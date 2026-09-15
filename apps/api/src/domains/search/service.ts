import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";

export interface SearchUserHit {
  [key: string]: unknown;
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface SearchLocationHit {
  [key: string]: unknown;
  id: string;
  name: string;
  city: string;
  category: string | null;
}

export interface SearchPostHit {
  [key: string]: unknown;
  id: string;
  caption: string | null;
  created_at: string;
  author_id: string;
  username: string;
  display_name: string;
}

export interface SearchDeciloHit {
  [key: string]: unknown;
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  username: string;
  display_name: string;
}

export interface SearchResults {
  users: SearchUserHit[];
  locations: SearchLocationHit[];
  posts: SearchPostHit[];
  decilo: SearchDeciloHit[];
}

/**
 * Búsqueda combinada por texto (Postgres full-text/trigram, ver
 * kor-arquitectura-v2.1.md — búsqueda semántica con pgvector es Fase 6/7,
 * esto es la búsqueda por texto de Fase 3). `similarity()` requiere pg_trgm
 * (ya habilitado desde Fase 1, ver extensions.sql) y usa los índices GIN
 * agregados en post-migrate.sql. Cada entidad se busca en paralelo y se
 * recorta a `limit` resultados, ordenados por similitud.
 */
export async function searchAll(rawQuery: string, limit = 8): Promise<SearchResults> {
  const q = rawQuery.trim();
  if (!q) return { users: [], locations: [], posts: [], decilo: [] };
  const like = `%${q}%`;

  const [users, locations, posts, decilo] = await Promise.all([
    db.execute<SearchUserHit>(sql`
      SELECT id, username, display_name, avatar_url,
             GREATEST(similarity(username, ${q}), similarity(display_name, ${q})) AS rank
      FROM users
      WHERE username ILIKE ${like} OR display_name ILIKE ${like}
         OR similarity(username, ${q}) > 0.15 OR similarity(display_name, ${q}) > 0.15
      ORDER BY rank DESC
      LIMIT ${limit}
    `),
    db.execute<SearchLocationHit>(sql`
      SELECT id, name, city, category,
             similarity(name, ${q}) AS rank
      FROM locations
      WHERE name ILIKE ${like} OR similarity(name, ${q}) > 0.15
      ORDER BY rank DESC
      LIMIT ${limit}
    `),
    db.execute<SearchPostHit>(sql`
      SELECT p.id, p.caption, p.created_at, u.id AS author_id, u.username, u.display_name,
             similarity(p.caption, ${q}) AS rank
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.visibility = 'public' AND p.caption IS NOT NULL
        AND (p.caption ILIKE ${like} OR similarity(p.caption, ${q}) > 0.1)
      ORDER BY rank DESC
      LIMIT ${limit}
    `),
    db.execute<SearchDeciloHit>(sql`
      SELECT d.id, d.body, d.created_at, u.id AS author_id, u.username, u.display_name,
             similarity(d.body, ${q}) AS rank
      FROM decilo d
      JOIN users u ON u.id = d.user_id
      WHERE d.visibility = 'public'
        AND (d.body ILIKE ${like} OR similarity(d.body, ${q}) > 0.1)
      ORDER BY rank DESC
      LIMIT ${limit}
    `),
  ]);

  return {
    users: users.rows,
    locations: locations.rows,
    posts: posts.rows,
    decilo: decilo.rows,
  };
}
