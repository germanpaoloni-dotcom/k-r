# DISCOVER — Fase 0: Arquitectura y Plan de Producto

*Documento de arquitectura, producto y plan de implementación. Nombre de trabajo: DISCOVER (ver sección B para propuestas de naming definitivo).*

---

## A. Visión de producto

DISCOVER no es una red social de consumo pasivo de contenido: es una **capa de descubrimiento local** que conecta a una persona con su ciudad —lugares, negocios, eventos y personas— a través de contenido real y de una inteligencia que entiende intención, no solo interés.

Hoy Instagram y TikTok optimizan "¿qué miro ahora?". DISCOVER optimiza "¿qué hago ahora?, ¿adónde voy?, ¿qué me estoy perdiendo cerca mío?". El contenido (fotos, reels, historias) sigue siendo el lenguaje de la app, pero cada pieza de contenido está anclada a un lugar, un negocio o un evento real, y ese anclaje es lo que la IA usa para responder preguntas de intención ("tengo $30.000 y quiero hacer algo esta noche").

Los tres pilares del producto, en orden de dependencia:

1. **Social** — el motor de contenido, identidad y relaciones que genera la materia prima (fotos, reels, reseñas, historias).
2. **Discovery** — la capa que organiza ese contenido alrededor de entidades geográficas y temporales: lugares, negocios, eventos, productos.
3. **Intelligence** — la capa que interpreta intención en lenguaje natural y devuelve recomendaciones accionables combinando 1 y 2.

Sin (1) no hay contenido que mostrar. Sin (2) el contenido no es descubrible por intención. Sin (3) el usuario tiene que buscar en vez de simplemente preguntar. El producto solo es diferencial cuando los tres pilares están conectados; construir cualquiera de ellos aislado da como resultado, otra vez, una copia de algo que ya existe.

---

## B. Naming — 10 propuestas

Mientras no haya nombre definitivo, el proyecto sigue llamándose **DISCOVER** en todo este documento y en el repositorio (`packages/*` usan el scope `@discover/*`).

| # | Nombre | Racional | Riesgo a validar |
|---|--------|----------|-------------------|
| 1 | **Orbita** | Todo gira alrededor tuyo: lugares, eventos, gente. Corto, se pronuncia igual en varios idiomas, metáfora clara de "tu ciudad orbitando alrededor tuyo". | Verificar marca/dominio en rubro tech-social; existen usos previos en fintech. |
| 2 | **Loka** | Juego entre "local" y "loca/o" (vida, energía). Corto, fácil de decir, funciona como marca global tipo Canva/Figma. | Verificar significados no deseados en otros idiomas. |
| 3 | **Pulso** | "El pulso de tu ciudad": eventos, tendencias, lo que está pasando ahora. Transmite en tiempo real sin decirlo literalmente. | Nombre usado en apps de salud/fintech; chequear categoría. |
| 4 | **Cercalo** | Evoca "cerca" + acción ("hacelo"). Muy claro para LatAm, menos portable a inglés. | Baja portabilidad internacional. |
| 5 | **Andar** | "Andar" = caminar, explorar, moverse por la ciudad. Funciona en español e inglés se lee como palabra propia y corta. | Existen marcas "Andar" en otros rubros (moda, movilidad). |
| 6 | **Nébula** | Sensación premium, espacial, conecta con el lenguaje visual "Liquid Glass" y de profundidad. | Puede sonar más "cósmico" que "local"; menos literal. |
| 7 | **Findy** | Derivado de "find", corto, fácil de pronunciar en cualquier idioma, sufijo -y amigable (estilo Spotify/Getly). | Puede sonar genérico tipo "buscador"; validar percepción. |
| 8 | **Bloom** | Metáfora de florecimiento: la ciudad, los negocios locales, los planes que "florecen". Cálido, internacional, fácil de recordar. | Nombre usado en otras categorías (belleza, fintech, jardinería). |
| 9 | **Kōr** | Núcleo/centro ("core" estilizado). Muy corto, distintivo visualmente, fácil de convertir en isotipo. | Pronunciación ambigua entre idiomas; requiere más trabajo de marca para dar significado. |
| 10 | **Ondas** | Las "ondas" de lo que pasa en tu zona; conecta con difusión social y descubrimiento. | Palabra común, requiere trabajo de diferenciación visual/verbal. |

