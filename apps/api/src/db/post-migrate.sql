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

-- Marketplace (Fase 6 — catálogo). Mismo patrón que el resto: ILIKE + similarity().
CREATE INDEX IF NOT EXISTS businesses_name_trgm_idx ON businesses USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON products USING GIN (name gin_trgm_ops);

-- Onboarding — corre una sola vez, no en cada deploy (a diferencia del resto
-- de este archivo): marca como "ya onboardeadas" a las cuentas creadas antes
-- de este flujo, para no forzarlas a repetirlo. El corte es una fecha fija
-- (el momento en que se agregó este flujo), no `now()` — así una corrida
-- futura de db:migrate no le pisa el progreso a cuentas nuevas que todavía
-- no pasaron por /onboarding.
UPDATE users SET onboarding_completed_at = created_at
WHERE onboarding_completed_at IS NULL AND created_at < '2026-09-17T00:00:00Z';

-- Kör Pets — catálogo curado de 25 mascotas (paquete "Perfil + Pets").
-- Idempotente por `key`: seguro de correr en cada deploy, nunca pisa filas existentes.
INSERT INTO pet_definitions (key, name, species, personality, description, interaction, rarity) VALUES
  ('robby',    'Robby',  'dog',    'El travieso',                 'Siempre encuentra una forma de hacer lío.',            'poop_feed',        'common'),
  ('toby',     'Toby',   'dog',    'El ladrón',                   'Le encanta llevarse cosas que no son suyas.',          'steal_profile',    'rare'),
  ('choco',    'Choco',  'dog',    'El desastre',                 'Cinco minutos con Choco equivalen a un desastre.',     'chaos',            'rare'),
  ('rocky',    'Rocky',  'dog',    'El dormilón',                 'Puede quedarse dormido en cualquier lugar.',           'sleep',            'common'),
  ('nala',     'Nala',   'dog',    'La juguetona',                'Siempre quiere jugar.',                                'ball',             'rare'),
  ('luna-cat', 'Luna',   'cat',    'La arañadora',                'Los Orbes son su rascador favorito.',                  'scratch_orbs',     'epic'),
  ('michi',    'Michi',  'cat',    'El rey del teclado',          'Nadie escribe cuando Michi tiene sueño.',              'keyboard',         'common'),
  ('niebla',   'Niebla', 'cat',    'La invisible',                'Nunca sabés dónde va a aparecer.',                     'hide',             'epic'),
  ('kira-cat', 'Kira',   'cat',    'La destructora de stickers',  'Los stickers no están a salvo.',                       'stickers',         'rare'),
  ('sombra',   'Sombra', 'cat',    'La dormilona',                'Cuando tiene sueño, todo se oscurece.',                'shadow',           'rare'),
  ('zyro',     'Zyro',   'dragon', 'El incendiario',              'No debería estar cerca de una interfaz.',              'fire',             'legendary'),
  ('nox',      'Nox',    'dragon', 'El apagón',                   'Apaga todo cuando menos lo esperás.',                  'blackout',         'epic'),
  ('lumen',    'Lumen',  'dragon', 'El luminoso',                 'Convierte Kör en una explosión de luz.',               'light',            'epic'),
  ('fulgor',   'Fulgor', 'dragon', 'El coleccionista',            'Todo lo convierte en energía.',                        'collect',          'rare'),
  ('vulcan',   'Vulcan', 'dragon', 'El gigante',                  'Demasiado grande para una pantalla.',                  'giant',            'legendary'),
  ('nube',     'Nube',   'rabbit', 'La escondedora',              'Esconde cosas que después tenés que encontrar.',       'hide_button',      'rare'),
  ('copito',   'Copito', 'rabbit', 'El corredor',                 'Nunca se queda quieto.',                               'run',              'common'),
  ('moka',     'Moka',   'rabbit', 'El comilón',                  'Todo parece comida.',                                  'eat',              'common'),
  ('chispa',   'Chispa', 'rabbit', 'La multiplicadora',           'Una cosa nunca es suficiente.',                        'multiply',         'epic'),
  ('pixel',    'Pixel',  'rabbit', 'El pixelado',                 'Puede convertirse en píxeles.',                        'pixel',            'epic'),
  ('pico',     'Pico',   'bird',   'El volador',                  'Nunca usa las puertas.',                               'fly',              'common'),
  ('sol',      'Sol',    'bird',   'El luminoso',                 'Deja luz por donde pasa.',                             'sun',              'rare'),
  ('luna-bird','Luna',   'bird',   'La imitadora',                'Imita todo lo que escucha.',                           'fake_notification','epic'),
  ('kiwi',     'Kiwi',   'bird',   'El emplumador',                'Siempre deja alguna pluma.',                          'fly',              'common'),
  ('trueno',   'Trueno', 'bird',   'El fiestero',                 'Puede convertir cualquier momento en fiesta.',         'party',            'legendary')
ON CONFLICT (key) DO NOTHING;
