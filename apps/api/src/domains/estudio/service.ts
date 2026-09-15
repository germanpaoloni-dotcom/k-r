/**
 * Estudio — galería de creaciones (posts con kind="creation"). No es una
 * entidad nueva: reutiliza `posts`/`media` tal cual, solo cambia el recorte
 * (kind="creation") y la superficie de navegación. Ver
 * kor-arquitectura-v2.1.md §14 y §25 (Fase 2).
 */
import { and, desc, eq } from "drizzle-orm";
import { posts } from "../../db/schema.js";
import { postBaseQuery } from "../social/service.js";
import { hydratePosts, type PostDto } from "../social/dto.js";

const DEFAULT_LIMIT = 30;

/** Galería general: creaciones públicas recientes de cualquier usuario. */
export async function listEstudioGallery(viewerId?: string, limit = DEFAULT_LIMIT): Promise<PostDto[]> {
  const rows = await postBaseQuery()
    .where(and(eq(posts.kind, "creation"), eq(posts.visibility, "public")))
    .orderBy(desc(posts.createdAt))
    .limit(limit);
  return hydratePosts(rows, viewerId);
}

/** Estudio de un usuario puntual — su perfil de creaciones. */
export async function listUserEstudio(
  userId: string,
  viewerId?: string,
  limit = DEFAULT_LIMIT
): Promise<PostDto[]> {
  const rows = await postBaseQuery()
    .where(and(eq(posts.userId, userId), eq(posts.kind, "creation")))
    .orderBy(desc(posts.createdAt))
    .limit(limit);
  return hydratePosts(rows, viewerId);
}
