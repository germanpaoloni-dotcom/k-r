/**
 * Arte real de los accesorios (gorra, anteojos, etc.), aislados y con fondo
 * transparente — ver mascotas/accesorios/ y scripts/normalize-cosmetics.mjs.
 * La posición está calibrada contra el lienzo 360x360 de los sprites reales
 * (apps/web/public/pets/sprites/dog/*) y funciona igual de bien en las 5
 * poses/perros probados — todavía no está calibrada contra las ilustraciones
 * SVG (gato/dragón/conejo/ave), así que ahí seguimos mostrando el emoji hasta
 * hacer esa pasada.
 */
import type { PetCosmeticSlot } from "../api";

const COSMETIC_ART_KEYS = new Set([
  "gorra",
  "galera",
  "corona",
  "anteojos-sol",
  "anteojos-nerd",
  "antiparras",
  "bufanda",
  "remera",
  "campera",
]);

export function hasCosmeticArt(key: string): boolean {
  return COSMETIC_ART_KEYS.has(key);
}

export function cosmeticArtUrl(key: string): string {
  return `/pets/cosmetics/${key}.png`;
}

interface Placement {
  widthPct: number;
  anchorYPct: number;
  anchor: "top" | "center" | "bottom";
  /** Qué corrección horizontal por mascota aplicar — ver cosmeticAnchors.ts. */
  offsetKind: "head" | "torso";
}

/** Calibrado sobre un lienzo de 360px de alto (ver el script de calibración). */
export const COSMETIC_PLACEMENT: Record<PetCosmeticSlot, Placement> = {
  hat: { widthPct: 0.46, anchorYPct: 96 / 360, anchor: "bottom", offsetKind: "head" },
  glasses: { widthPct: 0.56, anchorYPct: 143 / 360, anchor: "center", offsetKind: "head" },
  outfit: { widthPct: 0.5, anchorYPct: 197 / 360, anchor: "top", offsetKind: "torso" },
};
