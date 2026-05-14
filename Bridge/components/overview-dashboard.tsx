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
  const secondaryProjects = radar.portfolioItems.slice(1, 4);
  const queuedProjects = Math.max(0, radar.portfolioItems.length - 1);
  const focusProjectName = topProject?.projectName ?? summary.project?.name ?? "Proyecto activo";
  const focusClientName = topProject?.clientName ?? summary.client?.name ?? null;
  const focusHeader = topProject
    ? `Proyecto mas urgente${radar.portfolioItems.length > 1 ? ` de ${radar.portfolioItems.length}` : ""}`
    : "Proyecto activo";
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
        </div>

        <div className="mt-5 rounded-[26px] bg-white/70 px-5 py-5 ring-1 ring-[color:var(--line)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">{focusHeader}</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">{focusProjectName}</h3>
              {focusClientName ? <p className="mt-1 text-sm text-[color:var(--muted)]">Cliente: {focusClientName}</p> : null}
            </div>
            <div className="text-right text-[11px] uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">
              <div>{focusOrderLabel}</div>
              {focusUpdatedLabel ? <div className="mt-1 text-[color:var(--muted)]">{focusUpdatedLabel}</div> : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[22px] bg-slate-900 px-4 py-4 text-white">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Por qué está primero</div>
              <div className="mt-1 font-semibold">{topProject?.primaryAlert ?? summary.nextAction.label}</div>
              <p className="mt-1 text-sm leading-6 text-slate-300">{focusReason}</p>
            </div>

            <div className="rounded-[22px] bg-white px-4 py-4 ring-1 ring-[color:var(--line)]">
              <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">Siguiente acción</div>
              <div className="mt-1 font-semibold">{focusActionLabel}</div>
              <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                {queuedProjects > 0
                  ? `Despues de este hay ${queuedProjects} proyecto${queuedProjects !== 1 ? "s" : ""} mas en el radar.`
                  : "Es el unico proyecto visible en el radar actual."}
              </p>
              <Link
                href={focusActionHref}
                className="mt-4 inline-flex rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Ir al modulo
              </Link>
            </div>
          </div>
        </div>

        {secondaryProjects.length > 0 ? (
          <div className="mt-5 rounded-[26px] bg-white/70 px-5 py-5 ring-1 ring-[color:var(--line)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Proyectos siguientes</p>
                <h3 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
                  Cola compacta despues del prioritario
                </h3>
              </div>
              {queuedProjects > secondaryProjects.length ? (
                <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  +{queuedProjects - secondaryProjects.length} mas
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {secondaryProjects.map((project, index) => (
                <article
                  key={project.projectId}
                  className="rounded-[22px] bg-white px-4 py-4 ring-1 ring-[color:var(--line)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                        #{index + 2} en cola
                      </p>
                      <h4 className="mt-1 font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">
                        {project.projectName}
                      </h4>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">{project.clientName}</p>
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">
                      {project.priorityScore}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-medium leading-6">{project.primaryAlert}</p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{project.suggestedAction}</p>

                  <div className="mt-3 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    <span>
                      {project.idleHours >= 999 ? "sin movimiento" : `${project.idleHours}h sin movimiento`}
                    </span>
                    <Link
                      href={`/${project.suggestedModule}`}
                      className="font-semibold text-[color:var(--accent-deep)] transition hover:underline"
                    >
                      Ver modulo
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