**Recomendación de trabajo:** *Orbita* o *Bloom* son los candidatos más fuertes por balance entre claridad conceptual, pronunciación internacional y disponibilidad de marca probable. Ninguno se asume final: se mantiene DISCOVER como nombre de proyecto hasta validación de marca/dominio.

> **Actualización posterior:** de esta lista se terminó eligiendo **Kōr**, y más adelante el proyecto se renombró a **Gossip** (nombre actual — ver README). Esta sección queda como registro histórico de la exploración de naming, sin editar.

---

## C. Propuesta de valor

**Problema:** las redes sociales actuales están optimizadas para tiempo de consumo, no para resolver la pregunta real del usuario en el momento en que la tiene: *"¿qué hago ahora, con la gente que tengo, en el lugar donde estoy?"*. Google Maps tiene los lugares pero no el contenido social ni el contexto de "qué está pasando". Instagram tiene el contenido pero no organiza nada por intención ni geografía real. Los eventos viven dispersos en apps de terceros. Los negocios locales no tienen un canal nativo para mostrarse mezclado con contenido real de sus clientes.

**Solución:** una app donde el contenido social está anclado a lugares, negocios y eventos reales, y donde una capa de IA puede responder preguntas de intención combinando ese contenido con datos de ubicación, horario y presupuesto.

**Por qué ahora:** la combinación de (a) modelos de lenguaje capaces de resolver intención en lenguaje natural a bajo costo, (b) infraestructura de mapas y geolocalización madura y barata, y (c) fatiga del usuario con feeds puramente algorítmicos de entretenimiento, abre una ventana real para una categoría nueva.

---

## D. Usuarios objetivo (MVP)

- **Exploradores urbanos (18-35 años):** usuarios que ya usan Instagram/TikTok para buscar ideas de planes pero terminan saliendo de la app para buscar en Google Maps. Son el usuario primario del MVP.
- **Negocios locales independientes** (gastronomía, cafeterías, retail, servicios): necesitan presencia social + visibilidad geográfica sin pagar por tres herramientas distintas (Instagram + Maps + WhatsApp Business).
- **Organizadores de eventos** (venues, productoras chicas, espacios culturales): necesitan difusión con asistentes reales y sin depender de Eventbrite/Facebook Events.
- **Creadores locales:** dan contenido inicial a la plataforma; el producto les da distribución geográfica que Instagram no prioriza.

La ciudad piloto debe ser una sola (recomendado: San Salvador de Jujuy, dado el contexto de otros proyectos del usuario en la zona) para lograr densidad de contenido y negocios antes de expandir — el mayor riesgo de este tipo de producto es lanzar "ancho y vacío".

---

## E. Core features — priorizadas

**P0 (indispensables para que el producto tenga sentido):**
autenticación y perfil; publicar post/reel anclado opcionalmente a un lugar; seguir/like/comentar/guardar; feed Siguiendo + Para vos básico; búsqueda (texto); Discover por categorías; mapa con lugares/negocios/eventos; perfil de negocio; eventos (crear/ver/guardar); mensajería básica.

**P1 (diferencial temprano):**
búsqueda semántica; "¿Qué hago?" (IA de intención simple); favoritos/colecciones; stories; notificaciones inteligentes; reseñas de negocios.

**P2 (escala y monetización):**
marketplace de productos; búsqueda visual por foto; AI summary de conversaciones/comentarios; recomendador con feedback explícito ("no me interesa"); analíticas para negocios/creadores; publicidad contextual; bienestar digital ("Mi actividad").

Cada feature de P1/P2 depende de tener volumen de contenido y negocios reales generado en P0 — de ahí el orden de fases en la sección N.

---

## F. User journeys principales

