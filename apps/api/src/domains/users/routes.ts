import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { getUserById } from "../auth/service.js";
import { listUserPosts } from "../social/service.js";

export async function usersRoutes(app: FastifyInstance) {
  app.get("/users/me", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const user = await getUserById(sub);
    if (!user) return reply.status(404).send({ data: null, error: { message: "No encontrado." } });
    return reply.send({ data: user, error: null });
  });

  app.patch("/users/me", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = req.body as Partial<{ displayName: string; bio: string; avatarUrl: string }>;

    const [updated] = await db
      .update(users)
      .set({
        ...(body.displayName ? { displayName: body.displayName } : {}),
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, sub))
      .returning();

    if (!updated) return reply.status(404).send({ data: null, error: { message: "No encontrado." } });
    return reply.send({ data: await getUserById(updated.id), error: null });
  });

  // Perfil público — no requiere auth, respeta privacyMode a futuro.
  app.get("/users/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = await getUserById(id);
    if (!user) return reply.status(404).send({ data: null, error: { message: "No encontrado." } });
    const { email, privacyMode, ...publicUser } = user;
    return reply.send({ data: publicUser, error: null });
  });

  app.get("/users/:id/posts", { preHandler: app.optionalAuthenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const viewer = req.user as { sub: string } | undefined;
    const list = await listUserPosts(id, viewer?.sub);
    return reply.send({ data: list, error: null });
  });
}
