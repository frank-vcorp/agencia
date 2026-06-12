"use client";

/**
 * IMPL-20260611-04
 * Respaldo: fix critico Vika repregunta + textarea pierde foco.
 *   - El textarea ahora mantiene el foco: autoFocus al montar, foco tras
 *     enviar y foco reactivo cuando isPending pasa de true a false (Vika
 *     termino de responder).
 *
 * IMPL-20260611-07
 * Respaldo: fix Bug 1 - Enter no enviaba en movil. Se agregan
 *   `inputMode="text"` y `enterKeyHint="send"` al textarea para que el
 *   teclado virtual de iOS/Android muestre el boton "Enviar" y dispare
 *   el onKeyDown actual.
 *
 * IMPL-20260611-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260611-01_alineacion_chat_vika_a_especificacion_tecnica_v1.md
 * IMPL-20260603-02
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260603-02_cierre_brief_doble_salida_humano_raw_y_agenda_performance_v1.md
 * IMPL-20260602-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260602-01_brief_cliente_conversacion_primero_y_procesado_unico_al_cierre_v1.md
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-08_historial_optimista_y_tono_mas_natural_v1.md
 * FIX-20260528-01: Envio con Enter y timestamp corto por mensaje.
 * FIX-20260528-03: Layout compacto para chat cliente.
 * FIX-20260528-04: Autoscroll al ultimo mensaje.
 */
import { useEffect, useRef, useState, useTransition } from "react";

import type { BriefMessage, BriefRecord, StructuredBriefSummary } from "@/lib/briefing";

import { sendClientMessageAction, submitBriefAction } from "@/app/cliente/brief/[projectId]/actions";

type ClientBriefChatViewProps = {
  brief: BriefRecord;
  projectId: string;
};

type OptimisticClientMessage = BriefMessage & {
  pending?: boolean;
  optimisticKey?: string;
};

const VIKA_INTRO_TEXT = "Tengo 8 preguntas para entender tu negocio. \u00a1Empecemos!";

function closureHumanSummary(summary: StructuredBriefSummary): string {
  const lines = [
    summary.giroYProductoHeroe && `Lo que ofreces: ${summary.giroYProductoHeroe}.`,
    summary.madurez && `Trayectoria: ${summary.madurez}.`,
    summary.localFisico && `Operacion: ${summary.localFisico}.`,
    summary.logo && `Marca grafica: ${summary.logo}.`,
    summary.audience && `Lo que te hace unico: ${summary.audience}.`,
    summary.restrictions && `Lo que la gente duda antes de comprar: ${summary.restrictions}.`,
    summary.presupuesto && `Presupuesto mensual: ${summary.presupuesto}.`,
    summary.cta && `Accion esperada del cliente: ${summary.cta}.`,
    summary.historiaYContexto && `Tu historia: ${summary.historiaYContexto}.`
  ].filter(Boolean);

  return lines.join("\n");
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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
  const clientFacingSummary =
    currentVersion?.structuredSummary.clientFacingSummary ||
    (currentVersion ? closureHumanSummary(currentVersion.structuredSummary) : "") ||
    currentVersion?.finalSummaryText ||
    "";

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

  /**
   * IMPL-20260611-04
   * Cuando Vika termina de responder (isPending pasa de true a false) el
   * textarea perdia foco y el usuario tenia que volver a hacer clic para
   * escribir. Devolvemos el foco automaticamente al textarea para que la
   * conversacion sea fluida.
   */
  useEffect(() => {
    if (!isPending && textareaRef.current && canSend) {
      textareaRef.current.focus();
    }
  }, [isPending, canSend]);

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

    // IMPL-20260611-04: tras limpiar el texto, devolvemos el foco al textarea
    // para que el cliente pueda seguir escribiendo sin hacer clic otra vez.
    textareaRef.current?.focus();

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

  function handleSubmitBrief() {
    if (!currentVersion || !canSend) {
      return;
    }

    startTransition(async () => {
      try {
        await submitBriefAction(projectId, brief.id, currentVersion.id);
      } catch (error) {
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
        <p className="mt-1.5 text-xs text-[color:var(--muted)] sm:text-sm">{VIKA_INTRO_TEXT}</p>
      </section>

      <section className="panel rounded-[22px] px-3 py-3 sm:px-4 sm:py-4">
        {hideConversationSurface ? (
          <div className="space-y-3">
            {clientFacingSummary ? (
              <article className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-3 sm:px-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
                  Esto es lo que capturamos de tu proyecto
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-900">{clientFacingSummary}</p>
              </article>
            ) : null}
            <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900 sm:px-4">
              Ya capturamos la informacion necesaria para preparar tu propuesta. Nuestro equipo ya esta en la siguiente accion.
            </div>
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
            ref={textareaRef}
            value={messageText}
            autoFocus
            inputMode="text"
            enterKeyHint="send"
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
            {canSend ? (
              <button
                type="button"
                onClick={handleSubmitBrief}
                disabled={isPending || !canSend}
                className="rounded-[12px] bg-[color:var(--ink)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cerrar y enviar mi brief
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel rounded-[22px] px-4 py-3">
        <p className="text-sm font-semibold text-[color:var(--ink)]">Como trabajamos esta conversacion</p>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Vika te hara 8 preguntas para entender tu negocio y tu presupuesto. Al cerrar el brief, nuestro equipo recibira el resumen y te contactara por WhatsApp.
        </p>
      </section>
    </div>
  );
}
