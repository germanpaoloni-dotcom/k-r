"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeftIcon } from "../../components/icons";
import { PetSummary } from "../../components/pets/PetSummary";
import { PetPicker } from "../../components/pets/PetPicker";
import {
  clearSession,
  getSession,
  me,
  getMyPet,
  getPetDefinitions,
  type UserPublic,
  type PetDto,
  type PetDefinitionDto,
} from "../../lib/api";

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [pet, setPet] = useState<PetDto | null>(null);
  const [petDefinitions, setPetDefinitions] = useState<PetDefinitionDto[]>([]);
  const [petLoading, setPetLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    me(session.accessToken).then((res) => {
      setLoading(false);
      if (res.error || !res.data) {
        clearSession();
        router.push("/login");
        return;
      }
      setUser(res.data);
    });
    getMyPet().then((res) => {
      setPet(res.data ?? null);
      setPetLoading(false);
      if (!res.data) getPetDefinitions().then((r) => setPetDefinitions(r.data ?? []));
    });
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-text-muted">
        Cargando…
      </main>
    );
  }
  if (!user) return null;

  return (
    <main className="mx-auto max-w-sm px-5 py-16">
      <Link href="/home" className="mb-6 flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text">
        <ChevronLeftIcon size={16} />
        Volver al feed
      </Link>
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="h-14 w-14 rounded-full bg-accent-soft" />
        <h1 className="mt-4 font-display text-[20px] font-semibold">{user.displayName}</h1>
        <p className="text-[13.5px] text-text-muted">@{user.username}</p>
        {user.bio && <p className="mt-3 text-[14px] text-text">{user.bio}</p>}
        <p className="mt-4 text-[12.5px] text-text-muted">
          Cuenta {user.accountType} · desde {new Date(user.createdAt).toLocaleDateString("es-AR")}
        </p>
      </div>

      <div className="mt-5">
        <h2 className="mb-2.5 font-display text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Tu mascota
        </h2>
        {!petLoading && pet && <PetSummary pet={pet} />}
        {!petLoading && !pet && petDefinitions.length > 0 && (
          <>
            <p className="mb-3 text-[12.5px] text-text-muted">
              Elegí una mascota del catálogo — vive en Kör, no dentro de tu perfil.
            </p>
            <PetPicker definitions={petDefinitions} onAdopted={setPet} />
          </>
        )}
      </div>

      <button
        onClick={() => {
          clearSession();
          router.push("/");
        }}
        className="mt-6 text-[13px] text-text-muted hover:text-text"
      >
        Cerrar sesión
      </button>
    </main>
  );
}
