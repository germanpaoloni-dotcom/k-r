"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@gossip/ui";
import { ChevronLeftIcon, ImageIcon } from "../../../components/icons";
import { getSession, me, updateProfile, uploadFile, type UserPublic } from "../../../lib/api";

export default function EditProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<UserPublic | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    me(session.accessToken).then((res) => {
      setLoading(false);
      if (!res.data) return;
      setUser(res.data);
      setDisplayName(res.data.displayName);
      setBio(res.data.bio ?? "");
      setAvatarUrl(res.data.avatarUrl);
    });
  }, [router]);

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const res = await uploadFile(file);
    setUploadingAvatar(false);
    if (res.data) setAvatarUrl(res.data.url);
  }

  async function onSave() {
    setError(null);
    if (!displayName.trim()) {
      setError("El nombre no puede estar vacío.");
      return;
    }
    setSaving(true);
    const res = await updateProfile({
      displayName: displayName.trim(),
      bio: bio.trim(),
      ...(avatarUrl ? { avatarUrl } : {}),
    });
    setSaving(false);
    if (res.error || !res.data) {
      setError(res.error?.message ?? "No pudimos guardar los cambios.");
      return;
    }
    router.push("/me");
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center text-text-muted">Cargando…</main>;
  }
  if (!user) return null;

  return (
    <main className="mx-auto min-h-screen max-w-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <button onClick={() => router.back()} aria-label="Cancelar">
          <ChevronLeftIcon size={22} />
        </button>
        <span className="font-display text-[15px] font-semibold">Editar perfil</span>
        <button
          onClick={onSave}
          disabled={saving || uploadingAvatar}
          className="rounded-full bg-accent px-3.5 py-1.5 text-[13.5px] font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>

      <div className="flex flex-col items-center gap-2.5 py-6">
        <button type="button" onClick={() => fileInputRef.current?.click()} className="relative">
          <Avatar seed={user.username} src={avatarUrl} size={84} />
          <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white">
            <ImageIcon size={13} />
          </span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onAvatarSelected} className="hidden" />
        <span className="text-[12.5px] text-text-muted">
          {uploadingAvatar ? "Subiendo…" : "Tocá la foto para cambiarla"}
        </span>
      </div>

      <div className="flex flex-col gap-5 px-4 pb-8">
        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-medium text-text-muted">Nombre</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-[14px] text-text outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-medium text-text-muted">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Contá algo sobre vos..."
            className="resize-none rounded-md border border-border bg-surface px-3.5 py-2.5 text-[14px] text-text outline-none focus:border-accent"
          />
        </div>

        {error && <p className="text-[13px] text-error">{error}</p>}
      </div>
    </main>
  );
}
