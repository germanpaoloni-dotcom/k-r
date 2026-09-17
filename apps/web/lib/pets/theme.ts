import type { PetMood } from "../../components/pets/illustrations/PetIllustration";

export interface PetTheme {
  color: string;
  accent?: string;
  mood?: PetMood;
}

/** Paleta por mascota — reemplaza el placeholder de emoji por una ilustración
 * de verdad (ver components/pets/illustrations). Un color por mascota alcanza
 * para que las 25 se sientan distintas incluso dentro de la misma especie. */
export const PET_THEME_BY_KEY: Record<string, PetTheme> = {
  robby: { color: "#E8A33D" },
  toby: { color: "#6B7280", mood: "surprised" },
  choco: { color: "#7A4A2B" },
  rocky: { color: "#C9A66B", mood: "sleepy" },
  nala: { color: "#F2996B", mood: "happy" },
  "luna-cat": { color: "#4B5563" },
  michi: { color: "#1F2937" },
  niebla: { color: "#B9C4CC", mood: "sleepy" },
  "kira-cat": { color: "#F59E0B", mood: "happy" },
  sombra: { color: "#4C3A66", mood: "sleepy" },
  zyro: { color: "#E4572E", accent: "#FF1493", mood: "surprised" },
  nox: { color: "#2B2140", accent: "#8B7CD8" },
  lumen: { color: "#F6C90E", accent: "#FFFFFF" },
  fulgor: { color: "#9B5DE5" },
  vulcan: { color: "#B23A48", accent: "#F6C90E", mood: "surprised" },
  nube: { color: "#CBD5E1", mood: "sleepy" },
  copito: { color: "#F1F5F9", mood: "happy" },
  moka: { color: "#A9745C" },
  chispa: { color: "#FDE68A", mood: "happy" },
  pixel: { color: "#7DD3FC" },
  pico: { color: "#38BDF8", accent: "#0EA5E9" },
  sol: { color: "#FBBF24", accent: "#FFFFFF" },
  "luna-bird": { color: "#A78BFA" },
  kiwi: { color: "#65A30D" },
  trueno: { color: "#F43F5E", accent: "#FDE68A", mood: "surprised" },
};

export function themeFor(key: string): PetTheme {
  return PET_THEME_BY_KEY[key] ?? { color: "#9CA3AF" };
}
