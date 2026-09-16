import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { posts, follows, likes, locations, recommendations } from "../../db/schema.js";
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

// --- "Para vos" — recomendador real (Fase 8) ------------------------------
// Señales: recencia (decaimiento exponencial) + cuentas que seguís + afinidad
// por autor/categoría a partir de tus likes + feedback explícito "no me
// interesa" (recommendations.dismissed) que excluye ese post para siempre.
// Sin ML: scoring lineal explicable, mismo espíritu que el resto de los
// algoritmos del proyecto (ver decilo/intent.ts, domains/ai/heuristics.ts).

const RECENCY_HALF_LIFE_HOURS = 36;
const FOLLOW_WEIGHT = 3;
const AUTHOR_AFFINITY_WEIGHT = 1.5;
const CATEGORY_AFFINITY_WEIGHT = 1;
const CANDIDATE_WINDOW_DAYS = 14;
const CANDIDATE_POOL = 150;

export async function forYouFeed(viewerId?: string, limit = DEFAULT_LIMIT): Promise<PostDto[]> {
  if (!viewerId) {
    // Sin usuario no hay señales que personalizar — recencia pública simple.
    const rows = await postBaseQuery()
      .where(eq(posts.visibility, "public"))
      .orderBy(desc(posts.createdAt))
      .limit(limit);
    const hydrated = await hydratePosts(rows, undefined);
    return hydrated.map((p) => ({ ...p, reasonWhySeeing: "Público y reciente" }));
  }

  const dismissedRows = await db
    .select({ targetId: recommendations.targetId })
    .from(recommendations)
    .where(
      and(
        eq(recommendations.userId, viewerId),
        eq(recommendations.targetType, "post"),
        eq(recommendations.dismissed, true)
      )
    );
  const dismissedIds = new Set(dismissedRows.map((r) => r.targetId));

  const since = new Date(Date.now() - CANDIDATE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const candidateRows = await postBaseQuery()
    .where(and(eq(posts.visibility, "public"), ne(posts.userId, viewerId), sql`${posts.createdAt} >= ${since}`))
    .orderBy(desc(posts.createdAt))
    .limit(CANDIDATE_POOL);
  const candidates = candidateRows.filter((r) => !dismissedIds.has(r.id));
  if (candidates.length === 0) return [];

  const [followedRows, likedPostRows] = await Promise.all([
    db.select({ followeeId: follows.followeeId }).from(follows).where(eq(follows.followerId, viewerId)),
    db
      .select({ authorId: posts.userId, locationId: posts.locationId })
      .from(likes)
      .innerJoin(posts, eq(posts.id, likes.targetId))
      .where(and(eq(likes.userId, viewerId), eq(likes.targetType, "post"))),
  ]);
  const followedIds = new Set(followedRows.map((r) => r.followeeId));

  const authorAffinity = new Map<string, number>();
  const likedLocationIds = new Set<string>();
  for (const r of likedPostRows) {
    authorAffinity.set(r.authorId, (authorAffinity.get(r.authorId) ?? 0) + 1);
    if (r.locationId) likedLocationIds.add(r.locationId);
  }

  const likedCategories = new Set<string>();
  if (likedLocationIds.size > 0) {
    const rows = await db
      .select({ category: locations.category })
      .from(locations)
      .where(inArray(locations.id, [...likedLocationIds]));
    for (const l of rows) if (l.category) likedCategories.add(l.category);
  }

  const candidateLocationIds = [...new Set(candidates.map((c) => c.locationId).filter((id): id is string => !!id))];
  const categoryByLocation = new Map<string, string | null>();
  if (candidateLocationIds.length > 0) {
    const rows = await db
      .select({ id: locations.id, category: locations.category })
      .from(locations)
      .where(inArray(locations.id, candidateLocationIds));
    for (const l of rows) categoryByLocation.set(l.id, l.category);
  }

  const now = Date.now();
  const scored = candidates.map((c) => {
    const ageHours = (now - c.createdAt.getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.pow(0.5, ageHours / RECENCY_HALF_LIFE_HOURS);
    const isFollowed = followedIds.has(c.authorId);
    const authorScore = (authorAffinity.get(c.authorId) ?? 0) * AUTHOR_AFFINITY_WEIGHT;
    const category = c.locationId ? categoryByLocation.get(c.locationId) : null;
    const categoryScore = category && likedCategories.has(category) ? CATEGORY_AFFINITY_WEIGHT : 0;
    const followScore = isFollowed ? FOLLOW_WEIGHT : 0;

    let reasonCode = "recency";
    let reason = "Público y reciente";
    if (isFollowed) {
      reasonCode = "author_followed";
      reason = "Seguís a esta cuenta";
    } else if (authorScore > 0) {
      reasonCode = "author_affinity";
      reason = "Te gustó contenido de esta cuenta antes";
    } else if (categoryScore > 0) {
      reasonCode = "category_affinity";
      reason = `Te gusta la categoría "${category}"`;
    }

    return { row: c, score: recencyScore + followScore + authorScore + categoryScore, reasonCode, reason };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  const hydrated = await hydratePosts(
    top.map((t) => t.row),
    viewerId
  );
  const withReason = hydrated.map((p, i) => ({ ...p, reasonWhySeeing: top[i]!.reason }));

  await db.insert(recommendations).values(
    top.map((t) => ({
      userId: viewerId,
      targetType: "post",
      targetId: t.row.id,
      reasonCode: t.reasonCode,
    }))
  );

  return withReason;
}

/** Feedback explícito "no me interesa" — excluye el post de futuros `for-you` para este usuario. */
export async function dismissFromForYou(viewerId: string, postId: string): Promise<void> {
  const [existing] = await db
    .select({ id: recommendations.id })
    .from(recommendations)
    .where(
      and(
        eq(recommendations.userId, viewerId),
        eq(recommendations.targetType, "post"),
        eq(recommendations.targetId, postId)
      )
    )
    .limit(1);

  if (existing) {
    await db.update(recommendations).set({ dismissed: true }).where(eq(recommendations.id, existing.id));
  } else {
    await db.insert(recommendations).values({
      userId: viewerId,
      targetType: "post",
      targetId: postId,
      reasonCode: "dismissed_direct",
      dismissed: true,
    });
  }
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
