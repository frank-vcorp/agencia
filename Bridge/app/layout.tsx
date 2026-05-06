/**
 * FIX-20260505-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-26_crm_ligero_operativo_y_seguimiento_minimo_v1.md
 */
import type { Metadata } from "next";
import { Ubuntu, Source_Sans_3 } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { getOperativeSummary } from "@/lib/dashboard";

import "./globals.css";

const headingFont = Ubuntu({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-heading"
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "Bridge V1",
  description: "Cabina inicial de Bridge para operador, disenador y cliente."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const summary = await getOperativeSummary();

  return (
    <html lang="es">
      <body className={`${headingFont.variable} ${bodyFont.variable} font-[family-name:var(--font-body)] antialiased`}>
        <AppShell moduleMetrics={summary.moduleMetrics}>{children}</AppShell>
      </body>
    </html>
  );
}
