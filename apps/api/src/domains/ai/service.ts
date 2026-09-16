import { createAiProvider } from "@gossip/ai-gateway";
import { listLocations, nearbyLocations } from "../locations/service.js";
import { listEvents } from "../events/service.js";
import { detectQueHagoIntent } from "./heuristics.js";

const aiProvider = createAiProvider();

export interface QueHagoInput {
  q: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export interface RecommendationCard {
  type: "location" | "event";
  id: string;
  name: string;
  category: string | null;
  distanceKm: number | null;
  priceCents: number | null;
  startsAt: string | null;
  address: string | null;
  explain: string;
}

export interface QueHagoResult {
  q: string;
  detectedCategory: string | null;
  budgetCents: number | null;
  source: "claude" | "heuristic";
  recommendations: RecommendationCard[];
}

const EXTRACT_SYSTEM_PROMPT =
  'Extraés intención de descubrimiento local de un mensaje en español. ' +
  'Respondé ÚNICAMENTE un JSON válido con esta forma exacta, sin texto adicional: ' +
  '{"category": string|null, "budgetCents": number|null}. ' +
  '"category" tiene que ser una de: comer, cafeterias, comprar, eventos, musica, deportes, arte, emprendimientos, o null si no aplica ninguna. ' +
  '"budgetCents" es el presupuesto mencionado en pesos argentinos convertido a centavos (ej: "30000 pesos" -> 3000000), o null si no se menciona.';

async function detectIntent(q: string): Promise<{ category: string | null; budgetCents: number | null; source: "claude" | "heuristic" }> {
  if (aiProvider.available) {
    try {
      const raw = await aiProvider.complete(q, { system: EXTRACT_SYSTEM_PROMPT, maxTokens: 200 });
      const parsed = JSON.parse(raw.trim());
      if (typeof parsed === "object" && parsed !== null && ("category" in parsed || "budgetCents" in parsed)) {
        return {
          category: typeof parsed.category === "string" ? parsed.category : null,
          budgetCents: typeof parsed.budgetCents === "number" ? parsed.budgetCents : null,
          source: "claude",
        };
      }
    } catch {
      // Cae al heurístico — nunca dejamos "¿Qué hago?" sin respuesta por un
      // fallo del proveedor de IA (rate limit, JSON mal formado, etc).
    }
  }
  const heuristic = detectQueHagoIntent(q);
  return { ...heuristic, source: "heuristic" };
}

export async function queHago(input: QueHagoInput): Promise<QueHagoResult> {
  if (!input.q.trim()) throw new Error("Falta la pregunta.");

  const intent = await detectIntent(input.q);

  const locationCards: RecommendationCard[] = [];
  if (input.lat !== undefined && input.lng !== undefined) {
    const rows = await nearbyLocations({
      lat: input.lat,
      lng: input.lng,
      radiusKm: input.radiusKm,
      category: intent.category ?? undefined,
      limit: 5,
    });
    for (const r of rows as Record<string, unknown>[]) {
      locationCards.push({
        type: "location",
        id: r.id as string,
        name: r.name as string,
        category: (r.category as string | null) ?? null,
        distanceKm: Math.round(((r.distance_m as number) / 1000) * 10) / 10,
        priceCents: null,
        startsAt: null,
        address: (r.address as string | null) ?? null,
        explain: intent.category ? `Cerca tuyo · categoría "${intent.category}"` : "Cerca tuyo",
      });
    }
  } else {
    const rows = await listLocations({ category: intent.category ?? undefined, limit: 5 });
    for (const r of rows) {
      locationCards.push({
        type: "location",
        id: r.id,
        name: r.name,
        category: r.category,
        distanceKm: null,
        priceCents: null,
        startsAt: null,
        address: r.address,
        explain: intent.category ? `Categoría "${intent.category}"` : "Sugerido",
      });
    }
  }

  const events = await listEvents({ category: intent.category ?? undefined, upcomingOnly: true, limit: 5 });
  const eventCards: RecommendationCard[] = events.map((e) => ({
    type: "event",
    id: e.id,
    name: e.title,
    category: e.category,
    distanceKm: null,
    priceCents: e.priceCents,
    startsAt: e.startsAt,
    address: e.location.name,
    explain: "Evento próximo" + (intent.category ? ` · categoría "${intent.category}"` : ""),
  }));

  const recommendations = [...locationCards, ...eventCards].slice(0, 3);

  return {
    q: input.q,
    detectedCategory: intent.category,
    budgetCents: intent.budgetCents,
    source: intent.source,
    recommendations,
  };
}
