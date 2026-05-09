/**
 * IMPL-20260506-52
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-52_disenador_sesiones_reales_y_cierre_jornada.md
 *
 * Controles de sesion del workspace del disenador.
 * Componente cliente: ejecuta server actions reales con persistencia en work_sessions.
 */
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import {
  blockWorkSession,
  endWorkSession,
  markAssetReadyForReview,
  resumeWorkSession,
  startWorkSession
} from "@/app/disenador/actions";
import type { ActiveSession, DesignerAction, DesignerTask } from "@/lib/designer-workspace";

// ─── Etiquetas y estilos de acciones ─────────────────────────────────────────

const ACTION_LABELS: Record<DesignerAction, string> = {
  start: "Iniciar tarea",
  block: "Reportar bloqueo",
  resume: "Retomar",
  finish: "Terminar sesion",
  ready_for_review: "Listo para revision"
};

const ACTION_STYLES: Record<DesignerAction, string> = {
  start: "bg-slate-900 text-white hover:bg-slate-700",
  block: "bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100",
  resume: "bg-sky-50 text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100",
  finish: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100",
  ready_for_review: "bg-violet-50 text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100"
};

// ─── Boton de accion individual ───────────────────────────────────────────────

function ActionButton({
  action,
  onClick,
  isPending
}: {
  action: DesignerAction;
  onClick: () => void;
  isPending: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${ACTION_STYLES[action]}`}
    >
      {isPending ? "Guardando..." : ACTION_LABELS[action]}
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export interface SessionControlButtonsProps {
  task: DesignerTask;
  activeSession: ActiveSession | null;
}

/**
 * Controles de sesion reales del workspace del disenador.
 * Los botones ejecutan server actions con persistencia en work_sessions. IMPL-20260506-52
 */
export function SessionControlButtons({ task, activeSession }: SessionControlButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  const sessionId = activeSession?.sessionId;
  const isThisTaskSession = activeSession?.assetId === task.assetId;

  useEffect(() => {
    if (!isThisTaskSession || !activeSession) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeSession, isThisTaskSession]);

  const liveElapsedLabel = useMemo(() => {
    if (!isThisTaskSession || !activeSession) return null;
    const startedMs = new Date(activeSession.startedAt).getTime();
    const totalSeconds = Math.max(0, Math.floor((nowMs - startedMs) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }, [activeSession, isThisTaskSession, nowMs]);

  function withFeedback(fn: () => Promise<void>) {
    setFeedback(null);
    startTransition(async () => {
      try {
        await fn();
        setFeedback(null);
      } catch {
        setFeedback("Error al ejecutar la accion. Intenta de nuevo.");
      }
    });
  }

  function handleStart() {
    withFeedback(async () => {
      const r = await startWorkSession(task.assetId);
      if (!r.success) setFeedback(r.error ?? "Error al iniciar.");
    });
  }

  function handleBlock() {
    if (!sessionId || !isThisTaskSession) return;
    setShowBlockForm(true);
  }

  function handleBlockConfirm() {
    if (!sessionId || !isThisTaskSession) return;
    withFeedback(async () => {
      const r = await blockWorkSession(sessionId, blockReason);
      if (!r.success) setFeedback(r.error ?? "Error al bloquear.");
      else {
        setShowBlockForm(false);
        setBlockReason("");
      }
    });
  }

  function handleResume() {
    if (!sessionId || !isThisTaskSession) return;
    withFeedback(async () => {
      const r = await resumeWorkSession(sessionId, task.assetId);
      if (!r.success) setFeedback(r.error ?? "Error al retomar.");
    });
  }

  function handleFinish() {
    if (!sessionId || !isThisTaskSession) return;
    withFeedback(async () => {
      const r = await endWorkSession(sessionId);
      if (!r.success) setFeedback(r.error ?? "Error al terminar.");
    });
  }

  function handleReadyForReview() {
    withFeedback(async () => {
      const r = await markAssetReadyForReview(
        task.assetId,
        isThisTaskSession ? sessionId : undefined
      );
      if (!r.success) setFeedback(r.error ?? "Error al marcar para revision.");
    });
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Indicador de sesion activa */}
      {isThisTaskSession && activeSession && (
        <div className="rounded-[12px] bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Sesion{" "}
            {activeSession.status === "blocked" ? (
              <span className="text-red-600">Bloqueada</span>
            ) : (
              <span className="text-emerald-600">Activa</span>
            )}{" "}
            · {liveElapsedLabel ?? `${activeSession.elapsedMinutes} min`}
          </p>
          {activeSession.blockedReason && (
            <p className="mt-1 text-[11px] text-red-700">{activeSession.blockedReason}</p>
          )}
        </div>
      )}

      {/* Botones segun estado de tarea */}
      <div className="flex flex-wrap gap-2">
        {task.status === "ready_to_start" && (
          <ActionButton action="start" onClick={handleStart} isPending={isPending} />
        )}

        {task.status === "in_progress" && isThisTaskSession && (
          <>
            <ActionButton action="block" onClick={handleBlock} isPending={isPending} />
            <ActionButton action="finish" onClick={handleFinish} isPending={isPending} />
            <ActionButton
              action="ready_for_review"
              onClick={handleReadyForReview}
              isPending={isPending}
            />
          </>
        )}

        {task.status === "in_progress" && !isThisTaskSession && (
          // Hay sesion de otro activo activa — mostrar opcion de iniciar igualmente
          <ActionButton action="start" onClick={handleStart} isPending={isPending} />
        )}

        {task.status === "blocked" && isThisTaskSession && (
          <ActionButton action="resume" onClick={handleResume} isPending={isPending} />
        )}

        {task.status === "ready_for_review" && (
          <ActionButton
            action="ready_for_review"
            onClick={handleReadyForReview}
            isPending={isPending}
          />
        )}
      </div>

      {/* Formulario de bloqueo */}
      {showBlockForm && (
        <div className="rounded-[14px] bg-red-50 px-4 py-3 ring-1 ring-red-200">
          <p className="text-[10px] uppercase tracking-[0.2em] text-red-700">
            Motivo del bloqueo (opcional)
          </p>
          <textarea
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="Describe el impedimento..."
            rows={2}
            className="mt-2 w-full rounded-[10px] border-0 bg-white px-3 py-2 text-sm ring-1 ring-red-200 placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleBlockConfirm}
              disabled={isPending}
              className="rounded-full bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Confirmar bloqueo"}
            </button>
            <button
              type="button"
              onClick={() => setShowBlockForm(false)}
              className="rounded-full px-4 py-1.5 text-sm text-red-700 hover:bg-red-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Feedback de error */}
      {feedback && (
        <p className="text-[11px] text-red-600">{feedback}</p>
      )}
    </div>
  );
}
