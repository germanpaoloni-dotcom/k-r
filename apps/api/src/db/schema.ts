import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  doublePrecision,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ---------------------------------------------------------------------- */
/* Enums                                                                    */
/* ---------------------------------------------------------------------- */

export const accountTypeEnum = pgEnum("account_type", [
  "personal",
  "creator",
  "business",
  "organizer",
]);
export const privacyModeEnum = pgEnum("privacy_mode", ["public", "private"]);
export const postVisibilityEnum = pgEnum("post_visibility", [
  "public",
  "followers",
  "private",
]);
export const eventAttendanceStatusEnum = pgEnum("event_attendance_status", [
  "interested",
  "going",
  "reminder_set",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "fulfilled",
  "cancelled",
  "refunded",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "approved",
  "rejected",
  "refunded",
]);
export const payoutStatusEnum = pgEnum("payout_status", [
  "pending",
  "processing",
  "paid",
  "failed",
]);

// --- Nuevos enums v2.1 --------------------------------------------------

export const friendshipStatusEnum = pgEnum("friendship_status", [
  "pending",
  "accepted",
  "declined",
]);
export const miraEstoContentTypeEnum = pgEnum("mira_esto_content_type", [
  "media",
  "text",
  "mixed",
]);
export const postKindEnum = pgEnum("post_kind", ["photo", "video", "creation"]);
export const conversationTypeEnum = pgEnum("conversation_type", ["direct", "group"]);
export const shareScopeEnum = pgEnum("share_scope", ["dm", "public"]);
export const moderationStatusEnum = pgEnum("moderation_status", [
  "clean",
  "flagged",
  "under_review",
  "removed",
]);

/* ---------------------------------------------------------------------- */
/* Identidad                                                                */
/* ---------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    username: varchar("username", { length: 24 }).notNull().unique(),
    displayName: varchar("display_name", { length: 60 }).notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    accountType: accountTypeEnum("account_type").notNull().default("personal"),
    privacyMode: privacyModeEnum("privacy_mode").notNull().default("public"),
    locationLat: doublePrecision("location_lat"),
    locationLng: doublePrecision("location_lng"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: index("users_email_idx").on(t.email),
  })
);

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------------------------------------------------------- */
/* Ubicación (PostGIS: columna geog agregada vía migración SQL raw, ver     */
/* infra/migrations — Drizzle no tipa geography nativamente)                */
/* ---------------------------------------------------------------------- */

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 160 }).notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  address: text("address"),
  city: varchar("city", { length: 120 }).notNull(),
  category: varchar("category", { length: 60 }),
  source: varchar("source", { length: 20 }).notNull().default("user"), // user | business | event
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------------------------------------------------------- */
/* Social                                                                   */
/* ---------------------------------------------------------------------- */

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    caption: text("caption"),
    locationId: uuid("location_id").references(() => locations.id),
    visibility: postVisibilityEnum("visibility").notNull().default("public"),
    // v2.1: video y creación son variantes de posts (mismo ciclo de vida),
    // no entidades nuevas. `medium` solo aplica a kind="creation" (Estudio,
    // Fase 2) — ej. "dibujo" | "collage". Ver kor-arquitectura-v2.md §5.
    kind: postKindEnum("kind").notNull().default("photo"),
    medium: varchar("medium", { length: 30 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("posts_user_created_idx").on(t.userId, t.createdAt),
  })
);

export const media = pgTable("media", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 10 }).notNull(), // image | video
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  width: integer("width"),
  height: integer("height"),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stories = pgTable("stories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  mediaId: uuid("media_id")
    .notNull()
    .references(() => media.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").references(() => locations.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  saved: boolean("saved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentCommentId: uuid("parent_comment_id"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const likes = pgTable(
  "likes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 20 }).notNull(), // post | comment | product
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.targetType, t.targetId] }),
  })
);

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followeeId: uuid("followee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isFavorite: boolean("is_favorite").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.followerId, t.followeeId] }),
    followeeCreatedIdx: index("follows_followee_created_idx").on(t.followeeId, t.createdAt),
  })
);

/**
 * Grafo social mutuo ("Mi gente"), distinto de `follows` (asimétrico).
 * "Mi gente" = friendships aceptadas + follows favoritos (ver feed/service.ts).
 */
export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: friendshipStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => ({
    pairUnique: uniqueIndex("friendships_pair_idx").on(t.requesterId, t.addresseeId),
    addresseeIdx: index("friendships_addressee_idx").on(t.addresseeId, t.status),
  })
);

/** Bloqueo unidireccional. Se enforce en follow/mensajería y se usa para filtrar feeds. */
export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.blockerId, t.blockedId] }),
  })
);

/**
 * Mirá esto — contenido efímero (24h), promovible a post permanente.
 * Tabla propia porque su ciclo de vida es distinto al de `posts`.
 * `contentType` decide qué campos aplican: media (solo mediaId), texto (solo
 * text), mixed (ambos). Los Orbes leen esta tabla como una de sus fuentes de
 * señal, pero Mirá esto y Orbes son conceptos separados — ver ORBES.md /
 * kor-arquitectura-v2.1.md.
 */
