// Calcula, para cada mascota con sprite real, cuánto se corre horizontalmente
// el centro de la cabeza y el centro del torso respecto del centro del
// lienzo (que es donde asume la posición base de gorro/anteojos/ropa). Hace
// falta porque en poses de costado (ej. de perfil, cuerpo alargado) el
// centro de TODO el cuerpo no coincide con el centro de la cabeza — sin esto
// los accesorios quedan visiblemente descentrados en esas poses.
//
// Uso: node scripts/calibrate-pet-anchors.mjs
// Regenera apps/web/lib/pets/cosmeticAnchors.ts — correr de nuevo cada vez
// que se sume o reemplace un sprite "idle" de alguna mascota.
import { readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SPRITES_ROOT = path.resolve("apps/web/public/pets/sprites");
const OUT_FILE = path.resolve("apps/web/lib/pets/cosmeticAnchors.ts");
const CANVAS = 360;

// Mismas franjas Y usadas para calibrar hat/glasses (cabeza) y outfit
// (torso) — ver lib/pets/cosmeticArt.ts para las coordenadas de referencia.
const BANDS = {
  head: { top: 40, bottom: 160 },
  torso: { top: 180, bottom: 260 },
};

async function centerOffsetPct(file, band) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const yStart = Math.max(0, band.top);
  const yEnd = Math.min(height, band.bottom);
  let sum = 0;
  let count = 0;
  for (let y = yStart; y < yEnd; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] > 40) {
        sum += x;
        count++;
      }
    }
  }
  const centerX = count > 0 ? sum / count : width / 2;
  return (centerX - CANVAS / 2) / CANVAS;
}

async function main() {
  const anchors = {};
  const species = readdirSync(SPRITES_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const speciesDir of species) {
    const pets = readdirSync(path.join(SPRITES_ROOT, speciesDir.name), { withFileTypes: true }).filter((d) =>
      d.isDirectory()
    );
    for (const petDir of pets) {
      const idlePath = path.join(SPRITES_ROOT, speciesDir.name, petDir.name, "idle.png");
      try {
        const headOffsetPct = await centerOffsetPct(idlePath, BANDS.head);
        const torsoOffsetPct = await centerOffsetPct(idlePath, BANDS.torso);
        anchors[petDir.name] = {
          head: Math.round(headOffsetPct * 1000) / 1000,
          torso: Math.round(torsoOffsetPct * 1000) / 1000,
        };
        console.log(`✓ ${petDir.name}: head=${anchors[petDir.name].head} torso=${anchors[petDir.name].torso}`);
      } catch {
        console.warn(`? sin idle.png para ${speciesDir.name}/${petDir.name} — se salta`);
      }
    }
  }

  const body = `/**
 * Generado por scripts/calibrate-pet-anchors.mjs — no editar a mano.
 * Corrección horizontal (como fracción del ancho del lienzo) para que
 * gorro/anteojos ("head") y ropa ("torso") queden centrados en la cabeza o
 * el torso reales de cada mascota, no en el centro geométrico de todo el
 * sprite (que en poses de costado no coincide).
 */
export const PET_COSMETIC_ANCHORS: Record<string, { head: number; torso: number }> = ${JSON.stringify(anchors, null, 2)};

export function anchorOffsetFor(petKey: string, kind: "head" | "torso"): number {
  return PET_COSMETIC_ANCHORS[petKey]?.[kind] ?? 0;
}
`;
  writeFileSync(OUT_FILE, body);
  console.log(`\n✓ Escrito ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
