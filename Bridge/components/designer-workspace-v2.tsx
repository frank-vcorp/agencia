/**
 * IMPL-20260612-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-02_disenador_estacion_creativa_refinada_firefly_versionado_v1.md
 *
 * V2 de la Estación Creativa del Diseñador.
 * Refina la implementación actual con:
 * - Cola accionable con acciones inline (Iniciar, Bloquear, Firefly, Candidata)
 * - Referencias visuales con upload drag-drop
 * - Firefly deep link + callback endpoint
 * - Versionado visual 3 niveles (exploración, candidata, aprobada)
 * - Contexto filtrado por pieza (tono solo para copy, audiencia solo para conversion)
 */
"use client";

import React, { useState, useTransition, useCallback, useRef, useEffect } from "react";
import Link from "next/link";

import { assetOperationalKindLabel } from "@/lib/assets";
import {
  type DesignerProposalDraft,
  type DesignerTask,
  type DesignerTaskStatus,
  type DesignerWorkspace,
  type ProjectContext
} from "@/lib/designer-workspace";
import {
  type DraftLevel,
  type FireflyCallbackPayload,
  DRAFT_LEVEL_LABELS,
  DRAFT_LEVEL_STYLES,
  buildFireflyDeepLink,
  getDraftLevel,
  parseFormatToAspectRatio,
  pieceTypeToFireflyContentType
} from "@/lib/firefly";

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

const TOOL_LABELS: Record<string, string> = {
  firefly: "Adobe Firefly",
  adobe_express: "Adobe Express",
  photoshop: "Photoshop",
  other: "Otra herramienta"
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

// ─── LeftRail V2 — Cola Accionable ────────────────────────────────────────────

type AssetReference = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  isPrimary: boolean;
};

function LeftRailTaskItemV2({
  task,
  order,
  isFocused,
  onAction
}: {
  task: DesignerTask;
  order: number;
  isFocused: boolean;
  onAction: (action: string, task: DesignerTask) => void;
}) {
  const focusedRing = isFocused
    ? "ring-[color:rgba(200,93,39,0.35)] bg-[color:var(--accent-soft)]"
    : "ring-[color:var(--line)] bg-white/60 hover:bg-white/90";

  return (
    <Link href={`/disenador?focus=${task.assetId}`}>
      <article
        className={`group rounded-[18px] px-3 py-3 ring-1 transition ${focusedRing}`}
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

        {/* Acciones inline — visibles en hover/focus */}
        <div className="mt-2 flex flex-wrap items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          {task.status === "ready_to_start" && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onAction("start", task);
              }}
              className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 ring-1 ring-sky-200 hover:bg-sky-200"
            >
              ▶ Iniciar
            </button>
          )}
          {task.status === "in_progress" && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onAction("block", task);
                }}
                className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800 ring-1 ring-red-200 hover:bg-red-200"
              >
                ⏸ Bloquear
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onAction("open_firefly", task);
                }}
                className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:opacity-90"
              >
                🔥 Firefly
              </button>
            </>
          )}
          {task.status === "ready_for_review" && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onAction("mark_candidate", task);
              }}
              className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-200"
            >
              ✓ Candidata
            </button>
          )}
        </div>

        {isFocused && (
          <p className="mt-1.5 text-[10px] font-medium text-[color:var(--accent-deep)]">
            Activo ahora
          </p>
        )}
      </article>
    </Link>
  );
}