export const miraEsto = pgTable(
  "mira_esto",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentType: miraEstoContentTypeEnum("content_type").notNull().default("media"),
    text: text("text"),
    mediaId: uuid("media_id").references(() => media.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => locations.id),
    intentEmoji: varchar("intent_emoji", { length: 8 }),
    promotedToPostId: uuid("promoted_to_post_id").references(() => posts.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("mira_esto_user_created_idx").on(t.userId, t.createdAt),
    expiresIdx: index("mira_esto_expires_idx").on(t.expiresAt),
  })
);

/**
 * Compartir — siempre por referencia, nunca duplica contenido.
 * DM: reutiliza `messages` (attachmentType='post'|'mira_esto', ver domains/messaging).
 * Público: esta tabla. `targetType` es polimórfico como en likes/comments.
 */
export const shares = pgTable("shares", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetType: varchar("target_type", { length: 20 }).notNull(), // post | mira_esto | event | product
  targetId: uuid("target_id").notNull(),
  scope: shareScopeEnum("scope").notNull().default("public"),
  caption: text("caption"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 80 }).notNull(),
  type: varchar("type", { length: 30 }).notNull().default("custom"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const collectionItems = pgTable(
  "collection_items",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 20 }).notNull(),
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.collectionId, t.targetType, t.targetId] }),
  })
);

/* ---------------------------------------------------------------------- */
/* Mensajería                                                                */
/* ---------------------------------------------------------------------- */

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: conversationTypeEnum("type").notNull().default("direct"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Estado de lectura vía marca de tiempo (no recibos por mensaje) — ver
    // kor-arquitectura-v2.1.md §"Mensajería".
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.conversationId, t.userId] }),
  })
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body"),
    attachmentType: varchar("attachment_type", { length: 20 }), // post | mira_esto | location | product | event
    attachmentId: uuid("attachment_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    conversationCreatedIdx: index("messages_conversation_created_idx").on(
      t.conversationId,
      t.createdAt
    ),
  })
);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 40 }).notNull(),
  payload: jsonb("payload").notNull().default({}),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Preferencias de notificación por usuario y tipo — agrupación real es en tiempo de lectura. */
