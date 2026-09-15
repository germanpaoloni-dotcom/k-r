import type { FastifyInstance } from "fastify";
import { blockUser, unblockUser, listBlocked, BlockError } from "./service.js";

export async function blocksRoutes(app: FastifyInstance) {
  app.post("/users/:id/block", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      await blockUser(sub, id);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof BlockError) {
        return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
      }
      throw err;
    }
  });

  app.delete("/users/:id/block", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    await unblockUser(sub, id);
    return reply.status(204).send();
  });

  app.get("/users/me/blocked", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const rows = await listBlocked(sub);
    return reply.send({ data: rows, error: null });
  });
}
