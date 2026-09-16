"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { HomeIcon, UsersIcon, CommentIcon, FlameIcon, PlusIcon } from "./icons";
import { getConversations } from "../lib/api";

interface NavItem {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  isActive: (pathname: string, tab: string | null) => boolean;
}

const ITEMS: NavItem[] = [
  {
    href: "/home",
    label: "Inicio",
    icon: (active) => <HomeIcon size={22} filled={active} />,
    isActive: (p, tab) => p === "/home" && tab !== "mi-gente" && tab !== "trending",
  },
  {
    href: "/home?tab=mi-gente",
    label: "Mi gente",
    icon: () => <UsersIcon size={22} />,
    isActive: (p, tab) => p === "/home" && tab === "mi-gente",
  },
  {
    href: "/messages",
    label: "Mensajes",
    icon: () => <CommentIcon size={22} />,
    isActive: (p) => p.startsWith("/messages"),
  },
  {
    href: "/home?tab=trending",
    label: "Susurros",
    icon: () => <FlameIcon size={22} />,
    isActive: (p, tab) => p === "/home" && tab === "trending",
  },
];

/** Barra de navegación fija estilo Instagram — reemplaza la navegación que antes vivía arriba. */
export function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavInner />
    </Suspense>
  );
}

function BottomNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    getConversations().then((res) => {
      const total = (res.data ?? []).reduce((sum, c) => sum + c.unreadCount, 0);
      setUnread(total);
    });
  }, [pathname]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-center pb-[max(14px,env(safe-area-inset-bottom))]">
      <div className="gossip-glass flex items-end gap-3.5 rounded-[28px] px-3.5 py-2.5">
        {ITEMS.map((item) => {
          const active = item.isActive(pathname, tab);
          const isMessages = item.href === "/messages";
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className="relative flex flex-col items-center gap-1 px-0.5"
            >
              <span className={`relative ${active ? "text-accent" : "text-text"}`}>
                {item.icon(active)}
                {isMessages && unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" />
                )}
              </span>
              <span className={`h-1 w-1 rounded-full ${active ? "bg-accent" : "bg-transparent"}`} />
              <span
                className={`text-[9px] font-semibold uppercase tracking-[0.03em] ${
                  active ? "text-accent" : "text-text-muted"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
        <Link
          href="/create"
          aria-label="Crear post"
          className="flex flex-col items-center gap-1 px-0.5"
        >
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-md">
            <PlusIcon size={20} />
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.03em] text-accent">Crear</span>
        </Link>
      </div>
    </nav>
  );
}
