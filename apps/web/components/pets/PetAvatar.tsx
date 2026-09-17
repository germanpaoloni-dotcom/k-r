import { ILLUSTRATION_BY_SPECIES, type PetMood } from "./illustrations/PetIllustration";
import { themeFor } from "../../lib/pets/theme";
import { hasSprite, spriteUrl } from "../../lib/pets/sprites";
import type { PetDto } from "../../lib/api";

export function PetCosmeticsOverlay({ equipped, size }: { equipped?: PetDto["equipped"]; size: number }) {
  if (!equipped) return null;
  return (
    <>
      {equipped.hat && (
        <span
          className="absolute left-1/2"
          style={{ top: -size * 0.1, fontSize: size * 0.34, transform: "translateX(-50%)" }}
        >
          {equipped.hat.emoji}
        </span>
      )}
      {equipped.glasses && (
        <span
          className="absolute left-1/2"
          style={{ top: size * 0.36, fontSize: size * 0.24, transform: "translateX(-50%)" }}
        >
          {equipped.glasses.emoji}
        </span>
      )}
      {equipped.outfit && (
        <span
          className="absolute left-1/2"
          style={{ bottom: -size * 0.06, fontSize: size * 0.28, transform: "translateX(-50%)" }}
        >
          {equipped.outfit.emoji}
        </span>
      )}
    </>
  );
}

export function PetAvatar({
  species,
  petKey,
  size = 96,
  mood,
  badge,
  equipped,
  className,
}: {
  species: string;
  petKey: string;
  size?: number;
  mood?: PetMood;
  badge?: string;
  equipped?: PetDto["equipped"];
  className?: string;
}) {
  const theme = themeFor(petKey);
  const Illustration = ILLUSTRATION_BY_SPECIES[species] ?? ILLUSTRATION_BY_SPECIES.dog!;

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className ?? ""}`} style={{ width: size, height: size }}>
      {hasSprite(species) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={spriteUrl(species, petKey, "idle")}
          alt=""
          draggable={false}
          style={{ width: size, height: size, objectFit: "contain" }}
        />
      ) : (
        <Illustration color={theme.color} accent={theme.accent} mood={mood ?? theme.mood} size={size} />
      )}
      <PetCosmeticsOverlay equipped={equipped} size={size} />
      {badge && (
        <span
          className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-white shadow ring-1 ring-border"
          style={{ width: size * 0.4, height: size * 0.4, fontSize: size * 0.24 }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
