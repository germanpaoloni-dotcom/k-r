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

## Estado actual (Fase 1 — Red social real: completa)

Construido y probado de punta a punta según [`kor-arquitectura-v2.1.md`](../../claude/kor-arquitectura-v2.1.md) (Kör pasó de "app de descubrimiento" a red social masiva — ver también v2 y Fase 0 en el mismo lugar).

- ✅ Schema completo de base de datos (33 tablas — identidad, social, amigos/bloqueo, Mirá esto, compartir, mensajería, notificaciones, moderación centralizada, negocios, eventos, marketplace, búsqueda/recomendación).
- ✅ Dominio **Auth**: registro, login, refresh con rotación de tokens, logout.
- ✅ Dominio **Users**: perfil propio, perfil público.
- ✅ Dominio **Social**: posts (crear/ver/borrar), like/unlike, comentarios, guardado.
- ✅ Dominio **Follow**: seguir/dejar de seguir, favoritos, followers/following.
- ✅ Dominio **Friendships** ("Mi gente"): pedido/aceptar/rechazar/eliminar, mutuo — distinto de follow.
- ✅ Dominio **Blocks**: bloquear/desbloquear, corta follow + friendship, se aplica en follow y mensajería.
- ✅ Dominio **Mirá esto**: efímero 24h (media/texto/mixto), reacciones, promoción a post permanente, borrado real de vencidos (`npm run cleanup:mira-esto`, pensado para correr como job periódico).
- ✅ Dominio **Orbes**: servicio de agregación computado (no es tabla) sobre señales de posts/mira_esto/comments/asistencia a eventos, con caché (Redis si está configurado, si no memoria) — `GET /orbs`, agrupación evento+lugar a nivel de render.
- ✅ Dominio **Shares**: por referencia, nunca duplica contenido — DM reutiliza mensajería, público usa tabla propia.
- ✅ Dominio **Messaging**: conversaciones directas, mensajes, estado de lectura (`last_read_at`), unsend (soft-delete), bloqueo aplicado.
- ✅ Dominio **Notifications**: listar/marcar leídas, preferencias por tipo, emitidas desde follow/like/comment/friend request-accept/mira_esto/message.
- ✅ **Moderación centralizada**: toda denuncia pasa por `content_moderation` (regla dura, ningún dominio la saltea); cola de revisión y resolución simples (rol admin real queda pendiente, documentado como tal).
- ✅ Feed: Siguiendo, Para vos, Tendencias, Cerca (PostGIS), **Mi gente**, **Está pasando** (mismas señales que Orbes).
- ✅ Web: landing, registro, login, perfil (`/me`) con Liquid Glass. Todavía no consume el resto de los dominios nuevos.
- ⏳ Próximo (Fase 2, según roadmap v2.1): Decilo, Crear unificado, Estudio (estas ya tienen columnas `kind`/`medium` preparadas en `posts`), Descubrir/búsqueda/mapa.
- ⏳ Diferido a más adelante en el roadmap: Kör Play (Fase 5, necesita `groups`), grupos y progresión social, rol de admin/moderador real.

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