export const notificationPreferences = pgTable("notification_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  likes: boolean("likes").notNull().default(true),
  comments: boolean("comments").notNull().default(true),
  follows: boolean("follows").notNull().default(true),
  friendRequests: boolean("friend_requests").notNull().default(true),
  messages: boolean("messages").notNull().default(true),
  miraEsto: boolean("mira_esto").notNull().default(true),
  digest: boolean("digest").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------------------------------------------------------- */
/* Negocios, productos y eventos                                            */
/* ---------------------------------------------------------------------- */

export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 60 }).notNull(),
  locationId: uuid("location_id").references(() => locations.id),
  hours: jsonb("hours").default({}),
  whatsapp: varchar("whatsapp", { length: 30 }),
  verified: boolean("verified").notNull().default(false),
  // Datos de cobro (Mercado Pago Marketplace) — se completan en el onboarding de venta.
  mpSellerId: varchar("mp_seller_id", { length: 60 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 140 }).notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("ARS"),
  stock: integer("stock").notNull().default(0),
  images: jsonb("images").notNull().default([]),
  category: varchar("category", { length: 60 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizerId: uuid("organizer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").references(() => businesses.id),
  title: varchar("title", { length: 140 }).notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  priceCents: integer("price_cents"),
  category: varchar("category", { length: 60 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventAttendance = pgTable(
  "event_attendance",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: eventAttendanceStatusEnum("status").notNull().default("interested"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.eventId, t.userId] }),
  })
);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  body: text("body"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------------------------------------------------------- */
/* Marketplace — checkout + comisión por venta desde V1                     */
/* Mercado Pago Marketplace (split payments) vía checkout hosteado:         */
/* Kōr nunca toca datos de tarjeta directamente (evita alcance PCI).        */
/* ---------------------------------------------------------------------- */

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerUserId: uuid("buyer_user_id")
    .notNull()
    .references(() => users.id),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  status: orderStatusEnum("status").notNull().default("pending_payment"),
  subtotalCents: integer("subtotal_cents").notNull(),
  platformFeeCents: integer("platform_fee_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("ARS"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 20 }).notNull().default("mercadopago"),
  providerPaymentId: varchar("provider_payment_id", { length: 80 }),
  status: paymentStatusEnum("status").notNull().default("pending"),
  amountCents: integer("amount_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  status: payoutStatusEnum("status").notNull().default("pending"),
  amountCents: integer("amount_cents").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

/* ---------------------------------------------------------------------- */
/* Búsqueda, recomendación, moderación                                      */
/* (columnas vector se agregan vía migración SQL raw — ver infra/migrations)*/
/* ---------------------------------------------------------------------- */

export const searchLogs = pgTable("search_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id),
  query: text("query").notNull(),
  resultsClicked: jsonb("results_clicked").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recommendations = pgTable("recommendations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetType: varchar("target_type", { length: 20 }).notNull(),
  targetId: uuid("target_id").notNull(),
  reasonCode: varchar("reason_code", { length: 40 }).notNull(),
  shownAt: timestamp("shown_at", { withTimezone: true }).notNull().defaultNow(),
  dismissed: boolean("dismissed").notNull().default(false),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  targetType: varchar("target_type", { length: 20 }).notNull(),
  targetId: uuid("target_id").notNull(),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Moderación centralizada — regla dura (kor-arquitectura-v2.1.md §"Moderación"):
 * ningún dominio de contenido nuevo puede saltear esta tabla. Un `report` sobre
 * un target crea o actualiza su fila acá; el estado agregado por target vive
 * acá, no desperdigado por dominio.
 */
export const contentModeration = pgTable(
  "content_moderation",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    targetType: varchar("target_type", { length: 20 }).notNull(),
    targetId: uuid("target_id").notNull(),
    status: moderationStatusEnum("status").notNull().default("clean"),
    reportsCount: integer("reports_count").notNull().default(0),
    lastReportedAt: timestamp("last_reported_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    targetUnique: uniqueIndex("content_moderation_target_idx").on(t.targetType, t.targetId),
    statusIdx: index("content_moderation_status_idx").on(t.status),
  })
);

/* ---------------------------------------------------------------------- */
/* Fase 2 — Crear + expresarse (kor-arquitectura-v2.1.md §25, Fase 2)       */
/* ---------------------------------------------------------------------- */

/**
 * Decilo — texto corto con hilos. Entidad propia (no una variante de posts)
 * porque su ciclo de vida es distinto: siempre permanente, siempre texto,
 * organizado en hilos por `replyToId`. Igual que `comments.parentCommentId`
 * en el resto del schema, `replyToId` no lleva `.references()` — se resuelve
 * en la capa de aplicación, no con una FK auto-referencial.
 */
export const decilo = pgTable(
  "decilo",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    replyToId: uuid("reply_to_id"),
    // Heurística explicable (no IA real — ver domains/decilo/intent.ts), igual
    // espíritu que el resto de los placeholders documentados del proyecto.
    detectedIntent: varchar("detected_intent", { length: 30 }),
    visibility: postVisibilityEnum("visibility").notNull().default("public"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("decilo_user_created_idx").on(t.userId, t.createdAt),
    replyToIdx: index("decilo_reply_to_idx").on(t.replyToId),
  })
);

/**
 * Kör Play — groundwork únicamente (Fase 2: "tablas + dominio vacío, sin UI
 * todavía"). El dominio funcional (src/domains/play con lógica real) es
 * Fase 5, cuando `groups` ya exista. Ver domains/play/README.md.
 */
export const games = pgTable("games", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  rules: jsonb("rules").notNull().default({}),
  durationSeconds: integer("duration_seconds"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gameSessions = pgTable("game_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id),
  // Polimórfico como likes/comments: dm (conversationId) | group (a futuro,
  // sin FK porque `groups` todavía no existe) | event (eventId).
  contextType: varchar("context_type", { length: 20 }).notNull(),
  contextId: uuid("context_id"),
  status: varchar("status", { length: 20 }).notNull().default("waiting"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gameAnswers = pgTable("game_answers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => gameSessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  answer: jsonb("answer").notNull().default({}),
  isCorrect: boolean("is_correct"),
  creditsAwarded: integer("credits_awarded").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Ledger append-only — nunca una columna de balance mutable. El balance se
 * calcula sumando `delta` (positivo = se gana, negativo = se gasta en
 * cosméticos). No existe ni existirá una operación de retiro: es una
 * restricción de diseño, no una política — ver kor-arquitectura-v2.1.md §13.
 */
export const korCredits = pgTable("kor_credits", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  delta: integer("delta").notNull(),
  reason: varchar("reason", { length: 40 }).notNull(),
  refType: varchar("ref_type", { length: 20 }),
  refId: uuid("ref_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orbCosmetics = pgTable("orb_cosmetics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  description: text("description"),
  creditsCost: integer("credits_cost").notNull(),
  previewUrl: text("preview_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const badges = pgTable("badges", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  description: text("description"),
  iconUrl: text("icon_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pets = pgTable("pets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerType: varchar("owner_type", { length: 10 }).notNull(), // user | group (grupo a futuro)
  ownerId: uuid("owner_id").notNull(),
  species: varchar("species", { length: 40 }).notNull(),
  name: varchar("name", { length: 40 }).notNull(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Polimórfico: item_type 'cosmetic' -> orb_cosmetics.id, 'badge' -> badges.id. */
export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemType: varchar("item_type", { length: 20 }).notNull(),
    itemId: uuid("item_id").notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userItemUnique: uniqueIndex("inventory_user_item_idx").on(t.userId, t.itemType, t.itemId),
  })
);
