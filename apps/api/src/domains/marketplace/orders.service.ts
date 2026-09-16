import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { businesses, orderItems, orders, payments, payouts, products } from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";
import { notify } from "../notifications/service.js";
import { MarketplaceError } from "./businesses.service.js";
import { paymentProvider } from "./payment-provider.js";

/**
 * Comisión de Kör sobre el subtotal, tal como la describe README ("checkout +
 * comisión por venta desde V1"). Se descuenta del payout al negocio, nunca se
 * le suma al comprador — placeholder hasta que haya una tabla de tarifas por
 * categoría/negocio.
 */
const PLATFORM_FEE_RATE = 0.08;

/** Días entre el pago aprobado y la fecha en la que se programa el payout al negocio. */
const PAYOUT_DELAY_DAYS = 7;

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  businessId: string;
  items: CreateOrderItemInput[];
}

export interface OrderDto {
  id: string;
  status: string;
  subtotalCents: number;
  platformFeeCents: number;
  totalCents: number;
  currency: string;
  createdAt: string;
  buyerId: string;
  business: { id: string; name: string };
  items: { productId: string; name: string; quantity: number; unitPriceCents: number }[];
  payment: { id: string; status: string; providerPaymentId: string | null; checkoutUrl?: string } | null;
}

async function toDto(order: typeof orders.$inferSelect, checkoutUrl?: string): Promise<OrderDto> {
  const [business] = await db.select().from(businesses).where(eq(businesses.id, order.businessId));
  const items = await db
    .select({
      productId: orderItems.productId,
      quantity: orderItems.quantity,
      unitPriceCents: orderItems.unitPriceCents,
      name: products.name,
    })
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, order.id));
  const [payment] = await db.select().from(payments).where(eq(payments.orderId, order.id));

  return {
    id: order.id,
    status: order.status,
    subtotalCents: order.subtotalCents,
    platformFeeCents: order.platformFeeCents,
    totalCents: order.totalCents,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    buyerId: order.buyerUserId,
    business: { id: business!.id, name: business!.name },
    items,
    payment: payment
      ? {
          id: payment.id,
          status: payment.status,
          providerPaymentId: payment.providerPaymentId,
          ...(checkoutUrl ? { checkoutUrl } : {}),
        }
      : null,
  };
}

async function getOrderOrThrow(id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) throw new MarketplaceError(404, "Orden no encontrada.");
  return order;
}

async function assertCanView(order: typeof orders.$inferSelect, viewerId: string) {
  if (order.buyerUserId === viewerId) return;
  const [business] = await db.select().from(businesses).where(eq(businesses.id, order.businessId));
  if (business?.ownerUserId === viewerId) return;
  throw new MarketplaceError(403, "No podés ver esta orden.");
}

async function assertOwnsBusiness(businessId: string, userId: string) {
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
  if (!business) throw new MarketplaceError(404, "Negocio no encontrado.");
  if (business.ownerUserId !== userId) throw new MarketplaceError(403, "No sos dueño de este negocio.");
  return business;
}

export async function createOrder(buyerId: string, input: CreateOrderInput): Promise<OrderDto> {
  if (input.items.length === 0) throw new MarketplaceError(400, "La orden necesita al menos un producto.");

  const business = await db.select().from(businesses).where(eq(businesses.id, input.businessId)).then((r) => r[0]);
  if (!business) throw new MarketplaceError(404, "Negocio no encontrado.");

  const order = await db.transaction(async (tx) => {
    let subtotalCents = 0;
    const itemRows: { productId: string; quantity: number; unitPriceCents: number }[] = [];

    for (const item of input.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new MarketplaceError(400, "La cantidad tiene que ser un entero positivo.");
      }
      const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
      if (!product) throw new MarketplaceError(404, `Producto ${item.productId} no encontrado.`);
      if (product.businessId !== input.businessId) {
        throw new MarketplaceError(400, "Todos los productos de la orden tienen que ser del mismo negocio.");
      }
      if (product.stock < item.quantity) {
        throw new MarketplaceError(400, `Sin stock suficiente de "${product.name}".`);
      }
      subtotalCents += product.priceCents * item.quantity;
      itemRows.push({ productId: product.id, quantity: item.quantity, unitPriceCents: product.priceCents });

      await tx
        .update(products)
        .set({ stock: product.stock - item.quantity })
        .where(eq(products.id, product.id));
    }

    const platformFeeCents = Math.round(subtotalCents * PLATFORM_FEE_RATE);

    const newOrder = firstOrThrow(
      await tx
        .insert(orders)
        .values({
          buyerUserId: buyerId,
          businessId: input.businessId,
          status: "pending_payment",
          subtotalCents,
          platformFeeCents,
          totalCents: subtotalCents,
          currency: "ARS",
        })
        .returning()
    );

    await tx.insert(orderItems).values(
      itemRows.map((r) => ({
        orderId: newOrder.id,
        productId: r.productId,
        quantity: r.quantity,
        unitPriceCents: r.unitPriceCents,
      }))
    );

    return newOrder;
  });

  const paymentResult = await paymentProvider.createPayment({
    referenceId: order.id,
    amountCents: order.totalCents,
    currency: order.currency,
  });
  await db.insert(payments).values({
    orderId: order.id,
    provider: paymentProvider.name,
    providerPaymentId: paymentResult.providerPaymentId,
    status: paymentResult.status,
    amountCents: order.totalCents,
  });

  await notify(business.ownerUserId, "order_placed", { orderId: order.id, businessId: business.id }, { skipIfActor: buyerId });

  return toDto(order, paymentResult.checkoutUrl);
}

