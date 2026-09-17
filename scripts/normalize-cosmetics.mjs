// Normaliza los accesorios aislados (mascotas/accesorios/*.png) a PNG
// recortados a su propio contenido, listos para posicionar por CSS/JS.
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.resolve("apps/web/public/pets/cosmetics");
const MAX_DIM = 480;

const FILES = {
  "gorra.png": "gorra",
  "galera.png": "galera",
  "corona.png": "corona",
  "anteojos de sol.png": "anteojos-sol",
  "anteojos.png": "anteojos-nerd",
  "antiparras.png": "antiparras",
  "bufanda.png": "bufanda",
  "remera deportiva.png": "remera",
  "campera.png": "campera",
};

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const [src, key] of Object.entries(FILES)) {
    const trimmed = await sharp(path.join("mascotas/accesorios", src))
      .trim({ threshold: 10 })
      .toBuffer({ resolveWithObject: true });
    const { width, height } = trimmed.info;
    const scale = Math.min(1, MAX_DIM / Math.max(width, height));
    const outW = Math.round(width * scale);
    const outH = Math.round(height * scale);
    await sharp(trimmed.data).resize(outW, outH).toFile(path.join(OUT_DIR, `${key}.png`));
    console.log(`✓ ${key}.png (${outW}x${outH}, aspect ${(outW / outH).toFixed(2)})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
