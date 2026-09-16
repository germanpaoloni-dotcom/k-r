import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  games,
  gameSessions,
  gameAnswers,
  korCredits,
  orbCosmetics,
  badges,
  pets,
  petDefinitions,
  inventory,
  groups,
  groupMembers,
} from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";

export class PlayError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

/* ---------------------------------------------------------------------- */
/* Juegos                                                                   */
/* ---------------------------------------------------------------------- */

export interface CreateGameInput {
  key: string;
  name: string;
  rules?: Record<string, unknown>;
  durationSeconds?: number;
}

export async function createGame(input: CreateGameInput) {
  if (!input.key.trim() || !input.name.trim()) {
    throw new PlayError(400, "El juego necesita key y nombre.");
  }
  const [existing] = await db.select().from(games).where(eq(games.key, input.key.trim()));
  if (existing) throw new PlayError(400, "Ya existe un juego con esa key.");

  return firstOrThrow(
    await db
      .insert(games)
      .values({
        key: input.key.trim(),
        name: input.name.trim(),
        rules: input.rules ?? {},
        durationSeconds: input.durationSeconds ?? null,
      })
      .returning()
  );
}

export async function listGames(limit = 30) {
  return db.select().from(games).where(eq(games.active, true)).orderBy(desc(games.createdAt)).limit(limit);
}

export async function getGameById(id: string) {
  const [game] = await db.select().from(games).where(eq(games.id, id));
  return game ?? null;
}

/* ---------------------------------------------------------------------- */
/* Sesiones de juego                                                        */
/* ---------------------------------------------------------------------- */

export type SessionContextType = "solo" | "dm" | "group" | "event";
const CONTEXT_TYPES: SessionContextType[] = ["solo", "dm", "group", "event"];

export interface CreateSessionInput {
  contextType: string;
  contextId?: string;
}

export async function createSession(gameId: string, userId: string, input: CreateSessionInput) {
  const game = await getGameById(gameId);
  if (!game) throw new PlayError(404, "Juego no encontrado.");
  if (!CONTEXT_TYPES.includes(input.contextType as SessionContextType)) {
    throw new PlayError(400, "contextType inválido (solo | dm | group | event).");
  }
  if (input.contextType !== "solo" && !input.contextId) {
    throw new PlayError(400, "contextId es obligatorio salvo en partidas 'solo'.");
  }
  if (input.contextType === "group" && input.contextId) {
    const [group] = await db.select().from(groups).where(eq(groups.id, input.contextId));
    if (!group) throw new PlayError(400, "El grupo de la sesión no existe.");
  }

  return firstOrThrow(
    await db
      .insert(gameSessions)
      .values({
        gameId,
        contextType: input.contextType,
        contextId: input.contextId ?? null,
        status: "waiting",
        createdBy: userId,
      })
      .returning()
  );
}

export async function getSessionById(id: string) {
  const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, id));
  return session ?? null;
}

export interface ListSessionsParams {
  contextType?: string;
  contextId?: string;
  status?: string;
  limit?: number;
}

export async function listSessions(gameId: string, params: ListSessionsParams = {}) {
  const conditions = [eq(gameSessions.gameId, gameId)];
  if (params.contextType) conditions.push(eq(gameSessions.contextType, params.contextType));
  if (params.contextId) conditions.push(eq(gameSessions.contextId, params.contextId));
  if (params.status) conditions.push(eq(gameSessions.status, params.status));
  return db
    .select()
    .from(gameSessions)
    .where(and(...conditions))
    .orderBy(desc(gameSessions.createdAt))
    .limit(params.limit ?? 30);
}

export async function startSession(sessionId: string, userId: string) {
  const session = await getSessionById(sessionId);
  if (!session) throw new PlayError(404, "Sesión no encontrada.");
  if (session.createdBy !== userId) throw new PlayError(400, "Solo quien creó la sesión puede iniciarla.");
  if (session.status !== "waiting") throw new PlayError(400, "La sesión ya fue iniciada o terminó.");

  return firstOrThrow(
    await db
      .update(gameSessions)
      .set({ status: "active", startedAt: new Date() })
      .where(eq(gameSessions.id, sessionId))
      .returning()
  );
}

