"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@gossip/ui";
import { BellIcon, PlusIcon } from "../../components/icons";
import { PostCard } from "../../components/PostCard";
import { getSession, getFeed, me, type FeedTab, type PostDto, type UserPublic } from "../../lib/api";

const TABS: { id: FeedTab; label: string }[] = [
  { id: "for-you", label: "Para vos" },
  { id: "following", label: "Siguiendo" },
  { id: "nearby", label: "Cerca" },
  { id: "trending", label: "Tendencias" },
  { id: "mi-gente", label: "Mi gente" },
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [tab, setTab] = useState<FeedTab>("for-you");
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    me(session.accessToken).then((res) => {
      if (res.data) setUser(res.data);
    });
  }, [router]);

  const loadFeed = useCallback(async (nextTab: FeedTab) => {
    setLoading(true);
    setNearbyError(null);

    if (nextTab === "nearby") {
      if (!navigator.geolocation) {
        setNearbyError("Tu navegador no soporta geolocalización.");
        setPosts([]);
        setLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const res = await getFeed("nearby", { lat: pos.coords.latitude, lng: pos.coords.longitude });
          setPosts(res.data ?? []);
          setLoading(false);
        },
        () => {
          setNearbyError("No pudimos acceder a tu ubicación.");
          setPosts([]);
          setLoading(false);
        }
      );
      return;
    }

    const res = await getFeed(nextTab);
    setPosts(res.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFeed(tab);
  }, [tab, loadFeed]);

  return (
    <main className="relative mx-auto min-h-screen max-w-lg pb-24">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <span className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-symbol.png" alt="" width={24} height={24} />
          <span className="font-display text-[17px] font-semibold tracking-tight">Gossip</span>
        </span>
        <div className="flex items-center gap-3.5">
          <BellIcon size={22} className="text-text" />
          {user && (
            <Link href="/me">
              <Avatar seed={user.username} src={user.avatarUrl} size={30} />
            </Link>
          )}
        </div>
      </div>

      <div className="gossip-glass sticky top-2 z-10 mx-4 my-2.5 flex gap-0.5 overflow-x-auto rounded-full p-1 [scrollbar-width:none]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-display text-[13.5px] font-medium ${
              tab === t.id ? "bg-accent text-white" : "text-text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3.5 px-3.5 pb-6">
        {loading && <p className="px-2 py-8 text-center text-[13.5px] text-text-muted">Cargando…</p>}
        {!loading && nearbyError && (
          <p className="px-2 py-8 text-center text-[13.5px] text-text-muted">{nearbyError}</p>
        )}
        {!loading && !nearbyError && posts.length === 0 && (
          <p className="px-2 py-8 text-center text-[13.5px] text-text-muted">
            Todavía no hay nada para mostrar acá.
          </p>
        )}
        {!loading &&
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDismissed={
                tab === "for-you" ? (id) => setPosts((prev) => prev.filter((p) => p.id !== id)) : undefined
              }
            />
          ))}
      </div>

      <Link
        href="/create"
        className="fixed bottom-6 right-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent text-white shadow-lg"
        aria-label="Crear post"
      >
        <PlusIcon size={22} />
      </Link>
    </main>
  );
}
