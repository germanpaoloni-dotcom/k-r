import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  getOrCreateDirectConversation,
  listConversations,
  sendMessage,
  listMessages,
  markConversationRead,
  deleteMessage,
  MessagingError,
} from "./service.js";

function handle(err: unknown, reply: any) {
  if (err instanceof MessagingError) {
    return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
  }
  throw err;
}

const sendSchema = z.object({
  body: z.string().max(2000).optional(),
  attachmentType: z.enum(["post", "mira_esto", "location", "product", "event"]).optional(),
  attachmentId: z.string().uuid().optional(),
});

export async function messagingRoutes(app: FastifyInstance) {
  app.post("/conversations", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const parsed = z.object({ userId: z.string().uuid() }).safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    try {
      const id = await getOrCreateDirectConversation(sub, parsed.data.userId);
      return reply.status(201).send({ data: { id }, error: null });
    } catch (err) {
      return handle(err, reply);
    }
  });

  app.get("/conversations", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const rows = await listConversations(sub);
    return reply.send({ data: rows, error: null });
  });

  app.get(
    "/conversations/:id/messages",
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { sub } = req.user as { sub: string };
      const query = req.query as { before?: string };
      try {
        const rows = await listMessages(id, sub, query.before ? new Date(query.before) : undefined);
        return reply.send({ data: rows, error: null });
      } catch (err) {
        return handle(err, reply);
      }
    }
  );

  app.post(
    "/conversations/:id/messages",
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { sub } = req.user as { sub: string };
      const parsed = sendSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ data: null, error: parsed.error.flatten() });
      }
      try {
        const row = await sendMessage(id, sub, parsed.data);
        return reply.status(201).send({ data: row, error: null });
      } catch (err) {
        return handle(err, reply);
      }
    }
  );

  app.post("/conversations/:id/read", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      await markConversationRead(id, sub);
      return reply.status(204).send();
    } catch (err) {
      return handle(err, reply);
    }
  });

  app.delete("/messages/:id", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      await deleteMessage(id, sub);
      return reply.status(204).send();
    } catch (err) {
      return handle(err, reply);
    }
  });
}
