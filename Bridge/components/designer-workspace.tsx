/**
 * IMPL-20260506-44 | IMPL-20260506-52 | IMPL-20260513-20
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-41_workspace_disenador_guiado.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-40_modelo_ejecucion_disenador_sesiones_y_estados.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-52_disenador_sesiones_reales_y_cierre_jornada.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-20_workspace_disenador_estacion_unica_v2.md
 * IMPL-20260513-17 | ARCH-20260513-26
 * Respaldo: context/AGENTE_VIKA_Y_SKILLS_TECNICAS_V1.md
 */
import React from "react";
import Link from "next/link";

import { assetOperationalKindLabel } from "@/lib/assets";
import {
  type DesignerProposalDraft,
  type DesignerTask,
  type DesignerTaskStatus,
  type DesignerWorkspace,
  type ProjectContext
} from "@/lib/designer-workspace";

const TASK_STATUS_LABELS: Record<DesignerTaskStatus, string> = {
  ready_to_start: "Listo para empezar",
  in_progress: "En produccion",
  blocked: "Bloqueado",
  completed: "Completado",
  ready_for_review: "Listo para revision"
};

const TASK_STATUS_COLORS: Record<DesignerTaskStatus, string> = {
  ready_to_start: "bg-sky-50 text-sky-700 ring-sky-200",
  in_progress: "bg-amber-50 text-amber-700 ring-amber-200",
  blocked: "bg-red-50 text-red-700 ring-red-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ready_for_review: "bg-violet-50 text-violet-700 ring-violet-200"
};

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Mexico_City"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function TaskStatusBadge({ status }: { status: DesignerTaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ring-1 ${TASK_STATUS_COLORS[status]}`}
    >
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}

function TaskOperationalBadge({ task }: { task: DesignerTask }) {
  const colors =
    task.operationalKind === "captura"
      ? "bg-white text-slate-700 ring-[color:var(--line)]"
      : "bg-[color:var(--accent-soft)] text-[color:var(--accent-deep)] ring-[color:rgba(200,93,39,0.18)]";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ring-1 ${colors}`}
    >
      {assetOperationalKindLabel(task.operationalKind)}
    </span>
  );
}

// ─── Etiquetas de herramientas creativas ─────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  firefly: "Adobe Firefly",
  adobe_express: "Adobe Express",
  photoshop: "Photoshop",
  other: "Otra herramienta"
};

// ─── LeftRail — cola priorizada y encabezado de jornada ──────────────────────

function LeftRailTaskItem({
  task,
  order,
  isFocused
}: {
  task: DesignerTask;
  order: number;
  isFocused: boolean;
}) {
  const focusedRing = isFocused
    ? "ring-[color:rgba(200,93,39,0.35)] bg-[color:var(--accent-soft)]"
    : "ring-[color:var(--line)] bg-white/60 hover:bg-white/90";

  return (
    <Link href={`/activos/${task.assetId}`}>
      <article
        className={`rounded-[18px] px-3 py-3 ring-1 transition ${focusedRing}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
              #{order} · {task.projectName}
            </p>
            <p className="mt-0.5 truncate text-[13px] font-semibold leading-5">
              {task.assetTitle}
            </p>
          </div>
          <TaskStatusBadge status={task.status} />
        </div>
        {isFocused && (
          <p className="mt-1.5 text-[10px] text-[color:var(--accent-deep)] font-medium">
            Activo ahora
          </p>
        )}
      </article>
    </Link>
  );
}

