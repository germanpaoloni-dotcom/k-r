import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createDecilo,
  listDeciloTimeline,
  getThread,
  deleteDecilo,
  likeDecilo,
  unlikeDecilo,
  DeciloError,
} from "./service.js";

function handle(err: unknown, reply: any) {
  if (err instanceof DeciloError) {
    return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
  }
  throw err;
}

const createSchema = z.object({
  body: z.string().min(1).max(280),
  replyToId: z.string().uuid().optional(),
});

export async function deciloRoutes(app: FastifyInstance) {
  app.post("/decilo", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    try {
      const dto = await createDecilo(sub, parsed.data);
      return reply.status(201).send({ data: dto, error: null });
    } catch (err) {
      return handle(err, reply);
    }
  });

  app.get("/decilo", { preHandler: app.optionalAuthenticate }, async (req, reply) => {
    const viewer = req.user as { sub: string } | undefined;
    const items = await listDeciloTimeline(viewer?.sub);
    return reply.send({ data: items, error: null });
  });

  app.get("/decilo/:id", { preHandler: app.optionalAuthenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const viewer = req.user as { sub: string } | undefined;
    try {
      const thread = await getThread(id, viewer?.sub);
      return reply.send({ data: thread, error: null });
    } catch (err) {
      return handle(err, reply);
    }
  });

  app.post("/decilo/:id/reply", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const parsed = z.object({ body: z.string().min(1).max(280) }).safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    try {
      const dto = await createDecilo(sub, { body: parsed.data.body, replyToId: id });
      return reply.status(201).send({ data: dto, error: null });
    } catch (err) {
      return handle(err, reply);
    }
  });

  app.delete("/decilo/:id", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      await deleteDecilo(id, sub);
      return reply.status(204).send();
    } catch (err) {
      return handle(err, reply);
    }
  });

  app.post("/decilo/:id/like", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      await likeDecilo(id, sub);
      return reply.status(204).send();
    } catch (err) {
      return handle(err, reply);
    }
  });

  app.delete("/decilo/:id/like", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    await unlikeDecilo(id, sub);
    return reply.status(204).send();
  });
}
