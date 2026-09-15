import type { FastifyInstance } from "fastify";
import { listEstudioGallery, listUserEstudio } from "./service.js";

export async function estudioRoutes(app: FastifyInstance) {
  app.get("/estudio", { preHandler: app.optionalAuthenticate }, async (req, reply) => {
    const viewer = req.user as { sub: string } | undefined;
    const items = await listEstudioGallery(viewer?.sub);
    return reply.send({ data: items, error: null });
  });

  app.get("/users/:id/estudio", { preHandler: app.optionalAuthenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const viewer = req.user as { sub: string } | undefined;
    const items = await listUserEstudio(id, viewer?.sub);
    return reply.send({ data: items, error: null });
  });
}
