import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createMiraEsto,
  listMiraEstoFeed,
  getMiraEstoById,
  deleteMiraEsto,
  promoteMiraEsto,
  react,
  unreact,
  MiraEstoError,
} from "./service.js";
import { followeeIds } from "../follows/service.js";

const createSchema = z.object({
  contentType: z.enum(["media", "text", "mixed"]),
  text: z.string().max(500).optional(),
  media: z
    .object({
      type: z.enum(["image", "video"]),
      url: z.string().url(),
      thumbnailUrl: z.string().url().optional(),
    })
    .optional(),
  locationId: z.string().uuid().optional(),
  intentEmoji: z.string().max(8).optional(),
  ttlHours: z.number().min(1).max(72).optional(),
});

function handle(err: unknown, reply: any) {
  if (err instanceof MiraEstoError) {
    return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
  }
  throw err;
}

export async function miraEstoRoutes(app: FastifyInstance) {
  app.post("/mira-esto", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    try {
      const dto = await createMiraEsto(sub, parsed.data);
      return reply.status(201).send({ data: dto, error: null });
    } catch (err) {
      return handle(err, reply);
    }
  });

  app.get("/mira-esto", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const following = await followeeIds(sub);
    const items = await listMiraEstoFeed(sub, following);
    return reply.send({ data: items, error: null });
  });

  app.get("/mira-esto/:id", { preHandler: app.optionalAuthenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const viewer = req.user as { sub: string } | undefined;
    const dto = await getMiraEstoById(id, viewer?.sub);
    if (!dto) return reply.status(404).send({ data: null, error: { message: "No encontrado." } });
    return reply.send({ data: dto, error: null });
  });

  app.delete("/mira-esto/:id", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      await deleteMiraEsto(id, sub);
      return reply.status(204).send();
    } catch (err) {
      return handle(err, reply);
    }
  });

  app.post("/mira-esto/:id/promote", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      const post = await promoteMiraEsto(id, sub);
      return reply.status(201).send({ data: post, error: null });
    } catch (err) {
      return handle(err, reply);
    }
  });

  app.post("/mira-esto/:id/react", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      await react(id, sub);
      return reply.status(204).send();
    } catch (err) {
      return handle(err, reply);
    }
  });

  app.delete("/mira-esto/:id/react", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    await unreact(id, sub);
    return reply.status(204).send();
  });
}
