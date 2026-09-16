import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { MultipartFile } from "@fastify/multipart";

export class UploadError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
const MAX_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME_PREFIXES = ["image/", "video/"];
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export interface SavedUpload {
  filename: string;
  type: "image" | "video";
}

/**
 * Guarda un archivo subido por multipart a disco local — sin servicio de
 * storage/CDN todavía (ver README), pero ya es una subida real desde el
 * dispositivo del usuario, no una URL pegada a mano.
 */
export async function saveUpload(file: MultipartFile): Promise<SavedUpload> {
  if (!ALLOWED_MIME_PREFIXES.some((p) => file.mimetype.startsWith(p))) {
    throw new UploadError(400, "Solo se aceptan imágenes o videos.");
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of file.file) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BYTES) {
      throw new UploadError(400, "El archivo supera el límite de 25MB.");
    }
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  const ext = EXT_BY_MIME[file.mimetype] ?? path.extname(file.filename) ?? "";
  const filename = `${randomUUID()}${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return { filename, type: file.mimetype.startsWith("video/") ? "video" : "image" };
}

export { UPLOAD_DIR };
