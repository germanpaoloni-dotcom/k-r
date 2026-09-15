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

## Estado actual (Fase 2 — Crear + expresarse: completa)

Construido y probado de punta a punta según el roadmap de 8 fases de [`kor-arquitectura-v2.1.md`](../../claude/kor-arquitectura-v2.1.md) (Kör pasó de "app de descubrimiento" a red social masiva — ver también v2 y Fase 0 en el mismo lugar).

**Fase 1 — Red social real:**

- ✅ Schema completo de base de datos (identidad, social, amigos/bloqueo, Mirá esto, compartir, mensajería, notificaciones, moderación centralizada, negocios, eventos, marketplace, búsqueda/recomendación).
- ✅ Auth, Users, Social (posts/likes/comments/guardado), Follow, Friendships ("Mi gente"), Blocks, Mirá esto (efímero 24h, promoción a post, borrado real de vencidos), Orbes (servicio de agregación computado, no tabla, cacheado), Shares (por referencia), Messaging (conversaciones/mensajes/last_read_at/unsend), Notifications (con preferencias), Moderación centralizada (`content_moderation`).
- ✅ Feed: Siguiendo, Para vos, Tendencias, Cerca (PostGIS), Mi gente, Está pasando.

**Fase 2 — Crear + expresarse (nuevo):**

- ✅ Dominio **Decilo**: texto corto con hilos (`replyToId`), detección de intención por heurística explicable (no IA real todavía — eso es Kör AI, Fase 7), likes, notificaciones en respuestas.
- ✅ **Estudio**: `posts.kind="creation"` + `medium` (dibujo/collage/etc, validado al crear), galería general (`GET /estudio`) y por usuario (`GET /users/:id/estudio`). No es una entidad nueva, reutiliza `posts`/`media`.
- ✅ **Kör Play — groundwork únicamente**: las 8 tablas del dominio (`games`, `game_sessions`, `game_answers`, `kor_credits` como ledger append-only, `inventory`, `orb_cosmetics`, `badges`, `pets`) ya están migradas. El dominio (`src/domains/play`) está deliberadamente vacío — sin servicio, sin rutas, sin registrar en `app.ts` — hasta Fase 5, cuando `groups` exista. Ver `src/domains/play/README.md`.
- ℹ️ **"Crear unificado"** no es un dominio backend nuevo: es un patrón de composición del cliente sobre los endpoints de creación que ya existen (posts, Mirá esto, Decilo, creaciones de Estudio). Se resuelve cuando se construya la UI web/mobile, no acá.
- ✅ Web: landing, registro, login, perfil (`/me`) con Liquid Glass. Todavía no consume el resto de los dominios nuevos (Fase 1 ni Fase 2).
- ⏳ Próximo (Fase 3, según roadmap v2.1): Descubrir — búsqueda, Cerca, mapa, lugares, contenido geolocalizado.
- ⏳ Diferido a más adelante en el roadmap: Mundo social/grupos (Fase 4), Kör Play funcional (Fase 5), Marketplace (Fase 6), Kör AI (Fase 7), Escala (Fase 8).

## Decisiones de Fase 0 ya resueltas

| Decisión | Resolución |
|---|---|
| Ciudad piloto | San Salvador de Jujuy |
| Nombre de marca | **Kōr** |
| Mapas | Mapbox |
| Proveedor de IA por defecto | Claude (Anthropic), vía capa agnóstica `@kor/ai-gateway` (aún no implementada) |
| Marketplace en MVP | Checkout + comisión por venta desde V1, vía Mercado Pago Marketplace (split payments, checkout hosteado — Kōr no maneja datos de tarjeta) |
| Cuentas de negocio | Gratis desde el día 1 |

> **Nota de arquitectura:** incluir checkout desde V1 (en vez de solo catálogo, como proponía el plan original) suma alcance real a la Fase 3: integración con Mercado Pago Marketplace, manejo de webhooks de pago, estados de `Order`/`Payment`/`Payout`, y — más adelante — facturación electrónica (AFIP) para las comisiones cobradas. El schema ya contempla estas entidades; la integración se implementa en Fase 3.
