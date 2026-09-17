import type { FastifyInstance } from "fastify";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { getUserById } from "../auth/service.js";
import { listUserPosts } from "../social/service.js";
import { getUserPet } from "../play/service.js";
import { followeeIds } from "../follows/service.js";

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

  // Marca el onboarding como completo. Opcionalmente guarda la ubicación
  // compartida en ese paso (misma columna que usa el resto de la app para
  // "Cerca").
  app.patch("/users/me/onboarding", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = req.body as Partial<{ lat: number; lng: number }>;

    const [updated] = await db
      .update(users)
      .set({
        ...(typeof body.lat === "number" ? { locationLat: body.lat } : {}),
        ...(typeof body.lng === "number" ? { locationLng: body.lng } : {}),
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, sub))
      .returning();

    if (!updated) return reply.status(404).send({ data: null, error: { message: "No encontrado." } });
    return reply.send({ data: await getUserById(updated.id), error: null });
  });

  // Sugerencias para el paso "Mi gente" del onboarding: cuentas que todavía
  // no seguís, al azar. No es un feed de descubrimiento serio (eso vive en
  // domains/search) — solo un puñado de puntos de partida.
  app.get("/users/suggested", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const following = await followeeIds(sub);
    const excluded = [sub, ...following];

    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
      })
      .from(users)
      .where(and(notInArray(users.id, excluded)))
      .orderBy(sql`random()`)
      .limit(8);

    return reply.send({ data: rows, error: null });
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

  app.get("/users/:id/pet", async (req, reply) => {
    const { id } = req.params as { id: string };
    const pet = await getUserPet(id);
    return reply.send({ data: pet, error: null });
  });
}