1. **Descubrir algo para hacer esta noche** — usuario abre la app, va a "¿Qué hago?", escribe intención + presupuesto, recibe 3 opciones con contenido real, distancia y horario, elige una, guarda/comparte, va al lugar con "Cómo llegar".
2. **Publicar contenido en un negocio** — usuario crea un post/reel, la app sugiere el lugar por geolocalización, lo etiqueta, el post queda visible tanto en su perfil como en el perfil del negocio y en el mapa.
3. **Negocio publica un producto/evento** — dueño de negocio entra a su perfil comercial, sube producto o evento, define ubicación/horario/precio, queda visible en Discover, Mapa y búsqueda semántica.
4. **Organizador difunde un evento** — crea evento con fecha/precio/categoría, usuarios marcan "me interesa"/"recordarme", la app manda recordatorio antes del evento.
5. **Usuario nuevo en una ciudad** — abre Discover Map, filtra por categoría, explora contenido real alrededor de cada punto antes de decidir ir.

---

## G. Arquitectura de información

```
DISCOVER
├── Home (Feeds)
│   ├── Para vos
│   ├── Siguiendo (Recomendado | Cronológico | Favoritos)
│   ├── Cerca
│   ├── Eventos
│   └── Tendencias
├── Discover
│   ├── Categorías (Comer, Comprar, Eventos, Música, Deportes, Viajes, Arte, Fitness, Cafeterías, Entretenimiento, Negocios, Emprendimientos, Lugares)
│   ├── Búsqueda inteligente
│   └── ¿Qué hago? (AI Discovery)
├── Map (Discover Map)
│   ├── Filtros por categoría
│   └── Ficha de ubicación → contenido / negocio / evento / personas
├── Create (acción central)
│   ├── Post / Reel / Historia
│   ├── Lugar
│   ├── Evento
│   └── Producto (si es cuenta Negocio)
├── Messages
│   ├── Conversaciones
│   └── AI Summary
├── Notifications
└── Profile
    ├── Personal | Creador | Negocio | Organizador
    ├── Mi Colección (guardados)
    ├── Mi Actividad (bienestar digital)
    └── Privacidad y configuración
```

---

## H. UX Flow — pantallas clave

- **Onboarding:** email/password → intereses (chips, opcional) → permiso de ubicación (opt-in explícito, nunca asumido) → tres sugerencias iniciales para seguir (negocios/creadores locales) para evitar el "feed vacío" del día 1.
- **Home:** tabs superiores tipo pill flotante en vidrio esmerilado; feed vertical de cards con media a pantalla completa; acciones (like/comentar/guardar/compartir) en columna lateral derecha; badge "¿Por qué veo esto?" accesible con un tap sobre cada post.
- **Discover:** grilla visual por categoría (no lista), cada categoría con carrusel horizontal de contenido real; barra de búsqueda persistente arriba que da paso a búsqueda semántica.
- **¿Qué hago?:** input conversacional tipo chat; la respuesta se renderiza como 2-3 tarjetas de recomendación con distancia, precio aproximado, horario, rating y CTA directo (Ver, Cómo llegar, Guardar).
- **Mapa:** mapa a pantalla completa con pines por categoría (íconos diferenciados por color/forma); al tocar un pin se abre un bottom sheet en vidrio con resumen del lugar y contenido asociado (scroll horizontal de posts/reels de ese lugar).
- **Perfil de negocio:** header con foto de portada, info de contacto/horarios/WhatsApp, tabs internas (Publicaciones, Productos, Eventos, Reseñas, Sobre el negocio).
- **Evento:** portada, fecha/hora/ubicación, botones de acción (Me interesa, Recordarme, Cómo llegar, Compartir, Comprar si aplica), sección de contenido generado por asistentes.
- **Create:** botón central que expande un sheet con seis accesos directos (Post, Reel, Lugar, Evento, Producto, Historia); cada flujo debe completarse en 3 pasos o menos.
- **Mensajería:** lista de conversaciones, chat con soporte para compartir posts/lugares/productos/eventos como tarjetas embebidas; botón "Resumir" visible en conversaciones largas.

---

## I. Design System — Liquid Glass

**Principio rector:** el vidrio se usa para **jerarquía y profundidad**, nunca como decoración de base. Superficies flotantes (barras de navegación, bottom sheets, tarjetas de acción rápida, modales) usan vidrio; el contenido de fondo (feed, grillas, texto largo) usa superficies sólidas y opacas para garantizar legibilidad y contraste.