export async function endSession(sessionId: string, userId: string) {
  const session = await getSessionById(sessionId);
  if (!session) throw new PlayError(404, "Sesión no encontrada.");
  if (session.createdBy !== userId) throw new PlayError(400, "Solo quien creó la sesión puede terminarla.");
  if (session.status === "ended") throw new PlayError(400, "La sesión ya está terminada.");

  return firstOrThrow(
    await db
      .update(gameSessions)
      .set({ status: "ended", endedAt: new Date() })
      .where(eq(gameSessions.id, sessionId))
      .returning()
  );
}

const CREDITS_PER_CORRECT_ANSWER = 10;

export interface SubmitAnswerInput {
  answer: Record<string, unknown>;
  isCorrect?: boolean;
}

/**
 * Registra una respuesta y, si es correcta, acredita Kör Créditos (ledger
 * append-only, ver kor_credits) y otorga el badge "primer_acierto" la
 * primera vez que un usuario acierta algo (idempotente vía inventory).
 */
export async function submitAnswer(sessionId: string, userId: string, input: SubmitAnswerInput) {
  const session = await getSessionById(sessionId);
  if (!session) throw new PlayError(404, "Sesión no encontrada.");
  if (session.status !== "active") throw new PlayError(400, "La sesión no está activa.");

  const creditsAwarded = input.isCorrect ? CREDITS_PER_CORRECT_ANSWER : 0;

  const answer = firstOrThrow(
    await db
      .insert(gameAnswers)
      .values({
        sessionId,
        userId,
        answer: input.answer,
        isCorrect: input.isCorrect ?? null,
        creditsAwarded,
      })
      .returning()
  );

  if (creditsAwarded > 0) {
    await db.insert(korCredits).values({
      userId,
      delta: creditsAwarded,
      reason: "game_correct_answer",
      refType: "game_session",
      refId: sessionId,
    });
    await awardBadge(userId, "primer_acierto");
  }

  return answer;
}

export async function listSessionAnswers(sessionId: string) {
  return db
    .select()
    .from(gameAnswers)
    .where(eq(gameAnswers.sessionId, sessionId))
    .orderBy(desc(gameAnswers.createdAt));
}

/* ---------------------------------------------------------------------- */
/* Kör Créditos — ledger append-only, nunca balance mutable                 */
/* ---------------------------------------------------------------------- */

export async function getBalance(userId: string): Promise<number> {
  const rows = await db
    .select({ balance: sql<number>`coalesce(sum(${korCredits.delta}), 0)::int` })
    .from(korCredits)
    .where(eq(korCredits.userId, userId));
  return rows[0]?.balance ?? 0;
}

export async function getCreditsHistory(userId: string, limit = 30) {
  return db
    .select()
    .from(korCredits)
    .where(eq(korCredits.userId, userId))
    .orderBy(desc(korCredits.createdAt))
    .limit(limit);
}

/* ---------------------------------------------------------------------- */
/* Cosméticos                                                               */
/* ---------------------------------------------------------------------- */

export async function listCosmetics(limit = 50) {
  return db.select().from(orbCosmetics).orderBy(orbCosmetics.creditsCost).limit(limit);
}

export async function buyCosmetic(cosmeticId: string, userId: string) {
  const [cosmetic] = await db.select().from(orbCosmetics).where(eq(orbCosmetics.id, cosmeticId));
  if (!cosmetic) throw new PlayError(404, "Cosmético no encontrado.");

  const [owned] = await db
    .select()
    .from(inventory)
    .where(
      and(eq(inventory.userId, userId), eq(inventory.itemType, "cosmetic"), eq(inventory.itemId, cosmeticId))
    );
  if (owned) throw new PlayError(400, "Ya tenés este cosmético.");

  const balance = await getBalance(userId);
  if (balance < cosmetic.creditsCost) throw new PlayError(400, "Créditos insuficientes.");

  await db.transaction(async (tx) => {
    await tx.insert(korCredits).values({
      userId,
      delta: -cosmetic.creditsCost,
      reason: "cosmetic_purchase",
      refType: "orb_cosmetic",
      refId: cosmeticId,
    });
    await tx.insert(inventory).values({ userId, itemType: "cosmetic", itemId: cosmeticId });
  });

  return cosmetic;
}

