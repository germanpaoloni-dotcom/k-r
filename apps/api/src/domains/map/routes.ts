import type { FastifyInstance } from "fastify";
import { pinsInBbox } from "./service.js";

function parseBbox(raw: string): [number, number, number, number] | null {
  const parts = raw.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null;
  return parts as [number, number, number, number];
}

export async function mapRoutes(app: FastifyInstance) {
  // bbox = minLng,minLat,maxLng,maxLat (el rectángulo visible del mapa)
  app.get("/map/pins", async (req, reply) => {
    const query = req.query as { bbox?: string; category?: string };
    if (!query.bbox) {
      return reply
        .status(400)
        .send({ data: null, error: { message: "Falta bbox (minLng,minLat,maxLng,maxLat)." } });
    }
    const bbox = parseBbox(query.bbox);
    if (!bbox) {
      return reply.status(400).send({ data: null, error: { message: "bbox inválido." } });
    }
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const pins = await pinsInBbox({ minLng, minLat, maxLng, maxLat, category: query.category });
    return reply.send({ data: pins, error: null });
  });
}
