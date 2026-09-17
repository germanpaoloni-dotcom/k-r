/**
 * Simulación: crea varios Orbes ("Mirá esto") de contactos ficticios ya
 * seedeados (ver seed-demo-contacts.ts) para poder ver la barra de Orbes
 * con contenido real, y le otorga créditos de prueba a la cuenta objetivo
 * para probar el panel de personalización de mascota.
 *
 * Uso: npm run seed:demo-orbes -- tu-email@ejemplo.com
 * Para borrar los Orbes creados acá (y los contactos): npm run unseed:demo-contacts
 */
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, gossipCredits } from "../db/schema.js";
import { createMiraEsto } from "../domains/mira-esto/service.js";

const TARGET_EMAIL: string = process.argv[2] ?? "";
if (!TARGET_EMAIL) {
  console.error("Uso: npm run seed:demo-orbes -- tu-email@ejemplo.com");
  process.exit(1);
}

const CREDITS_GRANT = 200_000;

const ORBES = [
  { username: "demo_valen", contentType: "mixed" as const, text: "Tarde de café ☕", img: "orb-valen-1" },
  { username: "demo_nico", contentType: "text" as const, text: "¿Alguien se copa para un asado el finde?" },
  { username: "demo_cami", contentType: "mixed" as const, text: "Ensayo de hoy 💃", img: "orb-cami-1" },
  { username: "demo_tomi", contentType: "mixed" as const, text: "Sonando fuerte esta noche 🎸", img: "orb-tomi-1" },
  { username: "demo_sofi", contentType: "mixed" as const, text: "Subiendo al mirador otra vez 🏔️", img: "orb-sofi-1" },
  { username: "demo_luli", contentType: "text" as const, text: "Mate + Figma = domingo perfecto" },
];

async function run() {
  const [target] = await db.select().from(users).where(eq(users.email, TARGET_EMAIL));
  if (!target) {
    console.error(`✗ No existe ninguna cuenta con el email ${TARGET_EMAIL}. Registrala primero desde la app.`);
    process.exit(1);
  }
  console.log(`→ Cuenta: @${target.username} (${target.email})`);

  await db.insert(gossipCredits).values({
    userId: target.id,
    delta: CREDITS_GRANT,
    reason: "manual_test_grant",
  });
  console.log(`✓ +${CREDITS_GRANT.toLocaleString("es-AR")} créditos otorgados`);

  const usernames = ORBES.map((o) => o.username);
  const contacts = await db.select().from(users).where(inArray(users.username, usernames));
  const byUsername = new Map(contacts.map((c) => [c.username, c]));

  let created = 0;
  for (const o of ORBES) {
    const contact = byUsername.get(o.username);
    if (!contact) {
      console.warn(`  ? @${o.username} no existe todavía — corré antes npm run seed:demo-contacts -- ${TARGET_EMAIL}`);
      continue;
    }
    await createMiraEsto(contact.id, {
      contentType: o.contentType,
      text: o.text,
      media: o.img ? { type: "image", url: `https://picsum.photos/seed/gossip-${o.img}/900/1400` } : undefined,
      ttlHours: 24,
    });
    created++;
    console.log(`  ✓ Orbe de @${o.username}`);
  }

  console.log(`\n✓ Listo. ${created} Orbes creados para que aparezcan en tu barra de Inicio.`);
}

run()
  .catch((err) => {
    console.error("✗ Falló:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
