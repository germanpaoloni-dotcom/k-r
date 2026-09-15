import type { FastifyInstance } from "fastify";
import { registerInputSchema, loginInputSchema } from "@kor/types";
import { register, login, refresh, logout, AuthError } from "./service.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (req, reply) => {
    const parsed = registerInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    try {
      const result = await register(app, parsed.data);
      return reply.status(201).send({ data: result, error: null });
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
      }
      throw err;
    }
  });

  app.post("/auth/login", async (req, reply) => {
    const parsed = loginInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    try {
      const result = await login(app, parsed.data);
      return reply.send({ data: result, error: null });
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
      }
      throw err;
    }
  });

  app.post("/auth/refresh", async (req, reply) => {
    const body = req.body as { refreshToken?: string };
    if (!body?.refreshToken) {
      return reply.status(400).send({ data: null, error: { message: "Falta refreshToken." } });
    }
    try {
      const tokens = await refresh(app, body.refreshToken);
      return reply.send({ data: tokens, error: null });
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
      }
      throw err;
    }
  });

  app.post("/auth/logout", async (req, reply) => {
    const body = req.body as { refreshToken?: string };
    if (body?.refreshToken) await logout(body.refreshToken);
    return reply.status(204).send();
  });
}
