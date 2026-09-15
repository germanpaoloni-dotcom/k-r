# Kōr

Red social de descubrimiento local, social y comercial potenciada por IA. Ver [`docs/architecture.md`](./docs/architecture.md) para el documento completo de Fase 0 (visión, arquitectura, roadmap).

**Ciudad piloto:** San Salvador de Jujuy · **Mapas:** Mapbox · **IA:** Claude (capa agnóstica) · **Marketplace:** checkout + comisión por venta desde V1 (Mercado Pago Marketplace).

## Estructura

```
apps/
  api/      Fastify + TypeScript — API REST, dominio Auth implementado
  web/      Next.js 15 — landing, registro, login, perfil
packages/
  types/    Tipos y schemas Zod compartidos
  ui/       Design System Liquid Glass (tokens CSS + componentes React)
  config/   Config compartida (eslint)
infra/
  migrations/  Migraciones SQL generadas por Drizzle
scripts/
  abrir-bundle.ps1 / .sh   Aplica y pushea automáticamente un bundle de git (ver abajo)
```

## Levantar el proyecto localmente

### 1. Base de datos

```bash
docker compose up -d postgres redis
```

(o usá una instancia local de Postgres 16 con las extensiones `postgis`, `vector`, `pg_trgm` y `pgcrypto` disponibles — el script de migración las crea solo si ya están instaladas en el servidor).

### 2. Instalar dependencias

```bash
npm install
```

### 3. Variables de entorno

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

### 4. Migrar la base

```bash
npm run db:migrate
```

Esto crea las extensiones necesarias, corre las migraciones de Drizzle (27 tablas — ver `apps/api/src/db/schema.ts`) y agrega las columnas geoespaciales (`geog`) y de embeddings (`vector`) que Drizzle no tipa nativamente.

### 5. Correr API y Web

```bash
npm run dev:api   # http://localhost:4000
npm run dev:web   # http://localhost:3000
```

## Sincronizar sin push directo (bundles)

Mientras esta sesión de Claude no tenga permiso de push directo al repo, cada avance se entrega como un archivo `.bundle` (por chat). Para aplicarlo sin escribir comandos a mano:

**Windows (PowerShell):**
```powershell
.\scripts\abrir-bundle.ps1
```

**Mac/Linux:**
```bash
./scripts/abrir-bundle.sh
```

Por defecto busca el `.bundle` más reciente en tu carpeta de Descargas, lo aplica sobre `~/kor` (o clona el repo ahí si todavía no existe), pushea a GitHub, y archiva el bundle ya usado en `Descargas/kor-bundles-aplicados`. Nunca pisa commits locales: si no puede aplicar en fast-forward, avisa y no toca nada.

## Estado actual (Fase 3 — Descubrir: completa)

Construido y probado de punta a punta según el roadmap de 8 fases de [`kor-arquitectura-v2.1.md`](../../claude/kor-arquitectura-v2.1.md) (Kör pasó de "app de descubrimiento" a red social masiva — ver también v2 y Fase 0 en el mismo lugar).

**Fase 1 — Red social real:**

- ✅ Schema completo de base de datos (identidad, social, amigos/bloqueo, Mirá esto, compartir, mensajería, notificaciones, moderación centralizada, negocios, eventos, marketplace, búsqueda/recomendación).
- ✅ Auth, Users, Social (posts/likes/comments/guardado), Follow, Friendships ("Mi gente"), Blocks, Mirá esto (efímero 24h, promoción a post, borrado real de vencidos), Orbes (servicio de agregación computado, no tabla, cacheado), Shares (por referencia), Messaging (conversaciones/mensajes/last_read_at/unsend), Notifications (con preferencias), Moderación centralizada (`content_moderation`).
- ✅ Feed: Siguiendo, Para vos, Tendencias, Cerca (PostGIS), Mi gente, Está pasando.
- ✅ Geoespacial desde el día 1: tabla `locations` con columna `geog` (PostGIS, generada, con índice GiST) y `locationId` opcional ya en `posts`/`mira_esto`/`stories` — Fase 3 construye *sobre* esto, no lo crea de cero.

