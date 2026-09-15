import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { events, eventAttendance, users, locations } from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";
import { notify } from "../notifications/service.js";

export class EventError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export type AttendanceStatus = "interested" | "going" | "reminder_set";

export interface CreateEventInput {
  title: string;
  description?: string;
  coverUrl?: string;
  locationId: string;
  startsAt: string;
  endsAt?: string;
  priceCents?: number;
  category?: string;
}

export interface EventDto {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  priceCents: number | null;
  category: string | null;
  createdAt: string;
  organizer: { id: string; username: string; displayName: string; avatarUrl: string | null };
  location: { id: string; name: string; city: string };
  attendance: { interested: number; going: number; reminder_set: number };
  myStatus: AttendanceStatus | null;
}

const eventSelect = {
  id: events.id,
  title: events.title,
  description: events.description,
  coverUrl: events.coverUrl,
  startsAt: events.startsAt,
  endsAt: events.endsAt,
  priceCents: events.priceCents,
  category: events.category,
  createdAt: events.createdAt,
  organizerId: users.id,
  organizerUsername: users.username,
  organizerDisplayName: users.displayName,
  organizerAvatarUrl: users.avatarUrl,
  locationId: locations.id,
  locationName: locations.name,
  locationCity: locations.city,
};

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  startsAt: Date;
  endsAt: Date | null;
  priceCents: number | null;
  category: string | null;
  createdAt: Date;
  organizerId: string;
  organizerUsername: string;
  organizerDisplayName: string;
  organizerAvatarUrl: string | null;
  locationId: string;
  locationName: string;
  locationCity: string;
}

function baseQuery() {
  return db
    .select(eventSelect)
    .from(events)
    .innerJoin(users, eq(users.id, events.organizerId))
    .innerJoin(locations, eq(locations.id, events.locationId));
}

/**
 * Hidrata en lote (mismo patrón que hydratePosts en domains/social/dto.ts):
 * conteos de asistencia por estado + el estado del viewer, sin N+1 por evento
 * en un listado paginado.
 */
async function hydrateEvents(rows: EventRow[], viewerId?: string): Promise<EventDto[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [counts, myStatusRows] = await Promise.all([
    db
      .select({
        eventId: eventAttendance.eventId,
        status: eventAttendance.status,
        count: sql<number>`count(*)::int`,
      })
      .from(eventAttendance)
      .where(inArray(eventAttendance.eventId, ids))
      .groupBy(eventAttendance.eventId, eventAttendance.status),
    viewerId
      ? db
          .select({ eventId: eventAttendance.eventId, status: eventAttendance.status })
          .from(eventAttendance)
          .where(and(eq(eventAttendance.userId, viewerId), inArray(eventAttendance.eventId, ids)))
      : Promise.resolve([]),
  ]);

  const countsByEvent = new Map<string, { interested: number; going: number; reminder_set: number }>();
  for (const c of counts) {
    const entry = countsByEvent.get(c.eventId) ?? { interested: 0, going: 0, reminder_set: 0 };
    entry[c.status as AttendanceStatus] = c.count;
    countsByEvent.set(c.eventId, entry);
  }
  const myStatusByEvent = new Map(myStatusRows.map((r) => [r.eventId, r.status as AttendanceStatus]));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    coverUrl: r.coverUrl,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt ? r.endsAt.toISOString() : null,
    priceCents: r.priceCents,
    category: r.category,
    createdAt: r.createdAt.toISOString(),
    organizer: {
      id: r.organizerId,
      username: r.organizerUsername,
      displayName: r.organizerDisplayName,
      avatarUrl: r.organizerAvatarUrl,
    },
    location: { id: r.locationId, name: r.locationName, city: r.locationCity },
    attendance: countsByEvent.get(r.id) ?? { interested: 0, going: 0, reminder_set: 0 },
    myStatus: myStatusByEvent.get(r.id) ?? null,
  }));
}

export async function createEvent(userId: string, input: CreateEventInput): Promise<EventDto> {
  if (!input.title.trim()) throw new EventError(400, "El evento necesita un título.");

  const [location] = await db.select().from(locations).where(eq(locations.id, input.locationId));
  if (!location) throw new EventError(400, "El lugar del evento no existe.");

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new EventError(400, "Fecha de inicio inválida.");
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) throw new EventError(400, "Fecha de fin inválida.");

  const event = firstOrThrow(
    await db
      .insert(events)
      .values({
        organizerId: userId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        coverUrl: input.coverUrl ?? null,
        locationId: input.locationId,
        startsAt,
        endsAt,
        priceCents: input.priceCents ?? null,
        category: input.category ?? null,
      })
      .returning()
  );

  const dto = await getEventById(event.id, userId);
  if (!dto) throw new EventError(500, "No se pudo crear el evento.");
  return dto;
}

export async function getEventById(id: string, viewerId?: string): Promise<EventDto | null> {
  const [row] = await baseQuery().where(eq(events.id, id));
  if (!row) return null;
  const [dto] = await hydrateEvents([row], viewerId);
  return dto ?? null;
}

export interface ListEventsParams {
  category?: string;
  organizerId?: string;
  locationId?: string;
  upcomingOnly?: boolean;
  limit?: number;
}

export async function listEvents(params: ListEventsParams = {}, viewerId?: string): Promise<EventDto[]> {
  const conditions = [];
  if (params.category) conditions.push(eq(events.category, params.category));
  if (params.organizerId) conditions.push(eq(events.organizerId, params.organizerId));
  if (params.locationId) conditions.push(eq(events.locationId, params.locationId));
  if (params.upcomingOnly !== false) conditions.push(gte(events.startsAt, new Date()));

  let query = baseQuery();
  const filtered = conditions.length ? query.where(and(...conditions)) : query;
  const rows = await filtered.orderBy(asc(events.startsAt)).limit(params.limit ?? 30);
  return hydrateEvents(rows, viewerId);
}

/** Upsert del estado de asistencia — un usuario tiene un solo estado por evento a la vez. */
export async function setAttendance(eventId: string, userId: string, status: AttendanceStatus) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) throw new EventError(404, "Evento no encontrado.");

  await db
    .insert(eventAttendance)
    .values({ eventId, userId, status })
    .onConflictDoUpdate({
      target: [eventAttendance.eventId, eventAttendance.userId],
      set: { status },
    });

  await notify(
    event.organizerId,
    "event_attendance",
    { eventId, fromUserId: userId, status },
    { skipIfActor: userId }
  );
}

export async function removeAttendance(eventId: string, userId: string) {
  await db
    .delete(eventAttendance)
    .where(and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.userId, userId)));
}
