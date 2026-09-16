import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { queHago } from "./service.js";

const queHagoSchema = z.object({
  q: z.string().min(1).max(500),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radiusKm: z.number().positive().optional(),
});

export async function aiRoutes(app: FastifyInstance) {
  app.post("/ai/que-hago", { preHandler: app.optionalAuthenticate }, async (req, reply) => {
    const parsed = queHagoSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    const result = await queHago(parsed.data);
    return reply.send({ data: result, error: null });
  });
}
