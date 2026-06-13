/**
 * IMPL-20260612-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-03_cliente_portal_briefing_file_upload_estados_v1.md
 *
 * V2 del portal del cliente por proyecto.
 * Compone en una sola vista:
 * - Header persistente con etapa + proxima accion + progreso
 * - Chat de briefing con file upload (ClientBriefChatViewV2)
 * - Documentos y entregables (cotizacion, activos, resultados)
 * - Contactos y seguimiento (leads visibles)
 */
import { ClientBriefChatViewV2 } from "@/components/client-brief-chat-v2";
import { getClientPortal } from "@/lib/client-portal";
import { getOrCreateBriefForProject } from "@/lib/briefing";
import type {
  ProjectStageItem,
  ProjectStatusSummary,
  ReviewItem,
  NextClientAction
} from "@/lib/client-portal";

type ClientProjectPageV2Props = {
  params: Promise<{ projectId: string }>;
};

function stageStatusColor(status: ProjectStageItem["status"]): string {
  switch (status) {
    case "completado":
      return "bg-emerald-500";
    case "en_revision":
      return "bg-amber-400";
    case "pendiente_aclaracion":
      return "bg-amber-500";
    case "pendiente":
      return "bg-stone-300";
  }
}

function stageStatusLabel(status: ProjectStageItem["status"]): string {
  switch (status) {
    case "completado":
      return "Completado";
    case "en_revision":
      return "En curso";
    case "pendiente_aclaracion":
      return "Necesita tu atencion";
    case "pendiente":
      return "Pendiente";
  }
}

function ClientProjectHeader({
  projectName,
  stages,
  nextAction,
  completionPct
}: {
  projectName: string;
  stages: ProjectStatusSummary["stages"];
  nextAction: NextClientAction;
  completionPct: number;
}) {
  const activeIndex = Math.max(
    0,
    stages.findIndex((s) => s.active)
  );
  const activeStage = stages[activeIndex] ?? stages[0];

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--line)] bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-3 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Proyecto activo
            </p>
            <h1 className="mt-0.5 truncate font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight md:text-xl">
              {projectName}
            </h1>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            {/* Etapa actual + progreso */}
            <div className="flex-1 min-w-0 md:max-w-[280px]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  Etapa {activeIndex + 1}/3
                </p>
                <p className="text-[10px] font-semibold tabular-nums text-[color:var(--muted)]">
                  {completionPct}%
                </p>
              </div>
              <p className="mt-0.5 truncate text-sm font-medium">
                {activeStage?.label ?? "Cargando..."}
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-[color:var(--accent)] transition-all"
                  style={{ width: `${completionPct}%` }}
                  role="progressbar"
                  aria-valuenow={completionPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progreso: ${completionPct}%`}
                />
              </div>
            </div>

            {/* Indicadores de etapa */}
            <div className="flex items-center gap-1.5" aria-label="Etapas del proyecto">
              {stages.map((stage) => (
                <span
                  key={stage.key}
                  className={`h-2 w-2 rounded-full ${stageStatusColor(stage.status)}`}
                  title={`${stage.label} — ${stageStatusLabel(stage.status)}`}
                  aria-label={`${stage.label}: ${stageStatusLabel(stage.status)}`}
                />
              ))}
            </div>

            {/* Proxima accion */}
            {nextAction.requiresAction && (
              <a
                href={nextAction.href ?? "#"}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[color:var(--accent-soft)] px-3 py-2 text-sm font-medium text-[color:var(--accent-deep)] transition hover:bg-[color:var(--accent-deep)] hover:text-white"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="truncate">{nextAction.label}</span>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function ClientDocumentCard({
  icon,
  title,
  status,
  statusLabel,
  actionLabel,
  actionHref,
  badgeText
}: {
  icon: React.ReactNode;
  title: string;
  status: "pending" | "partial" | "decided" | "info";
  statusLabel: string;
  actionLabel: string;
  actionHref: string;
  badgeText: string;
}) {
  const statusStyles: Record<typeof status, { bg: string; text: string; ring: string }> = {
    pending: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
    partial: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
    decided: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
    info: { bg: "bg-sky-50", text: "text-sky-700", ring: "ring-sky-200" }
  };
  const style = statusStyles[status];

  return (
    <a
      href={actionHref}
      className="panel block rounded-2xl p-4 ring-1 ring-[color:var(--line)] transition hover:ring-[color:rgba(200,93,39,0.3)]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 ring-1 ring-[color:var(--line)]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium">{title}</h3>
          <p className="mt-0.5 text-xs text-[color:var(--muted)]">{statusLabel}</p>
          <span
            className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${style.bg} ${style.text} ${style.ring}`}
          >
            {badgeText}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end border-t border-[color:var(--line)] pt-3">
        <span className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--accent-deep)]">
          {actionLabel}
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </a>
  );
}

