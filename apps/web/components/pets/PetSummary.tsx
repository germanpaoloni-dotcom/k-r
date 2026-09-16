import { petEmoji, RARITY_LABEL } from "../../lib/pets/emoji";
import type { PetDto } from "../../lib/api";

/** Tarjeta compacta de mascota — se usa igual en perfil propio y ajeno. */
export function PetSummary({ pet }: { pet: PetDto }) {
  if (!pet.definition) return null; // pets libres previos a Fase Pets, sin catálogo

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-3.5">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-[26px]">
        {petEmoji(pet.definition.key, pet.definition.species)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-[14px] font-semibold">{pet.name}</span>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-medium text-accent">
            {RARITY_LABEL[pet.definition.rarity] ?? pet.definition.rarity}
          </span>
        </div>
        <div className="text-[12px] text-text-muted">{pet.definition.personality}</div>
      </div>
      <div className="flex-shrink-0 text-right text-[11px] text-text-muted">Nivel {pet.level}</div>
    </div>
  );
}
