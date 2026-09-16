/**
 * Marca como "paid" los payouts programados (`scheduledAt`) cuya fecha ya
 * pasó — simula la liquidación real hacia el negocio (Fase 8: la
 * transferencia de fondos en sí sigue siendo mock, igual que el resto del
 * checkout hasta que haya credenciales de Mercado Pago). Pensado para correr
 * como job periódico (BullMQ/cron); por ahora es un script standalone:
 * `npm run settle:payouts`.
 */
import "dotenv/config";
import { and, eq, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { payouts } from "../db/schema.js";

async function run() {
  const due = await db
    .select({ id: payouts.id })
    .from(payouts)
    .where(and(eq(payouts.status, "pending"), lte(payouts.scheduledAt, new Date())));

  if (due.length === 0) {
    console.log("→ No hay payouts para liquidar.");
    return;
  }

  for (const p of due) {
    await db.update(payouts).set({ status: "paid", paidAt: new Date() }).where(eq(payouts.id, p.id));
  }

  console.log(`✓ Liquidados ${due.length} payouts.`);
}

run().catch((err) => {
  console.error("✗ Falló la liquidación de payouts:", err);
  process.exit(1);
});
