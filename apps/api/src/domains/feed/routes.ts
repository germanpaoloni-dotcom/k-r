import type { FastifyInstance } from "fastify";
import {
  followingFeed,
  forYouFeed,
  trendingFeed,
  nearbyFeed,
  miGenteFeed,
  dismissFromForYou,
  type FollowingMode,
} from "./service.js";
import { getOrbsForViewer } from "../orbs/service.js";

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

  // Feedback explícito "no me interesa" (Fase 8) — excluye el post de for-you a futuro.
  app.post("/feed/for-you/:postId/dismiss", { preHandler: app.authenticate }, async (req, reply) => {
    const { postId } = req.params as { postId: string };
    const { sub } = req.user as { sub: string };
    await dismissFromForYou(sub, postId);
    return reply.status(204).send();
  });

  app.get("/feed/trending", async (req, reply) => {
    const query = req.query as { limit?: string };
    const posts = await trendingFeed(query.limit ? Number(query.limit) : undefined);
    return reply.send({ data: posts, error: null });
  });

  app.get("/feed/mi-gente", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const query = req.query as { limit?: string };
    const posts = await miGenteFeed(sub, query.limit ? Number(query.limit) : undefined);
    return reply.send({ data: posts, error: null });
  });

  // Mismas señales que Orbes, presentadas como feed en vez de como capa
  // visual de actividad — ver kor-arquitectura-v2.1.md §"Orbes" punto 6.
  app.get("/feed/esta-pasando", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const orbs = await getOrbsForViewer(sub);
    const active = orbs.filter((o) => o.state !== "silencioso");
    return reply.send({ data: active, error: null });
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