**Paleta (tokens, valores de partida):**
- `--bg` `#0B0E14` (dark) / `#F7F7FA` (light) — fondo base, nunca vidrio.
- `--surface` `#12151C` / `#FFFFFF` — tarjetas sólidas.
- `--glass` `rgba(255,255,255,0.08)` con `backdrop-filter: blur(24px) saturate(160%)` y borde `rgba(255,255,255,0.14)` — superficies flotantes.
- `--accent` `#5B8CFF` (azul eléctrico contenido) — CTAs primarios, estados activos.
- `--accent-2` `#FF7A59` — acentos cálidos puntuales (eventos, urgencia, "en vivo").
- `--text` `#F2F3F7` / `#14161B`, `--text-muted` a 60% de opacidad sobre `--text`.

**Tipografía:** una display/geométrica para títulos y navegación (ej. familia tipo Inter Display o Söhne — decisión final en Fase 0.5 junto con branding), y una para texto largo con mejor legibilidad en párrafos (ej. Inter). Escala tipográfica de 8 pasos, base 15px móvil.

**Componentes base:** botones con radios de 14-20px según tamaño; bottom sheets con vidrio + sombra difusa (nunca sombra dura); chips de categoría con borde translúcido; barra de tabs flotante con indicador animado; inputs sólidos (no vidrio, por legibilidad y accesibilidad de formularios).

**Motion:** transiciones basadas en spring (no easing lineal), 200-320ms para microinteracciones, hasta 400ms para transiciones de pantalla completa; respetar `prefers-reduced-motion` en todas las plataformas.

Este sistema se documenta como paquete compartido (`@discover/ui`) consumido tanto por mobile (React Native) como por web (Next.js), para evitar que diverjan con el tiempo.

---

## J. Arquitectura técnica

**Decisión marco:** monolito modular, no microservicios, para el MVP. Con el volumen esperado (hasta ~100k usuarios) un monolito bien modularizado en dominios (auth, social, discovery, business, events, messaging, ai) es más rápido de construir, más barato de operar y más fácil de razonar para un equipo chico. La separación en servicios independientes se evalúa recién cuando un dominio específico (ej. búsqueda, IA, o media processing) necesite escalar o desplegarse de forma independiente del resto.

| Capa | Elección | Por qué |
|---|---|---|
| **Frontend web** | Next.js 15 + React + TypeScript | SSR/SEO para páginas públicas de negocios/eventos (indexables en Google), y consistencia de lenguaje con mobile. |
| **Mobile** | React Native + Expo | Un solo código para iOS/Android; comparte lógica de negocio y design tokens con web vía paquetes compartidos. |
| **Backend** | Node.js + TypeScript, Fastify + tRPC/REST modular | Mismo lenguaje en todo el stack (menor costo de contexto para un equipo chico); Fastify por performance; tRPC para comunicación tipada mobile/web ↔ API interna, REST versionado para integraciones externas. |
| **Base de datos** | PostgreSQL + PostGIS | Relacional robusto, y PostGIS da consultas geoespaciales nativas ("negocios a 2km") sin sumar otro motor. |
| **Cache** | Redis | Sesiones, rate limiting, cache de feed/recomendaciones, pub/sub para realtime. |
| **Storage** | S3-compatible (ej. Cloudflare R2 o AWS S3) | Media (fotos/videos), con CDN delante para entrega. |
| **Búsqueda** | Postgres full-text + `pg_trgm` inicialmente; **pgvector** para embeddings de búsqueda semántica | Evita sumar un motor de búsqueda separado en el MVP; camino de migración a OpenSearch/Meilisearch documentado si el volumen lo exige. |
| **Mapas** | Mapbox | Mejor control de estilo visual (clave para Liquid Glass) y costo más predecible a escala que Google Maps; alternativa evaluable si el negocio requiere datos específicos de Google (reviews, Street View). |
| **Realtime** | WebSockets (ws) + Redis pub/sub | Mensajería y notificaciones en vivo sin depender de un proveedor externo. |
| **Colas / jobs** | BullMQ sobre Redis | Procesamiento de media, envío de notificaciones, generación de embeddings, moderación asíncrona. |
| **IA** | Capa propia `@discover/ai-gateway`, agnóstica de proveedor | Permite usar Claude/otros LLMs para "¿Qué hago?", búsqueda semántica y moderación sin acoplar el producto a un proveedor; embeddings almacenados en pgvector. |
| **Auth** | JWT + refresh tokens, email/password en MVP, OAuth (Google/Apple) en Fase siguiente | Simplicidad inicial, camino claro de expansión. |
| **Notificaciones push** | FCM (Android) + APNs (iOS) vía capa unificada | Estándar de la industria, evita reinventar infraestructura de push. |
| **Moderación** | Reglas + clasificador de contenido vía IA + cola de revisión humana | Necesario desde el día 1 por tratarse de una red social con ubicación y menores potencialmente presentes. |
| **Analytics** | Tabla de eventos propia + export a warehouse (o PostHog self-hosted) | Empezar simple; no depender de un proveedor caro antes de tener volumen. |

