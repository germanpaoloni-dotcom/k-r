import { ILLUSTRATION_BY_SPECIES, type PetMood } from "./illustrations/PetIllustration";
import { themeFor } from "../../lib/pets/theme";
import { hasSprite, spriteUrl } from "../../lib/pets/sprites";
import { hasCosmeticArt, cosmeticArtUrl, COSMETIC_PLACEMENT } from "../../lib/pets/cosmeticArt";
import type { PetDto, PetCosmeticDto } from "../../lib/api";

function CosmeticImage({ item, size }: { item: PetCosmeticDto; size: number }) {
  const placement = COSMETIC_PLACEMENT[item.slot];
  let transform = "translateX(-50%)";
  if (placement.anchor === "bottom") transform += " translateY(-100%)";
  else if (placement.anchor === "center") transform += " translateY(-50%)";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cosmeticArtUrl(item.key)}
      alt=""
      draggable={false}
      className="absolute left-1/2"
      style={{
        top: placement.anchorYPct * size,
        width: size * placement.widthPct,
        height: "auto",
        transform,
        pointerEvents: "none",
      }}
    />
  );
}

function CosmeticEmoji({ item, size }: { item: PetCosmeticDto; size: number }) {
  const style =
    item.slot === "hat"
      ? { top: -size * 0.1, fontSize: size * 0.34 }
      : item.slot === "glasses"
        ? { top: size * 0.36, fontSize: size * 0.24 }
        : { bottom: -size * 0.06, fontSize: size * 0.28 };
  return (
    <span className="absolute left-1/2" style={{ ...style, transform: "translateX(-50%)" }}>
      {item.emoji}
    </span>
  );
}

export function PetCosmeticsOverlay({
  equipped,
  size,
  useRealArt = false,
}: {
  equipped?: PetDto["equipped"];
  size: number;
  /** Solo las especies con sprite real (ver lib/pets/sprites.ts) tienen la
   * posición de los accesorios calibrada — el resto sigue con emoji. */
  useRealArt?: boolean;
}) {
  if (!equipped) return null;
  const items = [equipped.hat, equipped.glasses, equipped.outfit].filter(
    (item): item is PetCosmeticDto => Boolean(item)
  );
  return (
    <>
      {items.map((item) =>
        useRealArt && hasCosmeticArt(item.key) ? (
          <CosmeticImage key={item.slot} item={item} size={size} />
        ) : (
          <CosmeticEmoji key={item.slot} item={item} size={size} />
        )
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
  const sprited = hasSprite(species);

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className ?? ""}`} style={{ width: size, height: size }}>
      {sprited ? (
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
      <PetCosmeticsOverlay equipped={equipped} size={size} useRealArt={sprited} />
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
