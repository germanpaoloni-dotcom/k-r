import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  createEvent,
  getEventById,
  listEvents,
  setAttendance,
  removeAttendance,
  EventError,
  type AttendanceStatus,
} from "./service.js";

const createEventSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().max(4000).optional(),
  coverUrl: z.string().url().optional(),
  locationId: z.string().uuid(),
  startsAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  endsAt: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  priceCents: z.number().int().min(0).optional(),
  category: z.string().max(60).optional(),
});

function handleError(err: unknown, reply: FastifyReply) {
  if (err instanceof EventError) {
    return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
  }
  throw err;
}

export async function eventsRoutes(app: FastifyInstance) {
  app.post("/events", { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    const { sub } = req.user as { sub: string };
    try {
      const event = await createEvent(sub, parsed.data);
      return reply.status(201).send({ data: event, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/events", { preHandler: app.optionalAuthenticate }, async (req, reply) => {
    const viewer = req.user as { sub: string } | undefined;
    const query = req.query as {
      category?: string;
      organizerId?: string;
      locationId?: string;
      includePast?: string;
      limit?: string;
    };
    const list = await listEvents(
      {
        category: query.category,
        organizerId: query.organizerId,
        locationId: query.locationId,
        upcomingOnly: query.includePast !== "true",
        limit: query.limit ? Number(query.limit) : undefined,
      },
      viewer?.sub
    );
    return reply.send({ data: list, error: null });
  });

  app.get("/events/:id", { preHandler: app.optionalAuthenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const viewer = req.user as { sub: string } | undefined;
    const event = await getEventById(id, viewer?.sub);
    if (!event) return reply.status(404).send({ data: null, error: { message: "No encontrado." } });
    return reply.send({ data: event, error: null });
  });

  async function attend(status: AttendanceStatus, req: unknown, reply: FastifyReply) {
    const { id } = (req as { params: { id: string } }).params;
    const { sub } = (req as { user: { sub: string } }).user;
    try {
      await setAttendance(id, sub, status);
      return reply.status(204).send();
    } catch (err) {
      return handleError(err, reply);
    }
  }

  app.post("/events/:id/interested", { preHandler: app.authenticate }, (req, reply) =>
    attend("interested", req, reply)
  );
  app.post("/events/:id/going", { preHandler: app.authenticate }, (req, reply) =>
    attend("going", req, reply)
  );
  app.post("/events/:id/remind", { preHandler: app.authenticate }, (req, reply) =>
    attend("reminder_set", req, reply)
  );

  app.delete("/events/:id/attendance", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    await removeAttendance(id, sub);
    return reply.status(204).send();
  });
}
