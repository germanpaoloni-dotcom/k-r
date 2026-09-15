/**
 * Borra en forma permanente (no soft-delete) los Mirá esto vencidos y su
 * media asociada — la privacidad de "efímero" exige que realmente desaparezca,
 * no que quede oculto en la base. Pensado para correr como job periódico
 * (BullMQ/cron); por ahora es un script standalone: `npm run cleanup:mira-esto`.
 *
 * No borra los que fueron promovidos a post (promotedToPostId no nulo): esos
 * ya viven como post permanente y su media fue reasignada, no referenciada
 * por el mira_esto vencido.
 */
import "dotenv/config";
import { and, inArray, isNull, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { miraEsto, media } from "../db/schema.js";

async function run() {
  const expired = await db
    .select({ id: miraEsto.id, mediaId: miraEsto.mediaId })
    .from(miraEsto)
    .where(and(lt(miraEsto.expiresAt, new Date()), isNull(miraEsto.promotedToPostId)));

  if (expired.length === 0) {
    console.log("→ No hay Mirá esto vencidos para borrar.");
    return;
  }

  const ids = expired.map((r) => r.id);
  const mediaIds = expired.map((r) => r.mediaId).filter((v): v is string => v !== null);

  // El mira_esto primero: media_id es FK sin cascade, así que hay que soltar
  // la referencia antes de poder borrar el archivo de media.
  await db.delete(miraEsto).where(inArray(miraEsto.id, ids));
  if (mediaIds.length > 0) {
    await db.delete(media).where(inArray(media.id, mediaIds));
  }

  console.log(`✓ Borrados ${ids.length} Mirá esto vencidos y ${mediaIds.length} archivos de media asociados.`);
}

run()
  .catch((err) => {
    console.error("✗ Falló la limpieza:", err);
    process.exit(1);
  })
  .finally(() => {
    // El pool de conexión de Drizzle no expone un close directo acá porque
    // se comparte con db/index.ts; en un cron real esto corre en su propio
    // proceso de vida corta y el proceso termina solo.
  });
