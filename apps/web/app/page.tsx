import Link from "next/link";

const pillars = [
  {
    title: "Social",
    body: "Contenido real de personas y negocios: la materia prima de todo lo demás.",
  },
  {
    title: "Discovery",
    body: "Cada post vive anclado a un lugar, negocio o evento real de tu ciudad.",
  },
  {
    title: "Intelligence",
    body: "Preguntale a Kōr qué hacer hoy y recibí opciones reales, no un feed infinito.",
  },
];

const categories = [
  "Comer",
  "Comprar",
  "Eventos",
  "Música",
  "Deportes",
  "Cafeterías",
  "Arte",
  "Emprendimientos",
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-5">
      <nav className="kor-glass sticky top-4 z-10 mt-4 flex items-center justify-between rounded-full px-5 py-3">
        <span className="font-display text-[15px] font-semibold tracking-tight">Kōr</span>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-[13.5px] text-text-muted hover:text-text"
          >
            Ingresar
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-accent px-4 py-2 text-[13.5px] font-medium text-white hover:brightness-110"
          >
            Crear cuenta
          </Link>
        </div>
      </nav>

      <section className="pb-14 pt-20">
        <p className="mb-3 font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-accent">
          San Salvador de Jujuy · beta cerrada
        </p>
        <h1 className="max-w-2xl text-balance font-display text-[40px] font-semibold leading-[1.1] tracking-tight sm:text-[52px]">
          Tu ciudad, descubierta a través de personas.
        </h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-text-muted">
          Kōr combina contenido real, mapa y una IA que entiende intención para responder la
          pregunta que Instagram nunca resuelve: <em>¿qué hago ahora?</em>
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="rounded-md bg-accent px-5 py-3 text-[14.5px] font-medium text-white hover:brightness-110"
          >
            Sumarme a la beta
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-border px-5 py-3 text-[14.5px] font-medium text-text hover:bg-surface-2"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      <section className="grid gap-3 pb-14 sm:grid-cols-3">
        {pillars.map((p) => (
          <div key={p.title} className="rounded-md border border-border bg-surface p-5">
            <h3 className="font-display text-[15px] font-semibold">{p.title}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-text-muted">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="border-t border-border py-14">
        <h2 className="font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Descubrí por categoría
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c}
              className="rounded-full border border-border px-3.5 py-1.5 text-[13px] text-text-muted"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-[12.5px] text-text-muted">
        Kōr · Fase 1 — Social core en construcción.
      </footer>
    </main>
  );
}
