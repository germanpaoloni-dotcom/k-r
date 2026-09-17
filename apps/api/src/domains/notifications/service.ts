import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { notifications, notificationPreferences, users } from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";
import { pushToUser } from "../../realtime/hub.js";

export type NotificationType =
  | "follow"
  | "friend_request"
  | "friend_accept"
  | "like"
  | "comment"
  | "mira_esto_reaction"
  | "share"
  | "message"
  // Fase 4 (Mundo social) — todavía sin preferencia propia (no hay campo
  // "events"/"groups" en notification_preferences), así que van sin gate
  // por ahora; una preferencia dedicada es una extensión natural, no de
  // esta fase.
  | "event_attendance"
  | "group_join"
  // Fase 6 (Marketplace) — mismo criterio: sin preferencia propia todavía.
  | "order_placed"
  | "order_paid";

const PREFERENCE_BY_TYPE: Record<NotificationType, keyof typeof defaultPreferences | null> = {
  follow: "follows",
  friend_request: "friendRequests",
  friend_accept: "friendRequests",
  like: "likes",
  comment: "comments",
  mira_esto_reaction: "miraEsto",
  share: "likes",
  message: "messages",
  event_attendance: null,
  group_join: null,
  order_placed: null,
  order_paid: null,
};

const defaultPreferences = {
  likes: true,
  comments: true,
  follows: true,
  friendRequests: true,
  messages: true,
  miraEsto: true,
  digest: true,
};

// Qué campo del payload identifica a "quién generó esto" — para hidratar un
// avatar/nombre sin que cada dominio tenga que mandar el mismo dato con
// nombres distintos.
const ACTOR_FIELD_BY_TYPE: Partial<Record<NotificationType, string>> = {
  follow: "followerId",
  friend_request: "requesterId",
  friend_accept: "addresseeId",
  like: "fromUserId",
  comment: "fromUserId",
  mira_esto_reaction: "fromUserId",
  share: "fromUserId",
  message: "senderId",
  group_join: "fromUserId",
};

export interface NotificationDto {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  actor: { id: string; username: string; displayName: string; avatarUrl: string | null } | null;
}

async function hydrate(
  rows: { id: string; type: string; payload: unknown; readAt: Date | null; createdAt: Date }[]
): Promise<NotificationDto[]> {
  const actorIds = rows
    .map((r) => {
      const field = ACTOR_FIELD_BY_TYPE[r.type as NotificationType];
      const payload = r.payload as Record<string, unknown>;
      return field ? (payload[field] as string | undefined) : undefined;
    })
    .filter((id): id is string => Boolean(id));

  const actors = actorIds.length
    ? await db
        .select({ id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl })
        .from(users)
        .where(inArray(users.id, [...new Set(actorIds)]))
    : [];
  const actorById = new Map(actors.map((a) => [a.id, a]));

  return rows.map((r) => {
    const field = ACTOR_FIELD_BY_TYPE[r.type as NotificationType];
    const payload = r.payload as Record<string, unknown>;
    const actorId = field ? (payload[field] as string | undefined) : undefined;
    return {
      id: r.id,
      type: r.type as NotificationType,
      payload,
      readAt: r.readAt ? r.readAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      actor: actorId ? actorById.get(actorId) ?? null : null,
    };
  });
}

async function getPreferences(userId: string) {
  const [row] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));
  return row ?? { userId, ...defaultPreferences };
}

/**
 * Punto único de emisión de notificaciones — cualquier dominio que genere una
 * notificación pasa por acá (no inserta directo en `notifications`), así las
 * preferencias del usuario se respetan en un solo lugar.
 */
export async function notify(
  userId: string,
  type: NotificationType,
  payload: Record<string, unknown> = {},
  opts: { skipIfActor?: string } = {}
) {
  if (opts.skipIfActor && opts.skipIfActor === userId) return; // nunca notificarse a uno mismo
  const prefKey = PREFERENCE_BY_TYPE[type];
  if (prefKey) {
    const prefs = await getPreferences(userId);
    if (!prefs[prefKey]) return;
  }
  const row = firstOrThrow(await db.insert(notifications).values({ userId, type, payload }).returning());

  // Push en tiempo real — si el usuario no tiene un socket abierto esto es
  // un no-op (pushToUser revisa el registro en memoria y listo).
  const [dto] = await hydrate([row]);
  const unread = await unreadCount(userId);
  pushToUser(userId, { kind: "notification", notification: dto, unreadCount: unread });
}

export async function listNotifications(userId: string, limit = 30) {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  return hydrate(rows);
}

export async function unreadCount(userId: string) {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows.length;
}

export async function markRead(userId: string, notificationId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function getOrCreatePreferences(userId: string) {
  const [existing] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));
  if (existing) return existing;
  return firstOrThrow(
    await db.insert(notificationPreferences).values({ userId }).returning()
  );
}

export async function updatePreferences(
  userId: string,
  patch: Partial<typeof defaultPreferences>
) {
  await getOrCreatePreferences(userId);
  const [row] = await db
    .update(notificationPreferences)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(notificationPreferences.userId, userId))
    .returning();
  return row;
}
