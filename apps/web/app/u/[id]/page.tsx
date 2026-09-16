"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Avatar } from "@kor/ui";
import { ChevronLeftIcon, MessageSquareIcon, MoreHorizontalIcon } from "../../../components/icons";
import { PostCard } from "../../../components/PostCard";
import {
  getSession,
  getUser,
  getUserPosts,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  me,
  type UserPublic,
  type PostDto,
} from "../../../lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [user, setUser] = useState<UserPublic | null>(null);
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    let cancelled = false;
    async function load() {
      const [ownRes, userRes, postsRes, followersRes, followingRes] = await Promise.all([
        me(session!.accessToken),
        getUser(userId),
        getUserPosts(userId),
        getFollowers(userId),
        getFollowing(userId),
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
      setFollowerCount(followersRes.data?.length ?? 0);
      setFollowingCount(followingRes.data?.length ?? 0);
      setIsFollowing(Boolean(followersRes.data?.some((f) => f.id === ownRes.data?.id)));
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, router]);

  async function toggleFollow() {
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowerCount((c) => c + (next ? 1 : -1));
    await (next ? followUser(userId) : unfollowUser(userId));
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center text-text-muted">Cargando…</main>;
  }
  if (!user) {
    return <main className="flex min-h-screen items-center justify-center text-text-muted">No encontrado.</main>;
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg">
      <div className="flex items-center justify-between px-3.5 py-4">
        <button onClick={() => router.back()} aria-label="Volver">
          <ChevronLeftIcon size={21} />
        </button>
        <span className="font-display text-[14.5px] font-semibold">{user.username}</span>
        <MoreHorizontalIcon size={20} className="text-text" />
      </div>

      {/* Identidad a la izquierda, acciones compactas a la derecha de la misma
          fila — no hero centrado con stats en columnas (evita el patrón de
          perfil de Instagram). */}
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-start gap-3.5">
          <Avatar seed={user.username} src={user.avatarUrl} size={64} />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="font-display text-[17px] font-semibold">{user.displayName}</div>
            <div className="mt-0.5 text-[12.5px] text-text-muted">@{user.username}</div>
          </div>
          <div className="flex flex-shrink-0 flex-col gap-1.5">
            <button
              onClick={toggleFollow}
              className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold ${
                isFollowing ? "border border-border text-text-muted" : "bg-accent text-white"
              }`}
            >
              {isFollowing ? "Siguiendo" : "Seguir"}
            </button>
            <button className="flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-[12.5px] font-medium text-text-muted">
              <MessageSquareIcon size={14} />
              Mensaje
            </button>
          </div>
        </div>

        {user.bio && <p className="mt-3.5 text-[13.5px] leading-relaxed text-text">{user.bio}</p>}

        <div className="mt-2.5 text-[12px] leading-relaxed text-text-muted">
          <span className="font-semibold text-text">{posts.length}</span> publicaciones ·{" "}
          <span className="font-semibold text-text">{followerCount}</span> seguidores ·{" "}
          <span className="font-semibold text-text">{followingCount}</span> siguiendo
          <br />
          Cuenta {user.accountType} · en Kōr desde{" "}
          {new Date(user.createdAt).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
        </div>
      </div>

      <div className="mt-3 border-t border-border px-5 pb-1 pt-3.5">
        <span className="font-display text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Publicaciones
        </span>
      </div>

      {/* Lista vertical de cards, no grid cuadrado de fotos: no todos los
          posts de Kōr son imagen, y esto reusa el mismo componente del feed. */}
      <div className="flex flex-col gap-3 px-3.5 pb-8 pt-1">
        {posts.length === 0 && (
          <p className="px-2 py-8 text-center text-[13.5px] text-text-muted">Todavía no publicó nada.</p>
        )}
        {posts.map((post) => (
          <PostCard key={post.id} post={post} variant="compact" />
        ))}
      </div>
    </main>
  );
}
