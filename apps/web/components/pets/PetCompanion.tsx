"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMyPet, type PetDto } from "../../lib/api";
import { PetAvatar, PetCosmeticsOverlay } from "./PetAvatar";
import { hasSprite, spriteUrl, type SpritePose } from "../../lib/pets/sprites";
import { interactionFor, type GagFamily } from "../../lib/pets/interactions";
import type { PetMood } from "./illustrations/PetIllustration";

// Placeholders de balance — "fundacional" a propósito, se ajustan con datos
// reales de uso más adelante. Cortos para que se puedan ver en una demo en vivo.
const MIN_COOLDOWN_MS = 40_000;
const COOLDOWN_JITTER_MS = 50_000;
const TAP_DEBOUNCE_MS = 3_000;
const MESS_AUTOCLEAR_MS = 15_000;

const WANDER_MIN_MS = 7_000;
const WANDER_JITTER_MS = 8_000;
const HOP_DURATION_MS = 1_400;
const WIDGET_SIZE = 84;
const TRACK_MARGIN = 16;

const GAG_DURATION_MS: Record<GagFamily, number> = {
  shake: 1600,
  bounce: 1700,
  sleepy: 2200,
  sparkle: 1900,
  speech: 2800,
  mess: 2800,
};

const ANIM_CLASS: Record<GagFamily, string | null> = {
  shake: "gossip-pet-anim-shake",
  bounce: "gossip-pet-anim-bounce",
  sleepy: "gossip-pet-anim-sleepy",
  sparkle: "gossip-pet-anim-sparkle",
  speech: "gossip-pet-anim-bounce",
  mess: null,
};

const MOOD_DURING_GAG: Record<GagFamily, PetMood | undefined> = {
  shake: "surprised",
  bounce: "happy",
  sleepy: "sleepy",
  sparkle: "happy",
  speech: "surprised",
  mess: "surprised",
};

function cooldownKey(petId: string) {
  return `gossip.pet.lastGagAt.${petId}`;
}
function readLastGagAt(petId: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(cooldownKey(petId));
  return raw ? Number(raw) : 0;
}
function writeLastGagAt(petId: string, ts: number) {
  window.localStorage.setItem(cooldownKey(petId), String(ts));
}

