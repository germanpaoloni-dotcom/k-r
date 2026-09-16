/**
 * Emoji placeholder por mascota — MVP hasta que haya assets ilustrados reales
 * (ver INTEGRATION_CHECKLIST.md del paquete original: "sustituir emojis por
 * assets reales cuando estén disponibles"). Clave = `PetDefinitionDto.key`.
 */
export const PET_EMOJI_BY_KEY: Record<string, string> = {
  robby: "🐶",
  toby: "🐕",
  choco: "🐕‍🦺",
  rocky: "🐕",
  nala: "🐕",
  "luna-cat": "🐈",
  michi: "🐈‍⬛",
  niebla: "🐱",
  "kira-cat": "😼",
  sombra: "🐈",
  zyro: "🐉",
  nox: "🐲",
  lumen: "🐉",
  fulgor: "🐲",
  vulcan: "🐉",
  nube: "🐰",
  copito: "🐇",
  moka: "🐰",
  chispa: "🐇",
  pixel: "🐰",
  pico: "🐦",
  sol: "🐤",
  "luna-bird": "🦜",
  kiwi: "🦜",
  trueno: "🦜",
};

const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐶",
  cat: "🐱",
  dragon: "🐉",
  rabbit: "🐰",
  bird: "🐦",
};

export function petEmoji(key: string, species: string): string {
  return PET_EMOJI_BY_KEY[key] ?? SPECIES_EMOJI[species] ?? "✨";
}

export const RARITY_LABEL: Record<string, string> = {
  common: "Común",
  rare: "Rara",
  epic: "Épica",
  legendary: "Legendaria",
};
