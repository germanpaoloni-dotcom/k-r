import { and, desc, eq, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import { friendships, users } from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";
import { isBlockedEitherWay } from "../blocks/service.js";
import { notify } from "../notifications/service.js";

export class FriendshipError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

async function findPair(a: string, b: string) {
  const [row] = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, a), eq(friendships.addresseeId, b)),
        and(eq(friendships.requesterId, b), eq(friendships.addresseeId, a))
      )
    );
  return row ?? null;
}

/**
 * Pedido de amistad. Si la otra persona ya te había pedido a vos (pendiente
 * en el sentido inverso), se acepta automáticamente en vez de crear un
 * segundo pedido — evita el caso de dos solicitudes cruzadas.
 */
export async function requestFriendship(requesterId: string, addresseeId: string) {
  if (requesterId === addresseeId) {
    throw new FriendshipError(400, "No podés agregarte a vos mismo.");
  }
  if (await isBlockedEitherWay(requesterId, addresseeId)) {
    throw new FriendshipError(403, "No podés enviar un pedido a este usuario.");
  }

  const existing = await findPair(requesterId, addresseeId);
  if (existing) {
    if (existing.status === "accepted") return existing;
    if (existing.status === "pending" && existing.requesterId === addresseeId) {
      // La otra persona ya te había pedido — se acepta.
      return acceptFriendship(requesterId, addresseeId);
    }
    if (existing.status === "pending") return existing; // ya pedido por mí
    // declinada previamente: se reabre como nuevo pedido
    const [row] = await db
      .update(friendships)
      .set({ status: "pending", requesterId, addresseeId, createdAt: new Date(), respondedAt: null })
      .where(eq(friendships.id, existing.id))
      .returning();
    await notify(addresseeId, "friend_request", { requesterId }, { skipIfActor: requesterId });
    return row;
  }

  const row = firstOrThrow(
    await db.insert(friendships).values({ requesterId, addresseeId, status: "pending" }).returning()
  );
  await notify(addresseeId, "friend_request", { requesterId }, { skipIfActor: requesterId });
  return row;
}

export async function acceptFriendship(userId: string, requesterId: string) {
  const existing = await findPair(userId, requesterId);
  if (!existing || existing.status !== "pending" || existing.addresseeId !== userId) {
    throw new FriendshipError(404, "No hay un pedido de amistad pendiente de esa persona.");
  }
  const [row] = await db
    .update(friendships)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(eq(friendships.id, existing.id))
    .returning();
  await notify(requesterId, "friend_accept", { addresseeId: userId }, { skipIfActor: userId });
  return row;
}

export async function declineFriendship(userId: string, requesterId: string) {
  const existing = await findPair(userId, requesterId);
  if (!existing || existing.status !== "pending" || existing.addresseeId !== userId) {
    throw new FriendshipError(404, "No hay un pedido de amistad pendiente de esa persona.");
  }
  await db
    .update(friendships)
    .set({ status: "declined", respondedAt: new Date() })
    .where(eq(friendships.id, existing.id));
}

export async function removeFriendship(userId: string, otherId: string) {
  const existing = await findPair(userId, otherId);
  if (!existing) return;
  await db.delete(friendships).where(eq(friendships.id, existing.id));
}

const publicUserFields = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
};

/** Amigos aceptados de un usuario. */
export async function listFriends(userId: string) {
  const rows = await db
    .select({
      requesterId: friendships.requesterId,
      addresseeId: friendships.addresseeId,
      respondedAt: friendships.respondedAt,
      other: publicUserFields,
    })
    .from(friendships)
    .innerJoin(
      users,
      or(
        and(eq(friendships.requesterId, userId), eq(users.id, friendships.addresseeId)),
        and(eq(friendships.addresseeId, userId), eq(users.id, friendships.requesterId))
      )
    )
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))
      )
    )
    .orderBy(desc(friendships.respondedAt));
  return rows.map((r) => r.other);
}

/** Pedidos entrantes pendientes (para mostrarle al usuario qué le llegó). */
export async function listIncomingRequests(userId: string) {
  return db
    .select({ id: friendships.id, createdAt: friendships.createdAt, requester: publicUserFields })
    .from(friendships)
    .innerJoin(users, eq(users.id, friendships.requesterId))
    .where(and(eq(friendships.addresseeId, userId), eq(friendships.status, "pending")))
    .orderBy(desc(friendships.createdAt));
}

export async function listOutgoingRequests(userId: string) {
  return db
    .select({ id: friendships.id, createdAt: friendships.createdAt, addressee: publicUserFields })
    .from(friendships)
    .innerJoin(users, eq(users.id, friendships.addresseeId))
    .where(and(eq(friendships.requesterId, userId), eq(friendships.status, "pending")))
    .orderBy(desc(friendships.createdAt));
}

/** IDs de amigos aceptados — usado por el feed "Mi gente" y por Orbes. */
export async function friendIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ requesterId: friendships.requesterId, addresseeId: friendships.addresseeId })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))
      )
    );
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}
