/**
 * Moderación centralizada. Regla dura (kor-arquitectura-v2.1.md
 * §"Moderación"): ningún dominio de contenido nuevo puede saltear esta
 * tabla — un reporte sobre cualquier target (post, mira_esto, comment,
 * user, evento, producto...) siempre pasa por `reportContent`, que
 * mantiene tanto el detalle (`reports`, uno por reporte) como el estado
 * agregado por target (`content_moderation`, uno por target).
 *
 * `resolveModeration` es deliberadamente simple (cualquier usuario
 * autenticado puede resolver) porque todavía no existe un rol de
 * admin/moderador en el schema — eso es un ítem pendiente explícito para
 * antes de producción, no un olvido. Ver DECISIONS.md cuando exista.
 */
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { reports, contentModeration } from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";

export class ModerationError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

async function getOrCreateModerationRow(targetType: string, targetId: string) {
  const [existing] = await db
    .select()
    .from(contentModeration)
    .where(and(eq(contentModeration.targetType, targetType), eq(contentModeration.targetId, targetId)));
  if (existing) return existing;
  return firstOrThrow(
    await db.insert(contentModeration).values({ targetType, targetId }).returning()
  );
}

export async function reportContent(
  reporterId: string,
  targetType: string,
  targetId: string,
  reason: string
) {
  const report = firstOrThrow(
    await db.insert(reports).values({ targetType, targetId, reporterId, reason }).returning()
  );

  const moderationRow = await getOrCreateModerationRow(targetType, targetId);
  await db
    .update(contentModeration)
    .set({
      reportsCount: moderationRow.reportsCount + 1,
      lastReportedAt: new Date(),
      status: moderationRow.status === "clean" ? "flagged" : moderationRow.status,
    })
    .where(eq(contentModeration.id, moderationRow.id));

  return report;
}

export async function getModerationStatus(targetType: string, targetId: string) {
  const [row] = await db
    .select()
    .from(contentModeration)
    .where(and(eq(contentModeration.targetType, targetType), eq(contentModeration.targetId, targetId)));
  return row ?? null;
}

export async function listQueue(status: "flagged" | "under_review" = "flagged", limit = 50) {
  return db
    .select()
    .from(contentModeration)
    .where(eq(contentModeration.status, status))
    .orderBy(desc(contentModeration.lastReportedAt))
    .limit(limit);
}

export async function resolveModeration(
  moderationId: string,
  resolverId: string,
  outcome: "clean" | "removed" | "under_review"
) {
  const [row] = await db.select().from(contentModeration).where(eq(contentModeration.id, moderationId));
  if (!row) throw new ModerationError(404, "No encontrado.");
  const [updated] = await db
    .update(contentModeration)
    .set({ status: outcome, resolvedBy: resolverId, resolvedAt: new Date() })
    .where(eq(contentModeration.id, moderationId))
    .returning();
  return updated;
}
