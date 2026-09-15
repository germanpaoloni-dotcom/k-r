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

## Estado actual (Fase 1 — Social core: completa)

- ✅ Schema completo de base de datos (27 tablas: identidad, social, negocios, eventos, marketplace, moderación, búsqueda/recomendación).
- ✅ Dominio **Auth**: registro, login, refresh con rotación de tokens, logout. Probado de punta a punta.
- ✅ Dominio **Users**: perfil propio (`GET/PATCH /users/me`), perfil público (`GET /users/:id`).
- ✅ Dominio **Social**: posts (crear/ver/borrar), like/unlike, comentarios, guardado.
- ✅ Dominio **Follow**: seguir/dejar de seguir, favoritos, followers/following.
- ✅ Dominio **Feed**: Siguiendo (recomendado/cronológico/favoritos), Para vos, Tendencias, Cerca (PostGIS).
- ✅ Web: landing, registro, login, perfil (`/me`), con el Design System Liquid Glass aplicado.
- ⏳ Próximo (Fase 2): Discover por categorías, búsqueda, mapa. Web todavía no consume posts/feed (solo auth).

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
