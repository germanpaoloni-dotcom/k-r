import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import { config } from "./config.js";
import authenticate from "./plugins/authenticate.js";
import { authRoutes } from "./domains/auth/routes.js";
import { usersRoutes } from "./domains/users/routes.js";

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

  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err);
    const statusCode = err.statusCode ?? 500;
    reply.status(statusCode).send({
      data: null,
      error: { message: statusCode === 500 ? "Error interno del servidor." : err.message },
    });
  });

  return app;
}
