/**
 * FIX-20260505-01 | IMPL-20260508-23 | ARCH-20260513-20
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-26_crm_ligero_operativo_y_seguimiento_minimo_v1.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-05_configuracion_sendgrid_segura_v1.md
 * Ajuste: /cliente omite sidebar/header del shell general (PWA ligera).
 * Ajuste: /configuracion usa shell mas compacto para evitar ruido visual redundante.
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { shellMeta } from "@/lib/bridge-data";
import type { ModuleMetrics } from "@/lib/dashboard";

function isCurrent(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export function AppShell({
  children,
  moduleMetrics
}: {
  children: React.ReactNode;
  moduleMetrics?: ModuleMetrics;
}) {
  const pathname = usePathname();
  const isConfiguration = pathname.startsWith("/configuracion");
  const currentNavItem = [...shellMeta.roles, ...shellMeta.modules].find((item) => isCurrent(pathname, item.href));
  const compactTitle = currentNavItem?.label ?? "Bridge";

  // Ruta /cliente → PWA ligera; no exponer la cabina general de Bridge
  if (pathname.startsWith("/cliente")) {
    return <>{children}</>;
  }

  const mobileLinks = [
    ...shellMeta.roles,
    ...shellMeta.modules,
    { key: "configuracion", href: "/configuracion", label: "Config", shortLabel: "Cfg", description: "" }
  ];
  const modulesWithMetrics = shellMeta.modules.map((item) => {
    const nextMetric = moduleMetrics?.[item.key as keyof ModuleMetrics];
    return nextMetric ? { ...item, metric: nextMetric } : item;
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] gap-5 px-4 py-4 text-sm text-slate-800 md:px-6 md:py-6">
      <aside className="panel hidden w-[280px] shrink-0 rounded-[30px] px-5 py-6 lg:flex lg:flex-col">
        <div className="flex items-center gap-3 border-b border-[color:var(--line)] pb-5">
          <div className="rounded-2xl bg-white/90 p-2 shadow-sm ring-1 ring-[color:var(--line)]">
            <Image src="/logo-vectoria.png" alt="Vectoria" width={120} height={38} className="h-auto w-[120px]" priority />
          </div>
          <p className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">Bridge</p>
        </div>

        <div className="mt-6 space-y-6">
          <nav>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--muted)]">Superficies</p>
            <div className="space-y-2">
              {shellMeta.roles.map((item) => {
                const active = isCurrent(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-2xl px-4 py-3 transition ${
                      active
                        ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-deep)] ring-1 ring-[color:rgba(200,93,39,0.18)]"
                        : "hover:bg-white/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{item.label}</span>
                      <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                        {item.shortLabel}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>

          <nav>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--muted)]">Objetos compartidos</p>
            <div className="space-y-2">
              {modulesWithMetrics.map((item) => {
                const active = isCurrent(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 transition ${
                      active ? "bg-slate-900 text-white" : "panel-strong hover:bg-white"
                    }`}
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className={`text-[11px] ${active ? "text-white/70" : "text-[color:var(--muted)]"}`}>{item.metric}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>

        <div className="mt-auto">
          <Link
            href="/configuracion"
            className={`flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-semibold transition ring-1 ${
              isCurrent(pathname, "/configuracion")
                ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-deep)] ring-[color:rgba(200,93,39,0.18)]"
                : "bg-white/60 text-[color:var(--muted)] ring-[color:var(--line)] hover:bg-white/90"
            }`}
          >
            <span>Configuración</span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
              SendGrid
            </span>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <header className={`panel rounded-[20px] px-4 py-3 lg:hidden ${isConfiguration ? "" : ""}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">Superficie activa</div>
              <h1 className="mt-1 font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">{compactTitle}</h1>
            </div>
          </div>

          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto pb-1">
            {mobileLinks.map((item) => {
              const active = isCurrent(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "bg-white/80 text-[color:var(--muted)] ring-1 ring-[color:var(--line)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </header>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
