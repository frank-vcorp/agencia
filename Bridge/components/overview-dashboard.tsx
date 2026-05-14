/**
 * IMPL-20260505-25 | ARCH-20260513-22
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-25_cabina_operador_accionable_resumenes_reales_v1.md
 * Ajuste: la portada se ancla al proyecto mas urgente para evitar resúmenes genéricos sin contexto.
 */
import Link from "next/link";

import { getOperativeSummary } from "@/lib/dashboard";
import { getOperatorRadar } from "@/lib/operator-radar";

function formatLastMovement(iso: string | null): string {
  if (!iso) return "Sin movimiento registrado";

  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export async function OverviewDashboard() {
  const [summary, radar] = await Promise.all([getOperativeSummary(), getOperatorRadar()]);

  const tenantConfig = summary.tenant?.config;
  const dashboardTitle = tenantConfig?.dashboardHeadline ?? "Resumen comercial del piloto";
  const dashboardSummary = tenantConfig?.dashboardSummary ?? "Lo esencial para mover brief, cotizacion y activos sin distraerse con infraestructura o metadatos internos.";
  const topProject = radar.portfolioItems[0] ?? null;
  const focusProjectName = topProject?.projectName ?? summary.project?.name ?? "Proyecto activo";
  const focusClientName = topProject?.clientName ?? summary.client?.name ?? null;
  const focusOrderLabel = topProject
    ? `Prioridad ${topProject.priorityScore} · ${topProject.idleHours >= 999 ? "sin movimiento" : `${topProject.idleHours}h sin movimiento`}`
    : summary.project
      ? `Estado ${summary.project.status}`
      : "Sin proyecto priorizado";
  const focusUpdatedLabel = topProject?.lastMovementAt
    ? `Ultimo movimiento ${formatLastMovement(topProject.lastMovementAt)}`
    : null;
  const focusActionHref = topProject ? `/${topProject.suggestedModule}` : summary.nextAction.href;
  const focusActionLabel = topProject?.suggestedAction ?? summary.nextAction.label;
  const focusReason = topProject?.priorityReason ?? summary.nextAction.reason;

  return (
    <section>
      <div className="panel rounded-[30px] px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">{dashboardTitle}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">{dashboardSummary}</p>
          </div>
          <Link
            href={focusActionHref}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {focusActionLabel}
          </Link>
        </div>

        <div className="mt-5 rounded-[26px] bg-white/70 px-5 py-5 ring-1 ring-[color:var(--line)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Proyecto priorizado</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">{focusProjectName}</h3>
              {focusClientName ? <p className="mt-1 text-sm text-[color:var(--muted)]">Cliente: {focusClientName}</p> : null}
            </div>
            <div className="text-right text-[11px] uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">
              <div>{focusOrderLabel}</div>
              {focusUpdatedLabel ? <div className="mt-1 text-[color:var(--muted)]">{focusUpdatedLabel}</div> : null}
            </div>
          </div>

          <div className="mt-4 rounded-[22px] bg-slate-900 px-4 py-4 text-white">
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Por qué está primero</div>
            <div className="mt-1 font-semibold">{topProject?.primaryAlert ?? summary.nextAction.label}</div>
            <p className="mt-1 text-sm leading-6 text-slate-300">{focusReason}</p>
          </div>
        </div>

        <div className="mt-5 rounded-[26px] bg-white/70 px-5 py-5 ring-1 ring-[color:var(--line)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Estado operativo del proyecto</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Resumen accionable de {focusProjectName}</h3>

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
              href={focusActionHref}
              className="block rounded-[22px] bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-800"
            >
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Siguiente acción</div>
              <div className="mt-1 font-semibold">{focusActionLabel}</div>
              <p className="mt-1 text-sm leading-5 text-slate-300">{focusReason}</p>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
