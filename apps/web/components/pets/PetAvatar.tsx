import { ILLUSTRATION_BY_SPECIES, type PetMood } from "./illustrations/PetIllustration";
import { themeFor } from "../../lib/pets/theme";
import { hasSprite, spriteUrl } from "../../lib/pets/sprites";
import { hasCosmeticArt, cosmeticArtUrl, COSMETIC_PLACEMENT, anchorYPctFor } from "../../lib/pets/cosmeticArt";
import { anchorOffsetFor, type PetPose } from "../../lib/pets/cosmeticAnchors";
import type { PetDto, PetCosmeticDto } from "../../lib/api";

function CosmeticImage({
  item,
  size,
  petKey,
  pose,
}: {
  item: PetCosmeticDto;
  size: number;
  petKey: string;
  pose: PetPose;
}) {
  const placement = COSMETIC_PLACEMENT[item.slot];
  let transform = "translateX(-50%)";
  if (placement.anchor === "bottom") transform += " translateY(-100%)";
  else if (placement.anchor === "center") transform += " translateY(-50%)";
  // Corrige el centrado horizontal por mascota — en poses de costado (cuerpo
  // alargado) o de movimiento el centro de la cabeza/torso no coincide con
  // el centro geométrico de todo el sprite. Ver scripts/calibrate-pet-anchors.mjs.
  const offsetPct = anchorOffsetFor(petKey, placement.offsetKind, pose);
  // El gorro/anteojos además necesitan la posición vertical por pose (una
  // pose agachada puede tener la cabeza mucho más abajo que de pie).
  const anchorYPct = anchorYPctFor(item.slot, petKey, pose);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cosmeticArtUrl(item.key)}
      alt=""
      draggable={false}
      className="absolute"
      style={{
        left: `calc(50% + ${offsetPct * 100}%)`,
        top: anchorYPct * size,
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
  petKey = "",
  pose = "idle",
}: {
  equipped?: PetDto["equipped"];
  size: number;
  /** Solo las especies con sprite real (ver lib/pets/sprites.ts) tienen la
   * posición de los accesorios calibrada — el resto sigue con emoji. */
  useRealArt?: boolean;
  petKey?: string;
  /** Pose actual del sprite (PetAvatar siempre usa "idle"; el widget animado
   * de PetCompanion pasa la pose real para que gorro/anteojos la sigan). */
  pose?: PetPose;
}) {
  if (!equipped) return null;
  const items = [equipped.hat, equipped.glasses, equipped.outfit].filter(
    (item): item is PetCosmeticDto => Boolean(item)
  );
  return (
    <>
      {items.map((item) =>
        useRealArt && hasCosmeticArt(item.key) ? (
          <CosmeticImage key={item.slot} item={item} size={size} petKey={petKey} pose={pose} />
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
      <PetCosmeticsOverlay equipped={equipped} size={size} useRealArt={sprited} petKey={petKey} />
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
