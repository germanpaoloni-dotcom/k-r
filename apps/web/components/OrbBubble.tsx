"use client";

import { useState } from "react";
import { Avatar } from "@gossip/ui";

/**
 * Orbe — fusiona dos cosas que antes vivían separadas: el pulso de actividad
 * (silencioso/activo/creciendo/pulsando) y la burbuja de "Mirá esto". El
 * vidrio esmerilado alrededor del avatar ES el indicador de actividad; tocar
 * el Orbe lo rompe como vidrio antes de abrir el contenido.
 */

type ActivityState = "silencioso" | "activo" | "creciendo" | "pulsando";

const STATE_STYLE: Record<ActivityState, { glow: string; pulse: boolean }> = {
  silencioso: { glow: "rgba(17,17,17,0.12)", pulse: false },
  activo: { glow: "rgba(255,20,147,0.28)", pulse: false },
  creciendo: { glow: "rgba(255,20,147,0.42)", pulse: true },
  pulsando: { glow: "rgba(255,20,147,0.58)", pulse: true },
};

const SHARD_COUNT = 8;
const SHARDS = Array.from({ length: SHARD_COUNT }, (_, i) => {
  const angle = (i / SHARD_COUNT) * Math.PI * 2;
  const dist = 42 + (i % 3) * 12;
  return {
    dx: Math.round(Math.cos(angle) * dist),
    dy: Math.round(Math.sin(angle) * dist),
    rot: ((i * 53) % 360) - 180,
    delay: (i % 4) * 18,
  };
});

const SHATTER_MS = 420;

export function OrbBubble({
  avatarSeed,
  avatarSrc,
  size = 58,
  activityState,
  onOpen,
  label,
  emptyBadge,
}: {
  avatarSeed: string;
  avatarSrc?: string | null;
  size?: number;
  activityState?: string | null;
  onOpen: () => void;
  label: string;
  emptyBadge?: React.ReactNode;
}) {
  const [breaking, setBreaking] = useState(false);
  const style = STATE_STYLE[(activityState as ActivityState) ?? "silencioso"] ?? STATE_STYLE.silencioso;

  function handleTap() {
    if (breaking) return;
    setBreaking(true);
    window.setTimeout(onOpen, SHATTER_MS);
  }

  return (
    <button
      onClick={handleTap}
      aria-label={label}
      className="relative flex flex-shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Avatar seed={avatarSeed} src={avatarSrc} size={size - 10} />

      <div
        className={`absolute inset-0 rounded-full ${!breaking && style.pulse ? "gossip-orb-pulse" : ""}`}
        style={
          {
            backdropFilter: "blur(1.5px)",
            background: "rgba(255,255,255,0.16)",
            border: "1.5px solid rgba(255,255,255,0.7)",
            boxShadow: `0 0 0 3px ${style.glow}, inset 0 1px 2px rgba(255,255,255,0.9)`,
            "--orb-glow": style.glow,
            opacity: breaking ? 0 : 1,
            transform: breaking ? "scale(1.15)" : "scale(1)",
            transition: `opacity ${SHATTER_MS * 0.4}ms ease-out, transform ${SHATTER_MS * 0.4}ms ease-out`,
          } as React.CSSProperties
        }
      />

      {breaking && (
        <div className="pointer-events-none absolute inset-0">
          {SHARDS.map((s, i) => (
            <span
              key={i}
              className="gossip-orb-shard"
              style={
                {
                  "--dx": `${s.dx}px`,
                  "--dy": `${s.dy}px`,
                  "--rot": `${s.rot}deg`,
                  animationDelay: `${s.delay}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {emptyBadge}
    </button>
  );
}
