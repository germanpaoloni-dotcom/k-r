import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import { config } from "./config.js";
import authenticate from "./plugins/authenticate.js";
import { authRoutes } from "./domains/auth/routes.js";
import { usersRoutes } from "./domains/users/routes.js";
import { socialRoutes } from "./domains/social/routes.js";
import { followRoutes } from "./domains/follows/routes.js";
import { feedRoutes } from "./domains/feed/routes.js";
import { locationsRoutes } from "./domains/locations/routes.js";
import { friendshipsRoutes } from "./domains/friendships/routes.js";
import { blocksRoutes } from "./domains/blocks/routes.js";
import { miraEstoRoutes } from "./domains/mira-esto/routes.js";
import { orbsRoutes } from "./domains/orbs/routes.js";
import { sharesRoutes } from "./domains/shares/routes.js";
import { messagingRoutes } from "./domains/messaging/routes.js";
import { notificationsRoutes } from "./domains/notifications/routes.js";
import { moderationRoutes } from "./domains/moderation/routes.js";
import { deciloRoutes } from "./domains/decilo/routes.js";
import { estudioRoutes } from "./domains/estudio/routes.js";
import { mapRoutes } from "./domains/map/routes.js";
import { searchRoutes } from "./domains/search/routes.js";
import { groupsRoutes } from "./domains/groups/routes.js";
import { eventsRoutes } from "./domains/events/routes.js";
import { playRoutes } from "./domains/play/routes.js";
import { marketplaceRoutes } from "./domains/marketplace/routes.js";
import { aiRoutes } from "./domains/ai/routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === "development" ? "info" : "warn",
      transport: config.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
    },
  });

  await app.register(sensible);
  await app.register(cors, { origin: config.WEB_ORIGIN, credentials: true });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await app.register(jwt, { secret: config.JWT_ACCESS_SECRET });
  await app.register(authenticate);

  app.get("/health", async () => ({ status: "ok", service: "@kor/api" }));

  await app.register(authRoutes, { prefix: "/api/v1" });
  await app.register(usersRoutes, { prefix: "/api/v1" });
  await app.register(socialRoutes, { prefix: "/api/v1" });
  await app.register(followRoutes, { prefix: "/api/v1" });
  await app.register(feedRoutes, { prefix: "/api/v1" });
  await app.register(locationsRoutes, { prefix: "/api/v1" });
  await app.register(friendshipsRoutes, { prefix: "/api/v1" });
  await app.register(blocksRoutes, { prefix: "/api/v1" });
  await app.register(miraEstoRoutes, { prefix: "/api/v1" });
  await app.register(orbsRoutes, { prefix: "/api/v1" });
  await app.register(sharesRoutes, { prefix: "/api/v1" });
  await app.register(messagingRoutes, { prefix: "/api/v1" });
  await app.register(notificationsRoutes, { prefix: "/api/v1" });
  await app.register(moderationRoutes, { prefix: "/api/v1" });
  await app.register(deciloRoutes, { prefix: "/api/v1" });
  await app.register(estudioRoutes, { prefix: "/api/v1" });
  await app.register(mapRoutes, { prefix: "/api/v1" });
  await app.register(searchRoutes, { prefix: "/api/v1" });
  await app.register(groupsRoutes, { prefix: "/api/v1" });
  await app.register(eventsRoutes, { prefix: "/api/v1" });
  await app.register(playRoutes, { prefix: "/api/v1" });
  await app.register(marketplaceRoutes, { prefix: "/api/v1" });
  await app.register(aiRoutes, { prefix: "/api/v1" });

  app.setErrorHandler((err: FastifyError, _req, reply) => {
    app.log.error(err);
    const statusCode = err.statusCode ?? 500;
    reply.status(statusCode).send({
      data: null,
      error: { message: statusCode === 500 ? "Error interno del servidor." : err.message },
    });
  });

  return app;
}
