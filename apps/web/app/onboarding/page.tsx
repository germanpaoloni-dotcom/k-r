"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@gossip/ui";
import { PetPicker } from "../../components/pets/PetPicker";
import {
  getSession,
  getSuggestedUsers,
  followUser,
  unfollowUser,
  getPetDefinitions,
  completeOnboarding,
  type FollowUser,
  type PetDefinitionDto,
  type PetDto,
} from "../../lib/api";

const STEPS = ["Ubicación", "Mi gente", "Mascota"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "asking" | "ok" | "denied">("idle");

  const [suggestions, setSuggestions] = useState<FollowUser[]>([]);
  const [orbiting, setOrbiting] = useState<Set<string>>(new Set());
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  const [petDefinitions, setPetDefinitions] = useState<PetDefinitionDto[]>([]);
  const [adoptedPet, setAdoptedPet] = useState<PetDto | null>(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    getSuggestedUsers().then((res) => {
      setSuggestions(res.data ?? []);
      setSuggestionsLoading(false);
    });
    getPetDefinitions().then((res) => setPetDefinitions(res.data ?? []));
  }, [router]);

  function shareLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus("ok");
      },
      () => setLocationStatus("denied")
    );
  }

  async function toggleOrbit(user: FollowUser) {
    const isOrbiting = orbiting.has(user.id);
    setOrbiting((prev) => {
      const next = new Set(prev);
      if (isOrbiting) next.delete(user.id);
      else next.add(user.id);
      return next;
    });
    await (isOrbiting ? unfollowUser(user.id) : followUser(user.id));
  }

  async function finish() {
    setFinishing(true);
    await completeOnboarding(coords ? { lat: coords.lat, lng: coords.lng } : {});
    router.push("/home");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 pb-8 pt-8">
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <div className={`h-1 rounded-full ${i <= step ? "bg-accent" : "bg-surface-2"}`} />
            <span className={`text-[10.5px] font-medium ${i === step ? "text-text" : "text-text-muted"}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="mt-10 flex flex-1 flex-col">
          <h1 className="font-display text-[22px] font-semibold">Encontrá lo que pasa cerca tuyo</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-text-muted">
            Gossip usa tu ubicación para la pestaña Cerca y para lo que se comenta alrededor tuyo. Podés
            cambiarlo cuando quieras.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-10 text-center">
            {locationStatus === "ok" ? (
              <>
                <span className="text-[14px] font-semibold text-accent">Ubicación compartida</span>
                <span className="text-[12.5px] text-text-muted">Ya podés seguir.</span>
              </>
            ) : (
              <>
                <button
                  onClick={shareLocation}
                  disabled={locationStatus === "asking"}
                  className="rounded-full bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
                >
                  {locationStatus === "asking" ? "Pidiendo acceso…" : "Compartir mi ubicación"}
                </button>
                {locationStatus === "denied" && (
                  <span className="text-[12px] text-text-muted">
                    No pudimos acceder. Podés seguir sin esto y activarlo después.
                  </span>
                )}
              </>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between pt-8">
            <button onClick={() => setStep(1)} className="text-[13px] text-text-muted">
              Omitir
            </button>
            <button
              onClick={() => setStep(1)}
              className="rounded-full bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-10 flex flex-1 flex-col">
          <h1 className="font-display text-[22px] font-semibold">Sumá a tu gente</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-text-muted">
            Estas cuentas están arrancando en Gossip como vos. Sumalas a tu órbita para que aparezcan en tu
            feed.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            {suggestionsLoading && (
              <p className="py-8 text-center text-[13px] text-text-muted">Buscando gente…</p>
            )}
            {!suggestionsLoading && suggestions.length === 0 && (
              <p className="py-8 text-center text-[13px] text-text-muted">
                Todavía no hay más cuentas para sugerir.
              </p>
            )}
            {suggestions.map((u) => {
              const active = orbiting.has(u.id);
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-surface px-3.5 py-3"
                >
                  <Avatar seed={u.username} src={u.avatarUrl} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold">{u.displayName}</div>
                    <div className="truncate text-[12px] text-text-muted">@{u.username}</div>
                  </div>
                  <button
                    onClick={() => toggleOrbit(u)}
                    className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold ${
                      active ? "border border-border text-text-muted" : "bg-accent-soft text-accent"
                    }`}
                  >
                    {active ? "En tu órbita" : "Sumar"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-auto flex items-center justify-between pt-8">
            <button onClick={() => setStep(2)} className="text-[13px] text-text-muted">
              Omitir
            </button>
            <button
              onClick={() => setStep(2)}
              className="rounded-full bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-10 flex flex-1 flex-col">
          <h1 className="font-display text-[22px] font-semibold">Elegí tu Gossip Pet</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-text-muted">
            Vive en tu cuenta, no dentro de tu perfil, y de a poco va a asomarse por el resto de la app.
          </p>

          <div className="mt-6">
            {adoptedPet ? (
              <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface px-6 py-10 text-center">
                <span className="text-[14px] font-semibold text-accent">
                  {adoptedPet.name} ya es parte de tu cuenta
                </span>
                <span className="text-[12.5px] text-text-muted">La vas a ver en tu perfil.</span>
              </div>
            ) : petDefinitions.length > 0 ? (
              <PetPicker definitions={petDefinitions} onAdopted={setAdoptedPet} />
            ) : (
              <p className="py-8 text-center text-[13px] text-text-muted">Cargando catálogo…</p>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between pt-8">
            <button onClick={finish} disabled={finishing} className="text-[13px] text-text-muted disabled:opacity-60">
              Omitir
            </button>
            <button
              onClick={finish}
              disabled={finishing}
              className="rounded-full bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
            >
              {finishing ? "Entrando…" : "Empezar a usar Gossip"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
