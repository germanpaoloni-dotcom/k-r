/**
 * Arte real de los accesorios (gorra, anteojos, etc.), aislados y con fondo
 * transparente — ver mascotas/accesorios/ y scripts/normalize-cosmetics.mjs.
 * La posición está calibrada contra el lienzo 360x360 de los sprites reales
 * (apps/web/public/pets/sprites/dog/*), por mascota Y por pose (ver
 * cosmeticAnchors.ts) — todavía no está calibrada contra las ilustraciones
 * SVG (gato/dragón/conejo/ave), así que ahí seguimos mostrando el emoji hasta
 * hacer esa pasada.
 */
import type { PetCosmeticSlot } from "../api";
import { headAnchorYFor, type PetPose } from "./cosmeticAnchors";

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

/** Valores de respaldo (pose "idle" de Robby) para mascotas sin calibración
 * propia todavía — ver cosmeticAnchors.ts para la posición vertical real de
 * gorro/anteojos, que varía por mascota y por pose. */
export const COSMETIC_PLACEMENT: Record<PetCosmeticSlot, Placement> = {
  hat: { widthPct: 0.46, anchorYPct: 96 / 360, anchor: "bottom", offsetKind: "head" },
  glasses: { widthPct: 0.56, anchorYPct: 143 / 360, anchor: "center", offsetKind: "head" },
  outfit: { widthPct: 0.5, anchorYPct: 197 / 360, anchor: "top", offsetKind: "torso" },
};

const CANVAS = 360;

/** anchorYPct efectivo para gorro/anteojos — usa la calibración por
 * mascota+pose cuando existe (headAnchorYFor), y el valor fijo como
 * respaldo. La ropa no tiene este problema (ver commit de calibración) y
 * sigue usando siempre el valor fijo de COSMETIC_PLACEMENT. */
export function anchorYPctFor(slot: PetCosmeticSlot, petKey: string, pose: PetPose = "idle"): number {
  if (slot === "hat") {
    const y = headAnchorYFor(petKey, "hatY", pose);
    if (y !== null) return y / CANVAS;
  } else if (slot === "glasses") {
    const y = headAnchorYFor(petKey, "glassesY", pose);
    if (y !== null) return y / CANVAS;
  }
  return COSMETIC_PLACEMENT[slot].anchorYPct;
}
