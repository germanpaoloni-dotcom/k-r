/**
 * Orbes — servicio de agregación computado, NO una entidad de base de datos
 * (ver kor-arquitectura-v2.1.md §"Orbes — corrección obligatoria" y
 * ORBES.md). Lee señales de fuentes que ya existen (posts, mira_esto,
 * comments, event_attendance) y las traduce a un estado visual por fuente.
 * Cacheado con TTL corto porque es barato de recalcular y cambia seguido.
 *
 * Cualquier fuente de actividad nueva (ej. Kör Play más adelante) solo
 * necesita aportar señales con la forma { sourceType, sourceId, at } a
 * `buildOrbs` — no requiere migraciones ni tocar esta función de estado.
 */
import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  posts,
  miraEsto,
  comments,
  eventAttendance,
  events,
  follows,
  users,
  locations,
} from "../../db/schema.js";
import { friendIds } from "../friendships/service.js";
import { getOrCompute } from "../../lib/cache.js";

const CACHE_TTL_SECONDS = 90;

export type OrbState = "silencioso" | "activo" | "creciendo" | "pulsando" | "agrupado" | "desvaneciendo";
export type OrbSourceType = "user" | "event" | "location";

export interface Orb {
  sourceType: OrbSourceType;
  sourceId: string;
  state: OrbState;
  signalCount24h: number;
  lastSignalAt: string | null;
  label: Record<string, unknown>;
  groupedWith?: { sourceType: OrbSourceType; sourceId: string }[];
}

interface Signal {
  sourceId: string;
  at: Date;
}

/**
 * Heurística explicable (igual espíritu que el feed cronológico ponderado):
 * ventanas de 1h / 1-6h / 6-24h. Pulsando gana sobre creciendo, creciendo
 * sobre activo. Desvaneciendo = tuvo señales ayer, nada en las últimas 6h.
 * Silencioso = candidato válido (amigo/evento/lugar relevante) sin señales
 * en 24h — el Orbe existe igual, solo "apagado".
 */
function classify(signals: Signal[], now: number): { state: OrbState; last: Date | null } {
  if (signals.length === 0) return { state: "silencioso", last: null };

  let h1 = 0;
  let h6 = 0;
  let h24 = 0;
  let last: Date | null = null;
  for (const s of signals) {
    const ageMs = now - s.at.getTime();
    if (!last || s.at > last) last = s.at;
    if (ageMs <= 3600_000) h1++;
    else if (ageMs <= 6 * 3600_000) h6++;
    else if (ageMs <= 24 * 3600_000) h24++;
  }

  if (h1 >= 3) return { state: "pulsando", last };
  if (h1 + h6 >= 3) return { state: "creciendo", last };
  if (h1 + h6 > 0) return { state: "activo", last };
  if (h24 > 0) return { state: "desvaneciendo", last };
  return { state: "silencioso", last };
}

function bucketBySource(rows: { sourceId: string; at: Date }[]): Map<string, Signal[]> {
  const map = new Map<string, Signal[]>();
  for (const r of rows) {
    const list = map.get(r.sourceId) ?? [];
    list.push(r);
    map.set(r.sourceId, list);
  }
  return map;
}

