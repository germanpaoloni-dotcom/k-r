import { ILLUSTRATION_BY_SPECIES, type PetMood } from "./illustrations/PetIllustration";
import { themeFor } from "../../lib/pets/theme";

export function PetAvatar({
  species,
  petKey,
  size = 96,
  mood,
  badge,
  className,
}: {
  species: string;
  petKey: string;
  size?: number;
  mood?: PetMood;
  badge?: string;
  className?: string;
}) {
  const theme = themeFor(petKey);
  const Illustration = ILLUSTRATION_BY_SPECIES[species] ?? ILLUSTRATION_BY_SPECIES.dog!;

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className ?? ""}`} style={{ width: size, height: size }}>
      <Illustration color={theme.color} accent={theme.accent} mood={mood ?? theme.mood} size={size} />
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
