"use client";

/**
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-08_historial_optimista_y_tono_mas_natural_v1.md
 * FIX-20260528-01: Envio con Enter y timestamp corto por mensaje.
 * FIX-20260528-03: Layout compacto para chat cliente.
 * FIX-20260528-04: Autoscroll al ultimo mensaje.
 */
import { useEffect, useRef, useState, useTransition } from "react";

import type { BriefMessage, BriefRecord } from "@/lib/briefing";

import { sendClientMessageAction } from "@/app/cliente/brief/[projectId]/actions";

type ClientBriefChatViewProps = {
  brief: BriefRecord;
  projectId: string;
};

type OptimisticClientMessage = BriefMessage & {
  pending?: boolean;
  optimisticKey?: string;
};

function stageCopy(stage: BriefRecord["status"]): string {
  if (stage === "stage_1_discovery") return "Cuentanos que quieres mover y te iremos guiando en la conversacion.";
  if (stage === "stage_2_precision") return "Ya tenemos contexto. Ahora estamos aterrizando los detalles clave de la propuesta.";
  if (stage === "stage_3_commercial_fit") return "Estamos cerrando el mejor encaje para que tu propuesta salga bien enfocada.";
  if (stage === "pending_operator_review" || stage === "operator_review_in_progress") {
    return "Tu propuesta ya entro en revision con nuestro equipo.";
  }
  if (stage === "approved_locked") return "Tu brief ya fue validado y quedo listo para ejecucion.";
  if (stage === "returned_for_rework") return "Necesitamos un ajuste adicional para dejar la propuesta alineada.";
  return "Cuentanos que necesitas y te acompanamos paso a paso.";
}

function messageBubbleClass(authorRole: BriefMessage["authorRole"]): string {
  if (authorRole === "client") {
    return "ml-auto rounded-[18px] rounded-br-[6px] bg-[#d9fdd3] text-stone-900 shadow-[0_1px_0_rgba(15,23,42,0.08)]";
  }

  if (authorRole === "operator") {
    return "mr-auto rounded-[18px] rounded-bl-[6px] bg-[#e0f2fe] text-sky-950 shadow-[0_1px_0_rgba(15,23,42,0.08)]";
  }

  return "mr-auto rounded-[18px] rounded-bl-[6px] bg-white text-stone-800 shadow-[0_1px_0_rgba(15,23,42,0.08)]";
}

function messageAuthor(authorRole: BriefMessage["authorRole"]): string {
  if (authorRole === "client") return "Tu";
  if (authorRole === "operator") return "Tu asesor";
  return "Vika";
}

function formatShortDateTime(iso: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Mexico_City"
    }).formatToParts(new Date(iso));

    const lookup = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value])
    );

    return `${lookup.day ?? "00"}${lookup.month ?? "00"}${lookup.year ?? "00"}|${lookup.hour ?? "00"}:${lookup.minute ?? "00"}`;
  } catch {
    return iso;
  }
}

function createOptimisticMessageSignature(message: Pick<BriefMessage, "authorRole" | "versionId" | "messageText">): string {
  return [message.versionId, message.authorRole, message.messageText.trim().replace(/\s+/g, " ").toLowerCase()].join("::");
}

