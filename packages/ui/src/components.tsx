import type { ButtonHTMLAttributes, PropsWithChildren, HTMLAttributes } from "react";

/** Botón primario del sistema Kōr. Superficie sólida, nunca vidrio (accesibilidad de controles). */
export function Button({
  children,
  variant = "primary",
  ...props
}: PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }
>) {
  const base =
    "kor-btn inline-flex items-center justify-center gap-2 rounded-[14px] px-4 py-2.5 text-[14.5px] font-medium transition-transform active:scale-[0.98]";
  const styles =
    variant === "primary"
      ? "bg-[var(--kor-accent)] text-white hover:brightness-110"
      : "bg-transparent text-[var(--kor-text)] border border-[var(--kor-border)] hover:bg-[var(--kor-surface-2)]";
  return (
    <button className={`${base} ${styles}`} {...props}>
      {children}
    </button>
  );
}

/** Superficie flotante en vidrio esmerilado — usar solo para nav, sheets y modales. */
export function GlassSurface({
  children,
  className = "",
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={`kor-glass ${className}`} {...props}>
      {children}
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
      className={`rounded-[14px] border border-[var(--kor-border)] bg-[var(--kor-surface)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
