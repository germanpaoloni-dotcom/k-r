import type { FastifyInstance } from "fastify";
import { searchAll } from "./service.js";

export async function searchRoutes(app: FastifyInstance) {
  app.get("/search", async (req, reply) => {
    const query = req.query as { q?: string; limit?: string };
    if (!query.q?.trim()) {
      return reply.status(400).send({ data: null, error: { message: "Falta el parámetro q." } });
    }
    const results = await searchAll(query.q, query.limit ? Number(query.limit) : undefined);
    return reply.send({ data: results, error: null });
  });
}
