import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { follows, users } from "../../db/schema.js";
import { isBlockedEitherWay } from "../blocks/service.js";
import { notify } from "../notifications/service.js";

export class FollowError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export async function follow(followerId: string, followeeId: string) {
  if (followerId === followeeId) {
    throw new FollowError(400, "No podés seguirte a vos mismo.");
  }
  if (await isBlockedEitherWay(followerId, followeeId)) {
    throw new FollowError(403, "No podés seguir a este usuario.");
  }
  await db.insert(follows).values({ followerId, followeeId }).onConflictDoNothing();
  await notify(followeeId, "follow", { followerId }, { skipIfActor: followerId });
}

export async function unfollow(followerId: string, followeeId: string) {
  await db
    .delete(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followeeId, followeeId)));
}

export async function setFavorite(followerId: string, followeeId: string, isFavorite: boolean) {
  await db
    .update(follows)
    .set({ isFavorite })
    .where(and(eq(follows.followerId, followerId), eq(follows.followeeId, followeeId)));
}

const publicUserFields = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
};

export async function listFollowers(userId: string) {
  return db
    .select(publicUserFields)
    .from(follows)
    .innerJoin(users, eq(users.id, follows.followerId))
    .where(eq(follows.followeeId, userId));
}

export async function followeeIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ followeeId: follows.followeeId })
    .from(follows)
    .where(eq(follows.followerId, userId));
  return rows.map((r) => r.followeeId);
}

export async function listFollowing(userId: string) {
  return db
    .select({ ...publicUserFields, isFavorite: follows.isFavorite })
    .from(follows)
    .innerJoin(users, eq(users.id, follows.followeeId))
    .where(eq(follows.followerId, userId));
}

/**
 * "Gente en común" del perfil ajeno — gente que tanto `viewerId` como
 * `otherId` siguen. Solo cuenta follows (dato público de ambos lados), no
 * friendships ni ubicación/actividad — evita inferir relaciones privadas.
 */
export async function mutualFollowees(viewerId: string, otherId: string) {
  const [mine, theirs] = await Promise.all([followeeIds(viewerId), followeeIds(otherId)]);
  const theirSet = new Set(theirs);
  const mutualIds = mine.filter((id) => theirSet.has(id));
  if (mutualIds.length === 0) return [];

  return db.select(publicUserFields).from(users).where(inArray(users.id, mutualIds));
}
