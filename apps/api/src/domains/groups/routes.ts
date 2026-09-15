import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  createGroup,
  getGroupById,
  listGroups,
  listMyGroups,
  listMembers,
  joinGroup,
  leaveGroup,
  GroupError,
} from "./service.js";

const createGroupSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

function handleError(err: unknown, reply: FastifyReply) {
  if (err instanceof GroupError) {
    return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
  }
  throw err;
}

export async function groupsRoutes(app: FastifyInstance) {
  app.post("/groups", { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = createGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    const { sub } = req.user as { sub: string };
    try {
      const group = await createGroup(sub, parsed.data);
      return reply.status(201).send({ data: group, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/groups", { preHandler: app.optionalAuthenticate }, async (req, reply) => {
    const query = req.query as { q?: string; limit?: string };
    const list = await listGroups({ q: query.q, limit: query.limit ? Number(query.limit) : undefined });
    return reply.send({ data: list, error: null });
  });

  app.get("/groups/mine", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const list = await listMyGroups(sub);
    return reply.send({ data: list, error: null });
  });

  app.get("/groups/:id", { preHandler: app.optionalAuthenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const viewer = req.user as { sub: string } | undefined;
    const group = await getGroupById(id, viewer?.sub);
    if (!group) return reply.status(404).send({ data: null, error: { message: "No encontrado." } });
    return reply.send({ data: group, error: null });
  });

  app.get("/groups/:id/members", async (req, reply) => {
    const { id } = req.params as { id: string };
    const group = await getGroupById(id);
    if (!group) return reply.status(404).send({ data: null, error: { message: "No encontrado." } });
    const members = await listMembers(id);
    return reply.send({ data: members, error: null });
  });

  app.post("/groups/:id/join", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      await joinGroup(id, sub);
      return reply.status(204).send();
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post("/groups/:id/leave", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      await leaveGroup(id, sub);
      return reply.status(204).send();
    } catch (err) {
      return handleError(err, reply);
    }
  });
}
