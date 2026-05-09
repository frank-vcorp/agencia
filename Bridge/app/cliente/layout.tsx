/**
 * IMPL-20260508-21
 * Respaldo: context/SPECs/SPEC_ARCH-20260508-21_cliente_pwa_resultados_y_leads_v1.md
 *
 * Layout específico para /cliente que inyecta el manifest PWA y una experiencia
 * mobile-first independiente del AppShell general.
 */
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Tu proyecto — Cliente",
  description: "Revisa el avance, las propuestas y los resultados de tu proyecto.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cliente"
  }
};

export const viewport: Viewport = {
  themeColor: "#c85d27",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 pt-6 sm:px-6">
      {children}
    </div>
  );
}
