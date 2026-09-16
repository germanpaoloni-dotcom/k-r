"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Avatar } from "@gossip/ui";
import {
  ChevronLeftIcon,
  MoreHorizontalIcon,
  ShareIcon,
  MapPinIcon,
} from "../../../components/icons";
import { PostCard } from "../../../components/PostCard";
import { PetSummary } from "../../../components/pets/PetSummary";
import {
  getSession,
  getUser,
  getUserPosts,
  getMutualFollowees,
  getActivityState,
  getUserPet,
  followUser,
  unfollowUser,
  getFollowers,
  requestFriendship,
  getFriends,
  getFriendRequests,
  me,
  type UserPublic,
  type PostDto,
  type FollowUser,
  type PetDto,
} from "../../../lib/api";

type FriendStatus = "none" | "pending" | "friends";

const ACTIVITY_LABEL: Record<string, string> = {
  pulsando: "Muy activo ahora",
  creciendo: "Activo ahora",
  activo: "Activo hoy",
  desvaneciendo: "Activo hace poco",
  silencioso: "Sin actividad reciente",
};

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [user, setUser] = useState<UserPublic | null>(null);
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [mutuals, setMutuals] = useState<FollowUser[]>([]);
  const [activityState, setActivityState] = useState<string | null>(null);
  const [pet, setPet] = useState<PetDto | null>(null);
  const [isOrbiting, setIsOrbiting] = useState(false); // "sumar a tu órbita" = follow
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [loading, setLoading] = useState(true);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    let cancelled = false;
    async function load() {
      const [ownRes, userRes, postsRes, followersRes, mutualRes, activityRes, petRes, friendsRes, requestsRes] =
        await Promise.all([
          me(session!.accessToken),
          getUser(userId),
          getUserPosts(userId),
          getFollowers(userId),
          getMutualFollowees(userId),
          getActivityState(userId),
          getUserPet(userId),
          getFriends(),
          getFriendRequests(),
        ]);
      if (cancelled) return;

      if (ownRes.data?.id === userId) {
        router.replace("/me");
        return;
      }
      if (!userRes.data) {
        setLoading(false);
        return;
      }

      setUser(userRes.data);
      setPosts(postsRes.data ?? []);
      setMutuals(mutualRes.data ?? []);
      setActivityState(activityRes.data?.state ?? null);
      setPet(petRes.data ?? null);
      setIsOrbiting(Boolean(followersRes.data?.some((f) => f.id === ownRes.data?.id)));

      const friends = friendsRes.data ?? [];
      const outgoing = requestsRes.data?.outgoing ?? [];
      const incoming = requestsRes.data?.incoming ?? [];
      if (friends.some((f) => f.id === userId)) setFriendStatus("friends");
      else if (outgoing.some((r) => r.addressee.id === userId) || incoming.some((r) => r.requester.id === userId)) {
        setFriendStatus("pending");
      }

      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, router]);

  const featuredPost = useMemo(() => {
    if (posts.length === 0) return null;
    return [...posts].sort((a, b) => b.likeCount - a.likeCount)[0]!;
  }, [posts]);

  const recentPosts = useMemo(() => posts.filter((p) => p.id !== featuredPost?.id), [posts, featuredPost]);

  const topPlaces = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) {
      if (p.location) counts.set(p.location.name, (counts.get(p.location.name) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name]) => name);
  }, [posts]);

  async function toggleOrbit() {
    const next = !isOrbiting;
    setIsOrbiting(next);
    await (next ? followUser(userId) : unfollowUser(userId));
  }

  async function addToMyPeople() {
    if (friendStatus !== "none") return;
    setFriendStatus("pending");
    await requestFriendship(userId);
  }

  async function shareProfile() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: user?.displayName, url });
        return;
      } catch {
        // el usuario canceló el share nativo — cae al copiado
      }
    }
    await navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center text-text-muted">Cargando…</main>;
  }
  if (!user) {
    return <main className="flex min-h-screen items-center justify-center text-text-muted">No encontrado.</main>;
  }

  const daysInKor = Math.max(1, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86_400_000));

  return (
    <main className="mx-auto min-h-screen max-w-lg pb-10">
      <div className="flex items-center justify-between px-3.5 py-4">
        <button onClick={() => router.back()} aria-label="Volver">
          <ChevronLeftIcon size={21} />
        </button>
        <MoreHorizontalIcon size={20} className="text-text" />
      </div>

      {/* Identidad */}
      <div className="flex flex-col items-center px-5 text-center">
        <Avatar seed={user.username} src={user.avatarUrl} size={80} />
        <div className="mt-3 flex items-center gap-2">
          <h1 className="font-display text-[19px] font-semibold">{user.displayName}</h1>
          {activityState && activityState !== "silencioso" && (
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          )}
        </div>
        <span className="text-[13px] text-text-muted">@{user.username}</span>
        {activityState && (
          <span className="mt-1.5 text-[11.5px] text-text-muted">{ACTIVITY_LABEL[activityState] ?? activityState}</span>
        )}
        {user.bio && <p className="mt-3 max-w-xs text-[13.5px] leading-relaxed text-text">“{user.bio}”</p>}
      </div>

      {/* Contexto social — sin followers/following como protagonista */}
      <div className="mt-4 flex items-center justify-center gap-5 text-[12px] text-text-muted">
        <span>
          <strong className="text-text">{mutuals.length}</strong> en común
        </span>
        <span>
          <strong className="text-text">{daysInKor}</strong> día{daysInKor === 1 ? "" : "s"} en Gossip
        </span>
      </div>

      {/* Acciones — nunca "Seguir"/"Mensaje" como CTA principal */}
      <div className="mt-5 flex items-center gap-2 px-5">
        <button
          onClick={addToMyPeople}
          disabled={friendStatus !== "none"}
          className="flex-1 rounded-md bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
        >
          {friendStatus === "friends" ? "En tu gente" : friendStatus === "pending" ? "Pedido enviado" : "Sumar a Mi gente"}
        </button>
        <button
          onClick={toggleOrbit}
          className={`flex-1 rounded-md px-4 py-2.5 text-[13.5px] font-semibold ${
            isOrbiting ? "border border-border text-text-muted" : "bg-accent-soft text-accent"
          }`}
        >
          {isOrbiting ? "En tu órbita" : "Sumar a tu órbita"}
        </button>
        <button
          onClick={shareProfile}
          aria-label="Compartir perfil"
          className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-md border border-border text-text-muted"
        >
          <ShareIcon size={17} />
        </button>
      </div>
      {shared && <p className="mt-2 text-center text-[12px] text-accent">Link copiado</p>}

      {pet && (
        <div className="mt-6 px-5">
          <h2 className="mb-2.5 font-display text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            Mascota
          </h2>
          <PetSummary pet={pet} />
        </div>
      )}

      {topPlaces.length > 0 && (
        <div className="mt-6 px-5">
          <h2 className="mb-2.5 font-display text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            Lo que más vibra en su mundo
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {topPlaces.map((name) => (
              <span key={name} className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[12px] text-text-muted">
                <MapPinIcon size={11} />
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {featuredPost && (
        <div className="mt-6 px-3.5">
          <h2 className="mb-2.5 px-1.5 font-display text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            Momento destacado
          </h2>
          <PostCard post={featuredPost} variant="compact" />
        </div>
      )}

      <div className="mt-6 px-3.5">
        <h2 className="mb-2.5 px-1.5 font-display text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Últimos momentos
        </h2>
        {recentPosts.length === 0 && !featuredPost && (
          <p className="px-2 py-8 text-center text-[13.5px] text-text-muted">Todavía no publicó nada.</p>
        )}
        <div className="flex flex-col gap-3">
          {recentPosts.map((post) => (
            <PostCard key={post.id} post={post} variant="compact" />
          ))}
        </div>
      </div>
    </main>
  );
}
