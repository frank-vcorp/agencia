/**
 * IMPL-20260506-44 | IMPL-20260506-52
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-41_workspace_disenador_guiado.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-40_modelo_ejecucion_disenador_sesiones_y_estados.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-52_disenador_sesiones_reales_y_cierre_jornada.md
 * IMPL-20260513-17 | ARCH-20260513-26
 * Respaldo: context/AGENTE_VIKA_Y_SKILLS_TECNICAS_V1.md
 */
import Link from "next/link";

import { assetOperationalKindLabel } from "@/lib/assets";
import {
  type DesignerTask,
  type DesignerTaskStatus,
  type DesignerWorkspace
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

function ClientBriefLink({
  clientName,
  compact = false
}: {
  clientName: string;
  compact?: boolean;
}) {
  return (
    <Link
      href="/briefs"
      className={`inline-flex items-center rounded-full border border-[color:rgba(200,93,39,0.22)] bg-white/75 font-semibold text-[color:var(--accent-deep)] transition hover:bg-white ${
        compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]"
      }`}
    >
      Brief del cliente: {clientName}
    </Link>
  );
}

function PriorityTaskCard({ task }: { task: DesignerTask }) {
  return (
    <article className="panel rounded-[24px] bg-[color:var(--accent-soft)] px-5 py-5 ring-1 ring-[color:rgba(200,93,39,0.18)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
            Prioridad 1 · {task.projectName}
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-bold leading-tight tracking-tight">
            {task.assetTitle}
          </h3>
          <div className="mt-2">
            <ClientBriefLink clientName={task.clientName} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TaskOperationalBadge task={task} />
          <TaskStatusBadge status={task.status} />
        </div>
      </div>

      <div className="mt-4 rounded-[18px] bg-white/80 px-4 py-3 ring-1 ring-[color:rgba(200,93,39,0.12)]">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">Siguiente paso</p>
        <p className="mt-1 text-sm font-medium leading-6">{task.suggestedAction}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
        <span>Score {task.priorityScore}</span>
        <Link
          href={`/activos/${task.assetId}`}
          className="font-semibold text-[color:var(--accent-deep)] transition hover:underline"
        >
          Abrir ficha →
        </Link>
      </div>
    </article>
  );
}

function QueueTaskCard({ task, order }: { task: DesignerTask; order: number }) {
  return (
    <article className="panel rounded-[20px] px-4 py-4 ring-1 ring-[color:var(--line)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">Prioridad {order}</p>
        <p className="mt-1 truncate text-sm font-semibold leading-5">{task.assetTitle}</p>
          <div className="mt-2">
            <ClientBriefLink clientName={task.clientName} compact />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TaskStatusBadge status={task.status} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end">
        <Link
          href={`/activos/${task.assetId}`}
          className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)] transition hover:underline"
        >
          Abrir ficha →
        </Link>
      </div>
    </article>
  );
}

function DailyStatsStrip({
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
    <div className="panel rounded-[22px] px-4 py-3 ring-1 ring-[color:var(--line)]">
      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
        <span>Jornada {dailyStatsToday.date}</span>
        <span className="h-1 w-1 rounded-full bg-[color:var(--line-strong)]" />
        <span>{totalQueue} en cola</span>
        <span className="h-1 w-1 rounded-full bg-[color:var(--line-strong)]" />
        <span>{dailyStatsToday.completedCountToday} completadas</span>
        <span className="h-1 w-1 rounded-full bg-[color:var(--line-strong)]" />
        <span>{dailyStatsToday.effectiveMinutesToday} min efectivos</span>
        {dailyStats.blockedCount > 0 ? (
          <>
            <span className="h-1 w-1 rounded-full bg-red-300" />
            <span className="text-red-600">{dailyStats.blockedCount} bloqueadas</span>
          </>
        ) : null}
        {dailyStatsToday.lastSessionEndedAt ? (
          <>
            <span className="h-1 w-1 rounded-full bg-[color:var(--line-strong)]" />
            <span>Ultima sesion {formatTimestamp(dailyStatsToday.lastSessionEndedAt)}</span>
          </>
        ) : null}
        <span className="h-1 w-1 rounded-full bg-[color:var(--line-strong)]" />
        <span>Actualizado {formatTimestamp(generatedAt)}</span>
      </div>
    </div>
  );
}

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

export function DesignerWorkspaceView({
  workspace
}: {
  workspace: DesignerWorkspace;
  rightColumnTop?: React.ReactNode;
}) {
  const orderedTasks = workspace.taskQueue;
  const primaryTask = orderedTasks[0] ?? null;
  const secondaryTasks = orderedTasks.slice(1);

  return (
    <div className="space-y-5">
      <section className="panel rounded-[30px] px-6 py-6">
        <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
          Cola de produccion
        </h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[color:var(--muted)]">
          Usa este panel solo para decidir que activo abrir. El trabajo real sucede dentro de la ficha del activo.
        </p>
      </section>

      {workspace.isEmpty ? (
        <DesignerEmpty />
      ) : (
        <div className="space-y-5">
          <DailyStatsStrip workspace={workspace} />

          <section className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Prioridad visual de izquierda a derecha y de arriba hacia abajo
            </p>

            <div className="grid gap-4 lg:grid-cols-3">
              {primaryTask ? (
                <div className="lg:col-span-2">
                  <PriorityTaskCard task={primaryTask} />
                </div>
              ) : null}

              {secondaryTasks.map((task, index) => (
                <QueueTaskCard key={task.assetId} task={task} order={index + 2} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}