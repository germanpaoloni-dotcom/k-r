import type { Metadata } from "next";
import "./globals.css";

// Las fuentes se cargan por <link> (no con next/font) para no depender de
// acceso a Google Fonts en tiempo de build — más portable entre entornos.
export const metadata: Metadata = {
  title: "Kōr — descubrí tu ciudad",
  description:
    "Kōr conecta contenido real, lugares, negocios y eventos para responder una sola pregunta: ¿qué hago ahora?",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
        />
      </head>
      <body className="min-h-screen bg-bg text-text font-body antialiased">{children}</body>
    </html>
  );
}