export function PetCompanion() {
  const [pet, setPet] = useState<PetDto | null>(null);
  const [activeFamily, setActiveFamily] = useState<GagFamily | null>(null);
  const [messVisible, setMessVisible] = useState(false);

  // Locomoción (solo para especies con sprites reales — ver lib/pets/sprites.ts)
  const [x, setX] = useState<number | null>(null); // null = todavía no calculamos el track
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [hopping, setHopping] = useState(false);
  const [pose, setPose] = useState<SpritePose>("idle");

  const lastTapRef = useRef(0);
  const gagTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hopTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastWanderRef = useRef(0);

  useEffect(() => {
    getMyPet().then((res) => setPet(res.data ?? null));
  }, []);

  const sprited = Boolean(pet?.definition && hasSprite(pet.definition.species));

  useEffect(() => {
    if (!sprited || typeof window === "undefined") return;
    setX(window.innerWidth - WIDGET_SIZE - TRACK_MARGIN);
  }, [sprited]);

  const playGag = useCallback(
    (family: GagFamily) => {
      if (!pet) return;
      if (gagTimerRef.current) clearTimeout(gagTimerRef.current);
      setActiveFamily(family);
      if (family === "mess") {
        setMessVisible(true);
        if (messTimerRef.current) clearTimeout(messTimerRef.current);
        messTimerRef.current = setTimeout(() => setMessVisible(false), MESS_AUTOCLEAR_MS);
      }
      gagTimerRef.current = setTimeout(() => setActiveFamily(null), GAG_DURATION_MS[family]);
      writeLastGagAt(pet.id, Date.now());
    },
    [pet]
  );

  const startHop = useCallback(() => {
    if (typeof window === "undefined" || x === null) return;
    hopTimersRef.current.forEach(clearTimeout);
    hopTimersRef.current = [];

    const trackMin = TRACK_MARGIN;
    const trackMax = window.innerWidth - WIDGET_SIZE - TRACK_MARGIN;
    const delta = 90 + Math.random() * 120;
    const goRight = x - trackMin < delta ? true : x + delta > trackMax ? false : Math.random() > 0.5;
    const nextX = Math.min(trackMax, Math.max(trackMin, x + (goRight ? delta : -delta)));

    setFacing(goRight ? "right" : "left");
    setHopping(true);
    setPose("move-1");
    setX(nextX);
    lastWanderRef.current = Date.now();

    hopTimersRef.current.push(setTimeout(() => setPose("move-2"), HOP_DURATION_MS * 0.3));
    hopTimersRef.current.push(setTimeout(() => setPose("move-3"), HOP_DURATION_MS * 0.65));
    hopTimersRef.current.push(
      setTimeout(() => {
        setPose("idle");
        setHopping(false);
      }, HOP_DURATION_MS)
    );
  }, [x]);

  // Ciclo automático: cada 4s evalúa si toca deambular (sprites) o hacer una
  // travesura (todas las mascotas), respetando reduced motion.
  useEffect(() => {
    if (!pet) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const interval = setInterval(() => {
      if (activeFamily || hopping) return;

      if (sprited && !reducedMotion) {
        const sinceWander = Date.now() - lastWanderRef.current;
        const wanderThreshold = WANDER_MIN_MS + Math.random() * WANDER_JITTER_MS;
        if (sinceWander >= wanderThreshold) {
          startHop();
          return;
        }
      }

      const elapsed = Date.now() - readLastGagAt(pet.id);
      const threshold = MIN_COOLDOWN_MS + Math.random() * COOLDOWN_JITTER_MS;
      if (elapsed < threshold) return;
      const { family } = interactionFor(pet.definition?.interaction ?? "");
      playGag(reducedMotion && family !== "mess" ? "speech" : family);
    }, 4000);
    return () => clearInterval(interval);
  }, [pet, activeFamily, hopping, sprited, playGag, startHop]);

  useEffect(
    () => () => {
      if (gagTimerRef.current) clearTimeout(gagTimerRef.current);
      if (messTimerRef.current) clearTimeout(messTimerRef.current);
      hopTimersRef.current.forEach(clearTimeout);
    },
    []
  );

  if (!pet || !pet.definition) return null;

  const config = interactionFor(pet.definition.key);

  function onTap() {
    if (messVisible) {
      setMessVisible(false);
      if (messTimerRef.current) clearTimeout(messTimerRef.current);
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < TAP_DEBOUNCE_MS) return;
    lastTapRef.current = now;
    playGag(config.family);
  }

  const gagAnimClass = activeFamily ? ANIM_CLASS[activeFamily] : null;
  const mood = activeFamily ? MOOD_DURING_GAG[activeFamily] : undefined;

  const toast = activeFamily && (
    <div className="gossip-pet-anim-pop max-w-[170px] rounded-2xl rounded-br-sm bg-white px-3 py-2 text-[12px] font-medium text-text shadow-md ring-1 ring-border">
      {config.line}
    </div>
  );

  if (sprited && x !== null) {
    return (
      <div
        className="pointer-events-none fixed bottom-[104px] left-0 z-10 w-full"
        style={{ height: WIDGET_SIZE }}
      >
        <div
          className="pointer-events-auto absolute flex flex-col items-end gap-1.5"
          style={{ left: x, transition: `left ${HOP_DURATION_MS}ms ease-in-out` }}
        >
          {toast}
          <button
            onClick={onTap}
            aria-label={`Tu mascota: ${config.line}`}
            className={`relative ${hopping ? "gossip-pet-anim-hop" : !activeFamily ? "gossip-pet-anim-bob" : ""}`}
          >
            <img
              src={spriteUrl(pet.species, pet.definition.key, pose)}
              alt=""
              draggable={false}
              className={`drop-shadow-md ${gagAnimClass ?? ""}`}
              style={{
                width: WIDGET_SIZE,
                height: WIDGET_SIZE,
                objectFit: "contain",
                transform: facing === "left" ? "scaleX(-1)" : undefined,
              }}
            />
            <PetCosmeticsOverlay equipped={pet.equipped} size={WIDGET_SIZE} />
            {messVisible && (
              <span className="gossip-pet-anim-pop absolute -left-1 -top-1 text-[20px]">{config.emoji}</span>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-[104px] right-4 z-10 flex flex-col items-end gap-1.5">
      {toast}
      <button
        onClick={onTap}
        aria-label={`Tu mascota: ${config.line}`}
        className={`relative flex items-center justify-center rounded-full bg-surface shadow-md ring-1 ring-border ${gagAnimClass ?? "gossip-pet-anim-bob"}`}
      >
        <PetAvatar species={pet.species} petKey={pet.definition.key} size={68} mood={mood} equipped={pet.equipped} />
        {messVisible && (
          <span className="gossip-pet-anim-pop absolute -left-2 -top-2 text-[20px]">{config.emoji}</span>
        )}
      </button>
    </div>
  );
}
