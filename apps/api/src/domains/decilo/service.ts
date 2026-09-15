import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { decilo, users, likes } from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";
import { hydrateDecilo, type DeciloDto } from "./dto.js";
import { detectIntent } from "./intent.js";
import { notify } from "../notifications/service.js";

export class DeciloError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

const baseSelect = {
  id: decilo.id,
  body: decilo.body,
  replyToId: decilo.replyToId,
  detectedIntent: decilo.detectedIntent,
  visibility: decilo.visibility,
  createdAt: decilo.createdAt,
  authorId: users.id,
  username: users.username,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
};

function baseQuery() {
  return db.select(baseSelect).from(decilo).innerJoin(users, eq(users.id, decilo.userId));
}

export interface CreateDeciloInput {
  body: string;
  replyToId?: string;
}

export async function createDecilo(userId: string, input: CreateDeciloInput): Promise<DeciloDto> {
  const body = input.body.trim();
  if (!body) throw new DeciloError(400, "Decilo no puede estar vacío.");
  if (body.length > 280) throw new DeciloError(400, "Decilo es de texto corto (máximo 280 caracteres).");

  let parent: { id: string; userId: string } | null = null;
  if (input.replyToId) {
    const [row] = await db
      .select({ id: decilo.id, userId: decilo.userId })
      .from(decilo)
      .where(eq(decilo.id, input.replyToId));
    if (!row) throw new DeciloError(404, "El Decilo al que querés responder no existe.");
    parent = row;
  }

  const row = firstOrThrow(
    await db
      .insert(decilo)
      .values({
        userId,
        body,
        replyToId: parent?.id ?? null,
        detectedIntent: detectIntent(body),
      })
      .returning()
  );

  if (parent) {
    await notify(parent.userId, "comment", { deciloId: row.id, fromUserId: userId }, { skipIfActor: userId });
  }

  const dto = await getDeciloById(row.id, userId);
  if (!dto) throw new DeciloError(500, "No se pudo crear el Decilo.");
  return dto;
}

export async function getDeciloById(id: string, viewerId?: string): Promise<DeciloDto | null> {
  const [row] = await baseQuery().where(eq(decilo.id, id));
  if (!row) return null;
  const [dto] = await hydrateDecilo([row], viewerId);
  return dto ?? null;
}

/** Timeline público de Decilo — solo raíces (sin replyToId), igual criterio que un feed cronológico. */
export async function listDeciloTimeline(viewerId?: string, limit = 30): Promise<DeciloDto[]> {
  const rows = await baseQuery()
    .where(and(isNull(decilo.replyToId), eq(decilo.visibility, "public")))
    .orderBy(desc(decilo.createdAt))
    .limit(limit);
  return hydrateDecilo(rows, viewerId);
}

/** Hilo completo: el Decilo raíz/nodo pedido + sus respuestas directas, en orden cronológico. */
export async function getThread(id: string, viewerId?: string) {
  const root = await getDeciloById(id, viewerId);
  if (!root) throw new DeciloError(404, "No encontrado.");
  const replyRows = await baseQuery().where(eq(decilo.replyToId, id)).orderBy(decilo.createdAt);
  const replies = await hydrateDecilo(replyRows, viewerId);
  return { root, replies };
}

export async function deleteDecilo(id: string, userId: string) {
  const [row] = await db.select().from(decilo).where(eq(decilo.id, id));
  if (!row) throw new DeciloError(404, "No encontrado.");
  if (row.userId !== userId) throw new DeciloError(403, "No podés borrar esto.");
  await db.delete(decilo).where(eq(decilo.id, id));
}

export async function likeDecilo(id: string, userId: string) {
  const [row] = await db.select().from(decilo).where(eq(decilo.id, id));
  if (!row) throw new DeciloError(404, "No encontrado.");
  await db.insert(likes).values({ userId, targetType: "decilo", targetId: id }).onConflictDoNothing();
  await notify(row.userId, "like", { deciloId: id, fromUserId: userId }, { skipIfActor: userId });
}

export async function unlikeDecilo(id: string, userId: string) {
  await db
    .delete(likes)
    .where(and(eq(likes.userId, userId), eq(likes.targetType, "decilo"), eq(likes.targetId, id)));
}
