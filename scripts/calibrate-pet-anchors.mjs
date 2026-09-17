// Calcula, para cada mascota con sprite real y CADA POSE (idle/move-1/
// move-2/move-3), dónde va cada accesorio:
// - Horizontal (head/torso): centro real de la cabeza/torso en esa pose —
//   en poses de costado o de movimiento el centro de TODO el cuerpo no
//   coincide con el de la cabeza.
// - Vertical de gorro/anteojos: se ancla a la fila más ancha de la cabeza
//   (donde están las orejas) en vez de una coordenada fija — algunas poses
//   de movimiento (ej. un aterrizaje agachado) tienen la cabeza mucho más
//   abajo que en la pose idle, y una coordenada fija la deja flotando.
//   La ropa no lo necesita: su posición vertical se mantiene estable entre
//   poses.
//
// Uso: node scripts/calibrate-pet-anchors.mjs
// Regenera apps/web/lib/pets/cosmeticAnchors.ts — correr de nuevo cada vez
// que se sume o reemplace algún sprite de alguna mascota.
import { readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SPRITES_ROOT = path.resolve("apps/web/public/pets/sprites");
const OUT_FILE = path.resolve("apps/web/lib/pets/cosmeticAnchors.ts");
const CANVAS = 360;
const POSES = ["idle", "move-1", "move-2", "move-3"];

const BANDS = {
  head: { top: 40, bottom: 160 },
  torso: { top: 180, bottom: 260 },
};
const HEAD_WIDEST_SEARCH = { top: 30, bottom: 220 };
// Calibrado contra robby/idle (resultado verificado visualmente): la fila
// más ancha de la cabeza quedó en y=141; el gorro (ancla "bottom") se veía
// bien en y=96 y los anteojos (ancla "center") en y=143.
const HAT_MARGIN_ABOVE_WIDEST = 45;
const GLASSES_MARGIN_BELOW_WIDEST = 2;

async function loadAlpha(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

function centerOffsetPct({ data, width, height, channels }, band) {
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
  return Math.round(((centerX - CANVAS / 2) / CANVAS) * 1000) / 1000;
}

function widestRow({ data, width, height, channels }, band) {
  const yStart = Math.max(0, band.top);
  const yEnd = Math.min(height, band.bottom);
  let bestY = yStart;
  let bestWidth = 0;
  for (let y = yStart; y < yEnd; y++) {
    let minX = width;
    let maxX = -1;
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] > 40) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    const w = maxX - minX;
    if (w > bestWidth) {
      bestWidth = w;
      bestY = y;
    }
  }
  return bestY;
}

async function main() {
  const anchors = {};
  const species = readdirSync(SPRITES_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const speciesDir of species) {
    const pets = readdirSync(path.join(SPRITES_ROOT, speciesDir.name), { withFileTypes: true }).filter((d) =>
      d.isDirectory()
    );
    for (const petDir of pets) {
      const petPath = path.join(SPRITES_ROOT, speciesDir.name, petDir.name);
      const perPose = {};
      for (const pose of POSES) {
        const posePath = path.join(petPath, `${pose}.png`);
        try {
          const alpha = await loadAlpha(posePath);
          const headWidestY = widestRow(alpha, HEAD_WIDEST_SEARCH);
          perPose[pose] = {
            head: centerOffsetPct(alpha, BANDS.head),
            torso: centerOffsetPct(alpha, BANDS.torso),
            hatY: headWidestY - HAT_MARGIN_ABOVE_WIDEST,
            glassesY: headWidestY + GLASSES_MARGIN_BELOW_WIDEST,
          };
        } catch {
          // esta pose no existe todavía para esta mascota — se omite
        }
      }
      if (Object.keys(perPose).length > 0) {
        anchors[petDir.name] = perPose;
        console.log(`✓ ${petDir.name}:`, JSON.stringify(perPose));
      }
    }
  }

  const body = `/**
 * Generado por scripts/calibrate-pet-anchors.mjs — no editar a mano.
 * Por mascota y por pose (idle/move-1/move-2/move-3):
 * - head/torso: corrección horizontal (fracción del ancho del lienzo) para
 *   centrar gorro+anteojos ("head") o ropa ("torso") en la cabeza/torso
 *   reales, no en el centro geométrico de todo el sprite.
 * - hatY/glassesY: posición vertical del gorro/anteojos, anclada a la fila
 *   más ancha de la cabeza en ESA pose (algunas poses de movimiento tienen
 *   la cabeza mucho más abajo que en idle).
 */
export type PetPose = "idle" | "move-1" | "move-2" | "move-3";

interface PoseAnchor {
  head: number;
  torso: number;
  hatY: number;
  glassesY: number;
}

export const PET_COSMETIC_ANCHORS: Record<string, Partial<Record<PetPose, PoseAnchor>>> = ${JSON.stringify(anchors, null, 2)};

export function anchorOffsetFor(petKey: string, kind: "head" | "torso", pose: PetPose = "idle"): number {
  return PET_COSMETIC_ANCHORS[petKey]?.[pose]?.[kind] ?? PET_COSMETIC_ANCHORS[petKey]?.idle?.[kind] ?? 0;
}

/** Y absoluto (sobre un lienzo de 360px) para el ancla del gorro o los
 * anteojos en esa pose — null si no hay calibración (se usa el valor fijo
 * de respaldo definido en cosmeticArt.ts). */
export function headAnchorYFor(petKey: string, item: "hatY" | "glassesY", pose: PetPose = "idle"): number | null {
  return PET_COSMETIC_ANCHORS[petKey]?.[pose]?.[item] ?? PET_COSMETIC_ANCHORS[petKey]?.idle?.[item] ?? null;
}
`;
  writeFileSync(OUT_FILE, body);
  console.log(`\n✓ Escrito ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
