import type { FastifyInstance, FastifyReply } from "fastify";
import { creatorAnalytics, businessAnalytics } from "./service.js";
import { MarketplaceError } from "../marketplace/businesses.service.js";

function handleError(err: unknown, reply: FastifyReply) {
  if (err instanceof MarketplaceError) {
    return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
  }
  throw err;
}

export async function analyticsRoutes(app: FastifyInstance) {
  app.get("/analytics/creator", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const stats = await creatorAnalytics(sub);
    return reply.send({ data: stats, error: null });
  });

  app.get("/businesses/:id/analytics", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const query = req.query as { sinceDays?: string };
    const since = query.sinceDays ? new Date(Date.now() - Number(query.sinceDays) * 24 * 60 * 60 * 1000) : undefined;
    try {
      const stats = await businessAnalytics(id, sub, since);
      return reply.send({ data: stats, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });
}