**Multimedia:** subida directa a storage vía URL firmada, transcoding de video asíncrono (worker dedicado, cola separada) generando thumbnail + versión comprimida antes de publicar.

**Escalabilidad sin sobrearquitectura:** el monolito se divide internamente por dominios con límites claros (carpetas + tipos compartidos), de forma que si en el futuro "discovery" o "ai" necesitan salir como servicio independiente, la migración es de despliegue, no de reescritura.

---

## K. Base de datos — schema inicial (entidades principales)

Entidades y relaciones clave (PostgreSQL, con PostGIS para campos de ubicación y pgvector para embeddings):

- **User** (id, email, password_hash, username, display_name, avatar_url, bio, account_type[personal|creator|business|organizer], location_geog nullable, privacy_mode[public|private], created_at)
- **Profile** — extensión 1:1 de User según account_type (campos de negocio/organizador viven en `Business`, no acá).
- **Post** (id, user_id, caption, media_ids[], location_id nullable, visibility, created_at) — un post puede o no estar anclado a una `Location`.
- **Media** (id, post_id/story_id, type[image|video], url, thumbnail_url, width, height, duration)
- **Story** (id, user_id, media_id, location_id nullable, expires_at, saved boolean)
- **Comment** (id, post_id, user_id, parent_comment_id nullable, body, created_at)
- **Like** (user_id, target_type[post|comment|product], target_id, created_at) — clave compuesta.
- **Follow** (follower_id, followee_id, is_favorite boolean, created_at) — clave compuesta; `is_favorite` resuelve el feed "Siguiendo → Favoritos".
- **Collection** (id, user_id, name, type[restaurantes|viajes|compras|eventos|ideas|lugares|productos|custom])
- **CollectionItem** (collection_id, target_type, target_id)
- **Conversation** / **ConversationParticipant** / **Message** (id, conversation_id, sender_id, body, attachment_type[post|location|product|event] nullable, attachment_id nullable, created_at)
- **Notification** (id, user_id, type, payload jsonb, read_at, created_at)
- **Business** (id, owner_user_id, name, description, category, location_id, hours jsonb, whatsapp, verified boolean)
- **Product** (id, business_id, name, description, price, stock, images[], category)
- **Event** (id, organizer_id, business_id nullable, title, description, cover_url, location_id, starts_at, ends_at, price, category)
- **EventAttendance** (event_id, user_id, status[interested|going|reminder_set])
- **Venue / Location** (id, name, geog point (PostGIS), address, city, category, source[user|business|event])
- **Review** (id, business_id, user_id, rating, body, created_at)
- **SearchLog** (id, user_id nullable, query, query_embedding vector, results_clicked[], created_at) — insumo del recomendador y de la búsqueda semántica.
- **Recommendation** (id, user_id, target_type, target_id, reason_code, shown_at, dismissed boolean) — sostiene el "¿Por qué veo esto?" y los controles de "no me interesa".
- **Report** / **ModerationAction** (id, target_type, target_id, reporter_id, reason, status, resolved_by, resolved_at)
- **Advertisement** (id, business_id, target_type, budget, starts_at, ends_at, status) — placeholder de Fase 6, no se implementa en MVP.

