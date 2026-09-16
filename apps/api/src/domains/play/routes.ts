import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  PlayError,
  createGame,
  listGames,
  getGameById,
  createSession,
  getSessionById,
  listSessions,
  startSession,
  endSession,
  submitAnswer,
  listSessionAnswers,
  getBalance,
  getCreditsHistory,
  listCosmetics,
  buyCosmetic,
  createBadge,
  listBadges,
  listInventory,
  createUserPet,
  getUserPet,
  createGroupPet,
  getGroupPet,
  trainPet,
  listPetDefinitions,
  adoptPet,
} from "./service.js";

const createGameSchema = z.object({
  key: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  rules: z.record(z.unknown()).optional(),
  durationSeconds: z.number().int().positive().optional(),
});

const createSessionSchema = z.object({
  contextType: z.string().min(1),
  contextId: z.string().uuid().optional(),
});

const submitAnswerSchema = z.object({
  answer: z.record(z.unknown()),
  isCorrect: z.boolean().optional(),
});

const createBadgeSchema = z.object({
  key: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  iconUrl: z.string().url().optional(),
});

const createPetSchema = z.object({
  species: z.string().min(1).max(40),
  name: z.string().min(1).max(40),
});

const adoptPetSchema = z.object({
  definitionId: z.string().uuid(),
});

function handleError(err: unknown, reply: FastifyReply) {
  if (err instanceof PlayError) {
    return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
  }
  throw err;
}

export async function playRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------- juegos
  app.post("/games", { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = createGameSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    try {
      const game = await createGame(parsed.data);
      return reply.status(201).send({ data: game, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/games", async (req, reply) => {
    const { limit } = req.query as { limit?: string };
    const list = await listGames(limit ? Number(limit) : undefined);
    return reply.send({ data: list, error: null });
  });

  app.get("/games/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const game = await getGameById(id);
    if (!game) return reply.status(404).send({ data: null, error: { message: "No encontrado." } });
    return reply.send({ data: game, error: null });
  });

  // ------------------------------------------------------------- sesiones
  app.post("/games/:id/sessions", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    const { sub } = req.user as { sub: string };
    try {
      const session = await createSession(id, sub, parsed.data);
      return reply.status(201).send({ data: session, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/games/:id/sessions", async (req, reply) => {
    const { id } = req.params as { id: string };
    const query = req.query as { contextType?: string; contextId?: string; status?: string; limit?: string };
    const list = await listSessions(id, {
      contextType: query.contextType,
      contextId: query.contextId,
      status: query.status,
      limit: query.limit ? Number(query.limit) : undefined,
    });
    return reply.send({ data: list, error: null });
  });

  app.get("/sessions/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const session = await getSessionById(id);
    if (!session) return reply.status(404).send({ data: null, error: { message: "No encontrada." } });
    const answers = await listSessionAnswers(id);
    return reply.send({ data: { ...session, answers }, error: null });
  });

  app.post("/sessions/:id/start", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      const session = await startSession(id, sub);
      return reply.send({ data: session, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post("/sessions/:id/end", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      const session = await endSession(id, sub);
      return reply.send({ data: session, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post("/sessions/:id/answers", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = submitAnswerSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    const { sub } = req.user as { sub: string };
    try {
      const answer = await submitAnswer(id, sub, parsed.data);
      return reply.status(201).send({ data: answer, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // -------------------------------------------------------------- créditos
  app.get("/credits/balance", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const balance = await getBalance(sub);
    return reply.send({ data: { balance }, error: null });
  });

  app.get("/credits/history", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { limit } = req.query as { limit?: string };
    const history = await getCreditsHistory(sub, limit ? Number(limit) : undefined);
    return reply.send({ data: history, error: null });
  });

  // ------------------------------------------------------------ cosméticos
  app.get("/cosmetics", async (req, reply) => {
    const { limit } = req.query as { limit?: string };
    const list = await listCosmetics(limit ? Number(limit) : undefined);
    return reply.send({ data: list, error: null });
  });

  app.post("/cosmetics/:id/buy", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      const cosmetic = await buyCosmetic(id, sub);
      return reply.send({ data: cosmetic, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // ---------------------------------------------------------------- badges
  app.post("/badges", { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = createBadgeSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    try {
      const badge = await createBadge(parsed.data);
      return reply.status(201).send({ data: badge, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/badges", async (req, reply) => {
    const { limit } = req.query as { limit?: string };
    const list = await listBadges(limit ? Number(limit) : undefined);
    return reply.send({ data: list, error: null });
  });

  // ------------------------------------------------------------ inventario
  app.get("/inventory", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const list = await listInventory(sub);
    return reply.send({ data: list, error: null });
  });

  // ------------------------------------------------------------- mascotas
  app.get("/pet-definitions", async (_req, reply) => {
    const list = await listPetDefinitions();
    return reply.send({ data: list, error: null });
  });

  app.post("/pets/adopt", { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = adoptPetSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    const { sub } = req.user as { sub: string };
    try {
      const pet = await adoptPet(sub, parsed.data.definitionId);
      return reply.status(201).send({ data: pet, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post("/pets", { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = createPetSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    const { sub } = req.user as { sub: string };
    try {
      const pet = await createUserPet(sub, parsed.data);
      return reply.status(201).send({ data: pet, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/pets/mine", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const pet = await getUserPet(sub);
    return reply.send({ data: pet, error: null });
  });

  app.post("/pets/:id/train", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      const pet = await trainPet(id, sub);
      return reply.send({ data: pet, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post("/groups/:id/pet", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = createPetSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    const { sub } = req.user as { sub: string };
    try {
      const pet = await createGroupPet(id, sub, parsed.data);
      return reply.status(201).send({ data: pet, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/groups/:id/pet", async (req, reply) => {
    const { id } = req.params as { id: string };
    const pet = await getGroupPet(id);
    return reply.send({ data: pet, error: null });
  });
}
