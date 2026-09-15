import { and, desc, eq, gt, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { conversations, conversationParticipants, messages, users } from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";
import { isBlockedEitherWay } from "../blocks/service.js";
import { notify } from "../notifications/service.js";

export class MessagingError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

async function assertParticipant(conversationId: string, userId: string) {
  const [row] = await db
    .select()
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      )
    );
  if (!row) throw new MessagingError(403, "No formás parte de esta conversación.");
  return row;
}

/**
 * Encuentra (o crea) la conversación directa 1:1 entre dos usuarios. Nunca
 * hay dos conversaciones directas distintas para el mismo par — evita
 * fragmentar el historial.
 */
export async function getOrCreateDirectConversation(userId: string, otherUserId: string) {
  if (userId === otherUserId) {
    throw new MessagingError(400, "No podés iniciar una conversación con vos mismo.");
  }
  if (await isBlockedEitherWay(userId, otherUserId)) {
    throw new MessagingError(403, "No podés escribirle a este usuario.");
  }

  const mineRows = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId));
  const mineIds = mineRows.map((r) => r.conversationId);

  if (mineIds.length > 0) {
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .innerJoin(
        conversationParticipants,
        eq(conversationParticipants.conversationId, conversations.id)
      )
      .where(
        and(
          eq(conversations.type, "direct"),
          eq(conversationParticipants.userId, otherUserId),
          inArray(conversations.id, mineIds)
        )
      );
    if (existing) return existing.id;
  }

  const conversation = firstOrThrow(
    await db.insert(conversations).values({ type: "direct", createdBy: userId }).returning()
  );
  await db.insert(conversationParticipants).values([
    { conversationId: conversation.id, userId },
    { conversationId: conversation.id, userId: otherUserId },
  ]);
  return conversation.id;
}

const publicUserFields = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
};

export async function listConversations(userId: string) {
  const mine = await db
    .select({ conversationId: conversationParticipants.conversationId, lastReadAt: conversationParticipants.lastReadAt })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId));
  if (mine.length === 0) return [];

  const conversationIds = mine.map((m) => m.conversationId);
  const lastReadByConversation = new Map(mine.map((m) => [m.conversationId, m.lastReadAt]));

  const [convRows, otherParticipants, lastMessages, unreadCounts] = await Promise.all([
    db.select().from(conversations).where(inArray(conversations.id, conversationIds)),
    db
      .select({ conversationId: conversationParticipants.conversationId, user: publicUserFields })
      .from(conversationParticipants)
      .innerJoin(users, eq(users.id, conversationParticipants.userId))
      .where(
        and(inArray(conversationParticipants.conversationId, conversationIds), ne(conversationParticipants.userId, userId))
      ),
    db
      .select({
        conversationId: messages.conversationId,
        id: messages.id,
        body: messages.body,
        attachmentType: messages.attachmentType,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
        deletedAt: messages.deletedAt,
      })
      .from(messages)
      .where(inArray(messages.conversationId, conversationIds))
      .orderBy(desc(messages.createdAt)),
    Promise.all(
      conversationIds.map(async (id) => {
        const lastReadAt = lastReadByConversation.get(id);
        const rows = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, id),
              ne(messages.senderId, userId),
              lastReadAt ? gt(messages.createdAt, lastReadAt) : sql`true`
            )
          );
        return { conversationId: id, count: rows[0]?.count ?? 0 };
      })
    ),
  ]);

  const otherByConversation = new Map<string, (typeof otherParticipants)[number]["user"][]>();
  for (const row of otherParticipants) {
    const list = otherByConversation.get(row.conversationId) ?? [];
    list.push(row.user);
    otherByConversation.set(row.conversationId, list);
  }
  const lastMessageByConversation = new Map<string, (typeof lastMessages)[number]>();
  for (const m of lastMessages) {
    if (!lastMessageByConversation.has(m.conversationId)) lastMessageByConversation.set(m.conversationId, m);
  }
  const unreadByConversation = new Map(unreadCounts.map((u) => [u.conversationId, u.count]));

  return convRows
    .map((c) => {
      const last = lastMessageByConversation.get(c.id);
      return {
        id: c.id,
        type: c.type,
        participants: otherByConversation.get(c.id) ?? [],
        lastMessage: last
          ? {
              id: last.id,
              body: last.deletedAt ? null : last.body,
              deleted: !!last.deletedAt,
              attachmentType: last.attachmentType,
              senderId: last.senderId,
              createdAt: last.createdAt.toISOString(),
            }
          : null,
        unreadCount: unreadByConversation.get(c.id) ?? 0,
      };
    })
    .sort((a, b) => {
      const at = a.lastMessage?.createdAt ?? "";
      const bt = b.lastMessage?.createdAt ?? "";
      return bt.localeCompare(at);
    });
}

export interface SendMessageInput {
  body?: string;
  attachmentType?: "post" | "mira_esto" | "location" | "product" | "event";
  attachmentId?: string;
}

export async function sendMessage(conversationId: string, senderId: string, input: SendMessageInput) {
  await assertParticipant(conversationId, senderId);
  if (!input.body?.trim() && !input.attachmentType) {
    throw new MessagingError(400, "El mensaje necesita texto o un adjunto.");
  }

  const otherParticipants = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(
      and(eq(conversationParticipants.conversationId, conversationId), ne(conversationParticipants.userId, senderId))
    );
  for (const p of otherParticipants) {
    if (await isBlockedEitherWay(senderId, p.userId)) {
      throw new MessagingError(403, "No podés escribir en esta conversación.");
    }
  }

  const row = firstOrThrow(
    await db
      .insert(messages)
      .values({
        conversationId,
        senderId,
        body: input.body?.trim() ?? null,
        attachmentType: input.attachmentType ?? null,
        attachmentId: input.attachmentId ?? null,
      })
      .returning()
  );

  for (const p of otherParticipants) {
    await notify(p.userId, "message", { conversationId, senderId }, { skipIfActor: senderId });
  }

  return row;
}

export async function listMessages(conversationId: string, userId: string, before?: Date, limit = 50) {
  await assertParticipant(conversationId, userId);
  const rows = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        before ? lt(messages.createdAt, before) : sql`true`
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return rows
    .map((r) => ({ ...r, body: r.deletedAt ? null : r.body, deleted: !!r.deletedAt }))
    .reverse();
}

export async function markConversationRead(conversationId: string, userId: string) {
  await assertParticipant(conversationId, userId);
  await db
    .update(conversationParticipants)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      )
    );
}

/** Unsend — solo el remitente, y solo mientras el mensaje exista (sin ventana de tiempo por ahora). */
export async function deleteMessage(messageId: string, userId: string) {
  const [row] = await db.select().from(messages).where(eq(messages.id, messageId));
  if (!row) throw new MessagingError(404, "Mensaje no encontrado.");
  if (row.senderId !== userId) throw new MessagingError(403, "No podés borrar este mensaje.");
  if (row.deletedAt) return;
  await db
    .update(messages)
    .set({ deletedAt: new Date(), body: null, attachmentType: null, attachmentId: null })
    .where(and(eq(messages.id, messageId), isNull(messages.deletedAt)));
}