**Índices críticos desde el día 1:** GiST sobre todos los campos `geog` (consultas "cerca de mí"), índice IVFFlat/HNSW sobre `query_embedding` y sobre embeddings de contenido (búsqueda semántica), índices compuestos `(followee_id, created_at)` para feed Siguiendo, y `(user_id, created_at)` para feed personal.

---

## L. API — endpoints principales (REST versionado, `/api/v1`)

| Dominio | Endpoints clave |
|---|---|
| **Auth** | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/password/reset` |
| **Users** | `GET /users/:id`, `PATCH /users/me`, `POST /users/:id/follow`, `DELETE /users/:id/follow`, `GET /users/:id/followers`, `GET /users/me/collections` |
| **Posts** | `POST /posts`, `GET /posts/:id`, `DELETE /posts/:id`, `POST /posts/:id/like`, `POST /posts/:id/comments`, `POST /posts/:id/save` |
| **Feed** | `GET /feed/for-you`, `GET /feed/following?mode=recommended|chronological|favorites`, `GET /feed/nearby`, `GET /feed/trending` |
| **Discover** | `GET /discover/categories`, `GET /discover/categories/:slug`, `GET /search?q=` (búsqueda semántica combinada) |
| **AI** | `POST /ai/what-should-i-do` (intención → recomendaciones), `POST /ai/search-embed`, `POST /ai/visual-search` (Fase 5) |
| **Map** | `GET /map/pins?bbox=&category=`, `GET /locations/:id` |
| **Events** | `POST /events`, `GET /events/:id`, `POST /events/:id/interested`, `POST /events/:id/remind` |
| **Business** | `POST /businesses`, `GET /businesses/:id`, `PATCH /businesses/:id`, `POST /businesses/:id/products`, `GET /businesses/:id/reviews` |
| **Messaging** | `GET /conversations`, `POST /conversations/:id/messages`, `POST /conversations/:id/summary` |
| **Notifications** | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/preferences` |
| **Moderation** | `POST /reports`, `GET /admin/moderation/queue` (rol admin) |

Cada endpoint devuelve envelope estándar `{ data, meta, error }`, con paginación por cursor en todos los listados, y rate limiting por usuario/IP en Redis desde el día 1.

---

## M. Estructura de repositorio (monorepo)

```
discover/
├── apps/
│   ├── mobile/         # React Native + Expo
│   ├── web/             # Next.js (público: perfiles de negocio/eventos indexables + web app)
│   └── api/              # Fastify + tRPC/REST, dominios internos
│       └── src/domains/{auth,social,discovery,business,events,messaging,ai,moderation}
├── packages/
│   ├── ui/                 # Design System — Liquid Glass (tokens + componentes RN/Web)
│   ├── types/            # Tipos compartidos (entidades, DTOs)
│   ├── config/           # ESLint, TS config, tailwind/tokens compartidos
│   └── ai-gateway/    # Cliente agnóstico de proveedor de IA
├── infra/
│   ├── docker/
│   ├── migrations/    # SQL migrations versionadas
│   └── terraform|pulumi/ (cuando aplique)
└── docs/
    └── architecture.md (este documento, versionado)
```

---

## N. MVP Roadmap — fases

| Fase | Contenido | Duración estimada |
|---|---|---|
| **0 — Fundacional** | Este documento, branding definitivo, design system inicial, schema de DB, setup de repo/CI | 1-2 semanas |
| **1 — Social core** | Auth, perfiles, posts, follow, likes, comments, feed Siguiendo + Para vos básico | 4-6 semanas |
| **2 — Discovery** | Discover por categorías, búsqueda por texto, mapa con lugares/negocios/eventos | 3-4 semanas |
| **3 — Negocios y eventos** | Perfil comercial, productos (catálogo, sin checkout), eventos completos | 3-4 semanas |
| **4 — Mensajería y notificaciones** | Chat básico, notificaciones push inteligentes | 2-3 semanas |
| **5 — Inteligencia** | Búsqueda semántica, "¿Qué hago?", explicabilidad del feed ("¿por qué veo esto?") | 3-4 semanas |
| **6 — Recomendador y monetización** | Motor de recomendación con feedback, analytics, primeras piezas de monetización (promoción de negocios) | continuo |

