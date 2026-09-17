"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Avatar } from "@gossip/ui";
import { HeartIcon, HeartFilledIcon, XIcon, TrashIcon } from "../../../components/icons";
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

const ITEM_DURATION_MS = 6000;

export default function MiraEstoViewerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [ownId, setOwnId] = useState<string | null>(null);
  const [items, setItems] = useState<MiraEstoDto[] | null>(null);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);

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
      const target = all.find((it) => it.id === params.id);
      const group = target ? all.filter((it) => it.author.id === target.author.id) : [];
      setItems(group);
      const startIndex = group.findIndex((it) => it.id === params.id);
      setIndex(startIndex >= 0 ? startIndex : 0);
    });
  }, [params.id, router]);

  const current = items && items.length > 0 ? items[index] : null;

  const close = () => router.push("/home");

  const goNext = useMemo(
    () => () => {
      if (!items) return;
      if (index >= items.length - 1) {
        close();
        return;
      }
      setIndex((i) => i + 1);
      setProgress(0);
      elapsedRef.current = 0;
    },
    [items, index]
  );

  function goPrev() {
    if (index === 0) return;
    setIndex((i) => i - 1);
    setProgress(0);
    elapsedRef.current = 0;
  }

  useEffect(() => {
    if (!current || paused) return;
    startRef.current = Date.now() - elapsedRef.current;
    const tick = setInterval(() => {
      elapsedRef.current = Date.now() - startRef.current;
      const pct = Math.min(100, (elapsedRef.current / ITEM_DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) goNext();
    }, 60);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, paused]);

  async function toggleReact() {
    if (!current) return;
    const next = !current.reactedByMe;
    setItems((prev) =>
      prev
        ? prev.map((it, i) =>
            i === index
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
    if (items && items.length <= 1) {
      close();
      return;
    }
    setItems((prev) => (prev ? prev.filter((it) => it.id !== current.id) : prev));
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

  if (items === null) {
    return <main className="flex min-h-screen items-center justify-center bg-black text-white">Cargando…</main>;
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
