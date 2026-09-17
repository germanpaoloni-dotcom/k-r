"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMyPet, type PetDto } from "../../lib/api";
import { PetAvatar } from "./PetAvatar";
import { interactionFor, type GagFamily } from "../../lib/pets/interactions";
import type { PetMood } from "./illustrations/PetIllustration";

// Placeholder de balance — "fundacional" a propósito, se ajusta con datos
// reales de uso más adelante. Corto para que se pueda ver en una demo en vivo.
const MIN_COOLDOWN_MS = 40_000;
const COOLDOWN_JITTER_MS = 50_000;
const TAP_DEBOUNCE_MS = 3_000;
const MESS_AUTOCLEAR_MS = 15_000;

const GAG_DURATION_MS: Record<GagFamily, number> = {
  shake: 1600,
  bounce: 1700,
  sleepy: 2200,
  sparkle: 1900,
  speech: 2800,
  mess: 2800, // el ícono queda pegado más tiempo, pero el toast de texto se cierra igual que el resto
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
  const lastTapRef = useRef(0);
  const gagTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getMyPet().then((res) => setPet(res.data ?? null));
  }, []);

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

  // Ciclo automático: cada 5s chequea si ya pasó el cooldown (con jitter) y,
  // si el visitante no pidió reduced motion, dispara la travesura del pet.
  useEffect(() => {
    if (!pet) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const interval = setInterval(() => {
      if (activeFamily) return;
      const elapsed = Date.now() - readLastGagAt(pet.id);
      const threshold = MIN_COOLDOWN_MS + Math.random() * COOLDOWN_JITTER_MS;
      if (elapsed < threshold) return;
      const { family } = interactionFor(pet.definition?.interaction ?? "");
      playGag(reducedMotion && family !== "mess" ? "speech" : family);
    }, 5000);
    return () => clearInterval(interval);
  }, [pet, activeFamily, playGag]);

  useEffect(
    () => () => {
      if (gagTimerRef.current) clearTimeout(gagTimerRef.current);
      if (messTimerRef.current) clearTimeout(messTimerRef.current);
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

  const animClass = activeFamily ? ANIM_CLASS[activeFamily] : "gossip-pet-anim-bob";
  const mood = activeFamily ? MOOD_DURING_GAG[activeFamily] : undefined;

  return (
    <div className="fixed bottom-[104px] right-4 z-10 flex flex-col items-end gap-1.5">
      {activeFamily && (
        <div className="gossip-pet-anim-pop max-w-[170px] rounded-2xl rounded-br-sm bg-white px-3 py-2 text-[12px] font-medium text-text shadow-md ring-1 ring-border">
          {config.line}
        </div>
      )}
      <button
        onClick={onTap}
        aria-label={`Tu mascota: ${config.line}`}
        className={`relative flex items-center justify-center rounded-full bg-surface shadow-md ring-1 ring-border ${animClass ?? ""}`}
      >
        <PetAvatar species={pet.species} petKey={pet.definition.key} size={68} mood={mood} />
        {messVisible && (
          <span className="gossip-pet-anim-pop absolute -left-2 -top-2 text-[20px]">{config.emoji}</span>
        )}
      </button>
    </div>
  );
}