Estimación total a MVP funcional (fases 0-3, ya demostrable a usuarios reales): **11-16 semanas** con un equipo chico full-stack (2-3 personas). Fases 4-6 se pueden solapar parcialmente una vez que el core social+discovery esté estable.

---

## O. Riesgos

**Producto:**
- *Arranque en frío:* sin masa crítica de contenido y negocios, el mapa y el feed se sienten vacíos. Mitigación: lanzar en una sola ciudad, con onboarding activo de negocios/creadores locales antes del lanzamiento público (contenido "sembrado").
- *Confusión de propuesta:* si el usuario no entiende en los primeros 30 segundos que esto no es "otro Instagram", se pierde. Mitigación: onboarding y home deben comunicar intención ("¿qué hacés hoy?"), no solo mostrar un feed.
- *Dependencia de negocios para contenido de calidad:* muchos negocios locales no tienen capacidad de generar contenido bueno. Mitigación: herramientas de creación simples + posibilidad de que usuarios generen contenido "sobre" el negocio sin que el negocio lo suba.

**Técnicos:**
- *Costo de servir mapas + media a escala:* Mapbox y storage de video pueden crecer rápido en costo. Mitigación: cache agresivo de tiles/pines, compresión de video obligatoria, CDN.
- *Complejidad del recomendador:* un mal "Para vos" mata la retención. Mitigación: arrancar con reglas simples + señales explícitas (favoritos, categorías) antes de invertir en ML pesado.
- *Moderación de contenido con ubicación real:* mayor superficie de riesgo (menores, ubicación de negocios reales, contenido sensible). Mitigación: moderación desde Fase 1, no como feature tardía.
- *IA de intención devolviendo resultados pobres por falta de datos:* si no hay suficientes negocios/eventos cargados, "¿Qué hago?" da respuestas vacías o genéricas. Mitigación: fallback a contenido curado manualmente en la ciudad piloto mientras crece el volumen.

---

## P. Complejidad estimada

| Módulo | Complejidad |
|---|---|
| Auth + perfiles | 🟢 LOW |
| Posts/feed/social graph | 🟡 MEDIUM |
| Mapa + geolocalización (PostGIS/Mapbox) | 🟡 MEDIUM |
| Discover + categorías | 🟢 LOW |
| Negocios + productos (catálogo) | 🟡 MEDIUM |
| Eventos | 🟢 LOW |
| Mensajería + realtime | 🟡 MEDIUM |
| Búsqueda semántica + embeddings | 🔴 HIGH |
| "¿Qué hago?" (IA de intención) | 🔴 HIGH |
| Motor de recomendación (Para vos) | 🔴 HIGH |
| Marketplace con checkout/pagos | 🔴 HIGH (fuera del MVP) |
| Moderación con IA | 🟡 MEDIUM |

---

## Q. Decisiones pendientes antes de empezar a programar

1. **Ciudad piloto** — confirmar si es San Salvador de Jujuy u otra, define densidad de datos necesaria para el lanzamiento.
2. **Nombre de marca definitivo** — de la lista de la sección B, o una ronda adicional de naming con research de disponibilidad de dominio/marca.
3. **Mapbox vs Google Maps** — confirmar si hay razones de negocio (ej. necesidad de reseñas de Google, Street View) que inclinen la balanza hacia Google Maps pese al mayor costo.
4. **Proveedor de IA por defecto** — Claude u otro, para dimensionar costo por consulta de "¿Qué hago?" y búsqueda semántica.
5. **Alcance real del marketplace en MVP** — confirmar que en V1 no hay checkout/pagos (solo catálogo + "consultar"), como propone el documento fuente.
6. **Modelo de cuentas de negocio** — gratis desde el día 1 o con algún nivel pago desde el lanzamiento (afecta el diseño de onboarding de negocios).

Una vez resueltas estas seis decisiones, la Fase 0 queda cerrada y se puede empezar la implementación de Fase 1 (Social core) sin bloqueos.
