import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  posts,
  likes,
  comments,
  recommendations,
  orders,
  orderItems,
  payouts,
  products,
  businesses,
} from "../../db/schema.js";
import { MarketplaceError } from "../marketplace/businesses.service.js";

/**
 * Analíticas (Fase 8 — Escala, P2 del doc de arquitectura). Sin tabla nueva
 * de tracking: reutiliza señales que ya existen — `likes`/`comments` para
 * contenido, `recommendations` como log de impresiones (ver
 * domains/feed/service.ts) y `orders`/`payments`/`payouts` (reales desde
 * Fase 6) para el lado de negocio.
 */

export interface CreatorAnalytics {
  postCount: number;
  totalLikes: number;
  totalComments: number;
  totalImpressions: number;
  topPosts: {
    id: string;
    caption: string | null;
    createdAt: string;
    likeCount: number;
    commentCount: number;
    impressions: number;
  }[];
}

export async function creatorAnalytics(userId: string, limit = 5): Promise<CreatorAnalytics> {
  const ownPosts = await db
    .select({ id: posts.id, caption: posts.caption, createdAt: posts.createdAt })
    .from(posts)
    .where(eq(posts.userId, userId));

  if (ownPosts.length === 0) {
    return { postCount: 0, totalLikes: 0, totalComments: 0, totalImpressions: 0, topPosts: [] };
  }
  const postIds = ownPosts.map((p) => p.id);

  const [likeRows, commentRows, impressionRows] = await Promise.all([
    db
      .select({ targetId: likes.targetId, count: sql<number>`count(*)::int` })
      .from(likes)
      .where(and(eq(likes.targetType, "post"), inArray(likes.targetId, postIds)))
      .groupBy(likes.targetId),
    db
      .select({ postId: comments.postId, count: sql<number>`count(*)::int` })
      .from(comments)
      .where(inArray(comments.postId, postIds))
      .groupBy(comments.postId),
    db
      .select({ targetId: recommendations.targetId, count: sql<number>`count(*)::int` })
      .from(recommendations)
      .where(and(eq(recommendations.targetType, "post"), inArray(recommendations.targetId, postIds)))
      .groupBy(recommendations.targetId),
  ]);

  const likesByPost = new Map(likeRows.map((r) => [r.targetId, r.count]));
  const commentsByPost = new Map(commentRows.map((r) => [r.postId, r.count]));
  const impressionsByPost = new Map(impressionRows.map((r) => [r.targetId, r.count]));

  const enriched = ownPosts.map((p) => ({
    id: p.id,
    caption: p.caption,
    createdAt: p.createdAt.toISOString(),
    likeCount: likesByPost.get(p.id) ?? 0,
    commentCount: commentsByPost.get(p.id) ?? 0,
    impressions: impressionsByPost.get(p.id) ?? 0,
  }));
  enriched.sort((a, b) => b.likeCount + b.commentCount - (a.likeCount + a.commentCount));

  return {
    postCount: ownPosts.length,
    totalLikes: enriched.reduce((sum, p) => sum + p.likeCount, 0),
    totalComments: enriched.reduce((sum, p) => sum + p.commentCount, 0),
    totalImpressions: enriched.reduce((sum, p) => sum + p.impressions, 0),
    topPosts: enriched.slice(0, limit),
  };
}

export interface BusinessAnalytics {
  orderCount: number;
  paidOrderCount: number;
  revenueCents: number;
  platformFeeCents: number;
  payoutsPendingCents: number;
  payoutsPaidCents: number;
  topProducts: { productId: string; name: string; quantitySold: number; revenueCents: number }[];
}

const REVENUE_STATUSES = ["paid", "fulfilled"] as const;

export async function businessAnalytics(businessId: string, ownerId: string, since?: Date): Promise<BusinessAnalytics> {
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
  if (!business) throw new MarketplaceError(404, "Negocio no encontrado.");
  if (business.ownerUserId !== ownerId) throw new MarketplaceError(403, "No sos dueño de este negocio.");

  const dateFilter = since ? gte(orders.createdAt, since) : undefined;
  const allOrders = await db
    .select()
    .from(orders)
    .where(dateFilter ? and(eq(orders.businessId, businessId), dateFilter) : eq(orders.businessId, businessId));

  const paidOrders = allOrders.filter((o) => (REVENUE_STATUSES as readonly string[]).includes(o.status));
  const revenueCents = paidOrders.reduce((sum, o) => sum + o.subtotalCents, 0);
  const platformFeeCents = paidOrders.reduce((sum, o) => sum + o.platformFeeCents, 0);

  const payoutRows = await db.select().from(payouts).where(eq(payouts.businessId, businessId));
  const payoutsPendingCents = payoutRows.filter((p) => p.status === "pending" || p.status === "processing").reduce((s, p) => s + p.amountCents, 0);
  const payoutsPaidCents = payoutRows.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountCents, 0);

  const topProducts: BusinessAnalytics["topProducts"] = [];
  if (paidOrders.length > 0) {
    const orderIds = paidOrders.map((o) => o.id);
    const items = await db
      .select({
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        unitPriceCents: orderItems.unitPriceCents,
        productName: products.name,
      })
      .from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(inArray(orderItems.orderId, orderIds));

    const byProduct = new Map<string, { name: string; quantitySold: number; revenueCents: number }>();
    for (const item of items) {
      const entry = byProduct.get(item.productId) ?? { name: item.productName, quantitySold: 0, revenueCents: 0 };
      entry.quantitySold += item.quantity;
      entry.revenueCents += item.quantity * item.unitPriceCents;
      byProduct.set(item.productId, entry);
    }
    topProducts.push(
      ...[...byProduct.entries()]
        .map(([productId, v]) => ({ productId, ...v }))
        .sort((a, b) => b.quantitySold - a.quantitySold)
        .slice(0, 5)
    );
  }

  return {
    orderCount: allOrders.length,
    paidOrderCount: paidOrders.length,
    revenueCents,
    platformFeeCents,
    payoutsPendingCents,
    payoutsPaidCents,
    topProducts,
  };
}
