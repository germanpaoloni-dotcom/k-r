/**
 * Fallback heurístico de "¿Qué hago?" — mismo espíritu que
 * `domains/decilo/intent.ts`: reglas explicables por palabra clave, no un
 * modelo real. Se usa siempre que no hay proveedor de IA configurado
 * (`AiProvider.available === false`) y como red de contención si el
 * proveedor real falla o devuelve algo no parseable.
 */
const CATEGORY_HINTS: Record<string, string[]> = {
  comer: ["comer", "comida", "hambre", "almorzar", "cenar", "restaurant", "restorán", "parrilla", "pizza"],
  cafeterias: ["café", "cafe", "cafeter", "merendar", "desayun"],
  comprar: ["comprar", "compras", "shopping", "tienda", "regalo"],
  eventos: ["evento", "plan", "salir", "esta noche", "hoy", "fin de semana"],
  musica: ["música", "musica", "recital", "banda", "tocan", "show"],
  deportes: ["deporte", "correr", "gimnasio", "gym", "entrenar", "partido"],
  arte: ["arte", "museo", "expo", "exposición", "galería", "teatro"],
  emprendimientos: ["emprendimiento", "emprendedor", "artesan", "feria"],
};

export interface HeuristicIntent {
  category: string | null;
  budgetCents: number | null;
}

/** Primer monto en pesos que aparece en el texto ("30000", "$30.000", "30 mil") → centavos. */
function extractBudgetCents(text: string): number | null {
  const milMatch = text.match(/(\d+(?:[.,]\d+)?)\s*mil/);
  if (milMatch) return Math.round(parseFloat(milMatch[1]!.replace(",", ".")) * 1000 * 100);

  const numberMatch = text.match(/\$?\s*(\d{1,3}(?:[.,]\d{3})+|\d+)/);
  if (!numberMatch) return null;
  const raw = numberMatch[1]!.replace(/[.,]/g, "");
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value * 100 : null;
}

export function detectQueHagoIntent(q: string): HeuristicIntent {
  const text = q.toLowerCase();

  let bestCategory: string | null = null;
  for (const [category, hints] of Object.entries(CATEGORY_HINTS)) {
    if (hints.some((h) => text.includes(h))) {
      bestCategory = category;
      break;
    }
  }

  return { category: bestCategory, budgetCents: extractBudgetCents(text) };
}
