/**
 * Detección de intención — heurística explicable por palabras clave y
 * puntuación, NO un modelo de IA real (ese es Kör AI, Fase 7 del roadmap).
 * Mismo espíritu que el resto de los placeholders documentados del proyecto
 * (ej. "recommended" en feed/service.ts): funciona hoy, se reemplaza sin
 * romper el contrato de la API cuando exista la capa de IA agnóstica.
 */
export type DetectedIntent =
  | "pregunta"
  | "recomendacion_pedida"
  | "alerta"
  | "buen_humor"
  | "comentario";

const RECOMMENDATION_HINTS = ["recomend", "busco", "alguien sabe", "me tiran", "conocen"];
const ALERT_HINTS = ["cuidado", "atención", "urgente", "corte de", "se corta"];
const GOOD_MOOD_MARKERS = ["jaja", "jeje", "😂", "🎉", "🙌", "genial", "increíble"];

export function detectIntent(body: string): DetectedIntent {
  const text = body.toLowerCase();

  if (text.trim().endsWith("?") || text.includes("¿")) return "pregunta";
  if (RECOMMENDATION_HINTS.some((h) => text.includes(h))) return "recomendacion_pedida";
  if (ALERT_HINTS.some((h) => text.includes(h))) return "alerta";
  if (GOOD_MOOD_MARKERS.some((h) => text.includes(h))) return "buen_humor";
  return "comentario";
}
