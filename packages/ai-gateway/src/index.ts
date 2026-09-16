/**
 * Capa de IA agnóstica de Kōr (Fase 7 — Kör AI). Cualquier dominio que
 * necesite lenguaje natural real pasa por acá, nunca llama un SDK de IA
 * directo — mismo criterio que `payment-provider.ts` en marketplace.
 *
 * Hoy no hay credenciales de ningún proveedor configuradas todavía:
 * `createAiProvider()` devuelve `ClaudeProvider` si existe
 * `ANTHROPIC_API_KEY` en el entorno, o `NullAiProvider` si no. Los
 * dominios que consumen esto SIEMPRE chequean `.available` antes de
 * llamar `complete()` y tienen su propio fallback heurístico explicable
 * (ver `domains/decilo/intent.ts` y `domains/ai/heuristics.ts`) — nunca
 * dependen de que haya IA real para funcionar.
 */

export interface CompleteOptions {
  system?: string;
  maxTokens?: number;
}

export interface AiProvider {
  readonly name: string;
  /** false = no hay proveedor real configurado; el caller debe usar su fallback heurístico. */
  readonly available: boolean;
  complete(prompt: string, opts?: CompleteOptions): Promise<string>;
}

const DEFAULT_MODEL = "claude-sonnet-5";
const ANTHROPIC_VERSION = "2023-06-01";

export class ClaudeProvider implements AiProvider {
  readonly name = "claude";
  readonly available = true;

  constructor(
    private readonly apiKey: string,
    private readonly model: string = DEFAULT_MODEL
  ) {}

  async complete(prompt: string, opts: CompleteOptions = {}): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: opts.maxTokens ?? 1024,
        ...(opts.system ? { system: opts.system } : {}),
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Claude API respondió ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((block) => block.type === "text")?.text;
    if (text === undefined) throw new Error("Claude API no devolvió texto en la respuesta.");
    return text;
  }
}

/** Sin proveedor configurado — `complete()` nunca debería llamarse (`available` es false). */
export class NullAiProvider implements AiProvider {
  readonly name = "none";
  readonly available = false;

  async complete(): Promise<string> {
    throw new Error(
      "NullAiProvider no tiene proveedor real: chequeá `.available` antes de llamar complete()."
    );
  }
}

export function createAiProvider(): AiProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) return new ClaudeProvider(apiKey, process.env.ANTHROPIC_MODEL);
  return new NullAiProvider();
}
