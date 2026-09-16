import type { FastifyInstance, FastifyReply } from "fastify";
import { saveUpload, UploadError } from "./service.js";

function handleError(err: unknown, reply: FastifyReply) {
  if (err instanceof UploadError) {
    return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
  }
  throw err;
}

export async function uploadsRoutes(app: FastifyInstance) {
  app.post("/uploads", { preHandler: app.authenticate }, async (req, reply) => {
    const file = await req.file();
    if (!file) {
      return reply.status(400).send({ data: null, error: { message: "Falta el archivo." } });
    }
    try {
      const saved = await saveUpload(file);
      const url = `${req.protocol}://${req.headers.host}/uploads/${saved.filename}`;
      return reply.status(201).send({ data: { url, type: saved.type }, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });
}
