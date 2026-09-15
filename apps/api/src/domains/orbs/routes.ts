import type { FastifyInstance } from "fastify";
import { getOrbsForViewer } from "./service.js";

export async function orbsRoutes(app: FastifyInstance) {
  app.get("/orbs", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const orbs = await getOrbsForViewer(sub);
    return reply.send({ data: orbs, error: null });
  });
}