export function ClientBriefChatView({ brief, projectId }: ClientBriefChatViewProps) {
  const [messageText, setMessageText] = useState("");
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticClientMessage[]>([]);
  const [isPending, startTransition] = useTransition();
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const currentVersion = brief.currentVersion;

  const messages = currentVersion?.messages ?? [];
  const editable = currentVersion?.editable === true;
  const status = brief.status;
  const confirmedClientMessageSignatures = new Set(
    messages
      .filter((message) => message.authorRole === "client")
      .map((message) => createOptimisticMessageSignature(message))
  );
  const visibleMessages: OptimisticClientMessage[] = [
    ...messages,
    ...optimisticMessages.filter(
      (message) => !confirmedClientMessageSignatures.has(createOptimisticMessageSignature(message))
    )
  ];

  const isReviewStatus =
    status === "pending_operator_review" || status === "operator_review_in_progress";
  const isApprovedStatus = status === "approved_locked";
  const hideConversationSurface = isReviewStatus || isApprovedStatus;

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
  }, [visibleMessages.length]);

  useEffect(() => {
    setOptimisticMessages((current) => {
      const confirmedSignatures = new Set(
        messages
          .filter((message) => message.authorRole === "client")
          .map((message) => createOptimisticMessageSignature(message))
      );
      const next = current.filter(
        (message) => !confirmedSignatures.has(createOptimisticMessageSignature(message))
      );

      return next.length === current.length ? current : next;
    });
  }, [messages]);

  function handleSendMessage() {
    const trimmedMessage = messageText.trim();

    if (!currentVersion || !canSend || !trimmedMessage) {
      return;
    }

    const optimisticKey =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `optimistic-${Date.now()}`;
    const optimisticMessage: OptimisticClientMessage = {
      id: optimisticKey,
      optimisticKey,
      versionId: currentVersion.id,
      stage: currentVersion.stage,
      authorRole: "client",
      actorLabel: "Cliente",
      actorUserId: null,
      actorMembershipId: null,
      actorAgentId: null,
      effectiveUserId: null,
      effectiveMembershipId: null,
      messageText: trimmedMessage,
      createdAt: new Date().toISOString(),
      pending: true
    };

    setOptimisticMessages((current) => [...current, optimisticMessage]);
    setMessageText("");

    startTransition(async () => {
      try {
        await sendClientMessageAction(projectId, brief.id, currentVersion.id, trimmedMessage);
      } catch (error) {
        setOptimisticMessages((current) => current.filter((message) => message.optimisticKey !== optimisticKey));
        setMessageText(trimmedMessage);
        throw error;
      }
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
        {hideConversationSurface ? (
          <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900 sm:px-4">
            Ya capturamos la informacion necesaria para preparar tu propuesta. Nuestro equipo ya esta en la siguiente accion.
          </div>
        ) : (
          <div
            ref={messageListRef}
            className="min-h-[48vh] max-h-[68vh] space-y-1.5 overflow-y-auto rounded-[18px] bg-[#efeae2] px-2 py-2 pr-1 sm:px-3"
          >
            {visibleMessages.length === 0 ? (
              <p className="rounded-[14px] border border-dashed border-stone-300 p-2.5 text-xs text-stone-500 sm:text-sm">
                Aun no hay mensajes en este brief.
              </p>
            ) : (
              visibleMessages.map((message) => (
                <article
                  key={message.id}
                  className={`max-w-[84%] px-3 py-2 text-[13px] leading-5 sm:text-sm sm:leading-5 ${messageBubbleClass(message.authorRole)} ${message.pending ? "opacity-75" : ""}`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-[9px] font-semibold uppercase tracking-[0.12em] opacity-65">
                    <span>{messageAuthor(message.authorRole)}</span>
                    <span className="font-medium normal-case tracking-normal opacity-80">
                      {formatShortDateTime(message.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-5 sm:text-sm">
                    {message.messageText}
                  </p>
                  {message.pending && (
                    <p className="mt-1 text-[10px] font-medium text-stone-500">Enviando...</p>
                  )}
                </article>
              ))
            )}
          </div>
        )}

        <div className="mt-3 border-t border-[color:var(--line)] pt-3">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
            Tu mensaje
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
          </div>
        </div>
      </section>

      <section className="panel rounded-[22px] px-4 py-3">
        <p className="text-sm font-semibold text-[color:var(--ink)]">Como trabajamos esta conversacion</p>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Tu conversacion se va estructurando en segundo plano para que el equipo prepare una propuesta clara, sin obligarte a llenar un formulario paso a paso.
        </p>
      </section>
    </div>
  );
}
