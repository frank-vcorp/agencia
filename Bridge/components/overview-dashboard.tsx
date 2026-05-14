/**
 * IMPL-20260505-25 | ARCH-20260513-20
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-25_cabina_operador_accionable_resumenes_reales_v1.md
 * Ajuste: recorte del dashboard para evitar navegación redundante frente al shell global.
 */
import Link from "next/link";

import { modulePages } from "@/lib/bridge-data";
import { getOperativeSummary } from "@/lib/dashboard";
import { getSupabaseHealth } from "@/lib/supabase-health";

export async function OverviewDashboard() {
  const [supabaseHealth, summary] = await Promise.all([
    getSupabaseHealth(),
    getOperativeSummary()
  ]);

  const tenantSnapshot = summary.tenant;
  const tenantConfig = tenantSnapshot?.config;
  const dashboardTitle = tenantConfig?.dashboardHeadline ?? "Una sola superficie para coordinar el piloto real";
  const dashboardSummary = tenantConfig?.dashboardSummary ?? "Bridge coordina el piloto mientras termina de poblar tenancy, configuracion y objetos operativos reales.";

  const visibleSignals = [
    {
      label: "Preparacion de datos",
      value: supabaseHealth.label,
      detail: supabaseHealth.detail,
      accent: supabaseHealth.connected
    },
    {
      label: "Brief activo",
      value: summary.brief ? summary.brief.statusLabel : "Sin brief",
      detail: summary.brief
        ? summary.brief.projectObjective || "Objetivo pendiente de completar."
        : "Ingresa al modulo de Briefs para crear el primero.",
      accent: summary.brief?.isConsolidated ?? false
    },
    {
      label: "Cotizacion",
      value: summary.quotation ? summary.quotation.statusLabel : "Sin cotizacion",
      detail: summary.quotation
        ? summary.quotation.title
          ? `${summary.quotation.title}${summary.quotation.totalEstimado ? ` — ${summary.quotation.totalEstimado}` : ""}`
          : "Cotizacion registrada sin version activa."
        : "El brief debe consolidarse antes de crear una cotizacion.",
      accent: summary.quotation?.isActive ?? false
    }
  ];

  const modulePagesWithMetrics = modulePages.map((m) => {
    if (m.key === "briefs") return { ...m, metric: summary.moduleMetrics.briefs };
    if (m.key === "cotizaciones") return { ...m, metric: summary.moduleMetrics.cotizaciones };
    if (m.key === "activos") return { ...m, metric: summary.moduleMetrics.activos };
    if (m.key === "crm") return { ...m, metric: summary.moduleMetrics.crm };
    return m;
  });

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="panel rounded-[30px] px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Dashboard principal</p>
              <h2 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">{dashboardTitle}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">{dashboardSummary}</p>
            </div>
            <Link
              href="/operador"
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Entrar a la cabina operativa
            </Link>
          </div>

          {tenantSnapshot ? (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <article className="rounded-[22px] bg-white/72 px-4 py-4 ring-1 ring-[color:var(--line)]">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">Tenant real</div>
                <div className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">{tenantSnapshot.name}</div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">Slug {tenantSnapshot.slug} con estado {tenantSnapshot.status}.</p>
              </article>
              <article className="rounded-[22px] bg-white/72 px-4 py-4 ring-1 ring-[color:var(--line)]">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
                  {summary.client ? "Cliente activo" : "Canal primario"}
                </div>
                <div className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
                  {summary.client?.name ?? tenantConfig?.primaryContactChannel ?? "Pendiente"}
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {summary.client
                    ? `Estado: ${summary.client.status}.${summary.client.primaryContactChannel ? ` Canal: ${summary.client.primaryContactChannel}.` : ""}`
                    : "Configuracion inicial obtenida desde Supabase cuando existe un registro sembrado."}
                </p>
              </article>
              <article className="rounded-[22px] bg-white/72 px-4 py-4 ring-1 ring-[color:var(--line)]">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
                  {summary.project ? "Proyecto activo" : "Modulos activos"}
                </div>
                <div className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
                  {summary.project?.name ?? tenantConfig?.activeModules.length ?? 0}
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {summary.project
                    ? `Tipo: ${summary.project.projectType}. Estado: ${summary.project.status}.`
                    : (tenantConfig?.activeModules ?? []).join(" · ") || "Se mostraran aqui cuando la configuracion remota este disponible."}
                </p>
              </article>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {visibleSignals.map((signal) => (
              <article key={signal.label} className="panel-strong rounded-[24px] px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">{signal.label}</div>
                <div
                  className={`mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight ${
                    signal.accent ? "text-[color:var(--accent-deep)]" : ""
                  }`}
                >
                  {signal.value}
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{signal.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Modulos operativos</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Objetos listos para demostrar valor</h3>
          <div className="mt-5 space-y-3">
            {modulePagesWithMetrics.map((module) => (
              <Link key={module.href} href={module.href} className="block rounded-[22px] bg-white/70 px-4 py-3 ring-1 ring-[color:var(--line)] transition hover:bg-white">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{module.label}</span>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">{module.metric}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{module.description}</p>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section>
        <div className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Estado operativo del proyecto</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Resumen accionable del piloto</h3>

          <div className="mt-5 space-y-3">
            {/* Brief */}
            <div className="rounded-[22px] bg-white/70 px-4 py-3 ring-1 ring-[color:var(--line)]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">Brief</span>
                {summary.brief ? (
                  <span className={`text-[11px] uppercase tracking-[0.2em] ${summary.brief.isConsolidated ? "text-[color:var(--accent-deep)]" : "text-amber-600"}`}>
                    {summary.brief.statusLabel}
                  </span>
                ) : (
                  <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Vacío</span>
                )}
              </div>
              <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                {summary.brief?.projectObjective || "Sin objetivo registrado aún."}
              </p>
            </div>

            {/* Cotización */}
            <div className="rounded-[22px] bg-white/70 px-4 py-3 ring-1 ring-[color:var(--line)]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">Cotización</span>
                {summary.quotation ? (
                  <span className={`text-[11px] uppercase tracking-[0.2em] ${summary.quotation.isActive ? "text-[color:var(--accent-deep)]" : "text-amber-600"}`}>
                    {summary.quotation.statusLabel}
                  </span>
                ) : (
                  <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Vacío</span>
                )}
              </div>
              <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                {summary.quotation?.title ?? "Sin cotización registrada aún."}
                {summary.quotation?.totalEstimado ? ` — ${summary.quotation.totalEstimado}` : ""}
              </p>
            </div>

            {/* Activos */}
            <div className="rounded-[22px] bg-white/70 px-4 py-3 ring-1 ring-[color:var(--line)]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">Activos</span>
                <span className={`text-[11px] uppercase tracking-[0.2em] ${summary.assets && summary.assets.total > 0 ? "text-[color:var(--accent-deep)]" : "text-slate-400"}`}>
                  {summary.moduleMetrics.activos}
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                {summary.assets && summary.assets.total > 0
                  ? Object.entries(summary.assets.byStatus)
                      .map(([status, count]) => `${count} ${status.replace("_", " ")}`)
                      .join(" · ")
                  : "Sin activos registrados aún."}
              </p>
            </div>

            {/* Siguiente acción */}
            <Link
              href={summary.nextAction.href}
              className="block rounded-[22px] bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-800"
            >
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Siguiente acción</div>
              <div className="mt-1 font-semibold">{summary.nextAction.label}</div>
              <p className="mt-1 text-sm leading-5 text-slate-300">{summary.nextAction.reason}</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
