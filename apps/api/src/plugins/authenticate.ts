import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuthenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/** Middleware reusable: exige un access token válido y expone request.user.sub */
export default fp(async (app: FastifyInstance) => {
  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ data: null, error: { message: "No autenticado." } });
    }
  });

  // Para endpoints públicos que personalizan la respuesta si hay sesión
  // (ej. "likedByMe" en el feed), pero no la exigen.
  app.decorate("optionalAuthenticate", async (req: FastifyRequest) => {
    try {
      await req.jwtVerify();
    } catch {
      // sin sesión válida: seguimos como anónimo
    }
  });
});
