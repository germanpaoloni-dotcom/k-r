/**
 * Generado por scripts/calibrate-pet-anchors.mjs — no editar a mano.
 * Por mascota y por pose (idle/move-1/move-2/move-3):
 * - head/torso: corrección horizontal (fracción del ancho del lienzo) para
 *   centrar gorro+anteojos ("head") o ropa ("torso") en la cabeza/torso
 *   reales, no en el centro geométrico de todo el sprite.
 * - hatY/glassesY: posición vertical del gorro/anteojos, anclada a la fila
 *   más ancha de la cabeza en ESA pose (algunas poses de movimiento tienen
 *   la cabeza mucho más abajo que en idle).
 */
export type PetPose = "idle" | "move-1" | "move-2" | "move-3";

interface PoseAnchor {
  head: number;
  torso: number;
  hatY: number;
  glassesY: number;
}

export const PET_COSMETIC_ANCHORS: Record<string, Partial<Record<PetPose, PoseAnchor>>> = {
  "choco": {
    "idle": {
      "head": -0.086,
      "torso": 0.02,
      "hatY": 127,
      "glassesY": 174
    },
    "move-1": {
      "head": 0.133,
      "torso": 0.002,
      "hatY": 174,
      "glassesY": 221
    },
    "move-2": {
      "head": -0.001,
      "torso": -0.012,
      "hatY": 99,
      "glassesY": 146
    },
    "move-3": {
      "head": 0.075,
      "torso": 0.001,
      "hatY": 174,
      "glassesY": 221
    }
  },
  "nala": {
    "idle": {
      "head": -0.04,
      "torso": 0.06,
      "hatY": 121,
      "glassesY": 168
    },
    "move-1": {
      "head": -0.027,
      "torso": 0.022,
      "hatY": 92,
      "glassesY": 139
    },
    "move-2": {
      "head": 0.094,
      "torso": -0.011,
      "hatY": 170,
      "glassesY": 217
    },
    "move-3": {
      "head": -0.001,
      "torso": -0.014,
      "hatY": 68,
      "glassesY": 115
    }
  },
  "robby": {
    "idle": {
      "head": -0.002,
      "torso": 0.021,
      "hatY": 96,
      "glassesY": 143
    },
    "move-1": {
      "head": 0.036,
      "torso": -0.001,
      "hatY": 158,
      "glassesY": 205
    },
    "move-2": {
      "head": -0.002,
      "torso": -0.023,
      "hatY": 111,
      "glassesY": 158
    },
    "move-3": {
      "head": 0.032,
      "torso": 0.002,
      "hatY": 151,
      "glassesY": 198
    }
  },
  "rocky": {
    "idle": {
      "head": -0.008,
      "torso": 0.045,
      "hatY": 71,
      "glassesY": 118
    },
    "move-1": {
      "head": -0.026,
      "torso": 0.004,
      "hatY": 143,
      "glassesY": 190
    },
    "move-2": {
      "head": 0.004,
      "torso": 0.075,
      "hatY": 76,
      "glassesY": 123
    },
    "move-3": {
      "head": 0,
      "torso": -0.01,
      "hatY": 173,
      "glassesY": 220
    }
  },
  "toby": {
    "idle": {
      "head": -0.002,
      "torso": 0.03,
      "hatY": 108,
      "glassesY": 155
    },
    "move-1": {
      "head": 0.047,
      "torso": 0,
      "hatY": 155,
      "glassesY": 202
    },
    "move-2": {
      "head": 0.011,
      "torso": -0.012,
      "hatY": 124,
      "glassesY": 171
    },
    "move-3": {
      "head": 0.044,
      "torso": 0.001,
      "hatY": 154,
      "glassesY": 201
    }
  }
};

export function anchorOffsetFor(petKey: string, kind: "head" | "torso", pose: PetPose = "idle"): number {
  return PET_COSMETIC_ANCHORS[petKey]?.[pose]?.[kind] ?? PET_COSMETIC_ANCHORS[petKey]?.idle?.[kind] ?? 0;
}

/** Y absoluto (sobre un lienzo de 360px) para el ancla del gorro o los
 * anteojos en esa pose — null si no hay calibración (se usa el valor fijo
 * de respaldo definido en cosmeticArt.ts). */
export function headAnchorYFor(petKey: string, item: "hatY" | "glassesY", pose: PetPose = "idle"): number | null {
  return PET_COSMETIC_ANCHORS[petKey]?.[pose]?.[item] ?? PET_COSMETIC_ANCHORS[petKey]?.idle?.[item] ?? null;
}
