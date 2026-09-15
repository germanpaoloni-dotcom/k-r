import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createLocation,
  getLocationById,
  listLocations,
  nearbyLocations,
  getLocationContent,
} from "./service.js";

const createLocationSchema = z.object({
  name: z.string().min(1).max(160),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().max(255).optional(),
  city: z.string().min(1).max(120),
  category: z.string().max(60).optional(),
});

// Lugares — Fase 1 dejó la tabla, la columna geoespacial (geog, GiST) y el
// alta mínima listos. Fase 3 (Descubrir) agrega browse/filtro, "cerca de mí"
// y la ficha de ubicación con su contenido anclado.
export async function locationsRoutes(app: FastifyInstance) {
  app.post("/locations", { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = createLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    const location = await createLocation(parsed.data);
    return reply.status(201).send({ data: location, error: null });
  });

  app.get("/locations", async (req, reply) => {
    const query = req.query as { city?: string; category?: string; q?: string; limit?: string };
    const list = await listLocations({
      city: query.city,
      category: query.category,
      q: query.q,
      limit: query.limit ? Number(query.limit) : undefined,
    });
    return reply.send({ data: list, error: null });
  });

  app.get("/locations/nearby", async (req, reply) => {
    const query = req.query as {
      lat?: string;
      lng?: string;
      radiusKm?: string;
      category?: string;
    };
    if (!query.lat || !query.lng) {
      return reply.status(400).send({ data: null, error: { message: "Faltan lat/lng." } });
    }
    const list = await nearbyLocations({
      lat: Number(query.lat),
      lng: Number(query.lng),
      radiusKm: query.radiusKm ? Number(query.radiusKm) : undefined,
      category: query.category,
    });
    return reply.send({ data: list, error: null });
  });

  app.get("/locations/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const location = await getLocationById(id);
    if (!location) return reply.status(404).send({ data: null, error: { message: "No encontrado." } });
    return reply.send({ data: location, error: null });
  });

  app.get("/locations/:id/posts", { preHandler: app.optionalAuthenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const viewer = req.user as { sub: string } | undefined;
    const query = req.query as { limit?: string };

    const location = await getLocationById(id);
    if (!location) return reply.status(404).send({ data: null, error: { message: "No encontrado." } });

    const content = await getLocationContent(id, viewer?.sub, query.limit ? Number(query.limit) : undefined);
    return reply.send({ data: content, error: null });
  });
}
