"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, saveSession } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await login({ email, password });
    setLoading(false);
    if (res.error || !res.data) {
      setError(res.error?.message ?? "No pudimos iniciar sesión.");
      return;
    }
    saveSession(res.data.tokens);
    router.push("/me");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="font-display text-[22px] font-semibold">Ingresá a Kōr</h1>
      <p className="mt-1.5 text-[13.5px] text-text-muted">Volvé a descubrir tu ciudad.</p>

      <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-3.5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-[14px] text-text outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text-muted">Contraseña</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-[14px] text-text outline-none focus:border-accent"
          />
        </label>

        {error && <p className="text-[13px] text-accent-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-accent px-4 py-2.5 text-[14.5px] font-medium text-white hover:brightness-110 disabled:opacity-60"
        >
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      <p className="mt-6 text-[13px] text-text-muted">
        ¿No tenés cuenta?{" "}
        <Link href="/register" className="text-accent">
          Creá una
        </Link>
      </p>
    </main>
  );
}
