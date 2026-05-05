/**
 * IMPL-20260505-01
 * Respaldo: context/00_ARQUITECTURA.md, context/DIRECCION_VISUAL_V1.md
 */
import type { Metadata } from "next";
import { Ubuntu, Source_Sans_3 } from "next/font/google";

import { AppShell } from "@/components/app-shell";

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

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${headingFont.variable} ${bodyFont.variable} font-[family-name:var(--font-body)] antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
