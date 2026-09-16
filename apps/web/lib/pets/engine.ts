/**
 * Motor de comportamiento de Gossip Pets — fundacional (Fase 1 del paquete
 * "Perfil + Pets"): cooldowns, exclusión de pantallas críticas y reduced
 * motion. Las animaciones de cada travesura (PetInteractionLayer) son un
 * paso siguiente — este motor ya queda listo para que las consuman.
 *
 * Nunca modifica datos reales: solo decide SI una travesura puede dispararse
 * y con qué duración. El resultado es un evento de interacción, nada más.
 */
import type { PetDefinitionDto } from "../api";
import { CRITICAL_SURFACES, type PetInteractionKind, type PetSurface } from "./types";

export interface PetEngineContext {
  surface: PetSurface;
  /** El usuario está escribiendo (caption, comentario, mensaje) — nunca interrumpir. */
  userTyping?: boolean;
  /** Publicar, eliminar, pagar, moderar — nunca interrumpir. */
  criticalAction?: boolean;
  reducedMotion?: boolean;
}

export interface PetEvent {
  id: string;
  pet: PetDefinitionDto;
  interaction: PetInteractionKind;
  /** ms que dura la animación — se acorta con reduced motion. */
  duration: number;
  timestamp: number;
}

const GLOBAL_COOLDOWN_MS = 25_000;
const INTERACTION_COOLDOWN_MS = 90_000; // la misma travesura no se repite antes de esto
const SURFACE_COOLDOWN_MS = 45_000; // no golpear la misma pantalla seguido

const FIRE_DURATION_MS = 10_000; // tope explícito del spec ("hasta 10 segundos")
const DEFAULT_DURATION_MS = 4_000;
const REDUCED_MOTION_DURATION_MS = 1_500;

interface CooldownState {
  lastGlobal: number;
  lastByInteraction: Map<PetInteractionKind, number>;
  lastBySurface: Map<PetSurface, number>;
}

const state: CooldownState = {
  lastGlobal: 0,
  lastByInteraction: new Map(),
  lastBySurface: new Map(),
};

/** Chequeo previo, sin efectos secundarios — para deshabilitar UI o decidir si vale la pena intentar. */
export function canPetInteract(context: PetEngineContext): boolean {
  if (context.userTyping) return false;
  if (context.criticalAction) return false;
  if (CRITICAL_SURFACES.has(context.surface)) return false;

  const now = Date.now();
  if (now - state.lastGlobal < GLOBAL_COOLDOWN_MS) return false;
  if (now - (state.lastBySurface.get(context.surface) ?? 0) < SURFACE_COOLDOWN_MS) return false;
  return true;
}

function canInteractionFire(interaction: PetInteractionKind): boolean {
  const now = Date.now();
  return now - (state.lastByInteraction.get(interaction) ?? 0) >= INTERACTION_COOLDOWN_MS;
}

function durationFor(interaction: PetInteractionKind, reducedMotion: boolean): number {
  if (reducedMotion) return REDUCED_MOTION_DURATION_MS;
  return interaction === "fire" ? FIRE_DURATION_MS : DEFAULT_DURATION_MS;
}

/**
 * Intenta disparar la travesura principal de `pet`. Devuelve `null` si algún
 * cooldown, pantalla crítica o el contexto actual lo bloquea — el caller no
 * necesita saber por qué, solo si hay evento o no.
 */
export function createPetEvent(pet: PetDefinitionDto, context: PetEngineContext): PetEvent | null {
  if (!canPetInteract(context)) return null;

  const interaction = pet.interaction as PetInteractionKind;
  if (!canInteractionFire(interaction)) return null;

  const now = Date.now();
  state.lastGlobal = now;
  state.lastBySurface.set(context.surface, now);
  state.lastByInteraction.set(interaction, now);

  return {
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${now}-${Math.random()}`,
    pet,
    interaction,
    duration: durationFor(interaction, context.reducedMotion ?? false),
    timestamp: now,
  };
}

/** Lee `prefers-reduced-motion` del navegador — usar en el contexto en vez de asumir `false`. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
