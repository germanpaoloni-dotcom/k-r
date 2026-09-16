"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register, saveSession } from "../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", username: "", displayName: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await register(form);
    setLoading(false);
    if (res.error || !res.data) {
      setError(res.error?.message ?? "No pudimos crear tu cuenta.");
      return;
    }
    saveSession(res.data.tokens);
    router.push("/home");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="font-display text-[22px] font-semibold">Creá tu cuenta en Gossip</h1>
      <p className="mt-1.5 text-[13.5px] text-text-muted">
        Empezá a descubrir y publicar lo que pasa en tu ciudad.
      </p>

      <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-3.5">
        <Field
          label="Nombre"
          value={form.displayName}
          onChange={(v) => setForm({ ...form, displayName: v })}
          placeholder="Germán Paoloni"
        />
        <Field
          label="Usuario"
          value={form.username}
          onChange={(v) => setForm({ ...form, username: v })}
          placeholder="german"
        />
        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          placeholder="vos@ejemplo.com"
        />
        <Field
          label="Contraseña"
          type="password"
          value={form.password}
          onChange={(v) => setForm({ ...form, password: v })}
          placeholder="Mínimo 8 caracteres"
        />

        {error && <p className="text-[13px] text-accent-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-accent px-4 py-2.5 text-[14.5px] font-medium text-white hover:brightness-110 disabled:opacity-60"
        >
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-6 text-[13px] text-text-muted">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="text-accent">
          Ingresá
        </Link>
      </p>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-text-muted">{label}</span>
      <input
        type={type}
        required
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-[14px] text-text outline-none focus:border-accent"
      />
    </label>
  );
}
