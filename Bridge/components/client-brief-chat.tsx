"use client";

/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-04_brief_chat_portal_cliente_v1.md
 */
import { useMemo, useState, useTransition } from "react";

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
  return "Asistente";
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

  return (
    <div className="space-y-4 pb-8">
      <section className="panel rounded-[28px] px-5 py-5">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
          Brief conversacional
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
          {brief.container.project?.name ?? "Tu proyecto"}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{stageCopy(status)}</p>
      </section>

      <section className="panel rounded-[28px] px-4 py-4">
        <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="rounded-[16px] border border-dashed border-stone-300 p-3 text-sm text-stone-500">
              Aun no hay mensajes en este brief.
            </p>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className={`max-w-[92%] rounded-[16px] px-3.5 py-2.5 text-sm leading-6 ${messageBubbleClass(message.authorRole)}`}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
                  {messageAuthor(message.authorRole)}
                </p>
                <p className="whitespace-pre-wrap">{message.messageText}</p>
              </article>
            ))
          )}
        </div>

        <div className="mt-4 border-t border-[color:var(--line)] pt-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
            Tu respuesta
          </label>
          <textarea
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            rows={4}
            disabled={!canSend || isPending}
            className="w-full rounded-[14px] border border-[color:var(--line)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[color:var(--line-strong)]"
            placeholder="Escribe aqui lo que necesitas para tu proyecto"
          />
          {disabledReason && (
            <p className="mt-2 text-xs font-medium text-amber-700">{disabledReason}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (!currentVersion || !canSend || !messageText.trim()) {
                  return;
                }

                startTransition(async () => {
                  await sendClientMessageAction(
                    projectId,
                    brief.id,
                    currentVersion.id,
                    messageText
                  );
                  setMessageText("");
                });
              }}
              disabled={!canSend || isPending || !messageText.trim()}
              className="rounded-[14px] bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="rounded-[14px] border border-[color:var(--line-strong)] px-4 py-2 text-xs font-semibold text-[color:var(--muted)] transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="rounded-[14px] border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enviar brief para revision
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="panel rounded-[28px] px-5 py-4">
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-[color:var(--ink)]">
            Resumen de lo que capturamos hasta aqui
          </summary>
          <div className="mt-3 space-y-2">
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
