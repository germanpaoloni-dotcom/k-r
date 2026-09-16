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

## Estado actual (Fase 8 — Escala: en curso)

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

**Fase 4 — Mundo social (nuevo):**

- ✅ **Grupos**: tablas nuevas `groups`/`group_members`. Crear grupo (dueño = owner automático), `GET /groups` (browse público, con `q` por nombre vía trigram), `GET /groups/mine`, `GET /groups/:id/members`, join/leave. Grupos `private` solo quedan afuera del browse — sin sistema de invitaciones todavía, simplificación deliberada de esta fase. Notifica al dueño cuando alguien se une.
- ✅ **Eventos sociales**: dominio nuevo sobre `events`/`event_attendance`, que ya existían en el schema desde Fase 0/1 (Orbes ya las leía para el Orbe de tipo "event", pero no había forma de crear nada). Crear evento (valida que el lugar exista), listar con filtros (`category`/`organizerId`/`locationId`/`includePast`), asistencia de 3 estados (`interested`/`going`/`reminder_set`) como upsert real, notificación al organizador en cada cambio.
- ℹ️ Progresión de grupo (XP/mascota/orbe propio) quedó desbloqueada para Fase 5 en cuanto `groups` existió acá.
- ✅ Web: landing, registro, login, perfil (`/me`) con Liquid Glass. Loop social core agregado más adelante (ver sección siguiente) — `/home`, `/create`, `/u/:id`, `/p/:id`.

**Fase 5 — Kör Play (nuevo):**

- ✅ **Juegos**: `POST /games` (catálogo curado, key única), `GET /games`, `GET /games/:id`. Sin apuestas — el diseño no contempla dinero real en ningún punto.
- ✅ **Sesiones de juego**: `POST /games/:id/sessions` (contexto `solo` | `dm` | `group` | `event`, valida que el grupo exista), ciclo `waiting` → `active` (`/start`) → `ended` (`/end`), solo quien la creó puede arrancarla/cerrarla. `POST /sessions/:id/answers` registra la respuesta y, si es correcta, dispara créditos + badge.
- ✅ **Kör Créditos**: `GET /credits/balance` (suma del ledger, nunca una columna mutable — restricción que ya venía del schema desde Fase 2), `GET /credits/history`. Acierto en un juego = +10 créditos (`kor_credits`, `reason="game_correct_answer"`).
- ✅ **Cosméticos**: `GET /cosmetics`, `POST /cosmetics/:id/buy` — transacción atómica (débito en el ledger + alta en `inventory`), valida saldo suficiente y que no se posea ya. Catálogo curado, sin endpoint de alta pública (igual criterio que `games`/`badges`, que si tienen alta abierta por ahora al no existir todavía un sistema de roles admin en el proyecto).
- ✅ **Badges**: `POST /badges`, `GET /badges`, y `awardBadge()` interno — otorga `primer_acierto` la primera vez que alguien acierta una respuesta (idempotente).
- ✅ **Inventario**: `GET /inventory` — cosméticos y badges propios, hidratados en lote (mismo patrón `hydrateX` del resto del proyecto).
- ✅ **Mascotas**: `POST /pets` (una por usuario) y ahora también `POST /groups/:id/pet` (una por grupo, cualquier miembro puede crearla/entrenarla) — la progresión de grupo que Fase 4 dejó pendiente. `POST /pets/:id/train`: +15 XP, sube de nivel cada 100 XP.
- ⏳ Diferido a más adelante: Marketplace (Fase 6), Kör AI (Fase 7), Escala (Fase 8).

**Fase 6 — Marketplace (en curso):**

- ✅ **Negocios**: `businesses` pasa de tabla latente (desde Fase 0/1) a dominio completo — `POST /businesses` (dueño = owner automático), `GET /businesses` (browse con filtro por `category`/`city` vía el lugar asociado/`q` por nombre vía trigram), `GET /businesses/mine`, `GET /businesses/:id`, `PATCH /businesses/:id` (solo dueño). Sin gate por `accountType="business"` todavía — mismo criterio que `groups`/`events`: no existe sistema de roles, cualquier usuario autenticado puede crear un negocio del que es dueño.
- ✅ **Catálogo de productos**: `products` (mismo caso, latente desde Fase 0/1) — `POST /businesses/:id/products` (solo dueño del negocio), `GET /businesses/:id/products` (catálogo del negocio), `GET /products` (browse general con `businessId`/`category`/`q`), `GET /products/:id`, `PATCH /products/:id` y `DELETE /products/:id` (solo dueño, vía join a `businesses.ownerUserId`).
- ✅ **Checkout**: `POST /orders` (valida stock, reserva descontando `products.stock`, calcula comisión 8% sobre subtotal), `GET /orders/mine`, `GET /orders/:id`, `POST /orders/:id/cancel` (restaura stock), `POST /orders/:id/fulfill` (dueño del negocio), `GET /businesses/:id/orders` y `GET /businesses/:id/payouts` (dueño). Comisión se descuenta del payout al negocio, nunca se le suma al comprador.
- ✅ **Proveedor de pago agnóstico**: `payment-provider.ts` define la interfaz (`createPayment`); `MockPaymentProvider` es la única implementación hoy — simula un checkout hosteado y se resuelve a mano vía `POST /payments/mock-checkout/:orderId/resolve` (hace de webhook). El día que haya credenciales de sandbox de Mercado Pago, se suma `MercadoPagoProvider` sin tocar `orders.service.ts`.
- ⏳ Todavía sin UI en el web (como el resto de las fases post-Fase 1) ni conector real de Mercado Pago Marketplace.