/* ---------------------------------------------------------------------- */
/* Badges                                                                    */
/* ---------------------------------------------------------------------- */

export async function createBadge(input: { key: string; name: string; description?: string; iconUrl?: string }) {
  if (!input.key.trim() || !input.name.trim()) throw new PlayError(400, "El badge necesita key y nombre.");
  const [existing] = await db.select().from(badges).where(eq(badges.key, input.key.trim()));
  if (existing) throw new PlayError(400, "Ya existe un badge con esa key.");

  return firstOrThrow(
    await db
      .insert(badges)
      .values({
        key: input.key.trim(),
        name: input.name.trim(),
        description: input.description ?? null,
        iconUrl: input.iconUrl ?? null,
      })
      .returning()
  );
}

export async function listBadges(limit = 50) {
  return db.select().from(badges).orderBy(desc(badges.createdAt)).limit(limit);
}

/** Idempotente: si el usuario ya tiene el badge (por key), no hace nada. */
export async function awardBadge(userId: string, badgeKey: string) {
  const [badge] = await db.select().from(badges).where(eq(badges.key, badgeKey));
  if (!badge) return; // badge todavía no seedeado — no rompe el flujo de juego
  await db
    .insert(inventory)
    .values({ userId, itemType: "badge", itemId: badge.id })
    .onConflictDoNothing();
}

/* ---------------------------------------------------------------------- */
/* Inventario                                                               */
/* ---------------------------------------------------------------------- */

export interface InventoryItemDto {
  id: string;
  itemType: string;
  itemId: string;
  acquiredAt: string;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
}

export async function listInventory(userId: string): Promise<InventoryItemDto[]> {
  const rows = await db
    .select()
    .from(inventory)
    .where(eq(inventory.userId, userId))
    .orderBy(desc(inventory.acquiredAt));
  if (rows.length === 0) return [];

  const cosmeticIds = rows.filter((r) => r.itemType === "cosmetic").map((r) => r.itemId);
  const badgeIds = rows.filter((r) => r.itemType === "badge").map((r) => r.itemId);

  const [cosmeticRows, badgeRows] = await Promise.all([
    cosmeticIds.length
      ? db.select().from(orbCosmetics).where(inArray(orbCosmetics.id, cosmeticIds))
      : Promise.resolve([]),
    badgeIds.length ? db.select().from(badges).where(inArray(badges.id, badgeIds)) : Promise.resolve([]),
  ]);
  const cosmeticById = new Map(cosmeticRows.map((c) => [c.id, c]));
  const badgeById = new Map(badgeRows.map((b) => [b.id, b]));

  return rows.map((r) => {
    if (r.itemType === "cosmetic") {
      const c = cosmeticById.get(r.itemId);
      return {
        id: r.id,
        itemType: r.itemType,
        itemId: r.itemId,
        acquiredAt: r.acquiredAt.toISOString(),
        name: c?.name ?? null,
        description: c?.description ?? null,
        imageUrl: c?.previewUrl ?? null,
      };
    }
    const b = badgeById.get(r.itemId);
    return {
      id: r.id,
      itemType: r.itemType,
      itemId: r.itemId,
      acquiredAt: r.acquiredAt.toISOString(),
      name: b?.name ?? null,
      description: b?.description ?? null,
      imageUrl: b?.iconUrl ?? null,
    };
  });
}

/* ---------------------------------------------------------------------- */
/* Mascotas — progresión de usuario y, ahora que `groups` existe, de grupo  */
/* ---------------------------------------------------------------------- */

const XP_PER_TRAIN = 15;
const XP_PER_LEVEL = 100;

function applyXp(currentLevel: number, currentXp: number, gained: number) {
  const totalXp = currentLevel * 0 + currentXp + gained; // xp acumulado del nivel actual
  const level = currentLevel + Math.floor(totalXp / XP_PER_LEVEL);
  const xp = totalXp % XP_PER_LEVEL;
  return { level, xp };
}

