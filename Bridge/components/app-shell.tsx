/**
 * FIX-20260505-01 | IMPL-20260508-23
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-26_crm_ligero_operativo_y_seguimiento_minimo_v1.md
 * Ajuste: /cliente omite sidebar/header del shell general (PWA ligera).
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { shellMeta } from "@/lib/bridge-data";
import type { ModuleMetrics } from "@/lib/dashboard";
import { isSupabaseConfigured, supabaseEnv } from "@/lib/supabase";

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

  // Ruta /cliente → PWA ligera; no exponer la cabina general de Bridge
  if (pathname.startsWith("/cliente")) {
    return <>{children}</>;
  }

  const mobileLinks = [...shellMeta.roles, ...shellMeta.modules];
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
          <div>
            <p className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">Bridge</p>
            <p className="text-xs text-[color:var(--muted)]">Cabina multirrol para el piloto P0</p>
          </div>
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
                    <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{item.description}</p>
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

        <div className="mt-auto rounded-[26px] bg-slate-900 px-4 py-4 text-white">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/65">Infra lista</p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-lg font-bold">Next + Tailwind</p>
          <p className="mt-2 text-sm leading-6 text-white/72">Supabase queda desacoplado hasta cargar variables reales. El shell ya expone el estado del tenant por entorno.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              <div className="text-white/55">Tenant</div>
              <div className="mt-1 font-semibold">{supabaseEnv.defaultTenant}</div>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              <div className="text-white/55">Supabase</div>
              <div className="mt-1 font-semibold">{isSupabaseConfigured ? "listo" : "pendiente"}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <header className="panel flex flex-col gap-4 rounded-[28px] px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
              <span>Bridge V1</span>
              <span className="h-1 w-1 rounded-full bg-[color:var(--accent)]" />
              <span>Piloto operativo</span>
            </div>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight md:text-[2rem]">
              Plataforma compartida para operador, disenador y cliente
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
              Ordena briefings, cotizaciones, activos y contexto derivado sin depender de chats dispersos.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="rounded-2xl bg-white/75 px-4 py-3 ring-1 ring-[color:var(--line)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">Tenant activo</div>
              <div className="mt-1 font-semibold">{supabaseEnv.defaultTenant}</div>
            </div>
            <div className="rounded-2xl bg-[color:var(--accent-soft)] px-4 py-3 text-[color:var(--accent-deep)] ring-1 ring-[color:rgba(200,93,39,0.18)]">
              <div className="text-[11px] uppercase tracking-[0.22em]">Siguiente capa</div>
              <div className="mt-1 font-semibold">Contratos remotos + tenancy</div>
            </div>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 lg:hidden">
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
