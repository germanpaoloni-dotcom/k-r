"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@gossip/ui";
import { ChevronLeftIcon, ShareIcon, MapPinIcon } from "../../components/icons";
import { PostCard } from "../../components/PostCard";
import { PetSummary } from "../../components/pets/PetSummary";
import { PetPicker } from "../../components/pets/PetPicker";
import { BottomNav } from "../../components/BottomNav";
import {
  clearSession,
  getSession,
  me,
  getMyPet,
  getPetDefinitions,
  getUserPosts,
  getFollowers,
  getFollowing,
  getCreatorAnalytics,
  type UserPublic,
  type PetDto,
  type PetDefinitionDto,
  type PostDto,
  type CreatorAnalytics,
} from "../../lib/api";

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [pet, setPet] = useState<PetDto | null>(null);
  const [petDefinitions, setPetDefinitions] = useState<PetDefinitionDto[]>([]);
  const [petLoading, setPetLoading] = useState(true);
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    me(session.accessToken).then(async (res) => {
      if (res.error || !res.data) {
        clearSession();
        router.push("/login");
        return;
      }
      setUser(res.data);
      setLoading(false);

      const [postsRes, followersRes, followingRes, analyticsRes] = await Promise.all([
        getUserPosts(res.data.id),
        getFollowers(res.data.id),
        getFollowing(res.data.id),
        getCreatorAnalytics(),
      ]);
      setPosts(postsRes.data ?? []);
      setFollowerCount(followersRes.data?.length ?? 0);
      setFollowingCount(followingRes.data?.length ?? 0);
      setAnalytics(analyticsRes.data ?? null);
    });
    getMyPet().then((res) => {
      setPet(res.data ?? null);
      setPetLoading(false);
      if (!res.data) getPetDefinitions().then((r) => setPetDefinitions(r.data ?? []));
    });
  }, [router]);

  const topPlaces = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) {
      if (p.location) counts.set(p.location.name, (counts.get(p.location.name) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name]) => name);
  }, [posts]);

  async function shareProfile() {
    if (!user) return;
    const url = `${window.location.origin}/u/${user.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: user.displayName, url });
        return;
      } catch {
        // canceló el share nativo — cae al copiado
      }
    }
    await navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center text-text-muted">Cargando…</main>;
  }
  if (!user) return null;

  const daysInGossip = Math.max(1, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86_400_000));

  return (
    <main className="mx-auto min-h-screen max-w-lg pb-28">
      <div className="flex items-center gap-3 px-3.5 py-4">
        <Link href="/home" aria-label="Volver al feed">
          <ChevronLeftIcon size={21} />
        </Link>
        <span className="font-display text-[15px] font-semibold">Tu perfil</span>
      </div>

      {/* Identidad — mismo criterio que el perfil ajeno: nada de hero centrado con stats en columnas. */}
      <div className="px-5">
        <div className="flex items-start gap-3.5">
          <Avatar seed={user.username} src={user.avatarUrl} size={64} />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="font-display text-[17px] font-semibold">{user.displayName}</div>
            <div className="mt-0.5 text-[12.5px] text-text-muted">@{user.username}</div>
          </div>
          <div className="flex flex-shrink-0 flex-col gap-1.5">
            <Link
              href="/me/edit"
              className="rounded-full bg-accent px-4 py-1.5 text-center text-[12.5px] font-semibold text-white"
            >
              Editar perfil
            </Link>
            <button
              onClick={shareProfile}
              className="flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-[12.5px] font-medium text-text-muted"
            >
              <ShareIcon size={13} />
              Compartir
            </button>
          </div>
        </div>

        {user.bio && <p className="mt-3.5 text-[13.5px] leading-relaxed text-text">{user.bio}</p>}
        {shared && <p className="mt-2 text-[12px] text-accent">Link copiado</p>}

        <div className="mt-2.5 text-[12px] leading-relaxed text-text-muted">
          <span className="font-semibold text-text">{posts.length}</span> publicaciones ·{" "}
          <span className="font-semibold text-text">{followerCount}</span> seguidores ·{" "}
          <span className="font-semibold text-text">{followingCount}</span> siguiendo
          <br />
          Cuenta {user.accountType} · en Gossip desde{" "}
          {new Date(user.createdAt).toLocaleDateString("es-AR", { month: "long", year: "numeric" })} ({daysInGossip}{" "}
          día{daysInGossip === 1 ? "" : "s"})
        </div>
      </div>

      {/* Didáctico a propósito — Instagram no te muestra esto en tu propio perfil. */}
      {analytics && analytics.postCount > 0 && (
        <div className="mt-6 px-5">
          <h2 className="mb-1 font-display text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            Tu actividad
          </h2>
          <p className="mb-2.5 text-[12px] text-text-muted">Cómo le está yendo a lo que publicaste.</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border border-border bg-surface p-3 text-center">
              <div className="font-display text-[18px] font-semibold">{analytics.totalLikes}</div>
              <div className="text-[11px] text-text-muted">Me gusta</div>
            </div>
            <div className="rounded-md border border-border bg-surface p-3 text-center">
              <div className="font-display text-[18px] font-semibold">{analytics.totalComments}</div>
              <div className="text-[11px] text-text-muted">Comentarios</div>
            </div>
            <div className="rounded-md border border-border bg-surface p-3 text-center">
              <div className="font-display text-[18px] font-semibold">{analytics.totalImpressions}</div>
              <div className="text-[11px] text-text-muted">Vistas en feeds</div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 px-5">
        <h2 className="mb-2.5 font-display text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Tu mascota
        </h2>
        {!petLoading && pet && <PetSummary pet={pet} />}
        {!petLoading && !pet && petDefinitions.length > 0 && (
          <>
            <p className="mb-3 text-[12.5px] text-text-muted">
              Elegí una mascota del catálogo — vive en Gossip, no dentro de tu perfil.
            </p>
            <PetPicker definitions={petDefinitions} onAdopted={setPet} />
          </>
        )}
      </div>

      {topPlaces.length > 0 && (
        <div className="mt-6 px-5">
          <h2 className="mb-2.5 font-display text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            Lo que más vibra en tu mundo
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {topPlaces.map((name) => (
              <span
                key={name}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[12px] text-text-muted"
              >
                <MapPinIcon size={11} />
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 px-3.5">
        <h2 className="mb-2.5 px-1.5 font-display text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Tus publicaciones
        </h2>
        {posts.length === 0 && (
          <p className="px-2 py-8 text-center text-[13.5px] text-text-muted">Todavía no publicaste nada.</p>
        )}
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} variant="compact" />
          ))}
        </div>
      </div>

      <div className="mt-8 px-5">
        <button
          onClick={() => {
            clearSession();
            router.push("/");
          }}
          className="text-[13px] text-text-muted hover:text-text"
        >
          Cerrar sesión
        </button>
      </div>

      <BottomNav />
    </main>
  );
}
