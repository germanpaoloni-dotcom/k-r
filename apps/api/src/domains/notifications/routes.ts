import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
  getOrCreatePreferences,
  updatePreferences,
} from "./service.js";

const preferencesSchema = z.object({
  likes: z.boolean().optional(),
  comments: z.boolean().optional(),
  follows: z.boolean().optional(),
  friendRequests: z.boolean().optional(),
  messages: z.boolean().optional(),
  miraEsto: z.boolean().optional(),
  digest: z.boolean().optional(),
});

export async function notificationsRoutes(app: FastifyInstance) {
  app.get("/notifications", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const [rows, unread] = await Promise.all([listNotifications(sub), unreadCount(sub)]);
    return reply.send({ data: { items: rows, unreadCount: unread }, error: null });
  });

  app.post(
    "/notifications/:id/read",
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { sub } = req.user as { sub: string };
      await markRead(sub, id);
      return reply.status(204).send();
    }
  );

  app.post("/notifications/read-all", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    await markAllRead(sub);
    return reply.status(204).send();
  });

  app.get(
    "/notifications/preferences",
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { sub } = req.user as { sub: string };
      const prefs = await getOrCreatePreferences(sub);
      return reply.send({ data: prefs, error: null });
    }
  );

  app.patch(
    "/notifications/preferences",
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { sub } = req.user as { sub: string };
      const parsed = preferencesSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ data: null, error: parsed.error.flatten() });
      }
      const prefs = await updatePreferences(sub, parsed.data);
      return reply.send({ data: prefs, error: null });
    }
  );
}
