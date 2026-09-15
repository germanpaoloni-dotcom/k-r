import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { likes, decilo } from "../../db/schema.js";

export interface DeciloDto {
  id: string;
  body: string;
  replyToId: string | null;
  detectedIntent: string | null;
  visibility: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  likeCount: number;
  likedByMe: boolean;
  replyCount: number;
}

interface BaseRow {
  id: string;
  body: string;
  replyToId: string | null;
  detectedIntent: string | null;
  visibility: string;
  createdAt: Date;
  authorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export async function hydrateDecilo(rows: BaseRow[], viewerId?: string): Promise<DeciloDto[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [likeCounts, myLikes, replyCounts] = await Promise.all([
    db
      .select({ targetId: likes.targetId, count: sql<number>`count(*)::int` })
      .from(likes)
      .where(and(eq(likes.targetType, "decilo"), inArray(likes.targetId, ids)))
      .groupBy(likes.targetId),
    viewerId
      ? db
          .select({ targetId: likes.targetId })
          .from(likes)
          .where(
            and(eq(likes.targetType, "decilo"), eq(likes.userId, viewerId), inArray(likes.targetId, ids))
          )
      : Promise.resolve([]),
    db
      .select({ replyToId: decilo.replyToId, count: sql<number>`count(*)::int` })
      .from(decilo)
      .where(inArray(decilo.replyToId, ids))
      .groupBy(decilo.replyToId),
  ]);

  const likeCountById = new Map(likeCounts.map((r) => [r.targetId, r.count]));
  const likedSet = new Set(myLikes.map((r) => r.targetId));
  const replyCountById = new Map(replyCounts.map((r) => [r.replyToId as string, r.count]));

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    replyToId: r.replyToId,
    detectedIntent: r.detectedIntent,
    visibility: r.visibility,
    createdAt: r.createdAt.toISOString(),
    author: {
      id: r.authorId,
      username: r.username,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
    },
    likeCount: likeCountById.get(r.id) ?? 0,
    likedByMe: likedSet.has(r.id),
    replyCount: replyCountById.get(r.id) ?? 0,
  }));
}
