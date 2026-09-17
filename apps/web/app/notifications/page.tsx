"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@gossip/ui";
import { ChevronLeftIcon } from "../../components/icons";
import {
  getSession,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationDto,
} from "../../lib/api";
import { subscribeRealtime } from "../../lib/realtime";

function describe(n: NotificationDto): string {
  const who = n.actor?.displayName ?? "Alguien";
  switch (n.type) {
    case "follow":
      return `${who} te sumó a su órbita`;
    case "friend_request":
      return `${who} te quiere sumar a Mi gente`;
    case "friend_accept":
      return `${who} aceptó tu pedido para Mi gente`;
    case "like":
      return `A ${who} le gustó tu publicación`;
    case "comment":
      return `${who} comentó tu publicación`;
    case "mira_esto_reaction":
      return `${who} reaccionó a tu Orbe`;
    case "message":
      return `${who} te mandó un mensaje`;
    case "share":
      return `${who} compartió tu publicación`;
    case "group_join":
      return `${who} se sumó a tu grupo`;
    case "event_attendance":
      return "Alguien confirmó asistencia a tu evento";
    case "order_placed":
      return "Tenés un pedido nuevo en tu tienda";
    case "order_paid":
      return "Te pagaron un pedido";
    default:
      return "Nueva notificación";
  }
}

function linkFor(n: NotificationDto): string | null {
  const p = n.payload;
  switch (n.type) {
    case "follow":
    case "friend_request":
    case "friend_accept":
      return n.actor ? `/u/${n.actor.id}` : null;
    case "like":
    case "comment":
      return typeof p.postId === "string" ? `/p/${p.postId}` : null;
    case "mira_esto_reaction":
      return typeof p.miraEstoId === "string" ? `/mira-esto/${p.miraEstoId}` : null;
    case "message":
      return typeof p.conversationId === "string" ? `/messages/${p.conversationId}` : null;
    default:
      return null;
  }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationDto[] | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    getNotifications().then((res) => setItems(res.data?.items ?? []));
    return subscribeRealtime((event) => {
      if (event.kind === "notification") {
        getNotifications().then((res) => setItems(res.data?.items ?? []));
      }
    });
  }, [router]);

  async function onOpen(n: NotificationDto) {
    if (!n.readAt) {
      setItems((prev) => (prev ? prev.map((it) => (it.id === n.id ? { ...it, readAt: new Date().toISOString() } : it)) : prev));
      await markNotificationRead(n.id);
    }
    const href = linkFor(n);
    if (href) router.push(href);
  }

  async function onMarkAll() {
    setItems((prev) => (prev ? prev.map((it) => ({ ...it, readAt: it.readAt ?? new Date().toISOString() })) : prev));
    await markAllNotificationsRead();
  }

  const hasUnread = items?.some((n) => !n.readAt) ?? false;

  return (
    <main className="mx-auto min-h-screen max-w-lg pb-10">
      <div className="flex items-center justify-between px-3.5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Volver">
            <ChevronLeftIcon size={21} />
          </button>
          <span className="font-display text-[17px] font-semibold">Notificaciones</span>
        </div>
        {hasUnread && (
          <button onClick={onMarkAll} className="text-[12.5px] font-medium text-accent">
            Marcar todo leído
          </button>
        )}
      </div>

      {items === null && <p className="px-4 py-8 text-center text-[13.5px] text-text-muted">Cargando…</p>}

      {items !== null && items.length === 0 && (
        <div className="px-6 py-16 text-center">
          <p className="text-[14px] text-text-muted">Todavía no tenés notificaciones.</p>
        </div>
      )}

      <div className="flex flex-col">
        {items?.map((n) => {
          const href = linkFor(n);
          const content = (
            <>
              <Avatar seed={n.actor?.username ?? n.id} src={n.actor?.avatarUrl} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] leading-snug text-text">{describe(n)}</p>
                <span className="text-[11.5px] text-text-muted">{timeAgo(n.createdAt)}</span>
              </div>
              {!n.readAt && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent" />}
            </>
          );
          return (
            <button
              key={n.id}
              onClick={() => onOpen(n)}
              disabled={!href && Boolean(n.readAt)}
              className={`flex items-center gap-3 border-b border-border px-4 py-3.5 text-left hover:bg-surface ${
                !n.readAt ? "bg-accent-soft/30" : ""
              }`}
            >
              {content}
            </button>
          );
        })}
      </div>
    </main>
  );
}
