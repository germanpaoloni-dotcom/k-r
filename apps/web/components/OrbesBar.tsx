"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "./icons";
import { OrbBubble } from "./OrbBubble";
import { getMiraEstoFeed, getActivityState, getSession, me, type MiraEstoDto } from "../lib/api";

interface Group {
  author: MiraEstoDto["author"];
  items: MiraEstoDto[];
  activityState: string | null;
}

export function OrbesBar() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [ownId, setOwnId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    me(session.accessToken).then((res) => {
      if (res.data) setOwnId(res.data.id);
    });
    getMiraEstoFeed().then(async (res) => {
      const items = res.data ?? [];
      const byAuthor = new Map<string, { author: MiraEstoDto["author"]; items: MiraEstoDto[] }>();
      for (const item of items) {
        const existing = byAuthor.get(item.author.id);
        if (existing) existing.items.push(item);
        else byAuthor.set(item.author.id, { author: item.author, items: [item] });
      }
      const withActivity = await Promise.all(
        [...byAuthor.values()].map(async (g) => ({
          ...g,
          activityState: (await getActivityState(g.author.id)).data?.state ?? null,
        }))
      );
      setGroups(withActivity);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  const ownGroup = ownId ? groups.find((g) => g.author.id === ownId) : undefined;
  const otherGroups = groups.filter((g) => g.author.id !== ownId);

  return (
    <div className="flex gap-3.5 overflow-x-auto px-4 pb-1 pt-3.5" style={{ scrollbarWidth: "none" }}>
      <div className="flex flex-shrink-0 flex-col items-center gap-1">
        <OrbBubble
          avatarSeed="me"
          avatarSrc={ownGroup?.author.avatarUrl}
          activityState={ownGroup?.activityState}
          label="Tu Orbe"
          onOpen={() =>
            router.push(ownGroup ? `/mira-esto/${ownGroup.items[0]!.id}` : "/create?mode=mira-esto")
          }
          emptyBadge={
            !ownGroup ? (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-[19px] w-[19px] items-center justify-center rounded-full bg-accent text-white ring-2 ring-white">
                <PlusIcon size={11} />
              </span>
            ) : undefined
          }
        />
        <span className="max-w-[60px] truncate text-[10.5px] text-text-muted">Vos</span>
      </div>

      {otherGroups.map((g) => (
        <div key={g.author.id} className="flex flex-shrink-0 flex-col items-center gap-1">
          <OrbBubble
            avatarSeed={g.author.username}
            avatarSrc={g.author.avatarUrl}
            activityState={g.activityState}
            label={`Orbe de ${g.author.displayName}`}
            onOpen={() => router.push(`/mira-esto/${g.items[0]!.id}`)}
          />
          <span className="max-w-[60px] truncate text-[10.5px] text-text-muted">{g.author.username}</span>
        </div>
      ))}
    </div>
  );
}
