"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, MapPinIcon, XIcon, ImageIcon } from "../../components/icons";
import {
  getSession,
  createPost,
  createMiraEsto,
  searchLocations,
  uploadFile,
  type LocationDto,
  type UploadResult,
} from "../../lib/api";

type Visibility = "public" | "followers" | "private";
type Mode = "post" | "mira-esto";

const VISIBILITY_OPTIONS: { id: Visibility; label: string }[] = [
  { id: "public", label: "Público" },
  { id: "followers", label: "Seguidores" },
  { id: "private", label: "Privado" },
];

export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreateContent />
    </Suspense>
  );
}

function CreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>(searchParams.get("mode") === "mira-esto" ? "mira-esto" : "post");

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

  async function onSubmitPost() {
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

  async function onSubmitMiraEsto() {
    setError(null);
    const text = caption.trim();
    if (!upload && !text) {
      setError("Agregá una foto, un video o un texto.");
      return;
    }
    setLoading(true);
    const res = await createMiraEsto({
      contentType: upload && text ? "mixed" : upload ? "media" : "text",
      text: text || undefined,
      media: upload ? { type: upload.type, url: upload.url } : undefined,
      locationId: location?.id,
    });
    setLoading(false);
    if (res.error || !res.data) {
      setError(res.error?.message ?? "No pudimos publicar Mirá esto.");
      return;
    }
    router.push(`/mira-esto/${res.data.id}`);
  }

  const canSubmitPost = Boolean(upload) && !loading && !uploading;
  const canSubmitMiraEsto = (Boolean(upload) || caption.trim().length > 0) && !loading && !uploading;

  return (
    <main className="mx-auto min-h-screen max-w-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <button onClick={() => router.back()} aria-label="Cancelar">
          <ChevronLeftIcon size={22} />
        </button>
        <span className="font-display text-[15px] font-semibold">Crear</span>
        <button
          onClick={mode === "post" ? onSubmitPost : onSubmitMiraEsto}
          disabled={mode === "post" ? !canSubmitPost : !canSubmitMiraEsto}
          className="rounded-full bg-accent px-3.5 py-1.5 text-[13.5px] font-semibold text-white disabled:opacity-40"
        >
          {loading ? "Publicando…" : "Publicar"}
        </button>
      </div>

      <div className="flex gap-1 px-4 pt-3.5">
        <button
          onClick={() => setMode("post")}
          className={`flex-1 rounded-full py-2 font-display text-[13px] font-medium ${
            mode === "post" ? "bg-accent-soft text-accent" : "text-text-muted"
          }`}
        >
          Post
        </button>
        <button
          onClick={() => setMode("mira-esto")}
          className={`flex-1 rounded-full py-2 font-display text-[13px] font-medium ${
            mode === "mira-esto" ? "bg-accent-soft text-accent" : "text-text-muted"
          }`}
        >
          Mirá esto
        </button>
      </div>
      {mode === "mira-esto" && (
        <p className="px-4 pt-2 text-[12px] text-text-muted">
          Se muestra 24 horas a tu gente y después desaparece.
        </p>
      )}

      <div className="flex flex-col gap-5 px-4 py-5">
        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-medium text-text-muted">
            Foto o video{mode === "mira-esto" ? " (opcional)" : ""}
          </span>

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
          <span className="text-[12.5px] font-medium text-text-muted">
            {mode === "post" ? "Descripción" : "Texto (opcional si hay foto/video)"}
          </span>
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

        {mode === "post" && (
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
        )}

        {error && <p className="text-[13px] text-error">{error}</p>}
      </div>
    </main>
  );
}
