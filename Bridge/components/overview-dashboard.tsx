/**
 * IMPL-20260505-25 | ARCH-20260513-21
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-25_cabina_operador_accionable_resumenes_reales_v1.md
 * Ajuste: recorte del dashboard para evitar navegación redundante y modulos duplicados frente al shell global.
 */
import Link from "next/link";

import { getOperativeSummary } from "@/lib/dashboard";

export async function OverviewDashboard() {
  const summary = await getOperativeSummary();

  const tenantConfig = summary.tenant?.config;
  const dashboardTitle = tenantConfig?.dashboardHeadline ?? "Resumen comercial del piloto";
  const dashboardSummary = tenantConfig?.dashboardSummary ?? "Lo esencial para mover brief, cotizacion y activos sin distraerse con infraestructura o metadatos internos.";

  return (
    <section>
      <div className="panel rounded-[30px] px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">{dashboardTitle}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">{dashboardSummary}</p>
          </div>
          <Link
            href={summary.nextAction.href}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {summary.nextAction.label}
          </Link>
        </div>

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
      </div>
    </section>
  );
}