export async function createUserPet(userId: string, input: { species: string; name: string }) {
  if (!input.species.trim() || !input.name.trim()) {
    throw new PlayError(400, "La mascota necesita especie y nombre.");
  }
  const [existing] = await db
    .select()
    .from(pets)
    .where(and(eq(pets.ownerType, "user"), eq(pets.ownerId, userId)));
  if (existing) throw new PlayError(400, "Ya tenés una mascota.");

  return firstOrThrow(
    await db
      .insert(pets)
      .values({ ownerType: "user", ownerId: userId, species: input.species.trim(), name: input.name.trim() })
      .returning()
  );
}

/** Catálogo curado de Kör Pets — 25 mascotas fijas, sembradas en post-migrate.sql. */
export async function listPetDefinitions() {
  return db.select().from(petDefinitions).orderBy(petDefinitions.species, petDefinitions.name);
}

/**
 * Adoptar una mascota del catálogo curado — a diferencia de `createUserPet`
 * (nombre/especie libres, sigue existiendo para no romper nada), acá
 * `species`/`name` los fija el catálogo. Misma regla de "una por usuario".
 */
export async function adoptPet(userId: string, definitionId: string) {
  const [existing] = await db
    .select()
    .from(pets)
    .where(and(eq(pets.ownerType, "user"), eq(pets.ownerId, userId)));
  if (existing) throw new PlayError(400, "Ya tenés una mascota.");

  const [definition] = await db.select().from(petDefinitions).where(eq(petDefinitions.id, definitionId));
  if (!definition) throw new PlayError(404, "Esa mascota no existe en el catálogo.");

  const pet = firstOrThrow(
    await db
      .insert(pets)
      .values({
        ownerType: "user",
        ownerId: userId,
        species: definition.species,
        name: definition.name,
        definitionId: definition.id,
      })
      .returning()
  );
  return { ...pet, definition };
}

async function hydratePetDefinition(pet: typeof pets.$inferSelect) {
  if (!pet.definitionId) return { ...pet, definition: null };
  const [definition] = await db.select().from(petDefinitions).where(eq(petDefinitions.id, pet.definitionId));
  return { ...pet, definition: definition ?? null };
}

/** Mascota de un usuario, pública — perfil propio (`/pets/mine`) o ajeno (`/users/:id/pet`). */
export async function getUserPet(userId: string) {
  const [pet] = await db
    .select()
    .from(pets)
    .where(and(eq(pets.ownerType, "user"), eq(pets.ownerId, userId)));
  return pet ? hydratePetDefinition(pet) : null;
}

export async function createGroupPet(groupId: string, userId: string, input: { species: string; name: string }) {
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  if (!membership) throw new PlayError(400, "Solo un miembro del grupo puede crear su mascota.");
  if (!input.species.trim() || !input.name.trim()) {
    throw new PlayError(400, "La mascota necesita especie y nombre.");
  }
  const [existing] = await db
    .select()
    .from(pets)
    .where(and(eq(pets.ownerType, "group"), eq(pets.ownerId, groupId)));
  if (existing) throw new PlayError(400, "Este grupo ya tiene mascota.");

  return firstOrThrow(
    await db
      .insert(pets)
      .values({ ownerType: "group", ownerId: groupId, species: input.species.trim(), name: input.name.trim() })
      .returning()
  );
}

export async function getGroupPet(groupId: string) {
  const [pet] = await db
    .select()
    .from(pets)
    .where(and(eq(pets.ownerType, "group"), eq(pets.ownerId, groupId)));
  return pet ?? null;
}

export async function getPetById(id: string) {
  const [pet] = await db.select().from(pets).where(eq(pets.id, id));
  return pet ?? null;
}

/** Entrena la mascota: +15 XP, sube de nivel cada 100 XP acumulados. */
export async function trainPet(petId: string, userId: string) {
  const pet = await getPetById(petId);
  if (!pet) throw new PlayError(404, "Mascota no encontrada.");

  if (pet.ownerType === "user") {
    if (pet.ownerId !== userId) throw new PlayError(400, "No es tu mascota.");
  } else {
    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, pet.ownerId), eq(groupMembers.userId, userId)));
    if (!membership) throw new PlayError(400, "Solo un miembro del grupo puede entrenar su mascota.");
  }

  const { level, xp } = applyXp(pet.level, pet.xp, XP_PER_TRAIN);
  return firstOrThrow(
    await db.update(pets).set({ level, xp }).where(eq(pets.id, petId)).returning()
  );
}
