"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, MapPinIcon, XIcon } from "../../components/icons";
import { getSession, createPost, searchLocations, type LocationDto } from "../../lib/api";

type Visibility = "public" | "followers" | "private";

const VISIBILITY_OPTIONS: { id: Visibility; label: string }[] = [
  { id: "public", label: "Público" },
  { id: "followers", label: "Seguidores" },
  { id: "private", label: "Privado" },
];

export default function CreatePostPage() {
  const router = useRouter();
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");

  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<LocationDto[]>([]);
  const [location, setLocation] = useState<LocationDto | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getSession()) router.push("/login");
  }, [router]);

  useEffect(() => {
    if (!locationQuery.trim() || location) {
      setLocationResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await searchLocations(locationQuery);
      setLocationResults(res.data ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [locationQuery, location]);

  async function onSubmit() {
    setError(null);
    if (!mediaUrl.trim()) {
      setError("Pegá la URL de una foto o video para publicar.");
      return;
    }
    setLoading(true);
    const res = await createPost({
      caption: caption.trim() || undefined,
      locationId: location?.id,
      visibility,
      media: [{ type: mediaType, url: mediaUrl.trim() }],
    });
    setLoading(false);
    if (res.error || !res.data) {
      setError(res.error?.message ?? "No pudimos publicar el post.");
      return;
    }
    router.push(`/p/${res.data.id}`);
  }

  const canSubmit = mediaUrl.trim().length > 0 && !loading;

  return (
    <main className="mx-auto min-h-screen max-w-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <button onClick={() => router.back()} aria-label="Cancelar">
          <ChevronLeftIcon size={22} />
        </button>
        <span className="font-display text-[15px] font-semibold">Nuevo post</span>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="rounded-full bg-accent px-3.5 py-1.5 text-[13.5px] font-semibold text-white disabled:opacity-40"
        >
          {loading ? "Publicando…" : "Publicar"}
        </button>
      </div>

      <div className="flex flex-col gap-5 px-4 py-5">
        {/* Sin servicio de subida de archivos todavía — por ahora se publica
            desde una URL pública ya alojada (ej. un link de imagen). */}
        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-medium text-text-muted">URL de la foto o video</span>
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://…"
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-[14px] text-text outline-none focus:border-accent"
          />
          <div className="flex gap-1.5">
            {(["image", "video"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setMediaType(t)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium ${
                  mediaType === t ? "bg-accent-soft text-accent" : "text-text-muted"
                }`}
              >
                {t === "image" ? "Foto" : "Video"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-medium text-text-muted">Descripción</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Contá qué está pasando..."
            rows={3}
            className="resize-none rounded-md border border-border bg-surface px-3.5 py-2.5 text-[14px] text-text outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-medium text-text-muted">Lugar (opcional)</span>
          {location ? (
            <div className="flex w-fit items-center gap-2 rounded-full border border-border px-3.5 py-2">
              <MapPinIcon size={14} className="text-accent" />
              <span className="text-[13px]">{location.name}</span>
              <button onClick={() => { setLocation(null); setLocationQuery(""); }} aria-label="Quitar lugar">
                <XIcon size={13} className="text-text-muted" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Buscar un lugar..."
                className="w-full rounded-full border border-border bg-transparent px-3.5 py-2 text-[13px] text-text outline-none focus:border-accent"
              />
              {locationResults.length > 0 && (
                <div className="absolute z-10 mt-1.5 w-full rounded-md border border-border bg-surface py-1 shadow-lg">
                  {locationResults.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => { setLocation(l); setLocationResults([]); }}
                      className="flex w-full flex-col items-start px-3.5 py-2 text-left hover:bg-surface-2"
                    >
                      <span className="text-[13px] text-text">{l.name}</span>
                      <span className="text-[11px] text-text-muted">{l.city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-medium text-text-muted">Quién puede verlo</span>
          <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
            {VISIBILITY_OPTIONS.map((v) => (
              <button
                key={v.id}
                onClick={() => setVisibility(v.id)}
                className={`flex-1 rounded-lg py-2 font-display text-[13px] font-medium ${
                  visibility === v.id ? "bg-accent-soft text-accent" : "text-text-muted"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-[13px] text-accent-2">{error}</p>}
      </div>
    </main>
  );
}
