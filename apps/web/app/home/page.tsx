"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@gossip/ui";
import { SlidersIcon, SearchIcon } from "../../components/icons";
import { PostCard } from "../../components/PostCard";
import { BottomNav } from "../../components/BottomNav";
import { MiraEstoBar } from "../../components/MiraEstoBar";
import { NotificationBell } from "../../components/NotificationBell";
import { getSession, getFeed, me, type FeedTab, type PostDto, type UserPublic } from "../../lib/api";

const SUB_TABS: { id: FeedTab; label: string }[] = [
  { id: "for-you", label: "Para vos" },
  { id: "following", label: "Siguiendo" },
  { id: "nearby", label: "Cerca" },
];

const DESTINATION_LABEL: Record<string, string> = {
  "mi-gente": "Mi gente",
  trending: "Susurros",
};

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destinationTab = searchParams.get("tab"); // "mi-gente" | "trending" | null

  const [user, setUser] = useState<UserPublic | null>(null);
  const [subTab, setSubTab] = useState<FeedTab>("for-you");
  const [showFilters, setShowFilters] = useState(false);
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
      if (!res.data) return;
      if (!res.data.onboardingCompletedAt) {
        router.replace("/onboarding");
        return;
      }
      setUser(res.data);
    });
  }, [router]);

  const activeTab: FeedTab = destinationTab === "mi-gente" || destinationTab === "trending" ? destinationTab : subTab;

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
    loadFeed(activeTab);
  }, [activeTab, loadFeed]);

  return (
    <main className="relative mx-auto min-h-screen max-w-lg pb-28">
      <div className="flex items-center justify-between px-4 pt-4">
        <span className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-symbol.png" alt="" width={30} height={30} />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[19px] font-semibold tracking-tight">Gossip</span>
            <span className="text-[10px] text-text-muted">
              Gossipeá <span className="text-accent">algo</span>
            </span>
          </span>
        </span>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFilters((v) => !v)} aria-label="Filtros de feed">
            <SlidersIcon size={21} className={showFilters ? "text-accent" : "text-text"} />
          </button>
          <NotificationBell />
          {user && (
            <Link href="/me">
              <Avatar seed={user.username} src={user.avatarUrl} size={30} />
            </Link>
          )}
        </div>
      </div>

      <Link
        href="/search"
        className="mx-4 mt-3.5 flex items-center gap-2 rounded-full bg-surface px-3.5 py-2.5 text-text-muted"
      >
        <SearchIcon size={16} />
        <span className="text-[13.5px]">Buscar</span>
      </Link>

      {!destinationTab && <MiraEstoBar />}

      {destinationTab && DESTINATION_LABEL[destinationTab] && (
        <h1 className="px-4 pt-4 font-display text-[15px] font-semibold">{DESTINATION_LABEL[destinationTab]}</h1>
      )}

      {!destinationTab && showFilters && (
        <div className="gossip-glass mx-4 mt-3.5 flex gap-0.5 rounded-full p-1">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex-1 whitespace-nowrap rounded-full px-3.5 py-1.5 font-display text-[13px] font-medium ${
                subTab === t.id ? "bg-accent text-white" : "text-text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3.5 flex flex-col gap-3.5 px-3.5 pb-6">
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
                activeTab === "for-you" ? (id) => setPosts((prev) => prev.filter((p) => p.id !== id)) : undefined
              }
            />
          ))}
      </div>

      <BottomNav />
    </main>
  );
}
