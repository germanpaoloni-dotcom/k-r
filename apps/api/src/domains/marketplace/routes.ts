import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  createBusiness,
  getBusinessById,
  listBusinesses,
  listMyBusinesses,
  updateBusiness,
  MarketplaceError,
} from "./businesses.service.js";
import { createProduct, getProductById, listProducts, updateProduct, deleteProduct } from "./products.service.js";

const hoursSchema = z.record(z.string(), z.unknown());

const createBusinessSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  category: z.string().min(1).max(60),
  locationId: z.string().uuid().optional(),
  hours: hoursSchema.optional(),
  whatsapp: z.string().max(30).optional(),
});

const updateBusinessSchema = createBusinessSchema.partial();

const createProductSchema = z.object({
  name: z.string().min(1).max(140),
  description: z.string().max(4000).optional(),
  priceCents: z.number().int().min(0),
  currency: z.string().length(3).optional(),
  stock: z.number().int().min(0).optional(),
  images: z.array(z.string().url()).optional(),
  category: z.string().max(60).optional(),
});

const updateProductSchema = createProductSchema.partial();

function handleError(err: unknown, reply: FastifyReply) {
  if (err instanceof MarketplaceError) {
    return reply.status(err.statusCode).send({ data: null, error: { message: err.message } });
  }
  throw err;
}

export async function marketplaceRoutes(app: FastifyInstance) {
  app.post("/businesses", { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = createBusinessSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    const { sub } = req.user as { sub: string };
    try {
      const business = await createBusiness(sub, parsed.data);
      return reply.status(201).send({ data: business, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/businesses", async (req, reply) => {
    const query = req.query as { category?: string; city?: string; q?: string; limit?: string };
    const list = await listBusinesses({
      category: query.category,
      city: query.city,
      q: query.q,
      limit: query.limit ? Number(query.limit) : undefined,
    });
    return reply.send({ data: list, error: null });
  });

  app.get("/businesses/mine", { preHandler: app.authenticate }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const list = await listMyBusinesses(sub);
    return reply.send({ data: list, error: null });
  });

  app.get("/businesses/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const business = await getBusinessById(id);
    if (!business) return reply.status(404).send({ data: null, error: { message: "No encontrado." } });
    return reply.send({ data: business, error: null });
  });

  app.patch("/businesses/:id", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateBusinessSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    const { sub } = req.user as { sub: string };
    try {
      const business = await updateBusiness(id, sub, parsed.data);
      return reply.send({ data: business, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/businesses/:id/products", async (req, reply) => {
    const { id } = req.params as { id: string };
    const business = await getBusinessById(id);
    if (!business) return reply.status(404).send({ data: null, error: { message: "No encontrado." } });
    const list = await listProducts({ businessId: id });
    return reply.send({ data: list, error: null });
  });

  app.post("/businesses/:id/products", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    const { sub } = req.user as { sub: string };
    try {
      const product = await createProduct(id, sub, parsed.data);
      return reply.status(201).send({ data: product, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/products", async (req, reply) => {
    const query = req.query as { businessId?: string; category?: string; q?: string; limit?: string };
    const list = await listProducts({
      businessId: query.businessId,
      category: query.category,
      q: query.q,
      limit: query.limit ? Number(query.limit) : undefined,
    });
    return reply.send({ data: list, error: null });
  });

  app.get("/products/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const product = await getProductById(id);
    if (!product) return reply.status(404).send({ data: null, error: { message: "No encontrado." } });
    return reply.send({ data: product, error: null });
  });

  app.patch("/products/:id", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ data: null, error: parsed.error.flatten() });
    }
    const { sub } = req.user as { sub: string };
    try {
      const product = await updateProduct(id, sub, parsed.data);
      return reply.send({ data: product, error: null });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.delete("/products/:id", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    try {
      await deleteProduct(id, sub);
      return reply.status(204).send();
    } catch (err) {
      return handleError(err, reply);
    }
  });
}
