"use client";

import { useState } from "react";
import { adoptPet, type PetDefinitionDto, type PetDto } from "../../lib/api";
import { petEmoji, RARITY_LABEL } from "../../lib/pets/emoji";

export function PetPicker({
  definitions,
  onAdopted,
}: {
  definitions: PetDefinitionDto[];
  onAdopted: (pet: PetDto) => void;
}) {
  const [adopting, setAdopting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdopt(def: PetDefinitionDto) {
    setAdopting(def.id);
    setError(null);
    const res = await adoptPet(def.id);
    setAdopting(null);
    if (res.error || !res.data) {
      setError(res.error?.message ?? "No pudimos adoptar la mascota.");
      return;
    }
    onAdopted(res.data);
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {definitions.map((def) => (
          <button
            key={def.id}
            onClick={() => handleAdopt(def)}
            disabled={adopting !== null}
            className="flex flex-col items-center gap-1 rounded-md border border-border bg-surface p-3 text-center disabled:opacity-50"
          >
            <span className="text-[26px]">{petEmoji(def.key, def.species)}</span>
            <span className="text-[12px] font-medium leading-tight">{def.name}</span>
            <span className="text-[10px] text-text-muted">{RARITY_LABEL[def.rarity] ?? def.rarity}</span>
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-[13px] text-error">{error}</p>}
    </div>
  );
}
