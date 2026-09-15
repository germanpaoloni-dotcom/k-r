import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { notifications, notificationPreferences } from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";

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
  | "group_join";

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
  await db.insert(notifications).values({ userId, type, payload });
}

export async function listNotifications(userId: string, limit = 30) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
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
