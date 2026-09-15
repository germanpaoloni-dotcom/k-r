import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { locations, posts } from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";
import { postBaseQuery } from "../social/service.js";
import { hydratePosts, type PostDto } from "../social/dto.js";

export interface CreateLocationInput {
  name: string;
  lat: number;
  lng: number;
  address?: string;
  city: string;
  category?: string;
}

export async function createLocation(input: CreateLocationInput) {
  return firstOrThrow(
    await db
      .insert(locations)
      .values({ ...input, source: "user" })
      .returning()
  );
}

export async function getLocationById(id: string) {
  const [location] = await db.select().from(locations).where(eq(locations.id, id));
  return location ?? null;
}

export interface ListLocationsParams {
  city?: string;
  category?: string;
  q?: string;
  limit?: number;
}

/**
 * Browse/filtro de lugares — soporta ciudad, categoría y texto libre por
 * nombre (trigram, ver índice `locations_name_trgm_idx` en post-migrate.sql).
 * Sin `q`, ordena por más reciente.
 */
export async function listLocations(params: ListLocationsParams = {}) {
  const limit = params.limit ?? 30;
  const conditions = [];
  if (params.city) conditions.push(eq(locations.city, params.city));
  if (params.category) conditions.push(eq(locations.category, params.category));
  if (params.q?.trim()) {
    const q = params.q.trim();
    conditions.push(
      sql`(${locations.name} ILIKE ${"%" + q + "%"} OR similarity(${locations.name}, ${q}) > 0.15)`
    );
  }

  const query = db.select().from(locations);
  const filtered = conditions.length ? query.where(and(...conditions)) : query;

  if (params.q?.trim()) {
    const q = params.q.trim();
    return filtered
      .orderBy(desc(sql`similarity(${locations.name}, ${q})`))
      .limit(limit);
  }
  return filtered.orderBy(desc(locations.createdAt)).limit(limit);
}

export interface NearbyLocationsParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  category?: string;
  limit?: number;
}

interface NearbyRow {
  [key: string]: unknown;
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  city: string;
  category: string | null;
  source: string;
  created_at: string;
  distance_m: number;
}

/**
 * Lugares reales cerca de un punto (no posts anclados a ellos — eso es
 * `/feed/nearby`). Base de la pestaña "Cerca" y del listado corto que
 * acompaña al mapa.
 */
export async function nearbyLocations(params: NearbyLocationsParams) {
  const radiusMeters = (params.radiusKm ?? 5) * 1000;
  const result = await db.execute<NearbyRow>(sql`
    SELECT id, name, lat, lng, address, city, category, source, created_at,
           ST_Distance(geog, ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography) AS distance_m
    FROM locations
    WHERE ST_DWithin(
      geog,
      ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography,
      ${radiusMeters}
    )
    ${params.category ? sql`AND category = ${params.category}` : sql``}
    ORDER BY distance_m ASC
    LIMIT ${params.limit ?? 30}
  `);
  return result.rows;
}

/**
 * Contenido anclado a un lugar — la "ficha de ubicación" del documento de
 * arquitectura (sección H): tocar un lugar en el mapa o en el buscador
 * lleva a esto.
 */
export async function getLocationContent(
  locationId: string,
  viewerId?: string,
  limit = 20
): Promise<PostDto[]> {
  const rows = await postBaseQuery()
    .where(and(eq(posts.locationId, locationId), eq(posts.visibility, "public")))
    .orderBy(desc(posts.createdAt))
    .limit(limit);
  return hydratePosts(rows, viewerId);
}
