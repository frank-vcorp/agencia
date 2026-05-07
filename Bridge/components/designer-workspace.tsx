/**
 * IMPL-20260506-44
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-41_workspace_disenador_guiado.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-40_modelo_ejecucion_disenador_sesiones_y_estados.md
 */
import Link from "next/link";

import {
  getAvailableActions,
  suggestCreativeTool,
  type CreativeTool,
  type DesignerAction,
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

const ACTION_LABELS: Record<DesignerAction, string> = {
  start: "Iniciar tarea",
  block: "Reportar bloqueo",
  resume: "Retomar",
  finish: "Terminar",
  ready_for_review: "Marcar lista para revision"
};

const ACTION_STYLES: Record<DesignerAction, string> = {
  start:
    "bg-slate-900 text-white hover:bg-slate-700",
  block:
    "bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100",
  resume:
    "bg-sky-50 text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100",
  finish:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100",
  ready_for_review:
    "bg-violet-50 text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100"
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

// ─── Botones de control de sesion (V1: no persisten — redirigen a activos) ───

function SessionControlButtons({ task }: { task: DesignerTask }) {
  const actions = getAvailableActions(task.status);

  if (actions.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link
          key={action}
          href="/activos"
          className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition ${ACTION_STYLES[action]}`}
          title="V1: abre el modulo de activos. Persistencia de sesion en proximo corte."
        >
          {ACTION_LABELS[action]}
        </Link>
      ))}
      <span className="self-center text-[10px] text-[color:var(--muted)]">
        V1 — acciones disponibles en modulo Activos
      </span>
    </div>
  );
}

// ─── Bloque de herramienta sugerida (estacion creativa) ──────────────────────

function CreativeStationBlock({ task }: { task: DesignerTask }) {
  const tool = task.suggestedTool;
  const ALL_TOOLS: CreativeTool[] = ["firefly", "adobe_express", "photoshop"];

  return (
    <div className="panel rounded-[28px] px-5 py-5 ring-1 ring-[color:var(--line)]">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Estacion creativa — flujo Bridge → Adobe → Bridge
      </p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">
        Herramienta sugerida: {TOOL_LABELS[tool]}
      </h3>
      <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{TOOL_DESC[tool]}</p>

      {/* Flujo visual de 3 pasos */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {ALL_TOOLS.map((t, i) => (
          <div key={t} className="flex items-center gap-2">
            <span
              className={`rounded-[14px] px-3 py-1.5 text-[11px] font-semibold ${
                t === tool
                  ? "bg-slate-900 text-white"
                  : "bg-white/70 text-[color:var(--muted)] ring-1 ring-[color:var(--line)]"
              }`}
            >
              {i + 1}. {TOOL_LABELS[t]}
            </span>
            {i < ALL_TOOLS.length - 1 && (
              <span className="text-[color:var(--muted)]">→</span>
            )}
          </div>
        ))}
      </div>

      {/* Nota de regreso de propuestas */}
      <div className="mt-4 rounded-[14px] bg-[color:var(--accent-soft)] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">
          Regreso a Bridge
        </p>
        <p className="mt-1 text-sm leading-6 text-[color:var(--accent-deep)]">
          Cuando termines de producir, regresa las propuestas al activo en Bridge para revision del
          operador. El prompt origen queda registrado como referencia.
        </p>
      </div>
    </div>
  );
}

// ─── Tarjeta de tarea activa (pendiente principal) ────────────────────────────

function ActiveTaskCard({ task }: { task: DesignerTask }) {
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
        <Link
          href="/activos"
          className="inline-flex items-center rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-deep)] transition hover:bg-[color:var(--accent-deep)] hover:text-white"
        >
          → Ver activo
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

      {/* Control de sesion */}
      <div className="mt-5 border-t border-[color:var(--line)] pt-4">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
          Control de sesion
        </p>
        <SessionControlButtons task={task} />
      </div>
    </div>
  );
}

// ─── Tarjeta compacta de cola ─────────────────────────────────────────────────

function QueueTaskCard({ task }: { task: DesignerTask }) {
  const toolLabel = TOOL_LABELS[suggestCreativeTool(task.pieceTypeCode)];

  return (
    <article className="panel flex flex-wrap items-start justify-between gap-3 rounded-[22px] px-4 py-4 ring-1 ring-[color:var(--line)]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
          {task.clientName} / {task.projectName}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold">{task.assetTitle}</p>
        <p className="mt-1 text-[11px] leading-5 text-[color:var(--muted)]">{task.priorityReason}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <TaskStatusBadge status={task.status} />
        <span className="text-[10px] text-[color:var(--muted)]">{toolLabel}</span>
        <Link
          href="/activos"
          className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)] transition hover:underline"
        >
          Ver activo →
        </Link>
      </div>
    </article>
  );
}

// ─── Panel de propuestas (V1: vacio honesto) ──────────────────────────────────

function ProposalDraftsPanel({ note }: { note: string }) {
  return (
    <div className="panel rounded-[28px] px-5 py-5 ring-1 ring-[color:var(--line)]">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Propuestas del activo
      </p>
      <p className="mt-2 font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">
        Regreso de propuestas a Bridge
      </p>
      <div className="mt-4 rounded-[16px] bg-amber-50 px-4 py-4 ring-1 ring-amber-200">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">
          Disponible en proximo corte
        </p>
        <p className="mt-1 text-sm leading-6 text-amber-800">{note}</p>
      </div>
      <div className="mt-4 space-y-2 opacity-40">
        {[1, 2].map((n) => (
          <div
            key={n}
            className="flex items-center gap-3 rounded-[16px] bg-white/70 px-4 py-3 ring-1 ring-[color:var(--line)]"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Propuesta {n}
            </span>
            <span className="flex-1 h-2 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Panel de cierre de jornada ───────────────────────────────────────────────

function DailyStatsPanel({
  workspace
}: {
  workspace: Pick<
    DesignerWorkspace,
    "dailyStats" | "generatedAt" | "tenantSlug"
  >;
}) {
  const { dailyStats, generatedAt } = workspace;
  const total =
    dailyStats.inProgressCount +
    dailyStats.readyToStartCount +
    dailyStats.blockedCount +
    dailyStats.completedCount;

  return (
    <div className="panel rounded-[28px] px-5 py-5 ring-1 ring-[color:var(--line)]">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Resumen de jornada
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "En produccion",
            value: dailyStats.inProgressCount,
            color: "text-amber-700 bg-amber-50"
          },
          {
            label: "Listos",
            value: dailyStats.readyToStartCount,
            color: "text-sky-700 bg-sky-50"
          },
          {
            label: "Bloqueados",
            value: dailyStats.blockedCount,
            color: "text-red-700 bg-red-50"
          },
          {
            label: "Completados",
            value: dailyStats.completedCount,
            color: "text-emerald-700 bg-emerald-50"
          }
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className={`rounded-[18px] px-4 py-3 text-center ${color}`}
          >
            <p className="font-[family-name:var(--font-heading)] text-3xl font-bold tabular-nums">
              {value}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em]">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-[14px] bg-slate-50 px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Total de activos en cola
        </p>
        <p className="mt-0.5 text-sm">{total} activos gestionados</p>
        <p className="mt-2 text-[10px] leading-5 text-[color:var(--muted)]">
          {dailyStats.effectiveMinutesNote}
        </p>
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

export function DesignerWorkspaceView({ workspace }: { workspace: DesignerWorkspace }) {
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
            <div className="inline-flex rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-deep)]">
              Disenador
            </div>
            <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
              Workspace de produccion
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-7 text-[color:var(--muted)]">
              Cola guiada de activos. Bridge entrega el prompt y el contexto, tu saltas a la estacion
              Adobe para producir, y regresas las propuestas aqui para revision.
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
                <ActiveTaskCard task={workspace.activeTask} />
              </section>
            ) : workspace.nextSuggestedTask ? (
              <section>
                <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Siguiente sugerida por IA
                </p>
                <ActiveTaskCard task={workspace.nextSuggestedTask} />
              </section>
            ) : null}

            {/* 4. Estacion creativa — se muestra si hay tarea activa o sugerida */}
            {(workspace.activeTask ?? workspace.nextSuggestedTask) && (
              <CreativeStationBlock
                task={(workspace.activeTask ?? workspace.nextSuggestedTask)!}
              />
            )}

            {/* 6. Propuestas del activo */}
            <ProposalDraftsPanel note={workspace.proposalDraftsNote} />
          </div>

          {/* Columna lateral */}
          <div className="space-y-5">
            {/* 2. Cola priorizada */}
            {queueWithoutActive.length > 0 && (
              <section>
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

            {/* 7. Cierre de jornada */}
            <DailyStatsPanel workspace={workspace} />

            {/* Vacios V1 documentados */}
            <details className="panel rounded-[22px] px-5 py-4 ring-1 ring-[color:var(--line)]">
              <summary className="cursor-pointer text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
                Vacios V1 documentados ({workspace.gaps.length})
              </summary>
              <ul className="mt-3 space-y-1.5">
                {workspace.gaps.map((gap, i) => (
                  <li key={i} className="text-[11px] leading-5 text-[color:var(--muted)]">
                    • {gap}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
