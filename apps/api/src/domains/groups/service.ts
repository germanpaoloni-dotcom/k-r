import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { groups, groupMembers, users } from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";
import { notify } from "../notifications/service.js";

export class GroupError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  avatarUrl?: string;
  visibility?: "public" | "private";
}

export interface GroupDto {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  visibility: string;
  ownerId: string;
  createdAt: string;
  memberCount: number;
  myRole: "owner" | "member" | null;
}

async function toDto(
  group: typeof groups.$inferSelect,
  viewerId?: string
): Promise<GroupDto> {
  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, group.id));
  const count = countRows[0]?.count ?? 0;

  let myRole: "owner" | "member" | null = null;
  if (viewerId) {
    const [member] = await db
      .select({ role: groupMembers.role })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, viewerId)));
    myRole = member?.role ?? null;
  }

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    avatarUrl: group.avatarUrl,
    visibility: group.visibility,
    ownerId: group.ownerId,
    createdAt: group.createdAt.toISOString(),
    memberCount: count,
    myRole,
  };
}

export async function createGroup(userId: string, input: CreateGroupInput): Promise<GroupDto> {
  if (!input.name.trim()) throw new GroupError(400, "El grupo necesita un nombre.");

  const group = firstOrThrow(
    await db
      .insert(groups)
      .values({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        avatarUrl: input.avatarUrl ?? null,
        visibility: input.visibility ?? "public",
        ownerId: userId,
      })
      .returning()
  );

  await db.insert(groupMembers).values({ groupId: group.id, userId, role: "owner" });

  return toDto(group, userId);
}

export async function getGroupById(id: string, viewerId?: string): Promise<GroupDto | null> {
  const [group] = await db.select().from(groups).where(eq(groups.id, id));
  if (!group) return null;
  return toDto(group, viewerId);
}

export interface ListGroupsParams {
  q?: string;
  limit?: number;
}

/** Browse público — los grupos "private" no aparecen acá (ver nota en schema.ts). */
export async function listGroups(params: ListGroupsParams = {}): Promise<GroupDto[]> {
  const conditions = [eq(groups.visibility, "public")];
  if (params.q?.trim()) {
    const q = params.q.trim();
    conditions.push(sql`(${groups.name} ILIKE ${"%" + q + "%"} OR similarity(${groups.name}, ${q}) > 0.15)`);
  }
  const rows = await db
    .select()
    .from(groups)
    .where(and(...conditions))
    .orderBy(desc(groups.createdAt))
    .limit(params.limit ?? 30);
  return Promise.all(rows.map((g) => toDto(g)));
}

export async function listMyGroups(userId: string, limit = 50): Promise<GroupDto[]> {
  const rows = await db
    .select({ group: groups })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(eq(groupMembers.userId, userId))
    .orderBy(desc(groupMembers.joinedAt))
    .limit(limit);
  return Promise.all(rows.map((r) => toDto(r.group, userId)));
}

export async function listMembers(groupId: string) {
  return db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(groupMembers.joinedAt);
}

export async function joinGroup(groupId: string, userId: string) {
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) throw new GroupError(404, "Grupo no encontrado.");

  await db.insert(groupMembers).values({ groupId, userId, role: "member" }).onConflictDoNothing();
  if (group.ownerId !== userId) {
    await notify(group.ownerId, "group_join", { groupId, fromUserId: userId }, { skipIfActor: userId });
  }
}

export async function leaveGroup(groupId: string, userId: string) {
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) throw new GroupError(404, "Grupo no encontrado.");
  if (group.ownerId === userId) {
    throw new GroupError(400, "El dueño no puede abandonar su propio grupo todavía (sin transferencia de dueño).");
  }
  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
}
