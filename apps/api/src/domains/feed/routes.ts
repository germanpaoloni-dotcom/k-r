import type { FastifyInstance } from "fastify";
import { followingFeed, forYouFeed, trendingFeed, nearbyFeed, type FollowingMode } from "./service.js";

export async function feedRoutes(app: FastifyInstance) {
  app.get("/feed/following", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const query = req.query as { mode?: FollowingMode; limit?: string };
    const mode: FollowingMode = ["recommended", "chronological", "favorites"].includes(
      query.mode ?? ""
    )
      ? (query.mode as FollowingMode)
      : "recommended";
    const posts = await followingFeed(sub, mode, query.limit ? Number(query.limit) : undefined);
    return reply.send({ data: posts, error: null });
  });

  app.get("/feed/for-you", { preHandler: app.optionalAuthenticate }, async (req, reply) => {
    const viewer = req.user as { sub: string } | undefined;
    const query = req.query as { limit?: string };
    const posts = await forYouFeed(viewer?.sub, query.limit ? Number(query.limit) : undefined);
    return reply.send({ data: posts, error: null });
  });

  app.get("/feed/trending", async (req, reply) => {
    const query = req.query as { limit?: string };
    const posts = await trendingFeed(query.limit ? Number(query.limit) : undefined);
    return reply.send({ data: posts, error: null });
  });

  app.get("/feed/nearby", { preHandler: app.optionalAuthenticate }, async (req, reply) => {
    const viewer = req.user as { sub: string } | undefined;
    const query = req.query as { lat?: string; lng?: string; radiusKm?: string; category?: string };
    if (!query.lat || !query.lng) {
      return reply.status(400).send({ data: null, error: { message: "Faltan lat/lng." } });
    }
    const posts = await nearbyFeed(
      {
        lat: Number(query.lat),
        lng: Number(query.lng),
        radiusKm: query.radiusKm ? Number(query.radiusKm) : undefined,
        category: query.category,
      },
      viewer?.sub
    );
    return reply.send({ data: posts, error: null });
  });
}
