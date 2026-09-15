import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { locations } from "../../db/schema.js";

const createLocationSchema = z.object({
  name: z.string().min(1).max(160),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().max(255).optional(),
  city: z.string().min(1).max(120),
  category: z.string().max(60).optional(),
});

// Endpoint mínimo para que posts/negocios/eventos puedan anclarse a un lugar
// real. El flujo completo de "sugerir lugar por geolocalización" (sección H
// del documento de arquitectura) se implementa en Fase 2 (Discover/Mapa).
export async function locationsRoutes(app: FastifyInstance) {
  app.post("/locations", { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = createLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    const [location] = await db
      .insert(locations)
      .values({ ...parsed.data, source: "user" })
      .returning();
    return reply.status(201).send({ data: location, error: null });
  });

  app.get("/locations/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    if (!location) return reply.status(404).send({ data: null, error: { message: "No encontrado." } });
    return reply.send({ data: location, error: null });
  });
}
