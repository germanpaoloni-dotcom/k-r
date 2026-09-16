/**
 * Borra los contactos ficticios creados por seed-demo-contacts.ts — cualquier
 * usuario con username que empieza con "demo_". El borrado de `users` cascadea
 * posts/media/follows/friendships/mensajes/likes/comments (ver schema.ts,
 * casi todas las FK a users.id tienen onDelete: "cascade"), así que no hace
 * falta borrar nada más a mano.
 */
import "dotenv/config";
import { like } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

async function run() {
  const toDelete = await db.select({ id: users.id, username: users.username }).from(users).where(like(users.username, "demo\\_%"));

  if (toDelete.length === 0) {
    console.log("→ No hay contactos de prueba para borrar.");
    return;
  }

  await db.delete(users).where(like(users.username, "demo\\_%"));
  console.log(`✓ Borrados ${toDelete.length} contactos de prueba: ${toDelete.map((u) => "@" + u.username).join(", ")}`);
}

run()
  .catch((err) => {
    console.error("✗ Falló el borrado:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