**Fase 7 — Kör AI (en curso):**

- ✅ **`@kor/ai-gateway`**: la capa agnóstica que README ya venía anunciando como pendiente. Interfaz `AiProvider` (`complete()` + flag `available`); `ClaudeProvider` (llama a la Messages API de Anthropic por `fetch`, sin SDK) se activa solo si existe `ANTHROPIC_API_KEY`; si no, `NullAiProvider` deja `available=false` y cada dominio usa su propio fallback heurístico — nunca rompe por falta de credenciales.
- ✅ **"¿Qué hago?"**: `POST /ai/que-hago` (`domains/ai`) — extrae categoría + presupuesto del mensaje (con Claude si hay API key, si no con reglas explicables en `heuristics.ts`, mismo criterio que `domains/decilo/intent.ts`) y devuelve hasta 3 tarjetas combinando lugares cercanos (o por categoría, sin geo) y eventos próximos.
- ✅ **Explicabilidad del feed ("¿por qué veo esto?")**: los 5 feeds (`following`, `for-you`, `trending`, `mi-gente`, `nearby`) ahora devuelven `reasonWhySeeing` en cada post — sin IA, es texto determinístico por algoritmo (ej. "Seguís a @x", "Tendencia — muchos likes esta semana").
- ⏳ Sin credenciales de Anthropic configuradas en este entorno todavía — todo corre hoy con el fallback heurístico (`source: "heuristic"` en la respuesta de `/ai/que-hago`). Pegar `ANTHROPIC_API_KEY` en `.env` activa `ClaudeProvider` sin tocar código.
- ⏳ Búsqueda semántica (`content_embeddings`, ya en schema desde Fase 1) queda pendiente: no tiene un mock razonable — requiere un modelo de embeddings real para no ser directamente engañosa, a diferencia del resto de los placeholders del proyecto.

**Fase 8 — Escala (en curso):**

- ✅ **Recomendador real**: `for-you` dejó de ser "posts públicos recientes" — ranking por decaimiento de recencia + cuentas que seguís + afinidad por autor/categoría (a partir de tus likes), sin ML, scoring lineal explicable (mismo criterio que `decilo/intent.ts`). Cada impresión se loguea en `recommendations` (tabla que ya estaba en el schema, sin usar). `POST /feed/for-you/:postId/dismiss` es el feedback explícito "no me interesa" del doc de arquitectura (P2) — excluye ese post para siempre.
- ✅ **Analytics**: `GET /analytics/creator` (propio: posts, likes, comments, impresiones — reutiliza el log de `recommendations`, no hay tabla de tracking nueva) y `GET /businesses/:id/analytics` (dueño: órdenes, revenue, comisión pagada, payouts pendientes/liquidados, top productos — todo sobre datos reales de Fase 6, no estimados).
- ✅ **Publicidad**: tabla `promotions` nueva — `POST /businesses/:id/promotions` (negocio o producto propio, mismo circuito de pago mockeado que `orders`), `GET /businesses/:id/promotions`, resolución vía `POST /payments/mock-checkout-promotion/:id/resolve`. `GET /businesses` y `GET /products` rankean lo promocionado activo primero, siempre con `isPromoted:true` explícito (nunca mezclado de forma indistinguible de lo orgánico).
- ✅ **Infra/perf**: índices que faltaban en `orders`/`order_items`/`payments`/`payouts`/`recommendations` (Fase 6/7 los había dejado sin cubrir), rate limit propio para `/auth/login` y `/auth/register` (10/min vs. 100/min global — mitiga fuerza bruta), `npm run settle:payouts` (script standalone, mismo patrón que `cleanup:mira-esto`) liquida los payouts cuyo `scheduledAt` ya pasó.
- ⏳ Todo lo de arriba corre a escala de MVP (scoring en memoria sobre hasta 150 candidatos, sin cache de resultados, sin cola de jobs real) — pensado para no quedar mal diseñado cuando haya que crecerlo, no para carga de producción todavía.

**Web — loop social core (nuevo):**

