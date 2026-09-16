import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  posts,
  media,
  users,
  locations,
  likes,
  comments,
  collections,
  collectionItems,
} from "../../db/schema.js";
import { hydratePosts, type PostDto } from "./dto.js";
import { firstOrThrow } from "../../db/utils.js";
import { notify } from "../notifications/service.js";

export class SocialError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

const postSelect = {
  id: posts.id,
  caption: posts.caption,
  visibility: posts.visibility,
  kind: posts.kind,
  medium: posts.medium,
  createdAt: posts.createdAt,
  authorId: users.id,
  username: users.username,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
  locationId: locations.id,
  locationName: locations.name,
  locationCity: locations.city,
};

function baseQuery() {
  return db
    .select(postSelect)
    .from(posts)
    .innerJoin(users, eq(users.id, posts.userId))
    .leftJoin(locations, eq(locations.id, posts.locationId));
}

export interface CreatePostInput {
  caption?: string;
  locationId?: string;
  visibility?: "public" | "followers" | "private";
  media: { type: "image" | "video"; url: string; thumbnailUrl?: string }[];
  // kind="creation" es Estudio (dibujo/collage/etc, ver domains/estudio) —
  // requiere `medium`. kind="video" no es obligatorio pasarlo explícito: se
  // infiere si toda la media es de tipo video, igual que antes de Fase 2.
  kind?: "photo" | "video" | "creation";
  medium?: string;
}

export async function createPost(
  userId: string,
  input: CreatePostInput
): Promise<PostDto> {
  if (!input.media || input.media.length === 0) {
    throw new SocialError(400, "Un post necesita al menos una foto o video.");
  }
  if (input.kind === "creation" && !input.medium?.trim()) {
    throw new SocialError(400, "Una creación de Estudio necesita indicar el medio (ej. dibujo, collage).");
  }

  const kind = input.kind ?? (input.media.every((m) => m.type === "video") ? "video" : "photo");

  const post = firstOrThrow(
    await db
      .insert(posts)
      .values({
        userId,
        caption: input.caption ?? null,
        locationId: input.locationId ?? null,
        visibility: input.visibility ?? "public",
        kind,
        medium: kind === "creation" ? input.medium!.trim() : null,
      })
      .returning()
  );

  await db.insert(media).values(
    input.media.map((m) => ({
      postId: post.id,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl ?? null,
    }))
  );

  const dto = await getPostById(post.id, userId);
  if (!dto) throw new SocialError(500, "No se pudo crear el post.");
  return dto;
}

export async function getPostById(postId: string, viewerId?: string): Promise<PostDto | null> {
  const [row] = await baseQuery().where(eq(posts.id, postId));
  if (!row) return null;
  const [dto] = await hydratePosts([row], viewerId);
  return dto ?? null;
}

/** Publicaciones públicas de un usuario — perfil ajeno (Fase de UI web). */
export async function listUserPosts(userId: string, viewerId?: string, limit = 30): Promise<PostDto[]> {
  const rows = await baseQuery()
    .where(and(eq(posts.userId, userId), eq(posts.visibility, "public")))
    .orderBy(desc(posts.createdAt))
    .limit(limit);
  return hydratePosts(rows, viewerId);
}

export async function deletePost(postId: string, userId: string) {
  const [post] = await db.select().from(posts).where(eq(posts.id, postId));
  if (!post) throw new SocialError(404, "Post no encontrado.");
  if (post.userId !== userId) throw new SocialError(403, "No podés borrar este post.");
  await db.delete(posts).where(eq(posts.id, postId));
}

export async function likePost(postId: string, userId: string) {
  await db
    .insert(likes)
    .values({ userId, targetType: "post", targetId: postId })
    .onConflictDoNothing();
  const [post] = await db.select({ userId: posts.userId }).from(posts).where(eq(posts.id, postId));
  if (post) await notify(post.userId, "like", { postId, fromUserId: userId }, { skipIfActor: userId });
}

export async function unlikePost(postId: string, userId: string) {
  await db
    .delete(likes)
    .where(and(eq(likes.userId, userId), eq(likes.targetType, "post"), eq(likes.targetId, postId)));
}

const commentSelect = {
  id: comments.id,
  body: comments.body,
  parentCommentId: comments.parentCommentId,
  createdAt: comments.createdAt,
  author: {
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    avatarUrl: users.avatarUrl,
  },
};

function commentBaseQuery() {
  return db.select(commentSelect).from(comments).innerJoin(users, eq(users.id, comments.userId));
}

export async function addComment(
  postId: string,
  userId: string,
  body: string,
  parentCommentId?: string
) {
  const [post] = await db.select().from(posts).where(eq(posts.id, postId));
  if (!post) throw new SocialError(404, "Post no encontrado.");

  const [inserted] = await db
    .insert(comments)
    .values({ postId, userId, body, parentCommentId: parentCommentId ?? null })
    .returning();
  await notify(post.userId, "comment", { postId, fromUserId: userId }, { skipIfActor: userId });

  // Misma forma que listComments (con `author` hidratado) — sin esto el
  // caller de POST /posts/:id/comments recibe un DTO distinto al de GET.
  const [comment] = await commentBaseQuery().where(eq(comments.id, inserted!.id));
  return comment;
}

export async function listComments(postId: string) {
  return commentBaseQuery().where(eq(comments.postId, postId)).orderBy(comments.createdAt);
}

async function getOrCreateDefaultCollection(userId: string) {
  const [existing] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.userId, userId), eq(collections.type, "guardados")));
  if (existing) return existing;
  return firstOrThrow(
    await db.insert(collections).values({ userId, name: "Guardados", type: "guardados" }).returning()
  );
}

export async function savePost(postId: string, userId: string) {
  const collection = await getOrCreateDefaultCollection(userId);
  await db
    .insert(collectionItems)
    .values({ collectionId: collection.id, targetType: "post", targetId: postId })
    .onConflictDoNothing();
}

export async function unsavePost(postId: string, userId: string) {
  const collection = await getOrCreateDefaultCollection(userId);
  await db
    .delete(collectionItems)
    .where(
      and(
        eq(collectionItems.collectionId, collection.id),
        eq(collectionItems.targetType, "post"),
        eq(collectionItems.targetId, postId)
      )
    );
}

export { baseQuery as postBaseQuery, postSelect };
