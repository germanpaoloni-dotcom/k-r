import type { FastifyInstance } from "fastify";
import {
  requestFriendship,
  acceptFriendship,
  declineFriendship,
  removeFriendship,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  FriendshipError,
} from "./service.js";

function handle(err: unknown, reply: any) {
  if (err instanceof FriendshipError) {
    return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
  }
  throw err;
}

export async function friendshipsRoutes(app: FastifyInstance) {
  app.post(
    "/friendships/:userId/request",
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { userId } = req.params as { userId: string };
      const { sub } = req.user as { sub: string };
      try {
        const row = await requestFriendship(sub, userId);
        return reply.status(201).send({ data: row, error: null });
      } catch (err) {
        return handle(err, reply);
      }
    }
  );

  app.post(
    "/friendships/:userId/accept",
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { userId } = req.params as { userId: string };
      const { sub } = req.user as { sub: string };
      try {
        const row = await acceptFriendship(sub, userId);
        return reply.send({ data: row, error: null });
      } catch (err) {
        return handle(err, reply);
      }
    }
  );

  app.post(
    "/friendships/:userId/decline",
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { userId } = req.params as { userId: string };
      const { sub } = req.user as { sub: string };
      try {
        await declineFriendship(sub, userId);
        return reply.status(204).send();
      } catch (err) {
        return handle(err, reply);
      }
    }
  );

  app.delete("/friendships/:userId", { preHandler: app.authenticate }, async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const { sub } = req.user as { sub: string };
    await removeFriendship(sub, userId);
    return reply.status(204).send();
  });

  app.get("/friendships", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const rows = await listFriends(sub);
    return reply.send({ data: rows, error: null });
  });

  app.get("/friendships/requests", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const [incoming, outgoing] = await Promise.all([
      listIncomingRequests(sub),
      listOutgoingRequests(sub),
    ]);
    return reply.send({ data: { incoming, outgoing }, error: null });
  });
}
