import { inArray, eq, and, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { comments, likes, media, collectionItems, collections } from "../../db/schema.js";

export interface PostDto {
  id: string;
  caption: string | null;
  visibility: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  location: { id: string; name: string; city: string } | null;
  media: { id: string; type: string; url: string; thumbnailUrl: string | null }[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
}

interface BaseRow {
  id: string;
  caption: string | null;
  visibility: string;
  createdAt: Date;
  authorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  locationId: string | null;
  locationName: string | null;
  locationCity: string | null;
}

/**
 * Toma filas "base" de post (ya con autor/ubicación resueltos) y las hidrata
 * en lote con media, contadores y estado del viewer — evita N+1 queries por
 * post en un feed paginado.
 */
export async function hydratePosts(rows: BaseRow[], viewerId?: string): Promise<PostDto[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [mediaRows, likeCounts, commentCounts, myLikes, mySaves] = await Promise.all([
    db.select().from(media).where(inArray(media.postId, ids)),
    db
      .select({ targetId: likes.targetId, count: sql<number>`count(*)::int` })
      .from(likes)
      .where(and(eq(likes.targetType, "post"), inArray(likes.targetId, ids)))
      .groupBy(likes.targetId),
    db
      .select({ postId: comments.postId, count: sql<number>`count(*)::int` })
      .from(comments)
      .where(inArray(comments.postId, ids))
      .groupBy(comments.postId),
    viewerId
      ? db
          .select({ targetId: likes.targetId })
          .from(likes)
          .where(
            and(eq(likes.targetType, "post"), eq(likes.userId, viewerId), inArray(likes.targetId, ids))
          )
      : Promise.resolve([]),
    viewerId
      ? db
          .select({ targetId: collectionItems.targetId })
          .from(collectionItems)
          .innerJoin(collections, eq(collections.id, collectionItems.collectionId))
          .where(
            and(
              eq(collections.userId, viewerId),
              eq(collectionItems.targetType, "post"),
              inArray(collectionItems.targetId, ids)
            )
          )
      : Promise.resolve([]),
  ]);

  const mediaByPost = new Map<string, (typeof mediaRows)[number][]>();
  for (const m of mediaRows) {
    if (!m.postId) continue;
    const list = mediaByPost.get(m.postId) ?? [];
    list.push(m);
    mediaByPost.set(m.postId, list);
  }
  const likeCountByPost = new Map(likeCounts.map((r) => [r.targetId, r.count]));
  const commentCountByPost = new Map(commentCounts.map((r) => [r.postId, r.count]));
  const likedSet = new Set(myLikes.map((r) => r.targetId));
  const savedSet = new Set(mySaves.map((r) => r.targetId));

  return rows.map((r) => ({
    id: r.id,
    caption: r.caption,
    visibility: r.visibility,
    createdAt: r.createdAt.toISOString(),
    author: {
      id: r.authorId,
      username: r.username,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
    },
    location: r.locationId
      ? { id: r.locationId, name: r.locationName!, city: r.locationCity! }
      : null,
    media: (mediaByPost.get(r.id) ?? []).map((m) => ({
      id: m.id,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl,
    })),
    likeCount: likeCountByPost.get(r.id) ?? 0,
    commentCount: commentCountByPost.get(r.id) ?? 0,
    likedByMe: likedSet.has(r.id),
    savedByMe: savedSet.has(r.id),
  }));
}
