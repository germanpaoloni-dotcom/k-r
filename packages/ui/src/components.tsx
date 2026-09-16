import type { ButtonHTMLAttributes, PropsWithChildren, HTMLAttributes } from "react";

/** Botón primario del sistema Gossip. Superficie sólida, nunca vidrio (accesibilidad de controles). */
export function Button({
  children,
  variant = "primary",
  ...props
}: PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }
>) {
  const base =
    "gossip-btn inline-flex items-center justify-center gap-2 rounded-[14px] px-4 py-2.5 text-[14.5px] font-medium transition-transform active:scale-[0.98]";
  const styles =
    variant === "primary"
      ? "bg-[var(--gossip-accent)] text-white hover:brightness-110"
      : "bg-transparent text-[var(--gossip-text)] border border-[var(--gossip-border)] hover:bg-[var(--gossip-surface-2)]";
  return (
    <button className={`${base} ${styles}`} {...props}>
      {children}
    </button>
  );
}

/** Superficie flotante (nav, sheets, modales) — elevada por sombra, sin blur ("premium sin 3D"). */
export function GlassSurface({
  children,
  className = "",
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={`gossip-glass ${className}`} {...props}>
      {children}
    </div>
  );
}

const AVATAR_PALETTE = ["#4a7a5a", "#7a5a4a", "#5a4a7a", "#3a5a7a", "#4a5a7a", "#7a4a5a", "#5a7a4a", "#7a6a3a"];

function colorForSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
}

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  /** Usado para el color de fondo placeholder y las iniciales — username o displayName. */
  seed: string;
  size?: number;
}

/** Avatar circular — imagen si hay `src`, si no un color determinístico por `seed` con iniciales. */
export function Avatar({ src, seed, size = 36, className = "", style, ...props }: AvatarProps) {
  const dimension = { width: size, height: size, ...style };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt=""
        className={`rounded-full object-cover ${className}`}
        style={dimension}
        {...(props as HTMLAttributes<HTMLImageElement>)}
      />
    );
  }
  const initials = seed.trim().slice(0, 1).toUpperCase();
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-display font-semibold text-white/90 ${className}`}
      style={{ ...dimension, background: colorForSeed(seed), fontSize: size * 0.4 }}
      {...props}
    >
      {initials}
    </div>
  );
}

/** Tarjeta sólida de contenido — feed, listas, formularios. */
export function Card({
  children,
  className = "",
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={`rounded-[14px] border border-[var(--gossip-border)] bg-[var(--gossip-surface)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
