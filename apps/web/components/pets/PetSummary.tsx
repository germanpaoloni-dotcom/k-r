import Link from "next/link";
import { PetAvatar } from "./PetAvatar";
import { RARITY_LABEL } from "../../lib/pets/emoji";
import type { PetDto } from "../../lib/api";

/** Tarjeta compacta de mascota — se usa igual en perfil propio y ajeno. */
export function PetSummary({ pet, editable }: { pet: PetDto; editable?: boolean }) {
  if (!pet.definition) return null; // pets libres previos a Fase Pets, sin catálogo

  const content = (
    <>
      <PetAvatar species={pet.definition.species} petKey={pet.definition.key} size={52} equipped={pet.equipped} />
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
    </>
  );

  if (editable) {
    return (
      <Link href="/me/pet" className="flex items-center gap-3 rounded-md border border-border bg-surface p-3.5">
        {content}
      </Link>
    );
  }

  return <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-3.5">{content}</div>;
}
