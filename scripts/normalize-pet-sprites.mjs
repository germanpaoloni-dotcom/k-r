// Normaliza los sprites crudos que van llegando en D:\Kör\mascotas\<especie>\<Nombre>\
// (nombres de archivo libres, tamaños de lienzo inconsistentes entre sí) a un
// set de 4 PNG con el mismo tamaño de lienzo y el mismo anclaje (centrado,
// apoyado abajo), listos para el motor de animación en apps/web/public.
//
// Uso: node scripts/normalize-pet-sprites.mjs
import { readdirSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve("mascotas");
const OUT_ROOT = path.resolve("apps/web/public/pets/sprites");
const CANVAS = 360; // lienzo cuadrado final
const TARGET_HEIGHT = 300; // alto del personaje ya recortado, dentro del lienzo
const BOTTOM_MARGIN = 18; // separación entre la base del personaje y el borde inferior

// especie (nombre de carpeta en español) -> key interno usado por el catálogo
const SPECIES_TO_FOLDER = { dog: "perro", cat: "gato", dragon: "dragon", rabbit: "conejo", bird: "ave" };
// nombre de mascota (carpeta, con mayúscula) -> key interno del catálogo (pet_definitions.key)
const NAME_TO_KEY = {
  Robby: "robby", Toby: "toby", Choco: "choco", Rocky: "rocky", Nala: "nala",
  Luna: null, // ambiguo (hay Luna gato y Luna ave) — se resuelve por especie más abajo
  Michi: "michi", Niebla: "niebla", Kira: "kira-cat", Sombra: "sombra",
  Zyro: "zyro", Nox: "nox", Lumen: "lumen", Fulgor: "fulgor", Vulcan: "vulcan",
  Nube: "nube", Copito: "copito", Moka: "moka", Chispa: "chispa", Pixel: "pixel",
  Pico: "pico", Sol: "sol", Kiwi: "kiwi", Trueno: "trueno",
};
const LUNA_KEY_BY_SPECIES = { cat: "luna-cat", bird: "luna-bird" };

function poseFromFilename(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes("idle")) return "idle";
  if (lower.includes("move 1") || lower.includes("move-1")) return "move-1";
  if (lower.includes("move 2") || lower.includes("move-2")) return "move-2";
  if (lower.includes("move 3") || lower.includes("move-3")) return "move-3";
  return null;
}

async function normalizeOne(srcPath, destPath) {
  const img = sharp(srcPath).ensureAlpha();
  const trimmed = await img.trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });
  const meta = trimmed.info;
  const maxWidth = CANVAS - 24; // deja un margen lateral mínimo

  // Encoge por alto (TARGET_HEIGHT) salvo que eso lo haga más ancho que el
  // lienzo permite — ahí encoge por ancho en su lugar (algunas poses salen
  // bien más anchas que altas, ej. planeando).
  let scale = TARGET_HEIGHT / meta.height;
  if (meta.width * scale > maxWidth) scale = maxWidth / meta.width;

  const targetWidth = Math.max(1, Math.round(meta.width * scale));
  const targetHeight = Math.max(1, Math.round(meta.height * scale));

  const resized = await sharp(trimmed.data)
    .resize({ width: targetWidth, height: targetHeight, fit: "fill" })
    .toBuffer();

  const left = Math.round((CANVAS - targetWidth) / 2);
  const top = CANVAS - targetHeight - BOTTOM_MARGIN;

  await sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, left: Math.max(0, left), top: Math.max(0, top) }])
    .png()
    .toFile(destPath);
}

async function main() {
  const speciesDirs = readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
  let done = 0;

  for (const speciesDir of speciesDirs) {
    const speciesFolder = speciesDir.name; // "perro", "gato", etc.
    const species = Object.entries(SPECIES_TO_FOLDER).find(([, v]) => v === speciesFolder)?.[0];
    if (!species) continue;

    const petDirs = readdirSync(path.join(ROOT, speciesFolder), { withFileTypes: true }).filter((d) =>
      d.isDirectory()
    );

    for (const petDir of petDirs) {
      const name = petDir.name; // "Robby", "Luna", ...
      const key = name === "Luna" ? LUNA_KEY_BY_SPECIES[species] : NAME_TO_KEY[name];
      if (!key) {
        console.warn(`? sin key para ${speciesFolder}/${name} — se salta`);
        continue;
      }

      const petPath = path.join(ROOT, speciesFolder, name);
      const files = readdirSync(petPath).filter((f) => f.toLowerCase().endsWith(".png"));
      const outDir = path.join(OUT_ROOT, species, key);
      let foundAny = false;

      for (const file of files) {
        const pose = poseFromFilename(file);
        if (!pose) continue;
        foundAny = true;
        mkdirSync(outDir, { recursive: true });
        const destPath = path.join(outDir, `${pose}.png`);
        await normalizeOne(path.join(petPath, file), destPath);
        done++;
      }
      if (foundAny) console.log(`✓ ${species}/${key}`);
    }
  }
  console.log(`Listo — ${done} imágenes normalizadas en ${OUT_ROOT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
