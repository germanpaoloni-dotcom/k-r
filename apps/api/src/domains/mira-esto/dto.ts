import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { likes, media } from "../../db/schema.js";

export interface MiraEstoDto {
  id: string;
  contentType: "media" | "text" | "mixed";
  text: string | null;
  media: { id: string; type: string; url: string; thumbnailUrl: string | null } | null;
  intentEmoji: string | null;
  location: { id: string; name: string; city: string } | null;
  promotedToPostId: string | null;
  expiresAt: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  reactionCount: number;
  reactedByMe: boolean;
}

interface BaseRow {
  id: string;
  contentType: "media" | "text" | "mixed";
  text: string | null;
  mediaId: string | null;
  intentEmoji: string | null;
  locationId: string | null;
  locationName: string | null;
  locationCity: string | null;
  promotedToPostId: string | null;
  expiresAt: Date;
  createdAt: Date;
  authorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export async function hydrateMiraEsto(rows: BaseRow[], viewerId?: string): Promise<MiraEstoDto[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const mediaIds = rows.map((r) => r.mediaId).filter((v): v is string => v !== null);

  const [mediaRows, reactionCounts, myReactions] = await Promise.all([
    mediaIds.length
      ? db.select().from(media).where(inArray(media.id, mediaIds))
      : Promise.resolve([]),
    db
      .select({ targetId: likes.targetId, count: sql<number>`count(*)::int` })
      .from(likes)
      .where(and(eq(likes.targetType, "mira_esto"), inArray(likes.targetId, ids)))
      .groupBy(likes.targetId),
    viewerId
      ? db
          .select({ targetId: likes.targetId })
          .from(likes)
          .where(
            and(
              eq(likes.targetType, "mira_esto"),
              eq(likes.userId, viewerId),
              inArray(likes.targetId, ids)
            )
          )
      : Promise.resolve([]),
  ]);

  const mediaById = new Map(mediaRows.map((m) => [m.id, m]));
  const reactionCountById = new Map(reactionCounts.map((r) => [r.targetId, r.count]));
  const reactedSet = new Set(myReactions.map((r) => r.targetId));

  return rows.map((r) => {
    const m = r.mediaId ? mediaById.get(r.mediaId) : undefined;
    return {
      id: r.id,
      contentType: r.contentType,
      text: r.text,
      media: m ? { id: m.id, type: m.type, url: m.url, thumbnailUrl: m.thumbnailUrl } : null,
      intentEmoji: r.intentEmoji,
      location: r.locationId
        ? { id: r.locationId, name: r.locationName!, city: r.locationCity! }
        : null,
      promotedToPostId: r.promotedToPostId,
      expiresAt: r.expiresAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      author: {
        id: r.authorId,
        username: r.username,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
      },
      reactionCount: reactionCountById.get(r.id) ?? 0,
      reactedByMe: reactedSet.has(r.id),
    };
  });
}