**Fase 2 — Crear + expresarse:**

- ✅ Dominio **Decilo**: texto corto con hilos (`replyToId`), detección de intención por heurística explicable (no IA real todavía — eso es Kör AI, Fase 7), likes, notificaciones en respuestas.
- ✅ **Estudio**: `posts.kind="creation"` + `medium` (dibujo/collage/etc, validado al crear), galería general (`GET /estudio`) y por usuario (`GET /users/:id/estudio`). No es una entidad nueva, reutiliza `posts`/`media`.
- ✅ **Kör Play — groundwork únicamente**: las 8 tablas del dominio ya están migradas; el dominio (`src/domains/play`) sigue deliberadamente vacío hasta Fase 5. Ver `src/domains/play/README.md`.
- ℹ️ **"Crear unificado"** no es un dominio backend: es un patrón de composición del cliente sobre los endpoints de creación que ya existen. Se resuelve al construir la UI.

**Fase 3 — Descubrir (nuevo):**

- ✅ **Búsqueda** (`GET /search?q=`): combinada por texto (Postgres `pg_trgm` + `ILIKE`, con índices GIN) sobre usuarios, lugares, posts públicos y Decilo públicos — resultados agrupados por tipo. Búsqueda semántica con embeddings (`content_embeddings`, ya en schema desde Fase 1) queda para Fase 6/7, esto es solo texto.
- ✅ **Lugares**: `locations` pasa de alta mínima a dominio completo — `GET /locations` (browse con filtro por `city`/`category`/`q`), `GET /locations/:id`, `GET /locations/:id/posts` (la "ficha de ubicación" del documento de arquitectura: contenido real anclado a ese lugar).
- ✅ **Cerca**: `GET /locations/nearby?lat&lng&radiusKm&category` — lugares reales cerca de un punto (PostGIS `ST_DWithin`), distinto de `/feed/nearby` (que ya existía desde Fase 1 y trae *posts* cerca, no lugares).
- ✅ **Mapa**: `GET /map/pins?bbox=&category=` — versión liviana de lugares acotada a un bounding box (`ST_Intersects`), pensada para pintar un mapa sin traer la ciudad entera.
- ✅ **Contenido geolocalizado**: ya estaba resuelto desde Fase 1 (posts/Mirá esto anclables a un lugar); Fase 3 lo conecta con búsqueda, Cerca y la ficha de ubicación.
- ✅ Web: landing, registro, login, perfil (`/me`) con Liquid Glass. Todavía no consume ningún dominio del backend más allá de auth/perfil.
- ⏳ Próximo (Fase 4, según roadmap v2.1): Mundo social — grupos, eventos sociales.
- ⏳ Diferido a más adelante: Kör Play funcional (Fase 5), Marketplace (Fase 6), Kör AI (Fase 7), Escala (Fase 8).

## Decisiones de Fase 0 ya resueltas

| Decisión | Resolución |
|---|---|
| Ciudad piloto | San Salvador de Jujuy |
| Nombre de marca | **Kōr** |
| Mapas | Mapbox |
| Proveedor de IA por defecto | Claude (Anthropic), vía capa agnóstica `@kor/ai-gateway` (aún no implementada) |
| Marketplace en MVP | Checkout + comisión por venta desde V1, vía Mercado Pago Marketplace (split payments, checkout hosteado — Kōr no maneja datos de tarjeta) |
| Cuentas de negocio | Gratis desde el día 1 |

> **Nota de arquitectura:** incluir checkout desde V1 (en vez de solo catálogo, como proponía el plan original) suma alcance real a la Fase 6 (Marketplace, según la numeración vigente de 8 fases de v2.1): integración con Mercado Pago Marketplace, manejo de webhooks de pago, estados de `Order`/`Payment`/`Payout`, y — más adelante — facturación electrónica (AFIP) para las comisiones cobradas. El schema ya contempla estas entidades; la integración se implementa en esa fase.