async function computeOrbs(viewerId: string): Promise<Orb[]> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = Date.now();

  const friends = await friendIds(viewerId);
  const favoriteRows = await db
    .select({ followeeId: follows.followeeId })
    .from(follows)
    .where(and(eq(follows.followerId, viewerId), eq(follows.isFavorite, true)));
  const candidatePersonIds = Array.from(
    new Set([...friends, ...favoriteRows.map((r) => r.followeeId)])
  );
  const peopleForSignals = Array.from(new Set([viewerId, ...candidatePersonIds]));

  /* ---------------- Orbes de persona ---------------- */
  const personOrbs: Orb[] = [];
  if (candidatePersonIds.length > 0) {
    const [postRows, miraRows, commentRows, attendRows, userRows] = await Promise.all([
      db
        .select({ sourceId: posts.userId, at: posts.createdAt })
        .from(posts)
        .where(and(inArray(posts.userId, candidatePersonIds), gte(posts.createdAt, since24h))),
      db
        .select({ sourceId: miraEsto.userId, at: miraEsto.createdAt })
        .from(miraEsto)
        .where(and(inArray(miraEsto.userId, candidatePersonIds), gte(miraEsto.createdAt, since24h))),
      db
        .select({ sourceId: comments.userId, at: comments.createdAt })
        .from(comments)
        .where(and(inArray(comments.userId, candidatePersonIds), gte(comments.createdAt, since24h))),
      db
        .select({ sourceId: eventAttendance.userId, at: eventAttendance.createdAt })
        .from(eventAttendance)
        .where(
          and(inArray(eventAttendance.userId, candidatePersonIds), gte(eventAttendance.createdAt, since24h))
        ),
      db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(inArray(users.id, candidatePersonIds)),
    ]);

    const bySource = bucketBySource([...postRows, ...miraRows, ...commentRows, ...attendRows]);
    const userById = new Map(userRows.map((u) => [u.id, u]));

    for (const id of candidatePersonIds) {
      const { state, last } = classify(bySource.get(id) ?? [], now);
      const user = userById.get(id);
      personOrbs.push({
        sourceType: "user",
        sourceId: id,
        state,
        signalCount24h: (bySource.get(id) ?? []).length,
        lastSignalAt: last ? last.toISOString() : null,
        label: user
          ? { username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
          : { id },
      });
    }
  }

  /* ---------------- Orbes de evento ---------------- */
  const inTwoWeeks = new Date(now + 14 * 24 * 60 * 60 * 1000);
  const recentAttendance = await db
    .select({ eventId: eventAttendance.eventId, userId: eventAttendance.userId, at: eventAttendance.createdAt })
    .from(eventAttendance)
    .where(and(inArray(eventAttendance.userId, peopleForSignals), gte(eventAttendance.createdAt, since24h)));

  const eventOrbs: Orb[] = [];
  const eventIds = Array.from(new Set(recentAttendance.map((r) => r.eventId)));
  if (eventIds.length > 0) {
    const eventRows = await db
      .select({
        id: events.id,
        title: events.title,
        startsAt: events.startsAt,
        locationId: events.locationId,
      })
      .from(events)
      .where(and(inArray(events.id, eventIds), gte(events.startsAt, new Date(now - 2 * 3600_000))));

    const upcomingIds = new Set(eventRows.map((e) => e.id));
    const bySource = bucketBySource(
      recentAttendance
        .filter((r) => upcomingIds.has(r.eventId))
        .map((r) => ({ sourceId: r.eventId, at: r.at }))
    );

    for (const ev of eventRows) {
      if (ev.startsAt > inTwoWeeks) continue;
      const { state, last } = classify(bySource.get(ev.id) ?? [], now);
      eventOrbs.push({
        sourceType: "event",
        sourceId: ev.id,
        state,
        signalCount24h: (bySource.get(ev.id) ?? []).length,
        lastSignalAt: last ? last.toISOString() : null,
        label: { title: ev.title, startsAt: ev.startsAt.toISOString(), locationId: ev.locationId },
      });
    }
  }

  /* ---------------- Orbes de lugar ---------------- */
  const [postLocRows, miraLocRows] = await Promise.all([
    db
      .select({ sourceId: posts.locationId, at: posts.createdAt })
      .from(posts)
      .where(and(inArray(posts.userId, peopleForSignals), gte(posts.createdAt, since24h))),
    db
      .select({ sourceId: miraEsto.locationId, at: miraEsto.createdAt })
      .from(miraEsto)
      .where(and(inArray(miraEsto.userId, peopleForSignals), gte(miraEsto.createdAt, since24h))),
  ]);
  const locSignalRows = [...postLocRows, ...miraLocRows].filter(
    (r): r is { sourceId: string; at: Date } => r.sourceId !== null
  );
  const locationOrbs: Orb[] = [];
  const locationIds = Array.from(new Set(locSignalRows.map((r) => r.sourceId)));
  if (locationIds.length > 0) {
    const locRows = await db
      .select({ id: locations.id, name: locations.name, city: locations.city })
      .from(locations)
      .where(inArray(locations.id, locationIds));
    const bySource = bucketBySource(locSignalRows);
    for (const loc of locRows) {
      const { state, last } = classify(bySource.get(loc.id) ?? [], now);
      locationOrbs.push({
        sourceType: "location",
        sourceId: loc.id,
        state,
        signalCount24h: (bySource.get(loc.id) ?? []).length,
        lastSignalAt: last ? last.toISOString() : null,
        label: { name: loc.name, city: loc.city },
      });
    }
  }

  /* ---------------- Agrupación a nivel de render ---------------- */
  // Evento + Lugar que comparten locationId dentro de la ventana se muestran
  // como un solo Orbe "agrupado" — nunca se persiste la fusión, se recalcula
  // cada vez. Ver kor-arquitectura-v2.1.md.
  const locationOrbById = new Map(locationOrbs.map((o) => [o.sourceId, o]));
  const consumedLocationIds = new Set<string>();
  const finalOrbs: Orb[] = [...personOrbs];

  for (const evOrb of eventOrbs) {
    const locId = evOrb.label.locationId as string | null;
    const locOrb = locId ? locationOrbById.get(locId) : undefined;
    if (locOrb && !consumedLocationIds.has(locOrb.sourceId)) {
      consumedLocationIds.add(locOrb.sourceId);
      finalOrbs.push({
        sourceType: "event",
        sourceId: evOrb.sourceId,
        state: "agrupado",
        signalCount24h: evOrb.signalCount24h + locOrb.signalCount24h,
        lastSignalAt: evOrb.lastSignalAt,
        label: evOrb.label,
        groupedWith: [{ sourceType: "location", sourceId: locOrb.sourceId }],
      });
    } else {
      finalOrbs.push(evOrb);
    }
  }
  for (const locOrb of locationOrbs) {
    if (!consumedLocationIds.has(locOrb.sourceId)) finalOrbs.push(locOrb);
  }

  return finalOrbs;
}

