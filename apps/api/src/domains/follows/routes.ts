import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { follow, unfollow, setFavorite, listFollowers, listFollowing, FollowError } from "./service.js";

export async function followRoutes(app: FastifyInstance) {
  app.post("/users/:id/follow", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      await follow(sub, id);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof FollowError) {
        return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
      }
      throw err;
    }
  });

  app.delete("/users/:id/follow", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    await unfollow(sub, id);
    return reply.status(204).send();
  });

  app.patch("/users/:id/favorite", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const parsed = z.object({ isFavorite: z.boolean() }).safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    await setFavorite(sub, id, parsed.data.isFavorite);
    return reply.status(204).send();
  });

  app.get("/users/:id/followers", async (req, reply) => {
    const { id } = req.params as { id: string };
    const rows = await listFollowers(id);
    return reply.send({ data: rows, error: null });
  });

  app.get("/users/:id/following", async (req, reply) => {
    const { id } = req.params as { id: string };
    const rows = await listFollowing(id);
    return reply.send({ data: rows, error: null });
  });
}
