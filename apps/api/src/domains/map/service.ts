import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";

export interface BboxParams {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  category?: string;
  limit?: number;
}

export interface Pin {
  [key: string]: unknown;
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string | null;
}

/**
 * Pines para la vista de mapa (sección "Cerca") — versión liviana de
 * `locations` (sin address/city/source) acotada a un bounding box visible
 * en pantalla, en vez de traer todos los lugares de la ciudad de una.
 */
export async function pinsInBbox(params: BboxParams): Promise<Pin[]> {
  const result = await db.execute<Pin>(sql`
    SELECT id, name, lat, lng, category
    FROM locations
    WHERE ST_Intersects(
      geog,
      ST_MakeEnvelope(${params.minLng}, ${params.minLat}, ${params.maxLng}, ${params.maxLat}, 4326)::geography
    )
    ${params.category ? sql`AND category = ${params.category}` : sql``}
    LIMIT ${params.limit ?? 200}
  `);
  return result.rows;
}
