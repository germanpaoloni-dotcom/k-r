/**
 * Generado por scripts/calibrate-pet-anchors.mjs — no editar a mano.
 * Corrección horizontal (como fracción del ancho del lienzo) para que
 * gorro/anteojos ("head") y ropa ("torso") queden centrados en la cabeza o
 * el torso reales de cada mascota, no en el centro geométrico de todo el
 * sprite (que en poses de costado no coincide).
 */
export const PET_COSMETIC_ANCHORS: Record<string, { head: number; torso: number }> = {
  "choco": {
    "head": -0.086,
    "torso": 0.02
  },
  "nala": {
    "head": -0.04,
    "torso": 0.06
  },
  "robby": {
    "head": -0.002,
    "torso": 0.021
  },
  "rocky": {
    "head": -0.008,
    "torso": 0.045
  },
  "toby": {
    "head": -0.002,
    "torso": 0.03
  }
};

export function anchorOffsetFor(petKey: string, kind: "head" | "torso"): number {
  return PET_COSMETIC_ANCHORS[petKey]?.[kind] ?? 0;
}
