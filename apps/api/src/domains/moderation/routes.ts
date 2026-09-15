import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  reportContent,
  getModerationStatus,
  listQueue,
  resolveModeration,
  ModerationError,
} from "./service.js";

const reportSchema = z.object({
  targetType: z.string().min(1).max(20),
  targetId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

export async function moderationRoutes(app: FastifyInstance) {
  app.post("/reports", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    const row = await reportContent(sub, parsed.data.targetType, parsed.data.targetId, parsed.data.reason);
    return reply.status(201).send({ data: row, error: null });
  });

  app.get("/moderation/status", async (req, reply) => {
    const query = req.query as { targetType?: string; targetId?: string };
    if (!query.targetType || !query.targetId) {
      return reply.status(400).send({ data: null, error: { message: "Faltan targetType/targetId." } });
    }
    const row = await getModerationStatus(query.targetType, query.targetId);
    return reply.send({ data: row, error: null });
  });

  app.get("/moderation/queue", { preHandler: app.authenticate }, async (req, reply) => {
    const query = req.query as { status?: "flagged" | "under_review" };
    const rows = await listQueue(query.status ?? "flagged");
    return reply.send({ data: rows, error: null });
  });

  app.post(
    "/moderation/:id/resolve",
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { sub } = req.user as { sub: string };
      const parsed = z
        .object({ outcome: z.enum(["clean", "removed", "under_review"]) })
        .safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ data: null, error: parsed.error.flatten() });
      }
      try {
        const row = await resolveModeration(id, sub, parsed.data.outcome);
        return reply.send({ data: row, error: null });
      } catch (err) {
        if (err instanceof ModerationError) {
          return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
        }
        throw err;
      }
    }
  );
}
