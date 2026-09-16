import type { FastifyInstance } from "fastify";
import { getOrbsForViewer, getPublicActivityState } from "./service.js";

export async function orbsRoutes(app: FastifyInstance) {
  app.get("/orbs", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const orbs = await getOrbsForViewer(sub);
    return reply.send({ data: orbs, error: null });
  });

  // Ver domains/orbs/service.ts#getPublicActivityState — no es "sus Orbes".
  app.get("/users/:id/activity-state", async (req, reply) => {
    const { id } = req.params as { id: string };
    const state = await getPublicActivityState(id);
    return reply.send({ data: { state }, error: null });
  });
}
