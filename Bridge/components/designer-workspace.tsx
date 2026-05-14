/**
 * IMPL-20260506-44 | IMPL-20260506-52
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-41_workspace_disenador_guiado.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-40_modelo_ejecucion_disenador_sesiones_y_estados.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-52_disenador_sesiones_reales_y_cierre_jornada.md
 * IMPL-20260513-17
 * Respaldo: context/AGENTE_VIKA_Y_SKILLS_TECNICAS_V1.md
 */
import Link from "next/link";

import { SessionControlButtons } from "@/components/session-control-buttons";
import { assetOperationalKindLabel } from "@/lib/assets";
import {
  type DesignerProposalDraft,
  type CreativeTool,
  type DesignerTask,
  type DesignerTaskStatus,
  type DesignerWorkspace
} from "@/lib/designer-workspace";

// ─── Helpers de presentacion ─────────────────────────────────────────────────

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

const TOOL_LABELS: Record<CreativeTool, string> = {
  firefly: "Adobe Firefly",
  adobe_express: "Adobe Express",
  photoshop: "Photoshop",
  other: "Herramienta de texto"
};

const TOOL_DESC: Record<CreativeTool, string> = {
  firefly: "Generacion inicial de imagenes con IA — exploraciones rapidas.",
  adobe_express: "Variaciones, adaptaciones de formato y composiciones rapidas.",
  photoshop: "Pulido fino y ajustes avanzados sobre la pieza base.",
  other: "Redaccion y edicion de copy sin herramienta grafica."
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

// ─── Badge de estado de tarea ─────────────────────────────────────────────────

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

// ─── Tarjeta de tarea activa (pendiente principal) ────────────────────────────

interface ActiveTaskCardProps {
  task: DesignerTask;
  activeSession: DesignerWorkspace["activeSession"];
}

function ActiveTaskCard({ task, activeSession }: ActiveTaskCardProps) {
  return (
    <div className="panel rounded-[28px] px-5 py-5 ring-1 ring-[color:var(--line)]">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
            {task.clientName} / {task.projectName}
          </p>
          <h3 className="mt-0.5 font-[family-name:var(--font-heading)] text-xl font-bold leading-tight tracking-tight">
            {task.assetTitle}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TaskOperationalBadge task={task} />
          <TaskStatusBadge status={task.status} />
          <span className="font-[family-name:var(--font-heading)] text-2xl font-bold tabular-nums text-[color:var(--accent)]">
            {task.priorityScore}
          </span>
        </div>
      </div>

      {/* Razon y accion sugerida */}
      <div className="mt-4 rounded-[16px] bg-slate-900 px-4 py-3 text-white">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">
          Siguiente accion sugerida por IA
        </p>
        <p className="mt-1 text-sm font-medium leading-6">{task.suggestedAction}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{task.priorityReason}</p>

      {/* Contexto de trabajo */}
      {task.promptText && (
        <div className="mt-4 rounded-[16px] bg-[color:var(--background-soft)] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
              Prompt activo
              {task.promptVersion !== null && (
                <span className="ml-1.5 text-[color:var(--accent)]">v{task.promptVersion}</span>
              )}
            </p>
            <span className="text-[10px] text-[color:var(--muted)]">
              {TOOL_LABELS[task.suggestedTool]}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6">{task.promptText}</p>
        </div>
      )}

      {!task.promptText && (
        <div className="mt-4 rounded-[16px] bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <p className="text-[10px] uppercase tracking-[0.22em] text-amber-700">Sin prompt activo</p>
          <p className="mt-1 text-sm leading-6 text-amber-800">
            Este activo no tiene un prompt activo. Solicita al operador que defina el prompt antes de
            saltar a la estacion creativa.
          </p>
        </div>
      )}

      {/* Accesos rapidos */}
      <div className="mt-4 flex flex-wrap gap-2">
        {/* IMPL-20260506-45: apunta a la ficha detallada del activo */}
        <Link
          href={`/activos/${task.assetId}`}
          className="inline-flex items-center rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-deep)] transition hover:bg-[color:var(--accent-deep)] hover:text-white"
        >
          → Ver ficha
        </Link>
        {task.briefId && (
          <Link
            href="/briefs"
            className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)] ring-1 ring-[color:var(--line)] transition hover:text-[color:var(--accent-deep)]"
          >
            Brief
          </Link>
        )}
      </div>

      {/* Control de sesion — componente cliente con acciones reales */}
      <div className="mt-5 border-t border-[color:var(--line)] pt-4">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
          Control de sesion
        </p>
        <SessionControlButtons task={task} activeSession={activeSession} />
      </div>
    </div>
  );
}