function LeftRail({ workspace }: { workspace: DesignerWorkspace }) {
  const { taskQueue, focusedAsset, dailyStats, dailyStatsToday, activeSession, generatedAt } =
    workspace;
  const totalQueue =
    dailyStats.inProgressCount + dailyStats.readyToStartCount + dailyStats.blockedCount;

  return (
    <div className="flex flex-col gap-3">
      {/* Encabezado de jornada */}
      <div className="panel rounded-[22px] px-4 py-3 ring-1 ring-[color:var(--line)]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Jornada · {dailyStatsToday.date}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
          <span className="font-semibold">{totalQueue} en cola</span>
          <span className="text-[color:var(--muted)]">·</span>
          <span className="text-emerald-700 font-medium">
            {dailyStatsToday.completedCountToday} completadas
          </span>
          {dailyStats.blockedCount > 0 && (
            <>
              <span className="text-[color:var(--muted)]">·</span>
              <span className="text-red-600 font-medium">
                {dailyStats.blockedCount} bloqueadas
              </span>
            </>
          )}
        </div>
        <p className="mt-1.5 text-[9px] text-[color:var(--muted)]">
          {dailyStatsToday.effectiveMinutesToday} min efectivos hoy · act.{" "}
          {formatTimestamp(generatedAt)}
        </p>
      </div>

      {/* Estado de sesion activa */}
      {activeSession ? (
        <div
          className={`rounded-[18px] px-3 py-2.5 ring-1 text-[11px] ${
            activeSession.status === "blocked"
              ? "bg-red-50 ring-red-200 text-red-700"
              : "bg-amber-50 ring-amber-200 text-amber-700"
          }`}
        >
          <p className="font-semibold uppercase tracking-[0.15em] text-[10px]">
            {activeSession.status === "blocked" ? "Sesion bloqueada" : "Sesion activa"}
          </p>
          <p className="mt-0.5">
            {activeSession.elapsedMinutes} min transcurridos
          </p>
          {activeSession.blockedReason && (
            <p className="mt-0.5 text-[10px] opacity-80">{activeSession.blockedReason}</p>
          )}
        </div>
      ) : null}

      {/* Cola de activos */}
      <p className="px-1 text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
        Cola de produccion
      </p>

      {taskQueue.length === 0 ? (
        <p className="px-3 text-sm text-[color:var(--muted)]">Sin pendientes activos.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {taskQueue.map((task, index) => (
            <LeftRailTaskItem
              key={task.assetId}
              task={task}
              order={index + 1}
              isFocused={task.assetId === focusedAsset?.assetId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── WorkCanvas — activo enfocado y su ejecucion ──────────────────────────────

function ProposalDraftCard({ draft, index }: { draft: DesignerProposalDraft; index: number }) {
  return (
    <div className="rounded-[16px] bg-white/80 px-3 py-3 ring-1 ring-[color:var(--line)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Propuesta {index + 1}
          {draft.isPrimary ? " · Principal" : ""}
        </p>
        {draft.toolUsed && (
          <span className="text-[10px] text-[color:var(--muted)]">
            {TOOL_LABELS[draft.toolUsed] ?? draft.toolUsed}
          </span>
        )}
      </div>
      {draft.note && (
        <p className="mt-1 text-sm leading-6">{draft.note}</p>
      )}
      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[color:var(--muted)]">
        {draft.hasEvidence && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
            Con evidencia
          </span>
        )}
        {draft.reviewDecision && draft.reviewDecision !== "pending" && (
          <span>{draft.reviewDecision}</span>
        )}
        <span className="ml-auto">{formatTimestamp(draft.createdAt)}</span>
      </div>
    </div>
  );
}

function WorkCanvas({
  task,
  proposalDrafts,
  projectContext
}: {
  task: DesignerTask;
  proposalDrafts: DesignerProposalDraft[];
  projectContext: ProjectContext | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera del activo */}
      <div className="panel rounded-[26px] bg-[color:var(--accent-soft)] px-5 py-5 ring-1 ring-[color:rgba(200,93,39,0.22)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
              {task.clientName} · {task.projectName}
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-bold leading-tight tracking-tight">
              {task.assetTitle}
            </h2>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <TaskOperationalBadge task={task} />
            <TaskStatusBadge status={task.status} />
          </div>
        </div>

        {/* Accion sugerida */}
        <div className="mt-4 rounded-[18px] bg-white/80 px-4 py-3 ring-1 ring-[color:rgba(200,93,39,0.12)]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Siguiente paso
          </p>
          <p className="mt-1 text-sm font-medium leading-6">{task.suggestedAction}</p>
        </div>

        {/* Acciones y enlace */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
          <span>
            Herramienta sugerida: {TOOL_LABELS[task.suggestedTool] ?? task.suggestedTool}
          </span>
          <Link
            href={`/activos/${task.assetId}`}
            className="font-semibold text-[color:var(--accent-deep)] transition hover:underline"
          >
            Abrir ficha completa →
          </Link>
        </div>
      </div>

      {/* Brief resumido operativo — solo si hay datos del proyecto */}
      {projectContext &&
        (projectContext.projectObjective || projectContext.businessSummary || projectContext.offerSummary) && (
          <div className="panel rounded-[22px] px-5 py-4 ring-1 ring-[color:var(--line)]">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
              Brief operativo
            </p>
            <div className="mt-3 flex flex-col gap-2.5">
              {projectContext.projectObjective && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Objetivo
                  </p>
                  <p className="mt-0.5 text-sm leading-6">{projectContext.projectObjective}</p>
                </div>
              )}
              {projectContext.businessSummary && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Contexto del negocio
                  </p>
                  <p className="mt-0.5 text-sm leading-6">{projectContext.businessSummary}</p>
                </div>
              )}
              {projectContext.offerSummary && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Oferta principal
                  </p>
                  <p className="mt-0.5 text-sm leading-6">{projectContext.offerSummary}</p>
                </div>
              )}
            </div>
            {task.briefId && (
              <div className="mt-3">
                <Link
                  href="/briefs"
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)] transition hover:underline"
                >
                  Ver brief completo →
                </Link>
              </div>
            )}
          </div>
        )}

      {/* Prompt vigente */}
      {task.promptText ? (
        <div className="panel rounded-[22px] px-5 py-4 ring-1 ring-[color:var(--line)]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
              Prompt vigente
            </p>
            {task.promptVersion !== null && (
              <span className="text-[10px] text-[color:var(--muted)]">v{task.promptVersion}</span>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{task.promptText}</p>
        </div>
      ) : (
        <div className="panel rounded-[22px] px-5 py-4 ring-1 ring-[color:var(--line)]">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
            Prompt vigente
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Sin prompt activo. Solicita al operador que defina el prompt antes de iniciar.
          </p>
        </div>
      )}

      {/* Formato y tipo */}
      <div className="panel rounded-[22px] px-5 py-4 ring-1 ring-[color:var(--line)]">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
          Especificacion tecnica
        </p>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Tipo
            </span>
            <p className="mt-0.5 font-medium">{task.pieceTypeCode}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Formato
            </span>
            <p className="mt-0.5 font-medium">{task.formatCode}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Aplicacion
            </span>
            <p className="mt-0.5 font-medium">{task.applicationCode}</p>
          </div>
        </div>
      </div>

      {/* Propuestas y evidencias */}
      {proposalDrafts.length > 0 && (
        <div className="panel rounded-[22px] px-5 py-4 ring-1 ring-[color:var(--line)]">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
            Propuestas ({proposalDrafts.length})
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {proposalDrafts.map((draft, i) => (
              <ProposalDraftCard key={draft.id} draft={draft} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ProjectContextCard — contexto general del proyecto en rail derecho ───────

function ProjectContextCard({ context }: { context: ProjectContext }) {
  const hasContent =
    context.businessSummary ||
    context.projectObjective ||
    context.offerSummary ||
    context.toneSummary ||
    context.nonNegotiables.length > 0;

  if (!hasContent) return null;

  return (
    <div className="panel rounded-[22px] px-4 py-4 ring-1 ring-[color:var(--line)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
          Contexto del proyecto
        </p>
      </div>

      <p className="mt-1 font-[family-name:var(--font-heading)] text-base font-bold leading-tight tracking-tight">
        {context.clientName && <span>{context.clientName}</span>}
        {context.clientName && context.projectName && (
          <span className="font-normal text-[color:var(--muted)]"> · </span>
        )}
        {context.projectName && (
          <span className="font-normal text-[color:var(--muted)] text-sm">{context.projectName}</span>
        )}
      </p>

      <div className="mt-3 flex flex-col gap-2.5 border-t border-[color:var(--line)] pt-3">
        {context.projectObjective && (
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Objetivo
            </p>
            <p className="mt-0.5 text-[12px] leading-5">{context.projectObjective}</p>
          </div>
        )}
        {context.offerSummary && (
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Oferta / mensaje
            </p>
            <p className="mt-0.5 text-[12px] leading-5">{context.offerSummary}</p>
          </div>
        )}
        {context.toneSummary && (
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Tono
            </p>
            <p className="mt-0.5 text-[12px] leading-5">{context.toneSummary}</p>
          </div>
        )}
        {context.nonNegotiables.length > 0 && (
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
              No romper
            </p>
            <ul className="mt-0.5 flex flex-col gap-0.5">
              {context.nonNegotiables.slice(0, 4).map((item, i) => (
                <li key={i} className="flex items-start gap-1 text-[12px] leading-5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function DesignerEmpty() {
  return (
    <div className="panel rounded-[28px] px-6 py-10 text-center">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Sin pendientes
      </p>
      <h3 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
        No hay activos en cola para el disenador
      </h3>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[color:var(--muted)]">
        No se encontraron activos en produccion, listos o para revision. Solicita al operador que
        asigne activos con prompt activo a esta cola.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/activos"
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Ir a Activos
        </Link>
        <Link
          href="/operador"
          className="inline-flex items-center rounded-full bg-[color:var(--accent-soft)] px-4 py-2 text-sm font-medium text-[color:var(--accent-deep)] transition hover:bg-[color:var(--accent-deep)] hover:text-white"
        >
          Ver Radar del Operador
        </Link>
      </div>
    </div>
  );
}

// ─── DesignerWorkspaceView — layout tres zonas IMPL-20260513-20 ───────────────

export function DesignerWorkspaceView({
  workspace,
  productionAssistant
}: {
  workspace: DesignerWorkspace;
  productionAssistant?: React.ReactNode;
}) {
  const { focusedAsset, taskQueue, projectContext, proposalDrafts, isEmpty } = workspace;

  if (isEmpty && !focusedAsset) {
    return <DesignerEmpty />;
  }

  return (
    /**
     * Layout de tres zonas (estacion unica):
     * Mobile: canvas (order-1) → cola (order-2) → rail derecho (order-3), apilados.
     * Tablet md+: cola izquierda (w-[240px]) + canvas central.
     * Desktop xl+: cola izquierda + canvas + rail derecho (w-[320px]).
     */
    <div className="flex flex-col gap-4 md:grid md:grid-cols-[240px_1fr] xl:grid-cols-[280px_1fr_320px] md:items-start">
      {/* Rail izquierda — cola priorizada */}
      <aside className="order-2 md:order-none md:sticky md:top-4">
        <LeftRail workspace={workspace} />
      </aside>

      {/* Canvas central — activo enfocado */}
      <main className="order-1 md:order-none min-w-0">
        {focusedAsset ? (
          <WorkCanvas
            task={focusedAsset}
            proposalDrafts={proposalDrafts}
            projectContext={projectContext}
          />
        ) : (
          <DesignerEmpty />
        )}
      </main>

      {/* Rail derecha — contexto del proyecto + asistente de produccion */}
      <aside className="order-3 xl:order-none flex flex-col gap-3">
        {projectContext && <ProjectContextCard context={projectContext} />}
        {productionAssistant}
      </aside>
    </div>
  );
}