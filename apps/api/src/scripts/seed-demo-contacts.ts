/**
 * Simulación: crea 10 contactos ficticios que siguen, son amigos de, postean
 * cerca de y le escriben a una cuenta real (por email). Pensado para una
 * demo — todos los usuarios creados acá tienen username con prefijo "demo_",
 * así `npm run unseed:demo-contacts` los puede encontrar y borrar sin tocar
 * nada más (el borrado de `users` cascadea posts/follows/friendships/
 * mensajes/likes/comments — son las únicas filas que tocan estos usuarios).
 *
 * Uso: npm run seed:demo-contacts -- tu-email@ejemplo.com
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, locations, posts } from "../db/schema.js";
import { follow } from "../domains/follows/service.js";
import { requestFriendship, acceptFriendship } from "../domains/friendships/service.js";
import { createPost } from "../domains/social/service.js";
import { likePost } from "../domains/social/service.js";
import { getOrCreateDirectConversation, sendMessage } from "../domains/messaging/service.js";

const TARGET_EMAIL: string = process.argv[2] ?? "";
if (!TARGET_EMAIL) {
  console.error("Uso: npm run seed:demo-contacts -- tu-email@ejemplo.com");
  process.exit(1);
}

const CONTACTS = [
  { name: "Valentina Torres", username: "demo_valen", bio: "Fotografía y café ☕" },
  { name: "Nicolás Ibarra", username: "demo_nico", bio: "Siempre buscando el próximo asado 🥩" },
  { name: "Camila Rojas", username: "demo_cami", bio: "Bailarina, amante del arte urbano" },
  { name: "Tomás Vargas", username: "demo_tomi", bio: "Ingeniero de día, guitarrista de noche 🎸" },
  { name: "Sofía Medina", username: "demo_sofi", bio: "Mochilera del norte argentino 🏔️" },
  { name: "Martín Quispe", username: "demo_martu", bio: "Cocino, corro y publico demasiado" },
  { name: "Lucía Fernández", username: "demo_luli", bio: "Diseñadora gráfica, mate en mano" },
  { name: "Franco Castro", username: "demo_fran", bio: "Fútbol los domingos, nada más importa" },
  { name: "Agustina Ríos", username: "demo_agus", bio: "Estudiante de arquitectura, ama Jujuy" },
  { name: "Bruno Salazar", username: "demo_bruno", bio: "Emprendedor local, café de especialidad" },
];

const PLACES = [
  { name: "Café Le Blé", lat: -24.1858, lng: -65.2995, city: "San Salvador de Jujuy", category: "cafeteria" },
  { name: "Parque San Martín", lat: -24.1901, lng: -65.3023, city: "San Salvador de Jujuy", category: "parque" },
  { name: "Peatonal Belgrano", lat: -24.1833, lng: -65.3011, city: "San Salvador de Jujuy", category: "comercio" },
  { name: "Mirador Hornocal", lat: -23.1975, lng: -65.5539, city: "San Salvador de Jujuy", category: "turismo" },
];

const CAPTIONS = [
  "Domingo tranquilo por acá ☀️",
  "¿Alguien más sin planes para esta noche?",
  "Encontré este lugar de casualidad y no lo puedo creer",
  "Semana larga, pero valió la pena",
  "Mate, sol y nada más que hacer",
  "Recomendadísimo si pasás por Jujuy",
  "No me cansa esta vista, nunca",
  "Plan improvisado del fin de semana",
  "Volviendo a mis lugares favoritos",
  "Otro día lindo en la ciudad",
];

async function getOrCreatePlace(p: (typeof PLACES)[number]) {
  const [existing] = await db.select().from(locations).where(eq(locations.name, p.name));
  if (existing) return existing;
  const [created] = await db
    .insert(locations)
    .values({ name: p.name, lat: p.lat, lng: p.lng, city: p.city, category: p.category, source: "user" })
    .returning();
  return created!;
}

async function run() {
  const [target] = await db.select().from(users).where(eq(users.email, TARGET_EMAIL));
  if (!target) {
    console.error(`✗ No existe ninguna cuenta con el email ${TARGET_EMAIL}. Registrala primero desde la app.`);
    process.exit(1);
  }
  console.log(`→ Simulando contactos para @${target.username} (${target.email})`);

  const placeRows = await Promise.all(PLACES.map(getOrCreatePlace));
  const passwordHash = await bcrypt.hash("demo12345", 10);

  // Últimos posts reales del target, para que algún contacto los likee.
  const targetPosts = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.userId, target.id))
    .orderBy(desc(posts.createdAt))
    .limit(3);

  let created = 0;
  for (let i = 0; i < CONTACTS.length; i++) {
    const c = CONTACTS[i]!;
    const existing = await db.select().from(users).where(eq(users.username, c.username));
    let contact = existing[0];
    if (!contact) {
      const [inserted] = await db
        .insert(users)
        .values({
          email: `${c.username}@gossip-demo.local`,
          passwordHash,
          username: c.username,
          displayName: c.name,
          bio: c.bio,
        })
        .returning();
      contact = inserted!;
      created++;
    }

    // Mutuo: se siguen entre sí.
    await follow(contact.id, target.id);
    await follow(target.id, contact.id);

    // La mitad, además, quedan como "Mi gente" (amistad aceptada).
    if (i < 5) {
      await requestFriendship(contact.id, target.id);
      await acceptFriendship(target.id, contact.id).catch(() => {}); // ya aceptada en una corrida anterior
    }

    // Un post real, anclado a un lugar de Jujuy.
    const place = placeRows[i % placeRows.length]!;
    const post = await createPost(contact.id, {
      caption: CAPTIONS[i % CAPTIONS.length],
      locationId: place.id,
      visibility: "public",
      media: [{ type: "image", url: `https://picsum.photos/seed/gossip-demo-${c.username}/800/600` }],
    });

    // Los primeros 4 le mandan un mensaje directo al target.
    if (i < 4) {
      const conversationId = await getOrCreateDirectConversation(contact.id, target.id);
      await sendMessage(conversationId, contact.id, { body: `¡Hola! Soy ${c.name.split(" ")[0]} 👋` });
      await sendMessage(conversationId, contact.id, {
        body: "Te agregué como contacto de prueba — esto es una simulación.",
      });
    }

    // Los primeros 3 likean un post real del target, si tiene.
    if (i < 3 && targetPosts[i]) {
      await likePost(targetPosts[i]!.id, contact.id).catch(() => {});
    }

    console.log(`  ✓ @${c.username} — sigue, ${i < 5 ? "amigo, " : ""}${i < 4 ? "escribió, " : ""}posteó`);
  }

  console.log(`\n✓ Listo. ${created} contactos nuevos (el resto ya existía). Para borrarlos: npm run unseed:demo-contacts`);
}

run()
  .catch((err) => {
    console.error("✗ Falló la simulación:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