// ─── Tarjeta compacta de cola ─────────────────────────────────────────────────

function QueueTaskCard({ task }: { task: DesignerTask }) {
  return (
    <Link
      href={`/activos/${task.assetId}`}
      className="panel flex items-center justify-between gap-3 rounded-[18px] px-4 py-3 ring-1 ring-[color:var(--line)] transition hover:bg-white"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-5">{task.assetTitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <TaskStatusBadge status={task.status} />
      </div>
    </Link>
  );
}

// ─── Panel de propuestas (V1: vacio honesto) ──────────────────────────────────

function ProposalDraftsPanel({
  proposals,
  assetId
}: {
  proposals: DesignerProposalDraft[];
  assetId: string | null;
}) {
  return (
    <div className="panel rounded-[28px] px-5 py-5 ring-1 ring-[color:var(--line)]">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Propuestas del activo
      </p>
      <p className="mt-2 font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">
        Regreso de propuestas a Bridge
      </p>
      {proposals.length === 0 ? (
        <div className="mt-4 rounded-[16px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Sin propuestas registradas aun
          </p>
          <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
            Aun no hay propuestas devueltas para este activo. Registra o revisa las propuestas desde la ficha central del activo.
          </p>
          {assetId && (
            <Link
              href={`/activos/${assetId}`}
              className="mt-3 inline-flex items-center rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-deep)] transition hover:bg-[color:var(--accent-deep)] hover:text-white"
            >
              Ver ficha →
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {proposals.slice(0, 2).map((proposal) => (
            <div
              key={proposal.id}
              className="rounded-[16px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">
                  {proposal.isPrimary ? "Propuesta principal" : "Propuesta alternativa"}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  {proposal.reviewDecision}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6">{proposal.note}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[color:var(--muted)]">
                <span className="rounded bg-slate-50 px-2 py-0.5 ring-1 ring-[color:var(--line)]">
                  {TOOL_LABELS[proposal.toolUsed]}
                </span>
                <span className="rounded bg-slate-50 px-2 py-0.5 ring-1 ring-[color:var(--line)]">
                  {proposal.promptVersionId ? "Prompt origen vinculado" : "Sin prompt vinculado"}
                </span>
                <span className="rounded bg-slate-50 px-2 py-0.5 ring-1 ring-[color:var(--line)]">
                  {proposal.hasEvidence
                    ? proposal.evidenceFileName ?? "Evidencia subida"
                    : "Sin evidencia subida"}
                </span>
              </div>
            </div>
          ))}
          {assetId && (
            <Link
              href={`/activos/${assetId}`}
              className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-deep)] ring-1 ring-[color:var(--line)] transition hover:bg-[color:var(--accent-soft)]"
            >
              Gestionar propuestas en la ficha →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Panel de cierre de jornada ───────────────────────────────────────────────

function DailyStatsPanel({
  workspace
}: {
  workspace: Pick<
    DesignerWorkspace,
    "dailyStats" | "dailyStatsToday" | "generatedAt" | "tenantSlug"
  >;
}) {
  const { dailyStats, dailyStatsToday, generatedAt } = workspace;
  const totalQueue =
    dailyStats.inProgressCount +
    dailyStats.readyToStartCount +
    dailyStats.blockedCount;

  return (
    <div className="panel rounded-[28px] px-5 py-5 ring-1 ring-[color:var(--line)]">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Jornada de hoy — {dailyStatsToday.date}
      </p>

      {/* Metricas del dia actual (de work_sessions) */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        {[
          {
            label: "Completadas hoy",
            value: dailyStatsToday.completedCountToday,
            color: "text-emerald-700 bg-emerald-50"
          },
          {
            label: "Min efectivos",
            value: dailyStatsToday.effectiveMinutesToday,
            color: "text-sky-700 bg-sky-50"
          },
          {
            label: "Min bloqueado",
            value: dailyStatsToday.blockedMinutesToday,
            color: "text-red-700 bg-red-50"
          }
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-[18px] px-4 py-3 text-center ${color}`}>
            <p className="font-[family-name:var(--font-heading)] text-3xl font-bold tabular-nums">
              {value}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em]">{label}</p>
          </div>
        ))}
      </div>

      {/* Estado de la cola (de assets) */}
      <div className="mt-4 rounded-[14px] bg-slate-50 px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Cola activa
        </p>
        <p className="mt-0.5 text-sm">
          {totalQueue} activo{totalQueue !== 1 ? "s" : ""} pendiente{totalQueue !== 1 ? "s" : ""}
          {dailyStats.blockedCount > 0 && (
            <span className="ml-2 text-red-600">· {dailyStats.blockedCount} bloqueado{dailyStats.blockedCount !== 1 ? "s" : ""}</span>
          )}
        </p>
        {dailyStatsToday.lastSessionEndedAt && (
          <p className="mt-1 text-[10px] text-[color:var(--muted)]">
            Ultima sesion: {formatTimestamp(dailyStatsToday.lastSessionEndedAt)}
          </p>
        )}
      </div>

      <p className="mt-3 text-[10px] text-[color:var(--muted)]">
        Generado: {formatTimestamp(generatedAt)}
      </p>
    </div>
  );
}

// ─── Estado vacio ─────────────────────────────────────────────────────────────

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

// ─── Componente principal del workspace ──────────────────────────────────────

export function DesignerWorkspaceView({
  workspace,
  rightColumnTop
}: {
  workspace: DesignerWorkspace;
  rightColumnTop?: React.ReactNode;
}) {
  // Cola sin la tarea activa (se muestra separada)
  const queueWithoutActive = workspace.taskQueue.filter(
    (t) => t !== workspace.activeTask
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="panel rounded-[30px] px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
              Cola de produccion
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-7 text-[color:var(--muted)]">
              Activos listos para producir, revisar y devolver al flujo comercial sin pasos internos innecesarios.
            </p>
          </div>
          <div className="rounded-[24px] bg-slate-900 px-4 py-4 text-white">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/60">Jornada</div>
            <div className="mt-2 font-[family-name:var(--font-heading)] text-lg font-bold">
              {workspace.taskQueue.length} pendiente
              {workspace.taskQueue.length !== 1 ? "s" : ""}
            </div>
            <p className="mt-1 text-sm text-white/60">
              {workspace.dailyStats.inProgressCount > 0
                ? `${workspace.dailyStats.inProgressCount} en produccion`
                : "Sin tarea activa"}
            </p>
          </div>
        </div>
      </section>

      {workspace.isEmpty ? (
        <DesignerEmpty />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          {/* Columna principal */}
          <div className="space-y-5">
            {/* 1. Pendiente principal */}
            {workspace.activeTask ? (
              <section>
                <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Tarea activa
                </p>
                <ActiveTaskCard task={workspace.activeTask} activeSession={workspace.activeSession} />
              </section>
            ) : workspace.nextSuggestedTask ? (
              <section>
                <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Siguiente sugerida por IA
                </p>
                <ActiveTaskCard task={workspace.nextSuggestedTask} activeSession={workspace.activeSession} />
              </section>
            ) : null}

            {/* 6. Propuestas del activo */}
            <ProposalDraftsPanel
              proposals={workspace.proposalDrafts}
              assetId={(workspace.activeTask ?? workspace.nextSuggestedTask)?.assetId ?? null}
            />
          </div>

          {/* Columna lateral — sticky como unidad completa */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
            {/* 7. Jornada de hoy */}
            <DailyStatsPanel workspace={workspace} />

            {/* 2. Cola priorizada */}
            {queueWithoutActive.length > 0 && (
              <section className="shrink-0">
                <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Cola priorizada ({queueWithoutActive.length})
                </p>
                <div className="space-y-3">
                  {queueWithoutActive.map((task) => (
                    <QueueTaskCard key={task.assetId} task={task} />
                  ))}
                </div>
              </section>
            )}

            {/* Chat panel — ocupa el espacio restante */}
            {rightColumnTop}
          </div>
        </div>
      )}
    </div>
  );
}
