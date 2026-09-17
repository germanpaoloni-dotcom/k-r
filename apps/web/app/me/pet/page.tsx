"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "../../../components/icons";
import { PetAvatar } from "../../../components/pets/PetAvatar";
import { PetPicker } from "../../../components/pets/PetPicker";
import {
  getSession,
  getMyPet,
  getPetDefinitions,
  renamePet,
  getPetCosmetics,
  getOwnedPetCosmeticIds,
  getCreditsBalance,
  buyPetCosmetic,
  equipPetCosmetic,
  type PetDto,
  type PetDefinitionDto,
  type PetCosmeticDto,
  type PetCosmeticSlot,
} from "../../../lib/api";
import { RARITY_LABEL } from "../../../lib/pets/emoji";

const SLOT_TABS: { id: PetCosmeticSlot; label: string }[] = [
  { id: "hat", label: "Sombreros" },
  { id: "glasses", label: "Anteojos" },
  { id: "outfit", label: "Ropa" },
];

export default function PetPanelPage() {
  const router = useRouter();
  const [pet, setPet] = useState<PetDto | null | undefined>(undefined);
  const [definitions, setDefinitions] = useState<PetDefinitionDto[]>([]);
  const [switching, setSwitching] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const [cosmetics, setCosmetics] = useState<PetCosmeticDto[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState<number | null>(null);
  const [slotTab, setSlotTab] = useState<PetCosmeticSlot>("hat");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cosmeticError, setCosmeticError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    getMyPet().then((res) => setPet(res.data ?? null));
    getPetDefinitions().then((res) => setDefinitions(res.data ?? []));
    getPetCosmetics().then((res) => setCosmetics(res.data ?? []));
    refreshOwnedAndBalance();
  }, [router]);

  function refreshOwnedAndBalance() {
    getOwnedPetCosmeticIds().then((res) => setOwnedIds(new Set(res.data ?? [])));
    getCreditsBalance().then((res) => setBalance(res.data?.balance ?? 0));
  }

  async function saveName() {
    const name = nameDraft.trim();
    if (!name || !pet) {
      setEditingName(false);
      return;
    }
    setSaving(true);
    const res = await renamePet(name);
    setSaving(false);
    setEditingName(false);
    if (res.data) setPet(res.data);
  }

  async function onCosmeticTap(item: PetCosmeticDto) {
    if (!pet || busyId) return;
    setCosmeticError(null);
    const isEquipped = pet.equipped?.[item.slot]?.id === item.id;
    const isOwned = ownedIds.has(item.id);

    setBusyId(item.id);
    try {
      if (isEquipped) {
        const res = await equipPetCosmetic(item.slot, null);
        if (res.data) setPet(res.data);
        return;
      }
      if (!isOwned) {
        const buyRes = await buyPetCosmetic(item.id);
        if (buyRes.error || !buyRes.data) {
          setCosmeticError(buyRes.error?.message ?? "No pudimos comprar el accesorio.");
          return;
        }
        setOwnedIds((prev) => new Set(prev).add(item.id));
        setBalance((b) => (b !== null ? b - item.creditsCost : b));
      }
      const equipRes = await equipPetCosmetic(item.slot, item.id);
      if (equipRes.data) setPet(equipRes.data);
    } finally {
      setBusyId(null);
    }
  }

  if (pet === undefined) {
    return <main className="flex min-h-screen items-center justify-center text-text-muted">Cargando…</main>;
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg pb-10">
      <div className="flex items-center gap-3 px-3.5 py-4">
        <button onClick={() => router.back()} aria-label="Volver">
          <ChevronLeftIcon size={21} />
        </button>
        <span className="font-display text-[15px] font-semibold">Tu mascota</span>
      </div>

      {!pet && !switching && (
        <div className="px-5 py-10 text-center">
          <p className="mb-4 text-[13.5px] text-text-muted">Todavía no elegiste una mascota.</p>
          <button
            onClick={() => setSwitching(true)}
            className="rounded-full bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-white"
          >
            Elegir mascota
          </button>
        </div>
      )}

      {pet && !switching && pet.definition && (
        <div className="flex flex-col items-center px-5 py-6 text-center">
          <PetAvatar
            species={pet.definition.species}
            petKey={pet.definition.key}
            size={140}
            equipped={pet.equipped}
          />

          {editingName ? (
            <div className="mt-4 flex items-center gap-2">
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                maxLength={40}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-center text-[17px] font-semibold outline-none focus:border-accent"
              />
              <button onClick={saveName} disabled={saving} className="text-[13px] font-semibold text-accent">
                Guardar
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setNameDraft(pet.name);
                setEditingName(true);
              }}
              className="mt-4 font-display text-[19px] font-semibold"
            >
              {pet.name} <span className="text-[12px] font-normal text-text-muted">(editar)</span>
            </button>
          )}

          <span className="mt-2 rounded-full bg-accent-soft px-3 py-1 text-[12px] font-medium text-accent">
            {RARITY_LABEL[pet.definition.rarity] ?? pet.definition.rarity}
          </span>
          <p className="mt-3 max-w-xs text-[13.5px] leading-relaxed text-text-muted">
            {pet.definition.description ?? pet.definition.personality}
          </p>

          <div className="mt-5 w-full max-w-xs">
            <div className="mb-1 flex justify-between text-[11.5px] text-text-muted">
              <span>Nivel {pet.level}</span>
              <span>{pet.xp} XP</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, pet.xp % 100)}%` }} />
            </div>
          </div>

          <button
            onClick={() => setSwitching(true)}
            className="mt-7 rounded-full border border-border px-5 py-2.5 text-[13px] font-semibold text-text-muted"
          >
            Cambiar de mascota
          </button>

          {/* Personalización — sombreros, anteojos, ropa. Arranca con emoji como
              representación visual; se va a ir reemplazando por arte real de a poco,
              igual que pasó con las mascotas. */}
          <div className="mt-9 w-full text-left">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[13px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                Personalizar
              </h2>
              {balance !== null && (
                <span className="text-[12px] font-medium text-text-muted">💠 {balance} créditos</span>
              )}
            </div>

            <div className="mb-3 flex gap-1 rounded-xl bg-surface-2 p-1">
              {SLOT_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSlotTab(t.id)}
                  className={`flex-1 rounded-lg py-2 font-display text-[12.5px] font-medium ${
                    slotTab === t.id ? "bg-accent-soft text-accent" : "text-text-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {cosmetics
                .filter((c) => c.slot === slotTab)
                .map((item) => {
                  const isEquipped = pet.equipped?.[item.slot]?.id === item.id;
                  const isOwned = ownedIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => onCosmeticTap(item)}
                      disabled={busyId === item.id}
                      className={`flex flex-col items-center gap-1 rounded-md border p-3 text-center disabled:opacity-50 ${
                        isEquipped ? "border-accent bg-accent-soft" : "border-border bg-surface"
                      }`}
                    >
                      <span className="text-[26px]">{item.emoji}</span>
                      <span className="text-[11.5px] font-medium leading-tight">{item.name}</span>
                      <span className="text-[10px] text-text-muted">
                        {isEquipped ? "Puesto" : isOwned ? "Tocá para poner" : `${item.creditsCost} créditos`}
                      </span>
                    </button>
                  );
                })}
            </div>
            {cosmeticError && <p className="mt-3 text-[12.5px] text-error">{cosmeticError}</p>}
          </div>
        </div>
      )}

      {switching && (
        <div className="px-5 py-5">
          {pet && (
            <p className="mb-4 text-[12.5px] text-text-muted">
              Si elegís otra, {pet.name} se va y tu nueva mascota arranca desde nivel 1.
            </p>
          )}
          {definitions.length > 0 ? (
            <PetPicker
              definitions={definitions}
              mode="switch"
              onAdopted={(p) => {
                setPet(p);
                setSwitching(false);
              }}
            />
          ) : (
            <p className="py-8 text-center text-[13px] text-text-muted">Cargando catálogo…</p>
          )}
          <button
            onClick={() => setSwitching(false)}
            className="mt-4 w-full text-center text-[13px] text-text-muted"
          >
            Cancelar
          </button>
        </div>
      )}
    </main>
  );
}
