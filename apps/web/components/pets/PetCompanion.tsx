"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMyPet, type PetDto } from "../../lib/api";
import { petEmoji } from "../../lib/pets/emoji";
import { interactionFor, type GagFamily } from "../../lib/pets/interactions";

// Placeholder de balance — "fundacional" a propósito, se ajusta con datos
// reales de uso más adelante. Corto para que se pueda ver en una demo en vivo.
const MIN_COOLDOWN_MS = 40_000;
const COOLDOWN_JITTER_MS = 50_000;
const TAP_DEBOUNCE_MS = 3_000;
const MESS_AUTOCLEAR_MS = 15_000;

const GAG_DURATION_MS: Record<GagFamily, number> = {
  shake: 1300,
  bounce: 1500,
  sleepy: 1900,
  sparkle: 1700,
  speech: 2600,
  mess: 400, // solo la animación de "aparición" — el residuo queda hasta que lo tocás
};

const ANIM_CLASS: Record<Exclude<GagFamily, "mess" | "speech">, string> = {
  shake: "gossip-pet-anim-shake",
  bounce: "gossip-pet-anim-bounce",
  sleepy: "gossip-pet-anim-sleepy",
  sparkle: "gossip-pet-anim-sparkle",
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

  if (!pet) return null;

  const config = interactionFor(pet.definition?.key ?? "");
  const emoji = petEmoji(pet.definition?.key ?? "", pet.species);

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

  const bubbleAnimClass =
    activeFamily && activeFamily !== "mess" && activeFamily !== "speech" ? ANIM_CLASS[activeFamily] : "gossip-pet-anim-bob";

  return (
    <div className="fixed bottom-[104px] right-4 z-10 flex flex-col items-end gap-1.5">
      {activeFamily === "speech" && (
        <div className="gossip-pet-anim-pop max-w-[160px] rounded-2xl rounded-br-sm bg-white px-3 py-2 text-[12px] font-medium text-text shadow-md ring-1 ring-border">
          {config.line}
        </div>
      )}
      <button
        onClick={onTap}
        aria-label={`Tu mascota: ${config.line}`}
        className={`relative flex h-12 w-12 items-center justify-center rounded-full bg-surface text-[24px] shadow-md ring-1 ring-border ${bubbleAnimClass}`}
      >
        {emoji}
        {messVisible && (
          <span className="gossip-pet-anim-pop absolute -left-1.5 -top-1.5 text-[18px]">{config.emoji}</span>
        )}
      </button>
    </div>
  );
}
