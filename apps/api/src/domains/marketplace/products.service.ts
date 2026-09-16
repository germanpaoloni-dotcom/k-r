import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { businesses, products } from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";
import { MarketplaceError } from "./businesses.service.js";
import { activePromotedProductIds } from "./promotions.service.js";

export interface CreateProductInput {
  name: string;
  description?: string;
  priceCents: number;
  currency?: string;
  stock?: number;
  images?: string[];
  category?: string;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface ProductDto {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  stock: number;
  images: string[];
  category: string | null;
  createdAt: string;
  business: { id: string; name: string };
  isPromoted: boolean;
}

const productSelect = {
  id: products.id,
  name: products.name,
  description: products.description,
  priceCents: products.priceCents,
  currency: products.currency,
  stock: products.stock,
  images: products.images,
  category: products.category,
  createdAt: products.createdAt,
  businessId: businesses.id,
  businessName: businesses.name,
};

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  stock: number;
  images: unknown;
  category: string | null;
  createdAt: Date;
  businessId: string;
  businessName: string;
}

function baseQuery() {
  return db.select(productSelect).from(products).innerJoin(businesses, eq(businesses.id, products.businessId));
}

function toDto(row: ProductRow, isPromoted = false): ProductDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    currency: row.currency,
    stock: row.stock,
    images: (row.images as string[]) ?? [],
    category: row.category,
    createdAt: row.createdAt.toISOString(),
    business: { id: row.businessId, name: row.businessName },
    isPromoted,
  };
}

async function getOwnedBusinessOrThrow(businessId: string, userId: string) {
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
  if (!business) throw new MarketplaceError(404, "Negocio no encontrado.");
  if (business.ownerUserId !== userId) {
    throw new MarketplaceError(403, "No sos dueño de este negocio.");
  }
  return business;
}

async function getOwnedProductOrThrow(productId: string, userId: string) {
  const [row] = await db
    .select({ product: products, ownerUserId: businesses.ownerUserId })
    .from(products)
    .innerJoin(businesses, eq(businesses.id, products.businessId))
    .where(eq(products.id, productId));
  if (!row) throw new MarketplaceError(404, "Producto no encontrado.");
  if (row.ownerUserId !== userId) {
    throw new MarketplaceError(403, "No sos dueño de este producto.");
  }
  return row.product;
}

export async function createProduct(
  businessId: string,
  userId: string,
  input: CreateProductInput
): Promise<ProductDto> {
  await getOwnedBusinessOrThrow(businessId, userId);

  if (!input.name.trim()) throw new MarketplaceError(400, "El producto necesita un nombre.");
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
    throw new MarketplaceError(400, "El precio tiene que ser un entero positivo (en centavos).");
  }

  const product = firstOrThrow(
    await db
      .insert(products)
      .values({
        businessId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        priceCents: input.priceCents,
        currency: input.currency ?? "ARS",
        stock: input.stock ?? 0,
        images: input.images ?? [],
        category: input.category ?? null,
      })
      .returning()
  );

  const dto = await getProductById(product.id);
  if (!dto) throw new MarketplaceError(500, "No se pudo crear el producto.");
  return dto;
}

export async function getProductById(id: string): Promise<ProductDto | null> {
  const [row] = await baseQuery().where(eq(products.id, id));
  if (!row) return null;
  const promoted = await activePromotedProductIds([row.id]);
  return toDto(row, promoted.has(row.id));
}

export interface ListProductsParams {
  businessId?: string;
  category?: string;
  q?: string;
  limit?: number;
}

/** Browse de productos — filtro por negocio, categoría y texto libre por nombre (trigram). */
export async function listProducts(params: ListProductsParams = {}): Promise<ProductDto[]> {
  const conditions = [];
  if (params.businessId) conditions.push(eq(products.businessId, params.businessId));
  if (params.category) conditions.push(eq(products.category, params.category));
  if (params.q?.trim()) {
    const q = params.q.trim();
    conditions.push(sql`(${products.name} ILIKE ${"%" + q + "%"} OR similarity(${products.name}, ${q}) > 0.15)`);
  }

  let query = baseQuery();
  const filtered = conditions.length ? query.where(and(...conditions)) : query;
  const rows = await filtered.orderBy(desc(products.createdAt)).limit(params.limit ?? 30);

  const promoted = await activePromotedProductIds(rows.map((r) => r.id));
  const dtos = rows.map((r) => toDto(r, promoted.has(r.id)));
  // Promocionados primero (Fase 8), siempre marcados con `isPromoted`.
  return dtos.sort((a, b) => Number(b.isPromoted) - Number(a.isPromoted));
}

export async function updateProduct(id: string, userId: string, input: UpdateProductInput): Promise<ProductDto> {
  await getOwnedProductOrThrow(id, userId);

  if (input.priceCents !== undefined && (!Number.isInteger(input.priceCents) || input.priceCents < 0)) {
    throw new MarketplaceError(400, "El precio tiene que ser un entero positivo (en centavos).");
  }
  if (input.stock !== undefined && (!Number.isInteger(input.stock) || input.stock < 0)) {
    throw new MarketplaceError(400, "El stock tiene que ser un entero positivo.");
  }

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.priceCents !== undefined) patch.priceCents = input.priceCents;
  if (input.currency !== undefined) patch.currency = input.currency;
  if (input.stock !== undefined) patch.stock = input.stock;
  if (input.images !== undefined) patch.images = input.images;
  if (input.category !== undefined) patch.category = input.category;

  if (Object.keys(patch).length > 0) {
    await db.update(products).set(patch).where(eq(products.id, id));
  }

  const dto = await getProductById(id);
  if (!dto) throw new MarketplaceError(500, "No se pudo actualizar el producto.");
  return dto;
}

export async function deleteProduct(id: string, userId: string): Promise<void> {
  await getOwnedProductOrThrow(id, userId);
  await db.delete(products).where(eq(products.id, id));
}
