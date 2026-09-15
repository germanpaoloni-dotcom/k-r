import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  createPost,
  getPostById,
  deletePost,
  likePost,
  unlikePost,
  addComment,
  listComments,
  savePost,
  unsavePost,
  SocialError,
} from "./service.js";

const createPostSchema = z.object({
  caption: z.string().max(2200).optional(),
  locationId: z.string().uuid().optional(),
  visibility: z.enum(["public", "followers", "private"]).optional(),
  media: z
    .array(
      z.object({
        type: z.enum(["image", "video"]),
        url: z.string().url(),
        thumbnailUrl: z.string().url().optional(),
      })
    )
    .min(1),
  kind: z.enum(["photo", "video", "creation"]).optional(),
  medium: z.string().max(30).optional(),
});

const commentSchema = z.object({
  body: z.string().min(1).max(1000),
  parentCommentId: z.string().uuid().optional(),
});

function handleError(err: unknown, reply: FastifyReply) {
  if (err instanceof SocialError) {
    return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
  }
  throw err;
}

export async function socialRoutes(app: FastifyInstance) {
  app.post("/posts", { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    const { sub } = req.user as { sub: string };
    try {
      const post = await createPost(sub, parsed.data);
      return reply.status(201).send({ data: post, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/posts/:id", { preHandler: app.optionalAuthenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const viewer = req.user as { sub: string } | undefined;
    const post = await getPostById(id, viewer?.sub);
    if (!post) return reply.status(404).send({ data: null, error: { message: "No encontrado." } });
    return reply.send({ data: post, error: null });
  });

  app.delete("/posts/:id", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      await deletePost(id, sub);
      return reply.status(204).send();
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post("/posts/:id/like", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    await likePost(id, sub);
    return reply.status(204).send();
  });

  app.delete("/posts/:id/like", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    await unlikePost(id, sub);
    return reply.status(204).send();
  });

  app.post("/posts/:id/comments", { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      const comment = await addComment(id, sub, parsed.data.body, parsed.data.parentCommentId);
      return reply.status(201).send({ data: comment, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/posts/:id/comments", async (req, reply) => {
    const { id } = req.params as { id: string };
    const list = await listComments(id);
    return reply.send({ data: list, error: null });
  });

  app.post("/posts/:id/save", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    await savePost(id, sub);
    return reply.status(204).send();
  });

  app.delete("/posts/:id/save", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    await unsavePost(id, sub);
    return reply.status(204).send();
  });
}
