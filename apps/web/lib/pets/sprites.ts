/**
 * Sprites ilustrados reales (ver mascotas/ en la raíz del repo — assets
 * fuente sin normalizar — y scripts/normalize-pet-sprites.mjs, que los
 * procesa hacia acá). Se van sumando especie por especie; mientras una
 * especie no tenga sprites, PetCompanion cae al ilustración SVG estática.
 */
const SPECIES_WITH_SPRITES = new Set(["dog"]);

export type SpritePose = "idle" | "move-1" | "move-2" | "move-3";

export function hasSprite(species: string): boolean {
  return SPECIES_WITH_SPRITES.has(species);
}

export function spriteUrl(species: string, key: string, pose: SpritePose): string {
  return `/pets/sprites/${species}/${key}/${pose}.png`;
}
