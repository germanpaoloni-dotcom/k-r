import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { miraEsto, media, users, locations, posts, likes } from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";
import { hydrateMiraEsto, type MiraEstoDto } from "./dto.js";
import { notify } from "../notifications/service.js";

export class MiraEstoError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

const DEFAULT_TTL_HOURS = 24;

const baseSelect = {
  id: miraEsto.id,
  contentType: miraEsto.contentType,
  text: miraEsto.text,
  mediaId: miraEsto.mediaId,
  intentEmoji: miraEsto.intentEmoji,
  locationId: miraEsto.locationId,
  locationName: locations.name,
  locationCity: locations.city,
  promotedToPostId: miraEsto.promotedToPostId,
  expiresAt: miraEsto.expiresAt,
  createdAt: miraEsto.createdAt,
  authorId: users.id,
  username: users.username,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
};

function baseQuery() {
  return db
    .select(baseSelect)
    .from(miraEsto)
    .innerJoin(users, eq(users.id, miraEsto.userId))
    .leftJoin(locations, eq(locations.id, miraEsto.locationId));
}

export interface CreateMiraEstoInput {
  contentType: "media" | "text" | "mixed";
  text?: string;
  media?: { type: "image" | "video"; url: string; thumbnailUrl?: string };
  locationId?: string;
  intentEmoji?: string;
  ttlHours?: number;
}

function validate(input: CreateMiraEstoInput) {
  const needsMedia = input.contentType === "media" || input.contentType === "mixed";
  const needsText = input.contentType === "text" || input.contentType === "mixed";
  if (needsMedia && !input.media) {
    throw new MiraEstoError(400, "Este tipo de Mirá esto necesita una foto o video.");
  }
  if (needsText && !input.text?.trim()) {
    throw new MiraEstoError(400, "Este tipo de Mirá esto necesita texto.");
  }
}

export async function createMiraEsto(userId: string, input: CreateMiraEstoInput): Promise<MiraEstoDto> {
  validate(input);

  let mediaId: string | null = null;
  if (input.media) {
    const row = firstOrThrow(
      await db
        .insert(media)
        .values({
          type: input.media.type,
          url: input.media.url,
          thumbnailUrl: input.media.thumbnailUrl ?? null,
        })
        .returning()
    );
    mediaId = row.id;
  }

  const ttlHours = input.ttlHours ?? DEFAULT_TTL_HOURS;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  const row = firstOrThrow(
    await db
      .insert(miraEsto)
      .values({
        userId,
        contentType: input.contentType,
        text: input.text?.trim() ?? null,
        mediaId,
        locationId: input.locationId ?? null,
        intentEmoji: input.intentEmoji ?? null,
        expiresAt,
      })
      .returning()
  );

  const dto = await getMiraEstoById(row.id, userId);
  if (!dto) throw new MiraEstoError(500, "No se pudo crear Mirá esto.");
  return dto;
}

export async function getMiraEstoById(id: string, viewerId?: string): Promise<MiraEstoDto | null> {
  const [row] = await baseQuery().where(eq(miraEsto.id, id));
  if (!row) return null;
  const [dto] = await hydrateMiraEsto([row], viewerId);
  return dto ?? null;
}

/**
 * Feed de Mirá esto: propio + de una lista de autores (followees/amigos),
 * solo lo que no expiró. El borrado real de vencidos lo hace el script de
 * limpieza (`scripts/cleanup-mira-esto.ts`), este filtro solo evita mostrarlo
 * mientras tanto.
 */
export async function listMiraEstoFeed(
  viewerId: string,
  authorIds: string[],
  limit = 60
): Promise<MiraEstoDto[]> {
  const ids = Array.from(new Set([viewerId, ...authorIds]));
  const rows = await baseQuery()
    .where(and(inArray(miraEsto.userId, ids), gt(miraEsto.expiresAt, new Date())))
    .orderBy(desc(miraEsto.createdAt))
    .limit(limit);
  return hydrateMiraEsto(rows, viewerId);
}

export async function deleteMiraEsto(id: string, userId: string) {
  const [row] = await db.select().from(miraEsto).where(eq(miraEsto.id, id));
  if (!row) throw new MiraEstoError(404, "No encontrado.");
  if (row.userId !== userId) throw new MiraEstoError(403, "No podés borrar esto.");
  await db.delete(miraEsto).where(eq(miraEsto.id, id));
}

/** Promueve un Mirá esto a post permanente — no duplica media, la reasigna. */
export async function promoteMiraEsto(id: string, userId: string) {
  const [row] = await db.select().from(miraEsto).where(eq(miraEsto.id, id));
  if (!row) throw new MiraEstoError(404, "No encontrado.");
  if (row.userId !== userId) throw new MiraEstoError(403, "No podés promover esto.");
  if (row.promotedToPostId) throw new MiraEstoError(400, "Ya fue promovido a post.");
  if (!row.mediaId) {
    throw new MiraEstoError(400, "Solo se puede promover a post un Mirá esto con foto o video.");
  }

  const post = firstOrThrow(
    await db
      .insert(posts)
      .values({
        userId,
        caption: row.text,
        locationId: row.locationId,
        visibility: "public",
        kind: "photo",
      })
      .returning()
  );
  await db.update(media).set({ postId: post.id }).where(eq(media.id, row.mediaId));
  await db
    .update(miraEsto)
    .set({ promotedToPostId: post.id })
    .where(eq(miraEsto.id, id));

  return post;
}

export async function react(id: string, userId: string) {
  const [row] = await db.select().from(miraEsto).where(eq(miraEsto.id, id));
  if (!row) throw new MiraEstoError(404, "No encontrado.");
  await db.insert(likes).values({ userId, targetType: "mira_esto", targetId: id }).onConflictDoNothing();
  await notify(row.userId, "mira_esto_reaction", { fromUserId: userId, miraEstoId: id }, { skipIfActor: userId });
}

export async function unreact(id: string, userId: string) {
  await db
    .delete(likes)
    .where(and(eq(likes.userId, userId), eq(likes.targetType, "mira_esto"), eq(likes.targetId, id)));
}
