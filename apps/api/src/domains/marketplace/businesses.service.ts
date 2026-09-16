import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { businesses, locations, products } from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";
import { activePromotedBusinessIds } from "./promotions.service.js";

export class MarketplaceError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export interface CreateBusinessInput {
  name: string;
  description?: string;
  category: string;
  locationId?: string;
  hours?: Record<string, unknown>;
  whatsapp?: string;
}

export type UpdateBusinessInput = Partial<CreateBusinessInput>;

export interface BusinessDto {
  id: string;
  name: string;
  description: string | null;
  category: string;
  hours: Record<string, unknown>;
  whatsapp: string | null;
  verified: boolean;
  ownerId: string;
  createdAt: string;
  location: { id: string; name: string; city: string } | null;
  productCount: number;
  isPromoted: boolean;
}

const businessSelect = {
  id: businesses.id,
  name: businesses.name,
  description: businesses.description,
  category: businesses.category,
  hours: businesses.hours,
  whatsapp: businesses.whatsapp,
  verified: businesses.verified,
  ownerUserId: businesses.ownerUserId,
  createdAt: businesses.createdAt,
  locationId: locations.id,
  locationName: locations.name,
  locationCity: locations.city,
};

interface BusinessRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  hours: unknown;
  whatsapp: string | null;
  verified: boolean;
  ownerUserId: string;
  createdAt: Date;
  locationId: string | null;
  locationName: string | null;
  locationCity: string | null;
}

function baseQuery() {
  return db.select(businessSelect).from(businesses).leftJoin(locations, eq(locations.id, businesses.locationId));
}

async function hydrateBusinesses(rows: BusinessRow[]): Promise<BusinessDto[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [counts, promotedIds] = await Promise.all([
    db
      .select({ businessId: products.businessId, count: sql<number>`count(*)::int` })
      .from(products)
      .where(inArray(products.businessId, ids))
      .groupBy(products.businessId),
    activePromotedBusinessIds(),
  ]);
  const countByBusiness = new Map(counts.map((c) => [c.businessId, c.count]));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    hours: (r.hours as Record<string, unknown>) ?? {},
    whatsapp: r.whatsapp,
    verified: r.verified,
    ownerId: r.ownerUserId,
    createdAt: r.createdAt.toISOString(),
    location: r.locationId ? { id: r.locationId, name: r.locationName!, city: r.locationCity! } : null,
    productCount: countByBusiness.get(r.id) ?? 0,
    isPromoted: promotedIds.has(r.id),
  }));
}

export async function createBusiness(userId: string, input: CreateBusinessInput): Promise<BusinessDto> {
  if (!input.name.trim()) throw new MarketplaceError(400, "El negocio necesita un nombre.");
  if (!input.category.trim()) throw new MarketplaceError(400, "El negocio necesita una categoría.");

  if (input.locationId) {
    const [location] = await db.select().from(locations).where(eq(locations.id, input.locationId));
    if (!location) throw new MarketplaceError(400, "El lugar del negocio no existe.");
  }

  const business = firstOrThrow(
    await db
      .insert(businesses)
      .values({
        ownerUserId: userId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        category: input.category.trim(),
        locationId: input.locationId ?? null,
        hours: input.hours ?? {},
        whatsapp: input.whatsapp ?? null,
      })
      .returning()
  );

  const dto = await getBusinessById(business.id);
  if (!dto) throw new MarketplaceError(500, "No se pudo crear el negocio.");
  return dto;
}

export async function getBusinessById(id: string): Promise<BusinessDto | null> {
  const [row] = await baseQuery().where(eq(businesses.id, id));
  if (!row) return null;
  const [dto] = await hydrateBusinesses([row]);
  return dto ?? null;
}

async function getOwnedBusinessOrThrow(id: string, userId: string) {
  const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
  if (!business) throw new MarketplaceError(404, "Negocio no encontrado.");
  if (business.ownerUserId !== userId) {
    throw new MarketplaceError(403, "No sos dueño de este negocio.");
  }
  return business;
}

export interface ListBusinessesParams {
  category?: string;
  city?: string;
  q?: string;
  limit?: number;
}

/** Browse de negocios — filtro por categoría, ciudad (vía el lugar asociado) y texto libre por nombre (trigram). */
export async function listBusinesses(params: ListBusinessesParams = {}): Promise<BusinessDto[]> {
  const conditions = [];
  if (params.category) conditions.push(eq(businesses.category, params.category));
  if (params.city) conditions.push(eq(locations.city, params.city));
  if (params.q?.trim()) {
    const q = params.q.trim();
    conditions.push(
      sql`(${businesses.name} ILIKE ${"%" + q + "%"} OR similarity(${businesses.name}, ${q}) > 0.15)`
    );
  }

  let query = baseQuery();
  const filtered = conditions.length ? query.where(and(...conditions)) : query;
  const rows = await filtered.orderBy(desc(businesses.createdAt)).limit(params.limit ?? 30);
  const dtos = await hydrateBusinesses(rows);
  // Promocionados primero (Fase 8 — publicidad), siempre marcados con
  // `isPromoted`, nunca mezclados de forma indistinguible de lo orgánico.
  return dtos.sort((a, b) => Number(b.isPromoted) - Number(a.isPromoted));
}

export async function listMyBusinesses(userId: string, limit = 50): Promise<BusinessDto[]> {
  const rows = await baseQuery().where(eq(businesses.ownerUserId, userId)).orderBy(desc(businesses.createdAt)).limit(limit);
  return hydrateBusinesses(rows);
}

export async function updateBusiness(id: string, userId: string, input: UpdateBusinessInput): Promise<BusinessDto> {
  await getOwnedBusinessOrThrow(id, userId);

  if (input.locationId) {
    const [location] = await db.select().from(locations).where(eq(locations.id, input.locationId));
    if (!location) throw new MarketplaceError(400, "El lugar del negocio no existe.");
  }

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.category !== undefined) patch.category = input.category.trim();
  if (input.locationId !== undefined) patch.locationId = input.locationId;
  if (input.hours !== undefined) patch.hours = input.hours;
  if (input.whatsapp !== undefined) patch.whatsapp = input.whatsapp;

  if (Object.keys(patch).length > 0) {
    await db.update(businesses).set(patch).where(eq(businesses.id, id));
  }

  const dto = await getBusinessById(id);
  if (!dto) throw new MarketplaceError(500, "No se pudo actualizar el negocio.");
  return dto;
}
