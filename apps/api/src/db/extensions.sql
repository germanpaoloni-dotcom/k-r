-- Extensiones requeridas por el schema geoespacial y de búsqueda semántica.
-- Se ejecuta de forma idempotente antes de correr las migraciones de Drizzle.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()
