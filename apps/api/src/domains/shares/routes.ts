import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { shareToFeed, shareToConversation, listMyShares, ShareError } from "./service.js";
import { MessagingError } from "../messaging/service.js";

const baseSchema = {
  targetType: z.enum(["post", "mira_esto"]),
  targetId: z.string().uuid(),
  caption: z.string().max(280).optional(),
};

function handle(err: unknown, reply: any) {
  if (err instanceof ShareError || err instanceof MessagingError) {
    return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
  }
  throw err;
}

export async function sharesRoutes(app: FastifyInstance) {
  app.post("/shares", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const parsed = z.object(baseSchema).safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    try {
      const row = await shareToFeed(sub, parsed.data.targetType, parsed.data.targetId, parsed.data.caption);
      return reply.status(201).send({ data: row, error: null });
    } catch (err) {
      return handle(err, reply);
    }
  });

  app.post(
    "/conversations/:id/shares",
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { sub } = req.user as { sub: string };
      const parsed = z.object(baseSchema).safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ data: null, error: parsed.error.flatten() });
      }
      try {
        const row = await shareToConversation(
          sub,
          id,
          parsed.data.targetType,
          parsed.data.targetId,
          parsed.data.caption
        );
        return reply.status(201).send({ data: row, error: null });
      } catch (err) {
        return handle(err, reply);
      }
    }
  );

  app.get("/shares/me", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const rows = await listMyShares(sub);
    return reply.send({ data: rows, error: null });
  });
}
