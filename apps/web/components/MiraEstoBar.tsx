"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@gossip/ui";
import { PlusIcon } from "./icons";
import { getMiraEstoFeed, getSession, me, type MiraEstoDto } from "../lib/api";

interface Group {
  author: MiraEstoDto["author"];
  items: MiraEstoDto[];
}

export function MiraEstoBar() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [ownId, setOwnId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    me(session.accessToken).then((res) => {
      if (res.data) setOwnId(res.data.id);
    });
    getMiraEstoFeed().then((res) => {
      const items = res.data ?? [];
      const byAuthor = new Map<string, Group>();
      for (const item of items) {
        const existing = byAuthor.get(item.author.id);
        if (existing) existing.items.push(item);
        else byAuthor.set(item.author.id, { author: item.author, items: [item] });
      }
      setGroups([...byAuthor.values()]);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  const ownGroup = ownId ? groups.find((g) => g.author.id === ownId) : undefined;
  const otherGroups = groups.filter((g) => g.author.id !== ownId);

  return (
    <div className="flex gap-3.5 overflow-x-auto px-4 pb-1 pt-3.5" style={{ scrollbarWidth: "none" }}>
      <Link
        href={ownGroup ? `/mira-esto/${ownGroup.items[0]!.id}` : "/create?mode=mira-esto"}
        className="flex flex-shrink-0 flex-col items-center gap-1"
      >
        <div className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-border">
          <Avatar seed="me" src={ownGroup?.author.avatarUrl} size={50} />
          {!ownGroup && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-[19px] w-[19px] items-center justify-center rounded-full bg-accent text-white ring-2 ring-white">
              <PlusIcon size={11} />
            </span>
          )}
        </div>
        <span className="max-w-[60px] truncate text-[10.5px] text-text-muted">Vos</span>
      </Link>

      {otherGroups.map((g) => (
        <Link
          key={g.author.id}
          href={`/mira-esto/${g.items[0]!.id}`}
          className="flex flex-shrink-0 flex-col items-center gap-1"
        >
          <div className="rounded-full bg-accent p-[2px]">
            <div className="rounded-full bg-white p-[2px]">
              <Avatar seed={g.author.username} src={g.author.avatarUrl} size={50} />
            </div>
          </div>
          <span className="max-w-[60px] truncate text-[10.5px] text-text-muted">{g.author.username}</span>
        </Link>
      ))}
    </div>
  );
}
