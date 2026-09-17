"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@gossip/ui";
import { HeartIcon, HeartFilledIcon, XIcon, TrashIcon } from "../../../components/icons";
import { OrbBubble } from "../../../components/OrbBubble";
import {
  getSession,
  getMiraEstoFeed,
  deleteMiraEsto,
  reactToMiraEsto,
  unreactToMiraEsto,
  promoteMiraEsto,
  me,
  type MiraEstoDto,
} from "../../../lib/api";
import { markOrbesSeen } from "../../../lib/orbes/seen";

const ITEM_DURATION_MS = 6000;

export default function MiraEstoViewerPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-black text-white">Cargando…</main>}>
      <ViewerContent />
    </Suspense>
  );
}

function ViewerContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const [ownId, setOwnId] = useState<string | null>(null);
  const [allItems, setAllItems] = useState<MiraEstoDto[] | null>(null);
  const [currentAuthorId, setCurrentAuthorId] = useState<string | null>(null);
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nextAuthor, setNextAuthor] = useState<MiraEstoDto["author"] | null>(null);

  const startRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    me(session.accessToken).then((res) => {
      if (res.data) setOwnId(res.data.id);
    });
    getMiraEstoFeed().then((res) => {
      const all = res.data ?? [];
      setAllItems(all);

      const target = all.find((it) => it.id === params.id);
      const authorId = target?.author.id ?? null;
      setCurrentAuthorId(authorId);

      const group = authorId ? all.filter((it) => it.author.id === authorId) : [];
      const startIndex = group.findIndex((it) => it.id === params.id);
      setIndex(startIndex >= 0 ? startIndex : 0);
      if (group.length > 0) markOrbesSeen(group.map((it) => it.id));

      const queueParam = searchParams.get("queue");
      if (queueParam) {
        setQueueIds(queueParam.split(",").filter(Boolean));
      } else {
        // Sin queue explícita (llegaste por link directo) — arma una a partir
        // del orden de aparición en el feed, un id por autor.
        const seenAuthors = new Set<string>();
        const order: string[] = [];
        for (const it of all) {
          if (!seenAuthors.has(it.author.id)) {
            seenAuthors.add(it.author.id);
            order.push(it.author.id);
          }
        }
        setQueueIds(order);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  const items = useMemo(
    () => (allItems && currentAuthorId ? allItems.filter((it) => it.author.id === currentAuthorId) : []),
    [allItems, currentAuthorId]
  );
  const current = items.length > 0 ? items[index] : null;

  const close = useCallback(() => router.push("/home"), [router]);

  const goToNextAuthor = useCallback(() => {
    if (!currentAuthorId || !allItems) {
      close();
      return;
    }
    const pos = queueIds.indexOf(currentAuthorId);
    const nextId = pos >= 0 ? queueIds[pos + 1] : undefined;
    const nextGroup = nextId ? allItems.filter((it) => it.author.id === nextId) : [];
    if (!nextId || nextGroup.length === 0) {
      close();
      return;
    }
    setPaused(true);
    setNextAuthor(nextGroup[0]!.author);
  }, [currentAuthorId, allItems, queueIds, close]);

  function confirmNextAuthor() {
    if (!nextAuthor || !allItems) return;
    const nextGroup = allItems.filter((it) => it.author.id === nextAuthor.id);
    markOrbesSeen(nextGroup.map((it) => it.id));
    setCurrentAuthorId(nextAuthor.id);
    setIndex(0);
    setProgress(0);
    elapsedRef.current = 0;
    setNextAuthor(null);
    setPaused(false);
  }

  const goNext = useCallback(() => {
    if (items.length === 0) return;
    if (index >= items.length - 1) {
      goToNextAuthor();
      return;
    }
    setIndex((i) => i + 1);
    setProgress(0);
    elapsedRef.current = 0;
  }, [items, index, goToNextAuthor]);

  function goPrev() {
    if (index === 0) return;
    setIndex((i) => i - 1);
    setProgress(0);
    elapsedRef.current = 0;
  }

  useEffect(() => {
    if (!current || paused || nextAuthor) return;
    startRef.current = Date.now() - elapsedRef.current;
    const tick = setInterval(() => {
      elapsedRef.current = Date.now() - startRef.current;
      const pct = Math.min(100, (elapsedRef.current / ITEM_DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) goNext();
    }, 60);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, paused, nextAuthor]);

  async function toggleReact() {
    if (!current) return;
    const next = !current.reactedByMe;
    setAllItems((prev) =>
      prev
        ? prev.map((it) =>
            it.id === current.id
              ? { ...it, reactedByMe: next, reactionCount: it.reactionCount + (next ? 1 : -1) }
              : it
          )
        : prev
    );
    await (next ? reactToMiraEsto(current.id) : unreactToMiraEsto(current.id));
  }

  async function handleDelete() {
    if (!current || busy) return;
    setBusy(true);
    await deleteMiraEsto(current.id);
    setBusy(false);
    if (items.length <= 1) {
      goToNextAuthor();
      return;
    }
    setAllItems((prev) => (prev ? prev.filter((it) => it.id !== current.id) : prev));
    setProgress(0);
    elapsedRef.current = 0;
  }

  async function handlePromote() {
    if (!current || busy) return;
    setBusy(true);
    const res = await promoteMiraEsto(current.id);
    setBusy(false);
    if (res.data) router.push(`/p/${res.data.id}`);
  }

  if (allItems === null) {
    return <main className="flex min-h-screen items-center justify-center bg-black text-white">Cargando…</main>;
  }

  if (nextAuthor) {
    return (
      <main className="relative mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 bg-black px-8 text-center text-white">
        <p className="text-[13px] text-white/60">
          {current ? `Ya viste todo de ${current.author.displayName}` : "Seguiste avanzando"}
        </p>
        <OrbBubble
          avatarSeed={nextAuthor.username}
          avatarSrc={nextAuthor.avatarUrl}
          size={88}
          label={`Romper el Orbe de ${nextAuthor.displayName}`}
          onOpen={confirmNextAuthor}
        />
        <p className="font-display text-[16px] font-semibold">{nextAuthor.displayName}</p>
        <p className="text-[12px] text-white/50">Tocá el Orbe para seguir</p>
        <button onClick={close} className="mt-6 text-[13px] text-white/50">
          Salir
        </button>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black text-white">
        <span className="text-[14px] text-white/70">Esto ya no está disponible.</span>
        <button onClick={close} className="rounded-full bg-white/15 px-4 py-2 text-[13px]">
          Volver
        </button>
      </main>
    );
  }

  const isOwn = current.author.id === ownId;

  return (
    <main className="relative mx-auto min-h-screen max-w-lg overflow-hidden bg-black text-white">
      <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-2.5 pt-2.5">
        {items.map((it, i) => (
          <div key={it.id} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full bg-white"
              style={{ width: i < index ? "100%" : i === index ? `${progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      <div className="absolute inset-x-0 top-6 z-20 flex items-center justify-between px-3.5">
        <div className="flex items-center gap-2.5">
          <Avatar seed={current.author.username} src={current.author.avatarUrl} size={32} />
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold">{current.author.displayName}</span>
            <span className="text-[10.5px] text-white/60">@{current.author.username}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isOwn && (
            <button onClick={handleDelete} disabled={busy} aria-label="Borrar">
              <TrashIcon size={19} />
            </button>
          )}
          <button onClick={close} aria-label="Cerrar">
            <XIcon size={22} />
          </button>
        </div>
      </div>

      <div
        className="relative flex min-h-screen items-center justify-center"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
      >
        <button
          aria-label="Anterior"
          onClick={goPrev}
          className="absolute inset-y-0 left-0 z-10 w-1/3"
        />
        <button
          aria-label="Siguiente"
          onClick={goNext}
          className="absolute inset-y-0 right-0 z-10 w-1/3"
        />

        {current.media?.type === "video" ? (
          <video
            key={current.id}
            src={current.media.url}
            className="max-h-screen w-full object-contain"
            autoPlay
            playsInline
            muted
          />
        ) : current.media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={current.id} src={current.media.url} alt="" className="max-h-screen w-full object-contain" />
        ) : (
          <div className="flex h-screen w-full items-center justify-center bg-accent px-8 text-center">
            <p className="font-display text-[24px] font-semibold leading-snug">{current.text}</p>
          </div>
        )}

        {current.media && current.text && (
          <p className="absolute bottom-24 left-0 right-0 px-6 text-center text-[15px] font-medium">
            {current.text}
          </p>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-6 z-20 flex items-center justify-between px-4">
        <button onClick={toggleReact} aria-label="Reaccionar" className="flex items-center gap-1.5">
          {current.reactedByMe ? (
            <HeartFilledIcon size={22} className="text-accent" />
          ) : (
            <HeartIcon size={22} />
          )}
          {current.reactionCount > 0 && <span className="text-[12.5px]">{current.reactionCount}</span>}
        </button>
        {isOwn && current.media && !current.promotedToPostId && (
          <button
            onClick={handlePromote}
            disabled={busy}
            className="rounded-full bg-white/15 px-3.5 py-1.5 text-[12.5px] font-semibold disabled:opacity-50"
          >
            Convertir en post
          </button>
        )}
      </div>
    </main>
  );
}
