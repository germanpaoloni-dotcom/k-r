"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@gossip/ui";
import { ChevronLeftIcon } from "../../components/icons";
import { BottomNav } from "../../components/BottomNav";
import { getSession, getConversations, type ConversationDto } from "../../lib/api";

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    getConversations().then((res) => {
      setConversations(res.data ?? []);
      setLoading(false);
    });
  }, [router]);

  return (
    <main className="mx-auto min-h-screen max-w-lg pb-28">
      <div className="flex items-center gap-3 px-3.5 py-4">
        <Link href="/home" aria-label="Volver">
          <ChevronLeftIcon size={21} />
        </Link>
        <span className="font-display text-[17px] font-semibold">Mensajes</span>
      </div>

      {loading && <p className="px-4 py-8 text-center text-[13.5px] text-text-muted">Cargando…</p>}

      {!loading && conversations.length === 0 && (
        <div className="px-6 py-16 text-center">
          <p className="text-[14px] text-text-muted">Todavía no tenés conversaciones.</p>
          <p className="mt-1.5 text-[12.5px] text-text-muted">
            Escribile a alguien desde su perfil para empezar una.
          </p>
        </div>
      )}

      <div className="flex flex-col">
        {conversations.map((c) => {
          const other = c.participants[0];
          if (!other) return null;
          const preview = c.lastMessage
            ? c.lastMessage.deleted
              ? "Mensaje eliminado"
              : c.lastMessage.body ?? "Adjunto"
            : "Todavía no hay mensajes";
          return (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="flex items-center gap-3 border-b border-border px-4 py-3.5 hover:bg-surface"
            >
              <Avatar seed={other.username} src={other.avatarUrl} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold">{other.displayName}</span>
                  {c.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10.5px] font-semibold text-white">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                <p className="truncate text-[13px] text-text-muted">{preview}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <BottomNav />
    </main>
  );
}
