"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellIcon } from "./icons";
import { getNotifications } from "../lib/api";
import { subscribeRealtime } from "../lib/realtime";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    getNotifications().then((res) => setUnread(res.data?.unreadCount ?? 0));
    return subscribeRealtime((event) => {
      if (event.kind === "notification") setUnread(event.unreadCount);
    });
  }, []);

  return (
    <Link href="/notifications" aria-label="Notificaciones" className="relative">
      <BellIcon size={21} />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
