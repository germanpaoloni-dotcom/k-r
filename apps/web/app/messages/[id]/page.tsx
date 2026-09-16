"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Avatar } from "@gossip/ui";
import { ChevronLeftIcon, SendIcon } from "../../../components/icons";
import {
  getSession,
  getConversations,
  getMessages,
  sendChatMessage,
  markConversationRead,
  me,
  type ConversationDto,
  type MessageDto,
  type FollowUser,
} from "../../../lib/api";

const POLL_MS = 4000;

export default function ChatThreadPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const conversationId = params.id;

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [other, setOther] = useState<FollowUser | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    let cancelled = false;
    async function load() {
      const [meRes, conversationsRes, messagesRes] = await Promise.all([
        me(session!.accessToken),
        getConversations(),
        getMessages(conversationId),
      ]);
      if (cancelled) return;
      setViewerId(meRes.data?.id ?? null);
      const conversation = conversationsRes.data?.find((c: ConversationDto) => c.id === conversationId);
      setOther(conversation?.participants[0] ?? null);
      setMessages(messagesRes.data ?? []);
      setLoading(false);
      markConversationRead(conversationId);
    }
    load();

    const interval = setInterval(async () => {
      const res = await getMessages(conversationId);
      if (!cancelled && res.data) setMessages(res.data);
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [conversationId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function onSend() {
    if (!draft.trim() || sending) return;
    setSending(true);
    const body = draft.trim();
    setDraft("");
    const res = await sendChatMessage(conversationId, body);
    setSending(false);
    if (res.data) setMessages((prev) => [...prev, res.data!]);
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center text-text-muted">Cargando…</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col">
      <div className="flex items-center gap-3 border-b border-border px-3.5 py-3">
        <button onClick={() => router.back()} aria-label="Volver">
          <ChevronLeftIcon size={21} />
        </button>
        {other && (
          <>
            <Avatar seed={other.username} src={other.avatarUrl} size={34} />
            <span className="text-[14.5px] font-semibold">{other.displayName}</span>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-[13px] text-text-muted">
            Escribí el primer mensaje de la conversación.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {messages.map((m) => {
            const isOwn = m.senderId === viewerId;
            return (
              <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-[18px] px-3.5 py-2 text-[13.5px] leading-relaxed ${
                    isOwn ? "bg-accent text-white" : "bg-surface text-text"
                  }`}
                >
                  {m.deleted ? <span className="italic opacity-70">Mensaje eliminado</span> : m.body}
                </div>
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2.5 border-t border-border px-3.5 py-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder="Escribí un mensaje..."
          className="flex-1 rounded-full border border-border bg-surface px-3.5 py-2.5 text-[13.5px] outline-none focus:border-accent"
        />
        <button onClick={onSend} disabled={!draft.trim() || sending} aria-label="Enviar">
          <SendIcon size={20} className={draft.trim() ? "text-accent" : "text-text-muted"} />
        </button>
      </div>
    </main>
  );
}
