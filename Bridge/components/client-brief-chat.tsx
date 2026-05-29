"use client";

/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-04_brief_chat_portal_cliente_v1.md
 * FIX-20260528-01: Envio con Enter y timestamp corto por mensaje.
 * FIX-20260528-03: Layout compacto para chat cliente.
 * FIX-20260528-04: Autoscroll al ultimo mensaje.
 */
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { BriefMessage, BriefRecord, StructuredBriefSummary } from "@/lib/briefing";

import {
  advanceStageAction,
  sendClientMessageAction,
  submitBriefAction
} from "@/app/cliente/brief/[projectId]/actions";

type ClientBriefChatViewProps = {
  brief: BriefRecord;
  projectId: string;
};

function stageCopy(stage: BriefRecord["status"]): string {
  if (stage === "stage_1_discovery") return "Etapa 1 de 3 - Cuentanos que necesitas";
  if (stage === "stage_2_precision") return "Etapa 2 de 3 - Vamos a los detalles";
  if (stage === "stage_3_commercial_fit") return "Etapa 3 de 3 - Cerramos el encaje";
  if (stage === "pending_operator_review" || stage === "operator_review_in_progress") {
    return "Brief enviado - Tu asesor lo esta revisando";
  }
  if (stage === "approved_locked") return "Brief aprobado";
  if (stage === "returned_for_rework") return "Tu asesor pidio ajustes";
  return "Etapa 1 de 3 - Cuentanos que necesitas";
}

function messageBubbleClass(authorRole: BriefMessage["authorRole"]): string {
  if (authorRole === "client") {
    return "ml-auto bg-stone-800 text-white";
  }

  if (authorRole === "operator") {
    return "mr-auto border border-blue-200 bg-blue-50 text-blue-900";
  }

  return "mr-auto border border-stone-200 bg-white text-stone-800";
}

function messageAuthor(authorRole: BriefMessage["authorRole"]): string {
  if (authorRole === "client") return "Tu";
  if (authorRole === "operator") return "Tu asesor";
  return "Vika";
}

function formatShortDateTime(iso: string): string {
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

function hasValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return false;
}

function summaryEntries(summary: StructuredBriefSummary): Array<{ label: string; value: string }> {
  return Object.entries(summary)
    .filter(([, value]) => hasValue(value))
    .map(([key, value]) => ({
      label: key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (c) => c.toUpperCase())
        .trim(),
      value: String(value)
    }));
}

export function ClientBriefChatView({ brief, projectId }: ClientBriefChatViewProps) {
  const [messageText, setMessageText] = useState("");
  const [isPending, startTransition] = useTransition();
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const currentVersion = brief.currentVersion;

  const messages = currentVersion?.messages ?? [];
  const editable = currentVersion?.editable === true;
  const status = brief.status;

  const isReviewStatus =
    status === "pending_operator_review" || status === "operator_review_in_progress";
  const isApprovedStatus = status === "approved_locked";

  const clientMessagesInCurrentStage = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.authorRole === "client" && message.stage === (currentVersion?.stage ?? "discovery")
      ).length,
    [messages, currentVersion?.stage]
  );

  const showAdvanceButton =
    editable &&
    currentVersion?.stage !== "commercial_fit" &&
    clientMessagesInCurrentStage > 0;

  const showSubmitButton =
    editable &&
    currentVersion?.stage === "commercial_fit" &&
    clientMessagesInCurrentStage > 0;

  const summaryItems = currentVersion ? summaryEntries(currentVersion.structuredSummary) : [];

  const disabledReason = isReviewStatus
    ? "En revision"
    : isApprovedStatus
      ? "Brief aprobado"
      : null;

  const canSend = editable && !disabledReason;

  useEffect(() => {
    const container = messageListRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth"
    });
  }, [messages.length]);

  function handleSendMessage() {
    if (!currentVersion || !canSend || !messageText.trim()) {
      return;
    }

    startTransition(async () => {
      await sendClientMessageAction(projectId, brief.id, currentVersion.id, messageText);
      setMessageText("");
    });
  }

  return (
    <div className="space-y-3 pb-6">
      <section className="panel rounded-[22px] px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
          Brief conversacional
        </p>
        <h1 className="mt-1.5 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight sm:text-2xl">
          {brief.container.project?.name ?? "Tu proyecto"}
        </h1>
        <p className="mt-1.5 text-xs text-[color:var(--muted)] sm:text-sm">{stageCopy(status)}</p>
      </section>

      <section className="panel rounded-[22px] px-3 py-3 sm:px-4 sm:py-4">
        <div ref={messageListRef} className="max-h-[42vh] space-y-2.5 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-stone-300 p-2.5 text-xs text-stone-500 sm:text-sm">
              Aun no hay mensajes en este brief.
            </p>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className={`max-w-[86%] rounded-[14px] px-3 py-2 text-xs leading-5 sm:text-sm sm:leading-6 ${messageBubbleClass(message.authorRole)}`}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
                  {messageAuthor(message.authorRole)}
                </p>
                <p className="whitespace-pre-wrap">{message.messageText}</p>
                <p className="mt-1 text-[10px] opacity-70">{formatShortDateTime(message.createdAt)}</p>
              </article>
            ))
          )}
        </div>

        <div className="mt-3 border-t border-[color:var(--line)] pt-3">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
            Tu respuesta
          </label>
          <textarea
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSendMessage();
              }
            }}
            rows={3}
            disabled={!canSend || isPending}
            className="w-full rounded-[12px] border border-[color:var(--line)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[color:var(--line-strong)]"
            placeholder="Escribe aqui lo que necesitas para tu proyecto"
          />
          {disabledReason && (
            <p className="mt-2 text-xs font-medium text-amber-700">{disabledReason}</p>
          )}

          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!canSend || isPending || !messageText.trim()}
              className="rounded-[12px] bg-[color:var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Enviar
            </button>

            {showAdvanceButton && currentVersion && (
              <button
                type="button"
                onClick={() => {
                  startTransition(async () => {
                    await advanceStageAction(projectId, brief.id, currentVersion.id);
                  });
                }}
                disabled={isPending}
                className="rounded-[12px] border border-[color:var(--line-strong)] px-3.5 py-1.5 text-xs font-semibold text-[color:var(--muted)] transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continuar a etapa siguiente -&gt;
              </button>
            )}

            {showSubmitButton && currentVersion && (
              <button
                type="button"
                onClick={() => {
                  startTransition(async () => {
                    await submitBriefAction(projectId, brief.id, currentVersion.id);
                  });
                }}
                disabled={isPending}
                className="rounded-[12px] border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enviar brief para revision
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="panel rounded-[22px] px-4 py-3">
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-[color:var(--ink)]">
            Resumen de lo que capturamos hasta aqui
          </summary>
          <div className="mt-2.5 space-y-2">
            {summaryItems.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">Aun no hay datos resumidos.</p>
            ) : (
              summaryItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[14px] border border-[color:var(--line)] bg-white px-3 py-2"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--ink)]">{item.value}</p>
                </div>
              ))
            )}
          </div>
        </details>
      </section>
    </div>
  );
}
