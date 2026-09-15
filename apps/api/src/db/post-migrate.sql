-- Columnas geoespaciales y de embeddings que Drizzle no tipa nativamente.
-- Idempotente: seguro de correr en cada deploy.

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS geog geography(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED;

CREATE INDEX IF NOT EXISTS locations_geog_gix ON locations USING GIST (geog);

ALTER TABLE search_logs
  ADD COLUMN IF NOT EXISTS query_embedding vector(1536);

-- Embeddings de contenido para búsqueda semántica (posts, productos, eventos, negocios).
CREATE TABLE IF NOT EXISTS content_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type varchar(20) NOT NULL,
  target_id uuid NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id)
);

CREATE INDEX IF NOT EXISTS content_embeddings_hnsw
  ON content_embeddings USING hnsw (embedding vector_cosine_ops);

-- Búsqueda por texto (Fase 3 — Descubrir). pg_trgm ya estaba habilitado
-- desde Fase 1 (ver extensions.sql); estos índices GIN son los que hacen
-- rápidos tanto el ILIKE '%...%' como similarity() de domains/search.
CREATE INDEX IF NOT EXISTS users_username_trgm_idx ON users USING GIN (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS users_display_name_trgm_idx ON users USING GIN (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS locations_name_trgm_idx ON locations USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS posts_caption_trgm_idx ON posts USING GIN (caption gin_trgm_ops);
CREATE INDEX IF NOT EXISTS decilo_body_trgm_idx ON decilo USING GIN (body gin_trgm_ops);
