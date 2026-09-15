/**
 * Compartir — siempre por referencia, nunca duplica contenido. DM reutiliza
 * `messages` (domains/messaging); acá solo vive el caso público, que
 * únicamente guarda de qué se trata (targetType/targetId) y quién lo
 * compartió. Ver kor-arquitectura-v2.1.md §"Compartir".
 */
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { shares, posts, miraEsto } from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";
import { sendMessage, type SendMessageInput } from "../messaging/service.js";

export class ShareError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

type ShareTargetType = "post" | "mira_esto";

async function assertTargetExists(targetType: ShareTargetType, targetId: string) {
  const [row] =
    targetType === "post"
      ? await db.select({ id: posts.id }).from(posts).where(eq(posts.id, targetId))
      : await db.select({ id: miraEsto.id }).from(miraEsto).where(eq(miraEsto.id, targetId));
  if (!row) throw new ShareError(404, "El contenido que querés compartir no existe.");
}

export async function shareToFeed(
  userId: string,
  targetType: ShareTargetType,
  targetId: string,
  caption?: string
) {
  await assertTargetExists(targetType, targetId);
  return firstOrThrow(
    await db
      .insert(shares)
      .values({ userId, targetType, targetId, scope: "public", caption: caption ?? null })
      .returning()
  );
}

export async function shareToConversation(
  userId: string,
  conversationId: string,
  targetType: ShareTargetType,
  targetId: string,
  caption?: string
) {
  await assertTargetExists(targetType, targetId);
  const input: SendMessageInput = { body: caption, attachmentType: targetType, attachmentId: targetId };
  return sendMessage(conversationId, userId, input);
}

export async function listMyShares(userId: string) {
  return db.select().from(shares).where(eq(shares.userId, userId)).orderBy(desc(shares.createdAt));
}
