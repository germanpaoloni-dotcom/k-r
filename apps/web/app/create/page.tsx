"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, MapPinIcon, XIcon, ImageIcon } from "../../components/icons";
import { getSession, createPost, searchLocations, uploadFile, type LocationDto, type UploadResult } from "../../lib/api";

type Visibility = "public" | "followers" | "private";

const VISIBILITY_OPTIONS: { id: Visibility; label: string }[] = [
  { id: "public", label: "Público" },
  { id: "followers", label: "Seguidores" },
  { id: "private", label: "Privado" },
];

export default function CreatePostPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
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

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
    setUpload(null);
    setUploading(true);
    const res = await uploadFile(file);
    setUploading(false);
    if (res.error || !res.data) {
      setError(res.error?.message ?? "No pudimos subir el archivo.");
      setPreviewUrl(null);
      return;
    }
    setUpload(res.data);
  }

  function clearMedia() {
    setPreviewUrl(null);
    setUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit() {
    setError(null);
    if (!upload) {
      setError("Subí una foto o video para publicar.");
      return;
    }
    setLoading(true);
    const res = await createPost({
      caption: caption.trim() || undefined,
      locationId: location?.id,
      visibility,
      media: [{ type: upload.type, url: upload.url }],
    });
    setLoading(false);
    if (res.error || !res.data) {
      setError(res.error?.message ?? "No pudimos publicar el post.");
      return;
    }
    router.push(`/p/${res.data.id}`);
  }

  const canSubmit = Boolean(upload) && !loading && !uploading;

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
        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-medium text-text-muted">Foto o video</span>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={onFileSelected}
            className="hidden"
          />

          {!previewUrl && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-[190px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-text-muted"
            >
              <ImageIcon size={28} />
              <span className="text-[13.5px]">Elegí una foto o video</span>
              <span className="text-[11.5px]">Desde tu PC o tu celular</span>
            </button>
          )}

          {previewUrl && (
            <div className="relative overflow-hidden rounded-md border border-border">
              {upload?.type === "video" ? (
                <video src={previewUrl} className="h-[220px] w-full object-cover" controls />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" className="h-[220px] w-full object-cover" />
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[13px] text-white">
                  Subiendo…
                </div>
              )}
              <button
                type="button"
                onClick={clearMedia}
                aria-label="Quitar"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <XIcon size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-medium text-text-muted">Descripción</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Gossipeá algo..."
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

        {error && <p className="text-[13px] text-error">{error}</p>}
      </div>
    </main>
  );
}
