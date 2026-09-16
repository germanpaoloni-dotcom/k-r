import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { posts, follows, likes } from "../../db/schema.js";
import { postBaseQuery } from "../social/service.js";
import { hydratePosts, type PostDto } from "../social/dto.js";
import { friendIds } from "../friendships/service.js";

const DEFAULT_LIMIT = 20;

export type FollowingMode = "recommended" | "chronological" | "favorites";

export async function followingFeed(
  userId: string,
  mode: FollowingMode = "recommended",
  limit = DEFAULT_LIMIT
): Promise<PostDto[]> {
  const followeeRows = await db
    .select({ followeeId: follows.followeeId })
    .from(follows)
    .where(
      mode === "favorites"
        ? and(eq(follows.followerId, userId), eq(follows.isFavorite, true))
        : eq(follows.followerId, userId)
    );

  const followeeIds = followeeRows.map((r) => r.followeeId);
  if (followeeIds.length === 0) return [];

  // "recommended" todavía no tiene señal propia (motor de recomendación es Fase 6):
  // por ahora se comporta igual que "chronological", pero queda como modo
  // independiente en la API para no romper el contrato cuando se implemente.
  const rows = await postBaseQuery()
    .where(and(inArray(posts.userId, followeeIds), eq(posts.visibility, "public")))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  const hydrated = await hydratePosts(rows, userId);
  return hydrated.map((p) => ({ ...p, reasonWhySeeing: `Seguís a @${p.author.username}` }));
}

/**
 * Para vos — placeholder documentado: posts públicos recientes, excluyendo
 * los propios. `reasonWhySeeing` ya viaja en la respuesta (Fase 7 — Kör AI),
 * pero el recomendador real con señales de comportamiento sigue pendiente;
 * esto evita un feed vacío mientras tanto.
 */
export async function forYouFeed(viewerId?: string, limit = DEFAULT_LIMIT): Promise<PostDto[]> {
  const rows = await postBaseQuery()
    .where(
      viewerId
        ? and(eq(posts.visibility, "public"), ne(posts.userId, viewerId))
        : eq(posts.visibility, "public")
    )
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  const hydrated = await hydratePosts(rows, viewerId);
  // Sin motor de recomendación con señales reales todavía (ver comentario de
  // arriba) — la razón es honesta sobre eso, no simula personalización que no existe.
  return hydrated.map((p) => ({ ...p, reasonWhySeeing: "Público y reciente" }));
}

export async function trendingFeed(limit = DEFAULT_LIMIT): Promise<PostDto[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const popular = await db
    .select({ targetId: likes.targetId, count: sql<number>`count(*)::int` })
    .from(likes)
    .where(and(eq(likes.targetType, "post"), sql`${likes.createdAt} >= ${since}`))
    .groupBy(likes.targetId)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  if (popular.length === 0) return forYouFeed(undefined, limit);

  const ids = popular.map((p) => p.targetId);
  const rows = await postBaseQuery().where(inArray(posts.id, ids));
  // Reordenamos según el ranking de likes (el JOIN no preserva el orden del IN).
  const order = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  const hydrated = await hydratePosts(rows, undefined);
  return hydrated.map((p) => ({ ...p, reasonWhySeeing: "Tendencia — muchos likes esta semana" }));
}

/**
 * "Mi gente" — amigos (friendships aceptadas) + follows favoritos. Cero
 * inferencia: solo gente con la que hay una relación explícita y mutua o
 * marcada a mano, nunca calculada por comportamiento. Ver kor-arquitectura-v2.1.md.
 */
export async function miGenteFeed(userId: string, limit = DEFAULT_LIMIT): Promise<PostDto[]> {
  const [friends, favoriteRows] = await Promise.all([
    friendIds(userId),
    db
      .select({ followeeId: follows.followeeId })
      .from(follows)
      .where(and(eq(follows.followerId, userId), eq(follows.isFavorite, true))),
  ]);

  const ids = Array.from(new Set([...friends, ...favoriteRows.map((r) => r.followeeId)]));
  if (ids.length === 0) return [];

  const rows = await postBaseQuery()
    .where(and(inArray(posts.userId, ids), eq(posts.visibility, "public")))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  const hydrated = await hydratePosts(rows, userId);
  return hydrated.map((p) => ({ ...p, reasonWhySeeing: "Es tu gente" }));
}

export interface NearbyParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  category?: string;
}

export async function nearbyFeed(
  params: NearbyParams,
  viewerId?: string,
  limit = DEFAULT_LIMIT
): Promise<PostDto[]> {
  const radiusMeters = (params.radiusKm ?? 5) * 1000;

  const nearbyLocations = await db.execute<{ id: string }>(sql`
    SELECT id FROM locations
    WHERE ST_DWithin(
      geog,
      ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography,
      ${radiusMeters}
    )
    ${params.category ? sql`AND category = ${params.category}` : sql``}
  `);

  const locationIds = nearbyLocations.rows.map((r) => r.id);
  if (locationIds.length === 0) return [];

  const rows = await postBaseQuery()
    .where(and(inArray(posts.locationId, locationIds), eq(posts.visibility, "public")))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  const hydrated = await hydratePosts(rows, viewerId);
  return hydrated.map((p) => ({ ...p, reasonWhySeeing: `Cerca tuyo (${params.radiusKm ?? 5} km)` }));
}
