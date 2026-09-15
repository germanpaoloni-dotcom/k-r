import { and, eq, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import { blocks, follows, friendships, users } from "../../db/schema.js";

export class BlockError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) {
    throw new BlockError(400, "No podés bloquearte a vos mismo.");
  }
  await db.insert(blocks).values({ blockerId, blockedId }).onConflictDoNothing();

  // Bloquear corta la relación en ambos sentidos: deja de seguir/ser seguido
  // y cualquier amistad pendiente o aceptada entre ambos se cancela.
  await db
    .delete(follows)
    .where(
      or(
        and(eq(follows.followerId, blockerId), eq(follows.followeeId, blockedId)),
        and(eq(follows.followerId, blockedId), eq(follows.followeeId, blockerId))
      )
    );
  await db
    .delete(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, blockerId), eq(friendships.addresseeId, blockedId)),
        and(eq(friendships.requesterId, blockedId), eq(friendships.addresseeId, blockerId))
      )
    );
}

export async function unblockUser(blockerId: string, blockedId: string) {
  await db
    .delete(blocks)
    .where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)));
}

export async function listBlocked(blockerId: string) {
  return db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      blockedAt: blocks.createdAt,
    })
    .from(blocks)
    .innerJoin(users, eq(users.id, blocks.blockedId))
    .where(eq(blocks.blockerId, blockerId));
}

/** true si hay bloqueo en cualquiera de los dos sentidos entre a y b. */
export async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  const rows = await db
    .select({ blockerId: blocks.blockerId })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)),
        and(eq(blocks.blockerId, b), eq(blocks.blockedId, a))
      )
    );
  return rows.length > 0;
}
