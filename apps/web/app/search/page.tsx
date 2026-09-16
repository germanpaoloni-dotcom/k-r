"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@gossip/ui";
import { ChevronLeftIcon, SearchIcon } from "../../components/icons";
import { getSession, search, type SearchResults } from "../../lib/api";

export default function SearchPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getSession()) router.push("/login");
  }, [router]);

  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const res = await search(q.trim());
      setResults(res.data ?? null);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const hasResults = results && (results.users.length > 0 || results.posts.length > 0);

  return (
    <main className="mx-auto min-h-screen max-w-lg">
      <div className="flex items-center gap-3 px-3.5 py-4">
        <button onClick={() => router.back()} aria-label="Volver">
          <ChevronLeftIcon size={21} />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-surface px-3.5 py-2.5">
          <SearchIcon size={17} className="text-text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar personas, posts, lugares..."
            className="w-full bg-transparent text-[14px] text-text outline-none placeholder:text-text-muted"
          />
        </div>
      </div>

      {loading && <p className="px-4 py-8 text-center text-[13.5px] text-text-muted">Buscando…</p>}

      {!loading && q.trim() && results && !hasResults && (
        <p className="px-4 py-8 text-center text-[13.5px] text-text-muted">Sin resultados para "{q}".</p>
      )}

      {!loading && results && results.users.length > 0 && (
        <div className="px-1.5">
          <h2 className="px-4 pb-1.5 pt-2 font-display text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            Personas
          </h2>
          {results.users.map((u) => (
            <Link key={u.id} href={`/u/${u.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface">
              <Avatar seed={u.username} src={u.avatar_url} size={40} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">{u.display_name}</div>
                <div className="text-[12px] text-text-muted">@{u.username}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && results && results.posts.length > 0 && (
        <div className="px-1.5">
          <h2 className="px-4 pb-1.5 pt-3 font-display text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            Publicaciones
          </h2>
          {results.posts.map((p) => (
            <Link key={p.id} href={`/p/${p.id}`} className="flex flex-col gap-0.5 px-4 py-2.5 hover:bg-surface">
              <span className="text-[13px] font-semibold">@{p.username}</span>
              {p.caption && <span className="truncate text-[13px] text-text-muted">{p.caption}</span>}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
