export type PetSpecies = "dog" | "cat" | "dragon" | "rabbit" | "bird";

/**
 * Travesura visual asociada a una mascota (`PetDefinitionDto.interaction` del
 * backend, ver apps/api/src/db/post-migrate.sql). Puramente de cliente —
 * el backend no sabe ni le importa qué animación dispara cada una.
 */
export type PetInteractionKind =
  | "steal_profile"
  | "poop_feed"
  | "chaos"
  | "sleep"
  | "ball"
  | "scratch_orbs"
  | "keyboard"
  | "hide"
  | "stickers"
  | "shadow"
  | "fire"
  | "blackout"
  | "light"
  | "collect"
  | "giant"
  | "hide_button"
  | "run"
  | "eat"
  | "multiply"
  | "pixel"
  | "fly"
  | "sun"
  | "fake_notification"
  | "party";

/**
 * Pantallas donde la mascota puede aparecer contextualmente (ver
 * KOR_PETS_PRODUCT_SPEC.md). Solo algunas tienen UI real todavía en el web
 * (home/profile/create/me) — el resto queda listo para cuando exista pantalla.
 */
export type PetSurface =
  | "home"
  | "profile"
  | "my-people"
  | "messages"
  | "discover"
  | "near"
  | "create"
  | "play"
  | "me";

/** Pantallas donde una travesura NUNCA puede interrumpir (login/registro/pago/escritura crítica). */
export const CRITICAL_SURFACES: ReadonlySet<PetSurface> = new Set(["create"]);