export async function getOrbsForViewer(viewerId: string): Promise<Orb[]> {
  return getOrCompute(`orbs:${viewerId}`, CACHE_TTL_SECONDS, () => computeOrbs(viewerId));
}

/**
 * Estado de actividad público de UNA persona (perfil ajeno) — a propósito
 * NO es "sus Orbes": ese concepto se computa desde la red social del
 * *viewer* (ver `computeOrbs`), mostrárselo a un visitante cualquiera
 * infiere amigos/lugares/eventos privados del dueño del perfil, algo que
 * la propia spec de perfil ajeno prohíbe. Esto es solo su propia actividad
 * pública (posts/Mirá esto/comments), el mismo dato que ya es visible en
 * su perfil — un único estado, no una lista de Orbes.
 */
export async function getPublicActivityState(userId: string): Promise<OrbState> {
  return getOrCompute(`activity-state:${userId}`, CACHE_TTL_SECONDS, async () => {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [postRows, miraRows, commentRows] = await Promise.all([
      db
        .select({ at: posts.createdAt })
        .from(posts)
        .where(and(eq(posts.userId, userId), eq(posts.visibility, "public"), gte(posts.createdAt, since24h))),
      db
        .select({ at: miraEsto.createdAt })
        .from(miraEsto)
        .where(and(eq(miraEsto.userId, userId), gte(miraEsto.createdAt, since24h))),
      db
        .select({ at: comments.createdAt })
        .from(comments)
        .where(and(eq(comments.userId, userId), gte(comments.createdAt, since24h))),
    ]);
    const signals = [...postRows, ...miraRows, ...commentRows].map((r) => ({ sourceId: userId, at: r.at }));
    return classify(signals, Date.now()).state;
  });
}