export async function getOrderById(id: string, viewerId: string): Promise<OrderDto> {
  const order = await getOrderOrThrow(id);
  await assertCanView(order, viewerId);
  return toDto(order);
}

export async function listMyOrders(buyerId: string, limit = 30): Promise<OrderDto[]> {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.buyerUserId, buyerId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  return Promise.all(rows.map((o) => toDto(o)));
}

export async function listBusinessOrders(businessId: string, ownerId: string, limit = 30): Promise<OrderDto[]> {
  await assertOwnsBusiness(businessId, ownerId);
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.businessId, businessId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  return Promise.all(rows.map((o) => toDto(o)));
}

async function restoreStock(orderId: string) {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    await db
      .update(products)
      .set({ stock: sql`${products.stock} + ${item.quantity}` })
      .where(eq(products.id, item.productId));
  }
}

export async function cancelOrder(id: string, buyerId: string): Promise<OrderDto> {
  const order = await getOrderOrThrow(id);
  if (order.buyerUserId !== buyerId) throw new MarketplaceError(403, "No podés cancelar esta orden.");
  if (order.status !== "pending_payment") {
    throw new MarketplaceError(400, "Solo se puede cancelar una orden con pago pendiente.");
  }

  await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, id));
  await restoreStock(id);

  return toDto({ ...order, status: "cancelled" });
}

export async function fulfillOrder(id: string, ownerId: string): Promise<OrderDto> {
  const order = await getOrderOrThrow(id);
  await assertOwnsBusiness(order.businessId, ownerId);
  if (order.status !== "paid") {
    throw new MarketplaceError(400, "Solo se puede despachar una orden ya pagada.");
  }

  await db.update(orders).set({ status: "fulfilled" }).where(eq(orders.id, id));
  return toDto({ ...order, status: "fulfilled" });
}

/**
 * Hace las veces de webhook del proveedor de pago — hoy lo dispara
 * `POST /payments/mock-checkout/:orderId/resolve` (ver routes.ts), el día que
 * haya un proveedor real esto se llama desde el handler del webhook firmado.
 */
export async function resolveOrderPayment(orderId: string, approve: boolean): Promise<OrderDto> {
  const order = await getOrderOrThrow(orderId);
  if (order.status !== "pending_payment") {
    throw new MarketplaceError(400, "Esta orden ya no tiene un pago pendiente.");
  }
  const [payment] = await db.select().from(payments).where(eq(payments.orderId, orderId));
  if (!payment) throw new MarketplaceError(500, "La orden no tiene un pago asociado.");

  if (approve) {
    await db.update(payments).set({ status: "approved" }).where(eq(payments.id, payment.id));
    await db.update(orders).set({ status: "paid" }).where(eq(orders.id, orderId));
    await db.insert(payouts).values({
      businessId: order.businessId,
      orderId: order.id,
      status: "pending",
      amountCents: order.subtotalCents - order.platformFeeCents,
      scheduledAt: new Date(Date.now() + PAYOUT_DELAY_DAYS * 24 * 60 * 60 * 1000),
    });
    await notify(order.buyerUserId, "order_paid", { orderId: order.id });
    return toDto({ ...order, status: "paid" });
  }

  await db.update(payments).set({ status: "rejected" }).where(eq(payments.id, payment.id));
  await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, orderId));
  await restoreStock(orderId);
  return toDto({ ...order, status: "cancelled" });
}

export async function listBusinessPayouts(businessId: string, ownerId: string, limit = 30) {
  await assertOwnsBusiness(businessId, ownerId);
  return db
    .select()
    .from(payouts)
    .where(eq(payouts.businessId, businessId))
    .orderBy(desc(payouts.scheduledAt))
    .limit(limit);
}