function LeftRailV2({
  workspace,
  onTaskAction
}: {
  workspace: DesignerWorkspace;
  onTaskAction: (action: string, task: DesignerTask) => void;
}) {
  const { taskQueue, focusedAsset, dailyStats, dailyStatsToday, activeSession, generatedAt } =
    workspace;
  const totalQueue =
    dailyStats.inProgressCount + dailyStats.readyToStartCount + dailyStats.blockedCount;

  return (
    <div className="flex max-h-[calc(100vh-2rem)] flex-col gap-3 overflow-y-auto">
      <div className="panel rounded-[22px] px-4 py-3 ring-1 ring-[color:var(--line)]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Jornada · {dailyStatsToday.date}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
          <span className="font-semibold">{totalQueue} en cola</span>
          <span className="text-[color:var(--muted)]">·</span>
          <span className="font-medium text-emerald-700">
            {dailyStatsToday.completedCountToday} completadas
          </span>
          {dailyStats.blockedCount > 0 && (
            <>
              <span className="text-[color:var(--muted)]">·</span>
              <span className="font-medium text-red-600">
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

      {activeSession ? (
        <div
          className={`rounded-[18px] px-3 py-2.5 text-[11px] ring-1 ${
            activeSession.status === "blocked"
              ? "bg-red-50 text-red-700 ring-red-200"
              : "bg-amber-50 text-amber-700 ring-amber-200"
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em]">
            {activeSession.status === "blocked" ? "Sesion bloqueada" : "Sesion activa"}
          </p>
          <p className="mt-0.5">{activeSession.elapsedMinutes} min transcurridos</p>
          {activeSession.blockedReason && (
            <p className="mt-0.5 text-[10px] opacity-80">{activeSession.blockedReason}</p>
          )}
        </div>
      ) : null}

      <p className="px-1 text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
        Cola de produccion
      </p>

      {taskQueue.length === 0 ? (
        <p className="px-3 text-sm text-[color:var(--muted)]">Sin pendientes activos.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {taskQueue.map((task, index) => (
            <LeftRailTaskItemV2
              key={task.assetId}
              task={task}
              order={index + 1}
              isFocused={task.assetId === focusedAsset?.assetId}
              onAction={onTaskAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Firefly Deep Link Button ─────────────────────────────────────────────────

function FireflyDeepLinkButton({ task }: { task: DesignerTask }) {
  if (!task.promptText) {
    return (
      <span
        className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-stone-200 px-4 py-2 font-medium text-stone-500"
        title="Define un prompt antes de abrir Firefly"
      >
        🔥 Abrir en Firefly (requiere prompt)
      </span>
    );
  }

  const deepLink = buildFireflyDeepLink({
    prompt: task.promptText,
    aspectRatio: parseFormatToAspectRatio(task.formatCode),
    referenceImages: [],
    contentType: pieceTypeToFireflyContentType(task.pieceTypeCode)
  });

  return (
    <a
      href={deepLink}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 font-medium text-white transition hover:opacity-90"
    >
      <span aria-hidden="true">🔥</span>
      Abrir en Firefly
    </a>
  );
}

// ─── Referencias Visuales con Upload ───────────────────────────────────────────

function VisualReferencesGallery({
  references,
  onUpload,
  onDelete,
  onSetPrimary,
  uploading
}: {
  references: AssetReference[];
  onUpload: (files: FileList) => void;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
  uploading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
          Referencias visuales
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)] transition hover:bg-[color:var(--accent-deep)] hover:text-white disabled:opacity-50"
        >
          {uploading ? "Subiendo..." : "+ Subir"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => e.target.files && onUpload(e.target.files)}
          className="hidden"
        />
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
      >
        {references.map((ref) => (
          <div
            key={ref.id}
            className="relative aspect-square overflow-hidden rounded-lg ring-1 ring-[color:var(--line)]"
          >
            {ref.mimeType.startsWith("image/") ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={ref.url} alt={ref.name} className="h-full w-full object-cover" />
            ) : (
              <video src={ref.url} className="h-full w-full object-cover" muted />
            )}
            {ref.isPrimary && (
              <span className="absolute left-1 top-1 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                Principal
              </span>
            )}
            <div className="absolute right-1 top-1 flex gap-1">
              {!ref.isPrimary && (
                <button
                  type="button"
                  onClick={() => onSetPrimary(ref.id)}
                  className="rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-stone-700 hover:bg-white"
                  title="Marcar como principal"
                  aria-label={`Marcar ${ref.name} como principal`}
                >
                  ★
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(ref.id)}
                className="rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-red-600"
                title="Eliminar"
                aria-label={`Eliminar ${ref.name}`}
              >
                ×
              </button>
            </div>
          </div>
        ))}

        {references.length === 0 && (
          <div className="col-span-full flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-[color:var(--line)] text-xs text-[color:var(--muted)]">
            Arrastra imagenes o videos aqui, o haz click en "+ Subir"
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Propuesta V2 — Versionado Visual 3 Niveles ───────────────────────────────

function ProposalDraftCardV2({
  draft,
  level,
  onPromote,
  onSendToOperator,
  onUploadFile
}: {
  draft: DesignerProposalDraft;
  level: DraftLevel;
  onPromote?: (id: string) => void;
  onSendToOperator?: (id: string) => void;
  onUploadFile?: (id: string, file: File) => void;
}) {
  const styles = DRAFT_LEVEL_STYLES[level];
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      className={`rounded-[16px] px-3 py-3 ring-1 ${styles.bg} ${styles.ring}`}
      data-level={level}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1 ring-current/10 ${styles.badge}`}
          >
            {DRAFT_LEVEL_LABELS[level]}
          </span>
          {draft.toolUsed && (
            <span className="text-[10px] text-[color:var(--muted)]">
              {TOOL_LABELS[draft.toolUsed] ?? draft.toolUsed}
            </span>
          )}
        </div>
        <span className="text-[9px] text-[color:var(--muted)]">
          {formatTimestamp(draft.createdAt)}
        </span>
      </div>

      {draft.note && <p className="mt-1.5 text-sm leading-6">{draft.note}</p>}

      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-[color:var(--muted)]">
        {draft.hasEvidence && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
            Con evidencia
          </span>
        )}
        {draft.evidenceFileName && <span>{draft.evidenceFileName}</span>}
      </div>

      {/* Acciones por nivel */}
      <div className="mt-2 flex flex-wrap gap-2">
        {level === "exploration" && onPromote && (
          <button
            type="button"
            onClick={() => onPromote(draft.id)}
            className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-200"
          >
            ⭐ Promover a Candidata
          </button>
        )}
        {level === "candidate" && onSendToOperator && (
          <button
            type="button"
            onClick={() => onSendToOperator(draft.id)}
            className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-200"
          >
            ➡️ Enviar a Operador
          </button>
        )}
        {onUploadFile && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-stone-700 ring-1 ring-[color:var(--line)] hover:bg-white"
            >
              📎 Subir Archivo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadFile(draft.id, file);
                e.target.value = "";
              }}
              className="hidden"
            />
          </>
        )}
        {level === "approved_designer" && (
          <Link
            href={`/activos/${draft.id}`}
            className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-stone-700 ring-1 ring-[color:var(--line)] hover:bg-white"
          >
            Ver en Activos →
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Contexto Filtrado por Activo ─────────────────────────────────────────────

function ProjectContextFiltered({
  context,
  pieceTypeCode
}: {
  context: ProjectContext;
  pieceTypeCode: string;
}) {
  // Filtrar campos relevantes según tipo de pieza
  const showTone = ["copy", "anuncio_texto", "landing_section"].includes(pieceTypeCode);

  const hasContent =
    context.projectObjective ||
    context.offerSummary ||
    (showTone && context.toneSummary) ||
    context.nonNegotiables.length > 0;

  if (!hasContent) return null;

  return (
    <div className="panel rounded-[22px] px-4 py-4 ring-1 ring-[color:var(--line)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
        Contexto del proyecto
      </p>
      <p className="mt-1 font-[family-name:var(--font-heading)] text-base font-bold leading-tight tracking-tight">
        {context.clientName}
        {context.projectName && (
          <span className="text-sm font-normal text-[color:var(--muted)]">
            {" · "}
            {context.projectName}
          </span>
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
        {showTone && context.toneSummary && (
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
              {context.nonNegotiables.slice(0, 3).map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1 text-[12px] leading-5"
                >
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

// ─── WorkCanvas V2 — Activo Enfocado con Firefly + Referencias ───────────────

function WorkCanvasV2({
  task,
  proposalDrafts,
  projectContext,
  references,
  uploadingReferences,
  onUploadReferences,
  onDeleteReference,
  onSetPrimaryReference,
  onPromoteDraft,
  onSendToOperator,
  onUploadDraftFile,
  onStartTask,
  onMarkApproved,
  onFireflyCallback
}: {
  task: DesignerTask;
  proposalDrafts: DesignerProposalDraft[];
  projectContext: ProjectContext | null;
  references: AssetReference[];
  uploadingReferences: boolean;
  onUploadReferences: (files: FileList) => void;
  onDeleteReference: (id: string) => void;
  onSetPrimaryReference: (id: string) => void;
  onPromoteDraft?: (id: string) => void;
  onSendToOperator?: (id: string) => void;
  onUploadDraftFile?: (id: string, file: File) => void;
  onStartTask?: (assetId: string) => void;
  onMarkApproved?: (assetId: string) => void;
  onFireflyCallback?: (payload: FireflyCallbackPayload) => void;
}) {
  const [promptText, setPromptText] = useState(task.promptText ?? "");
  const [promptSaving, setPromptSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save con debounce 500ms
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (promptText === (task.promptText ?? "")) return;
    saveTimer.current = setTimeout(() => {
      setPromptSaving(true);
      // En producción, llamar a un server action para persistir
      // Por ahora, solo log
      console.log("[prompt-autosave]", { assetId: task.assetId, promptText: promptText.slice(0, 50) });
      setTimeout(() => setPromptSaving(false), 300);
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [promptText, task.promptText, task.assetId]);

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera */}
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

        {/* Siguiente paso + botones contextuales */}
        <div className="mt-4 rounded-[18px] bg-white/80 px-4 py-3 ring-1 ring-[color:rgba(200,93,39,0.12)]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Siguiente paso
          </p>
          <p className="mt-1 text-sm font-medium leading-6">{task.suggestedAction}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {task.status === "ready_to_start" && onStartTask && (
              <button
                type="button"
                onClick={() => onStartTask(task.assetId)}
                className="rounded-full bg-sky-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-sky-700"
              >
                ▶ Iniciar tarea
              </button>
            )}
            <FireflyDeepLinkButton task={task} />
            <Link
              href={`/activos/${task.assetId}`}
              className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)] ring-1 ring-[color:var(--line)] transition hover:bg-white"
            >
              Abrir ficha completa →
            </Link>
          </div>
        </div>
      </div>

      {/* Brief operativo (colapsable) */}
      {projectContext &&
        (projectContext.projectObjective || projectContext.businessSummary || projectContext.offerSummary) && (
          <details className="panel rounded-[22px] px-5 py-4 ring-1 ring-[color:var(--line)]" open>
            <summary className="cursor-pointer text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
              Brief operativo
            </summary>
            <div className="mt-3 flex flex-col gap-2.5">
              {projectContext.projectObjective && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Objetivo
                  </p>
                  <p className="mt-0.5 text-sm leading-6">{projectContext.projectObjective}</p>
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
          </details>
        )}

      {/* Prompt vigente — editable con auto-save */}
      <div className="panel rounded-[22px] px-5 py-4 ring-1 ring-[color:var(--line)]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
            Prompt vigente
          </p>
          <div className="flex items-center gap-2">
            {task.promptVersion !== null && (
              <span className="text-[10px] text-[color:var(--muted)]">
                v{task.promptVersion}
              </span>
            )}
            {promptSaving && (
              <span className="text-[10px] text-[color:var(--muted)]">Guardando...</span>
            )}
          </div>
        </div>
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          className="mt-2 w-full min-h-[120px] resize-y rounded-[10px] border border-[color:var(--line)] bg-transparent p-2 font-mono text-sm outline-none focus:border-[color:var(--line-strong)]"
          placeholder="Sin prompt activo. Solicita al operador que lo defina."
        />
        <div className="mt-2 flex items-center gap-3 text-[10px] text-[color:var(--muted)]">
          <span>Herramienta: {TOOL_LABELS[task.suggestedTool] ?? task.suggestedTool}</span>
          <span>Formato: {task.formatCode}</span>
          <span>AR: {parseFormatToAspectRatio(task.formatCode).toFixed(2)}</span>
        </div>
      </div>

      {/* Especificación técnica — chips compactos */}
      <div className="panel rounded-[22px] px-5 py-4 ring-1 ring-[color:var(--line)]">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
          Especificacion tecnica
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium ring-1 ring-[color:var(--line)]">
            {task.applicationCode}
          </span>
          <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium ring-1 ring-[color:var(--line)]">
            {task.pieceTypeCode}
          </span>
          <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium ring-1 ring-[color:var(--line)]">
            {task.formatCode}
          </span>
        </div>
      </div>

      {/* Referencias visuales — NUEVO CRÍTICO */}
      <div className="panel rounded-[22px] px-5 py-4 ring-1 ring-[color:var(--line)]">
        <VisualReferencesGallery
          references={references}
          onUpload={onUploadReferences}
          onDelete={onDeleteReference}
          onSetPrimary={onSetPrimaryReference}
          uploading={uploadingReferences}
        />
      </div>

      {/* Propuestas — Versionado visual 3 niveles */}
      {proposalDrafts.length > 0 && (
        <div className="panel rounded-[22px] px-5 py-4 ring-1 ring-[color:var(--line)]">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
            Propuestas ({proposalDrafts.length})
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {proposalDrafts.map((draft) => (
              <ProposalDraftCardV2
                key={draft.id}
                draft={draft}
                level={getDraftLevel(draft)}
                onPromote={onPromoteDraft}
                onSendToOperator={onSendToOperator}
                onUploadFile={onUploadDraftFile}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DesignerWorkspaceView V2 ─────────────────────────────────────────────────

export function DesignerWorkspaceViewV2({
  workspace,
  productionAssistant,
  references: externalReferences,
  onTaskAction,
  onUploadReferences,
  onDeleteReference,
  onSetPrimaryReference,
  onPromoteDraft,
  onSendToOperator,
  onUploadDraftFile,
  onMarkApproved
}: {
  workspace: DesignerWorkspace;
  productionAssistant?: React.ReactNode;
  references: AssetReference[];
  uploadingReferences?: boolean;
  onTaskAction: (action: string, task: DesignerTask) => void;
  onUploadReferences: (assetId: string, files: FileList) => void;
  onDeleteReference: (id: string) => void;
  onSetPrimaryReference: (id: string) => void;
  onPromoteDraft?: (id: string) => void;
  onSendToOperator?: (id: string) => void;
  onUploadDraftFile?: (id: string, file: File) => void;
  onMarkApproved?: (assetId: string) => void;
}) {
  const { focusedAsset, projectContext, proposalDrafts, isEmpty } = workspace;
  const uploadingRef = useRef(false);

  if (isEmpty && !focusedAsset) {
    return (
      <div className="panel rounded-[28px] px-6 py-10 text-center">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
          Sin pendientes
        </p>
        <h3 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
          No hay activos en cola para el diseñador
        </h3>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[color:var(--muted)]">
          No se encontraron activos en producción, listos o para revisión.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr_300px] md:items-start">
      <aside className="order-2 md:order-none md:sticky md:top-4">
        <LeftRailV2 workspace={workspace} onTaskAction={onTaskAction} />
      </aside>

      <main className="order-1 min-w-0 md:order-none">
        {focusedAsset ? (
          <WorkCanvasV2
            task={focusedAsset}
            proposalDrafts={proposalDrafts}
            projectContext={projectContext}
            references={externalReferences}
            uploadingReferences={uploadingRef.current}
            onUploadReferences={(files) => onUploadReferences(focusedAsset.assetId, files)}
            onDeleteReference={onDeleteReference}
            onSetPrimaryReference={onSetPrimaryReference}
            onPromoteDraft={onPromoteDraft}
            onSendToOperator={onSendToOperator}
            onUploadDraftFile={onUploadDraftFile}
            onMarkApproved={onMarkApproved}
          />
        ) : (
          <div className="panel rounded-[28px] px-6 py-10 text-center">
            <p className="text-sm text-[color:var(--muted)]">Selecciona un activo de la cola.</p>
          </div>
        )}
      </main>

      <aside className="order-3 flex flex-col gap-3 xl:order-none">
        {projectContext && focusedAsset && (
          <ProjectContextFiltered
            context={projectContext}
            pieceTypeCode={focusedAsset.pieceTypeCode}
          />
        )}
        {productionAssistant}
      </aside>
    </div>
  );
}
