import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { businesses, products, promotions } from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";
import { MarketplaceError } from "./businesses.service.js";
import { paymentProvider } from "./payment-provider.js";

const MIN_BUDGET_CENTS = 100000; // $1.000 ARS — piso arbitrario para evitar promociones de $0.
const MAX_DAYS = 30;

export type PromotionTargetType = "business" | "product";

export interface CreatePromotionInput {
  targetType: PromotionTargetType;
  targetId: string;
  budgetCents: number;
  days: number;
}

export interface PromotionDto {
  id: string;
  businessId: string;
  targetType: string;
  targetId: string;
  status: string;
  budgetCents: number;
  durationDays: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  checkoutUrl?: string;
}

function toDto(p: typeof promotions.$inferSelect, checkoutUrl?: string): PromotionDto {
  return {
    id: p.id,
    businessId: p.businessId,
    targetType: p.targetType,
    targetId: p.targetId,
    status: p.status,
    budgetCents: p.budgetCents,
    durationDays: p.durationDays,
    startsAt: p.startsAt ? p.startsAt.toISOString() : null,
    endsAt: p.endsAt ? p.endsAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    ...(checkoutUrl ? { checkoutUrl } : {}),
  };
}

async function assertOwnsBusiness(businessId: string, userId: string) {
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
  if (!business) throw new MarketplaceError(404, "Negocio no encontrado.");
  if (business.ownerUserId !== userId) throw new MarketplaceError(403, "No sos dueño de este negocio.");
  return business;
}

export async function createPromotion(
  businessId: string,
  userId: string,
  input: CreatePromotionInput
): Promise<PromotionDto> {
  await assertOwnsBusiness(businessId, userId);

  if (input.budgetCents < MIN_BUDGET_CENTS) {
    throw new MarketplaceError(400, `El presupuesto mínimo es de ${MIN_BUDGET_CENTS / 100} ARS.`);
  }
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > MAX_DAYS) {
    throw new MarketplaceError(400, `La duración tiene que ser entre 1 y ${MAX_DAYS} días.`);
  }

  if (input.targetType === "business") {
    if (input.targetId !== businessId) {
      throw new MarketplaceError(400, "Solo podés promocionar tu propio negocio.");
    }
  } else if (input.targetType === "product") {
    const [product] = await db.select().from(products).where(eq(products.id, input.targetId));
    if (!product || product.businessId !== businessId) {
      throw new MarketplaceError(400, "El producto no pertenece a este negocio.");
    }
  } else {
    throw new MarketplaceError(400, "targetType tiene que ser \"business\" o \"product\".");
  }

  const promotion = firstOrThrow(
    await db
      .insert(promotions)
      .values({
        businessId,
        targetType: input.targetType,
        targetId: input.targetId,
        status: "pending_payment",
        budgetCents: input.budgetCents,
        durationDays: input.days,
      })
      .returning()
  );

  await paymentProvider.createPayment({
    referenceId: promotion.id,
    amountCents: promotion.budgetCents,
    currency: "ARS",
  });

  return toDto(promotion, `/api/v1/payments/mock-checkout-promotion/${promotion.id}`);
}

export async function listBusinessPromotions(businessId: string, userId: string): Promise<PromotionDto[]> {
  await assertOwnsBusiness(businessId, userId);
  const rows = await db
    .select()
    .from(promotions)
    .where(eq(promotions.businessId, businessId))
    .orderBy(desc(promotions.createdAt));
  return rows.map((r) => toDto(r));
}

/** Hace de webhook del proveedor de pago para promociones — ver payment-provider.ts. */
export async function resolvePromotionPayment(promotionId: string, approve: boolean): Promise<PromotionDto> {
  const [promotion] = await db.select().from(promotions).where(eq(promotions.id, promotionId));
  if (!promotion) throw new MarketplaceError(404, "Promoción no encontrada.");
  if (promotion.status !== "pending_payment") {
    throw new MarketplaceError(400, "Esta promoción ya no tiene un pago pendiente.");
  }

  if (approve) {
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + promotion.durationDays * 24 * 60 * 60 * 1000);
    await db.update(promotions).set({ status: "active", startsAt, endsAt }).where(eq(promotions.id, promotionId));
    return toDto({ ...promotion, status: "active", startsAt, endsAt });
  }

  await db.update(promotions).set({ status: "cancelled" }).where(eq(promotions.id, promotionId));
  return toDto({ ...promotion, status: "cancelled" });
}

/** IDs de negocios con una promoción tipo "business" activa ahora mismo — usado para rankear el browse. */
export async function activePromotedBusinessIds(): Promise<Set<string>> {
  const rows = await db
    .select({ businessId: promotions.businessId })
    .from(promotions)
    .where(and(eq(promotions.targetType, "business"), eq(promotions.status, "active"), gt(promotions.endsAt, new Date())));
  return new Set(rows.map((r) => r.businessId));
}

/** IDs de productos con una promoción activa ahora mismo — usado para rankear el browse de productos. */
export async function activePromotedProductIds(productIds?: string[]): Promise<Set<string>> {
  const conditions = [eq(promotions.targetType, "product"), eq(promotions.status, "active"), gt(promotions.endsAt, new Date())];
  if (productIds && productIds.length > 0) conditions.push(inArray(promotions.targetId, productIds));
  const rows = await db
    .select({ targetId: promotions.targetId })
    .from(promotions)
    .where(and(...conditions));
  return new Set(rows.map((r) => r.targetId));
}
