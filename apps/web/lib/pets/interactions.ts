/**
 * Motor de comportamiento de Gossip Pets — vive en el cliente a propósito
 * (ver comentario en apps/api/src/db/schema.ts sobre `petDefinitions.interaction`).
 * Cada mascota tiene UNA travesura de las 25 curadas en el catálogo; acá se
 * agrupan en un puñado de familias visuales reutilizables (no 25 animaciones
 * a medida) y se les suma sabor propio (emoji + frase) por mascota.
 *
 * Regla de oro (brand kit): nunca interrumpe login, pago, publicación,
 * borrado, seguridad, moderación ni escritura crítica. Se garantiza por
 * diseño: cada gag ocurre DENTRO del widget flotante del pet, nunca toca
 * otro elemento de la pantalla.
 */

export type GagFamily = "shake" | "bounce" | "sleepy" | "sparkle" | "mess" | "speech";

export interface InteractionConfig {
  family: GagFamily;
  emoji: string;
  line: string;
}

export const INTERACTION_BY_KEY: Record<string, InteractionConfig> = {
  robby: { family: "mess", emoji: "💩", line: "Robby hizo de las suyas." },
  toby: { family: "mess", emoji: "🕵️", line: "Toby afanó algo tuyo." },
  choco: { family: "shake", emoji: "💥", line: "Choco desató el caos." },
  rocky: { family: "sleepy", emoji: "💤", line: "Rocky se quedó dormido." },
  nala: { family: "bounce", emoji: "🎾", line: "Nala quiere jugar." },
  "luna-cat": { family: "mess", emoji: "🐾", line: "Luna rasguñó tus Orbes." },
  michi: { family: "speech", emoji: "⌨️", line: "asdkjfh" },
  niebla: { family: "sleepy", emoji: "🌫️", line: "Niebla desapareció un rato." },
  "kira-cat": { family: "mess", emoji: "✨", line: "Kira se comió tus stickers." },
  sombra: { family: "shake", emoji: "🌑", line: "Sombra oscureció todo." },
  zyro: { family: "sparkle", emoji: "🔥", line: "Zyro prendió fuego (de nuevo)." },
  nox: { family: "shake", emoji: "🌚", line: "Nox apagó las luces." },
  lumen: { family: "sparkle", emoji: "💡", line: "Lumen iluminó todo." },
  fulgor: { family: "sparkle", emoji: "⭐", line: "Fulgor juntó energía." },
  vulcan: { family: "bounce", emoji: "🦖", line: "Vulcan creció de golpe." },
  nube: { family: "sleepy", emoji: "☁️", line: "Nube escondió algo." },
  copito: { family: "bounce", emoji: "🏃", line: "Copito salió corriendo." },
  moka: { family: "mess", emoji: "🍪", line: "Moka comió algo raro." },
  chispa: { family: "bounce", emoji: "✨", line: "Chispa se multiplicó." },
  pixel: { family: "sparkle", emoji: "🟪", line: "Pixel se pixeló." },
  pico: { family: "bounce", emoji: "🕊️", line: "Pico salió volando." },
  sol: { family: "sparkle", emoji: "☀️", line: "Sol dejó luz por donde pasó." },
  "luna-bird": { family: "speech", emoji: "🔔", line: "¡Pío pío!" },
  kiwi: { family: "bounce", emoji: "🪶", line: "Kiwi dejó una pluma volando." },
  trueno: { family: "sparkle", emoji: "🎉", line: "Trueno armó una fiesta." },
};

export function interactionFor(key: string): InteractionConfig {
  return INTERACTION_BY_KEY[key] ?? { family: "sparkle", emoji: "✨", line: "Tu mascota hizo algo." };
}