- ✅ **`/home`**: feed con tabs (Para vos / Siguiendo / Cerca / Tendencias / Mi gente), cada post muestra `reasonWhySeeing`, like/comentar/guardar/compartir, feedback "no me interesa" (✕ en el badge) que llama `POST /feed/for-you/:id/dismiss`. Cerca pide geolocalización del navegador y degrada con un mensaje si se la niegan.
- ✅ **`/create`**: publicar un post real contra `POST /posts` — sin servicio de subida de archivos todavía, así que la foto/video se pega por URL (no hay drag-and-drop de un archivo local). Tag de lugar con autocompletado (`GET /locations?q=`), selector de visibilidad.
- ✅ **`/u/:id`**: perfil ajeno v1 — identidad a la izquierda, stats como texto plano, lista vertical de posts en vez de grid. Superado por el rediseño v2 (ver sección siguiente).
- ✅ **`/p/:id`**: post expandido con comentarios (leer + publicar).
- ✅ Mockups de las 4 pantallas hechos primero con la skill `design` antes de programar, matcheando los tokens de `packages/ui/src/tokens.css` 1:1.
- ✅ `Avatar` nuevo en `packages/ui` (color determinístico por usuario + iniciales si no hay foto).
- ⏳ Sin subida real de archivos (falta un servicio de storage/CDN), sin pantalla de notificaciones (la campanita es decorativa todavía), sin Fases 3/4/5/6/7 en el web (Descubrir, Mundo social, Kör Play, Marketplace, Kör AI siguen siendo API-only).

**Perfil ajeno v2 + Kör Pets (nuevo, paquete "Perfil + Pets" aportado por el usuario):**

Auditado contra la arquitectura real antes de tocar código — dos decisiones del paquete original se adaptaron en vez de copiarse literal, documentadas abajo.

- ✅ **Perfil ajeno v2**: reescrito para no usar ningún patrón de Instagram (ni el que ya habíamos sacado en v1). CTAs principales son **"Sumar a Mi gente"** (`POST /friendships/:userId/request`, dominio de amistad real) y **"Sumar a tu órbita"** (el follow existente, solo renombrado en la UI) — nunca "Seguir"/"Mensaje". Secciones: identidad, "gente en común" (`GET /users/:id/mutual`, nuevo — intersección de follows), estado de actividad, mascota, "lo que más vibra en su mundo" (lugares más frecuentes en sus posts, derivado, no inventado), "momento destacado" (su post con más likes) y "últimos momentos" (el resto, reusando `PostCard`).
- ⚠️ **Adaptación 1 — "Sus Orbes" no se implementó tal cual la pedía el paquete.** Los Orbes (`domains/orbs`) se computan desde la red social del *viewer*, no del dueño del perfil — mostrárselos a cualquier visitante infiere amigos/lugares/eventos privados, exactamente lo que la propia spec de perfil prohíbe ("no inferir relaciones ni actividad privada"). Se reemplazó por `GET /users/:id/activity-state` (nuevo): un estado único calculado solo de la actividad pública propia de esa persona (sus posts/Mirá esto/comments), sin tocar la red social de nadie.
- ⚠️ **Adaptación 2 — sin "Nivel" de usuario ni "gente en común" con avatares.** "Nivel"/"Explorador" del mockup original no existe en el schema (nivel es de `pets`, no de `users`) — no se inventó. "Gente en común" quedó en conteo simple, no una lista con avatares (se puede sumar después si hace falta).
- ✅ **Kör Pets — fundacional** (catálogo + motor, sin animaciones todavía, alcance elegido explícitamente): tabla nueva `pet_definitions` con las 25 mascotas curadas del paquete (5 perros/gatos/dragones/conejos/aves, sembradas en `post-migrate.sql`, idempotente). `pets.definitionId` nueva (nullable — no rompe los pets libres de Kör Play/Fase 5, que siguen existiendo tal cual). `GET /pet-definitions`, `POST /pets/adopt`, `GET /users/:id/pet` (público). En el web: `apps/web/lib/pets/engine.ts` implementa el motor de cooldowns que pide `CLAUDE_INSTRUCTIONS.md` (global + por interacción + por superficie + exclusión de pantallas críticas + `prefers-reduced-motion`) — listo para que la Fase 2 (animaciones: robar foto, ensuciar el feed, incendiar pantalla, etc.) lo consuma sin rediseñarlo. Picker de adopción en `/me`, `PetSummary` reusado en perfil propio y ajeno.
- ⏳ Deliberadamente afuera de esta pasada (Fase 2 del feature, tamaño propio): las 8 interacciones animadas (`PetInteractionLayer`, requiere agregar la dependencia `motion`), el layer global montado en el shell de la app, configuración de sonido/frecuencia/silenciar mascotas, integración con Créditos Kör para cosméticos.

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