function ClientProjectDocuments({
  reviewItems,
  projectId
}: {
  reviewItems: ReviewItem[];
  projectId: string;
}) {
  const quotations = reviewItems.filter((r) => r.type === "quotation");
  const assets = reviewItems.filter((r) => r.type === "asset");
  const pendingAssets = assets.filter((a) => !a.currentDecision).length;
  const decidedAssets = assets.filter((a) => a.currentDecision).length;

  if (quotations.length === 0 && assets.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="px-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Documentos y entregables
      </h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {quotations.length > 0 && (
          <ClientDocumentCard
            icon={
              <svg
                className="h-5 w-5 text-stone-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
            title={quotations[0].title}
            status={quotations[0].currentDecision ? "decided" : "pending"}
            statusLabel={
              quotations[0].currentDecision
                ? `Decidido: ${quotations[0].currentDecision}`
                : "Pendiente de tu revision"
            }
            actionLabel="Revisar propuesta"
            actionHref={`/cliente/proyecto/${projectId}#cotizacion`}
            badgeText={quotations[0].currentDecision ? "Decidido" : "Pendiente"}
          />
        )}

        {assets.length > 0 && (
          <ClientDocumentCard
            icon={
              <svg
                className="h-5 w-5 text-stone-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            }
            title={
              pendingAssets > 0
                ? `${pendingAssets} pieza${pendingAssets !== 1 ? "s" : ""} para revisar`
                : `${assets.length} pieza${assets.length !== 1 ? "s" : ""} disponible${assets.length !== 1 ? "s" : ""}`
            }
            status={decidedAssets > 0 && pendingAssets > 0 ? "partial" : pendingAssets > 0 ? "pending" : "decided"}
            statusLabel={
              decidedAssets > 0
                ? `${decidedAssets} decidid${decidedAssets !== 1 ? "os" : "o"} de ${assets.length}`
                : "Pendientes de revision"
            }
            actionLabel="Ver piezas"
            actionHref={`/cliente/proyecto/${projectId}#activos`}
            badgeText={decidedAssets > 0 && pendingAssets > 0 ? "Parcial" : pendingAssets > 0 ? "Pendiente" : "Decidido"}
          />
        )}
      </div>
    </section>
  );
}

function ClientProjectLeads({
  leads,
  totalVisible
}: {
  leads: Array<{
    id: string;
    canal: string;
    nombreCompleto: string;
    asunto: string;
    etiquetas: string[];
    fechaHora: string;
  }>;
  totalVisible: number;
}) {
  if (totalVisible === 0) return null;

  const statusColors: Record<string, string> = {
    Ganado: "bg-emerald-100 text-emerald-700",
    "No continuó": "bg-red-100 text-red-700",
    "Propuesta enviada": "bg-sky-100 text-sky-700",
    "En seguimiento": "bg-amber-100 text-amber-700",
    "Nuevo contacto": "bg-stone-100 text-stone-700"
  };

  return (
    <section className="space-y-3 border-t border-[color:var(--line)] pt-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
          Contactos y seguimiento
        </h2>
        <span className="text-[10px] text-[color:var(--muted)]">
          {totalVisible} contacto{totalVisible !== 1 ? "s" : ""} visible{totalVisible !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {leads.map((lead) => {
          const statusKey = lead.etiquetas[0] ?? "Contacto";
          const colorClass = statusColors[statusKey] ?? "bg-stone-100 text-stone-700";
          return (
            <div
              key={lead.id}
              className="panel flex items-start justify-between gap-2 rounded-xl p-3 ring-1 ring-[color:var(--line)]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{lead.nombreCompleto}</p>
                <p className="text-xs text-[color:var(--muted)]">{lead.asunto}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">
                  {lead.canal}
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${colorClass}`}
                >
                  {statusKey}
                </span>
                <span className="text-[10px] text-[color:var(--muted)]">{lead.fechaHora}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default async function ClientProjectPageV2({ params }: ClientProjectPageV2Props) {
  const { projectId } = await params;

  const [portal, brief] = await Promise.all([
    getClientPortal(),
    getOrCreateBriefForProject(projectId)
  ]);

  const projectName = portal.projectStatusSummary.projectName ?? "Tu proyecto";
  const stages = portal.projectStatusSummary.stages;
  const nextAction = portal.nextClientAction;
  const completedStages = stages.filter((s) => s.status === "completado").length;
  const completionPct = Math.round((completedStages / stages.length) * 100);

  return (
    <div className="-mx-4 -mt-6 min-h-screen bg-[color:var(--background)] sm:-mx-6 lg:-mx-8">
      <ClientProjectHeader
        projectName={projectName}
        stages={stages}
        nextAction={nextAction}
        completionPct={completionPct}
      />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-4 md:px-6 md:py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Columna principal: chat + documentos + leads */}
          <div className="space-y-6">
            <ClientBriefChatViewV2 brief={brief} projectId={projectId} />
            <ClientProjectDocuments
              reviewItems={portal.reviewItems}
              projectId={projectId}
            />
            <ClientProjectLeads
              leads={portal.crmLeadSummary.leads}
              totalVisible={portal.crmLeadSummary.totalVisible}
            />
          </div>

          {/* Sidebar derecho: resumen rapido */}
          <aside className="hidden space-y-4 lg:block">
            <div className="panel sticky top-24 space-y-4 rounded-2xl p-4 ring-1 ring-[color:var(--line)]">
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Resumen rapido
                </h3>
              </div>

              <div className="space-y-2">
                {stages.map((stage) => (
                  <div key={stage.key} className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${stageStatusColor(stage.status)}`}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate text-xs">{stage.label}</span>
                    <span className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">
                      {stageStatusLabel(stage.status)}
                    </span>
                  </div>
                ))}
              </div>

              {nextAction.requiresAction && (
                <div className="border-t border-[color:var(--line)] pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Proxima accion
                  </p>
                  <p className="mt-1 text-sm font-medium">{nextAction.label}</p>
                  <p className="mt-0.5 text-xs text-[color:var(--muted)]">{nextAction.detail}</p>
                </div>
              )}

              {portal.channelResultsSummary.channels.some((c) => c.contactCount > 0) && (
                <div className="border-t border-[color:var(--line)] pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Contactos por canal
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {portal.channelResultsSummary.channels
                      .filter((c) => c.contactCount > 0)
                      .map((channel) => (
                        <div
                          key={channel.channel}
                          className="flex items-center justify-between text-xs"
                        >
                          <span>{channel.label}</span>
                          <span className="font-semibold tabular-nums">
                            {channel.contactCount}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
