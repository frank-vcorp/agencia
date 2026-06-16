/**
 * IMPL-20260612-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-03_cliente_portal_briefing_file_upload_estados_v1.md
 *
 * V2 del chat de briefing del cliente con soporte para:
 * - File upload drag-drop en el composer
 * - Preview de archivos adjuntos (imagen, video, PDF, doc)
 * - Mensajes con contenido mixto (texto + archivos)
 * - Persistencia de URLs permanentes de Supabase Storage
 * - Tonos de autor diferenciados (cliente, operador, asistente)
 *
 * Extiende ClientBriefChatView manteniendo la lógica de mensajes de Vika.
 */
"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import type { BriefMessage, BriefRecord, StructuredBriefSummary } from "@/lib/briefing";
import {
  type ClientMessageContent,
  type ClientUploadedFile,
  CLIENT_UPLOAD_MAX_FILES_PER_MESSAGE,
  formatClientUploadBytes,
  isClientUploadMimeAllowed
} from "@/lib/client-uploads";

import { sendClientMessageAction, submitBriefAction } from "@/app/cliente/brief/[projectId]/actions";

type ClientBriefChatViewV2Props = {
  brief: BriefRecord;
  projectId: string;
};

type OptimisticClientMessage = BriefMessage & {
  pending?: boolean;
  optimisticKey?: string;
  /** Contenido estructurado V2 (texto, archivo, o mixto). */
  structuredContent?: ClientMessageContent;
};

const VIKA_INTRO_TEXT = "Voy a hacerte algunas preguntas para entender tu negocio. \u00a1Empecemos!";

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
      parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
    );
    return `${lookup.day ?? "00"}${lookup.month ?? "00"}${lookup.year ?? "00"}|${lookup.hour ?? "00"}:${lookup.minute ?? "00"}`;
  } catch {
    return iso;
  }
}

function createOptimisticMessageSignature(
  message: Pick<BriefMessage, "authorRole" | "versionId" | "messageText">
): string {
  return [
    message.versionId,
    message.authorRole,
    message.messageText.trim().replace(/\s+/g, " ").toLowerCase()
  ].join("::");
}

/**
 * Vista de un archivo adjunto (imagen, video, PDF, doc).
 * IMPL-20260612-03
 */
function FileAttachmentView({
  file,
  caption
}: {
  file: ClientUploadedFile;
  caption?: string;
}) {
  const isImage = file.mimeType.startsWith("image/");
  const isVideo = file.mimeType.startsWith("video/");
  const isPDF = file.mimeType === "application/pdf";

  return (
    <div className="group relative mt-1 overflow-hidden rounded-lg ring-1 ring-stone-200 bg-white">
      {file.previewUrl && isImage && (
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          aria-label={`Abrir imagen ${file.name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.previewUrl}
            alt={file.name}
            className="w-full max-w-[280px] aspect-square object-cover"
          />
        </a>
      )}
      {file.previewUrl && isVideo && (
        <video
          src={file.previewUrl}
          controls
          className="w-full max-w-[280px] aspect-square object-cover"
          aria-label={`Video ${file.name}`}
        />
      )}
      {!isImage && !isVideo && (
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2"
          aria-label={`Descargar ${file.name}`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${
              isPDF ? "bg-red-50 text-red-500" : "bg-stone-100 text-stone-500"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-medium">{file.name}</span>
            <span className="block text-[10px] text-stone-500">
              {formatClientUploadBytes(file.size)}
            </span>
          </span>
        </a>
      )}
      {caption && (
        <p className="border-t border-stone-100 bg-black/5 px-2 py-1 text-[11px] text-stone-700">
          {caption}
        </p>
      )}
    </div>
  );
}

/**
 * Render del contenido de un mensaje del cliente.
 * Soporta texto, archivo, o mixto.
 * IMPL-20260612-03
 */
function ClientMessageContentView({ content }: { content: ClientMessageContent }) {
  if (content.type === "text") {
    return <p className="whitespace-pre-wrap break-words text-[13px] leading-5 sm:text-sm">{content.text}</p>;
  }
  if (content.type === "file") {
    return <FileAttachmentView file={content.file} caption={content.caption} />;
  }
  // mixed
  return (
    <>
      {content.text && (
        <p className="whitespace-pre-wrap break-words text-[13px] leading-5 sm:text-sm">
          {content.text}
        </p>
      )}
      <div className="mt-1 flex flex-col gap-1">
        {content.files.map((f) => (
          <FileAttachmentView key={f.id} file={f} />
        ))}
      </div>
    </>
  );
}

/**
 * Intenta parsear el messageText como JSON estructurado V2.
 * Si no es JSON válido, retorna un contenido de tipo texto.
 * IMPL-20260612-03
 */
function parseMessageContent(messageText: string): ClientMessageContent {
  if (!messageText) return { type: "text", text: "" };
  if (!messageText.startsWith("{")) return { type: "text", text: messageText };

  try {
    const parsed = JSON.parse(messageText) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "type" in parsed &&
      typeof (parsed as { type: unknown }).type === "string"
    ) {
      const p = parsed as { type: string; text?: unknown; file?: unknown; files?: unknown; caption?: unknown };
      if (p.type === "text" && typeof p.text === "string") {
        return { type: "text", text: p.text };
      }
      if (p.type === "file" && p.file && typeof p.file === "object") {
        return {
          type: "file",
          file: p.file as ClientUploadedFile,
          caption: typeof p.caption === "string" ? p.caption : undefined
        };
      }
      if (p.type === "mixed" && typeof p.text === "string" && Array.isArray(p.files)) {
        return {
          type: "mixed",
          text: p.text,
          files: p.files.filter((f): f is ClientUploadedFile => Boolean(f) && typeof f === "object")
        };
      }
    }
  } catch {
    // No es JSON válido, tratar como texto
  }
  return { type: "text", text: messageText };
}

export function ClientBriefChatViewV2({ brief, projectId }: ClientBriefChatViewV2Props) {
  const [messageText, setMessageText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<ClientUploadedFile[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticClientMessage[]>([]);
  const [isPending, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
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

  useEffect(() => {
    if (!isPending && textareaRef.current && canSend) {
      textareaRef.current.focus();
    }
  }, [isPending, canSend]);

  /**
   * Maneja la selección de archivos desde el input o drag-drop.
   * IMPL-20260612-03
   */
  function handleFileSelect(filesList: FileList | null) {
    if (!filesList || filesList.length === 0) return;
    setUploadError(null);

    const currentCount = pendingFiles.length;
    const remaining = CLIENT_UPLOAD_MAX_FILES_PER_MESSAGE - currentCount;
    if (remaining <= 0) {
      setUploadError(`Maximo ${CLIENT_UPLOAD_MAX_FILES_PER_MESSAGE} archivos por mensaje.`);
      return;
    }

    const filesToAdd: ClientUploadedFile[] = [];
    for (let i = 0; i < Math.min(filesList.length, remaining); i++) {
      const file = filesList[i];
      if (!isClientUploadMimeAllowed(file.type)) {
        setUploadError(`Tipo de archivo no permitido: ${file.type || file.name}`);
        continue;
      }
      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `file-${Date.now()}-${i}`;
      const blobUrl = URL.createObjectURL(file);
      const isPreviewable =
        file.type.startsWith("image/") || file.type.startsWith("video/");
      filesToAdd.push({
        id,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        url: blobUrl,
        previewUrl: isPreviewable ? blobUrl : undefined,
        uploadedAt: new Date().toISOString(),
        status: "uploading"
      });
    }

    if (filesToAdd.length > 0) {
      setPendingFiles((prev) => [...prev, ...filesToAdd]);
      // Subir cada archivo a Supabase Storage en paralelo
      void uploadFiles(filesToAdd);
    }
  }

  /**
   * Sube los archivos a Supabase Storage usando signed URLs.
   * Al finalizar, actualiza el archivo con la URL permanente.
   * IMPL-20260612-03
   */
  async function uploadFiles(files: ClientUploadedFile[]) {
    await Promise.all(
      files.map(async (file) => {
        try {
          const urlResponse = await fetch("/api/client/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              fileName: file.name,
              mimeType: file.mimeType,
              size: file.size
            })
          });

          if (!urlResponse.ok) {
            throw new Error(`upload-url failed: ${urlResponse.status}`);
          }

          const urlData = (await urlResponse.json()) as {
            signedUrl: string | null;
            publicUrl: string;
            path: string;
            development?: boolean;
          };

          let finalUrl = urlData.publicUrl;

          // Si hay signed URL, subir el archivo
          if (urlData.signedUrl) {
            const blob = await fetch(file.url).then((r) => r.blob());
            const uploadResponse = await fetch(urlData.signedUrl, {
              method: "PUT",
              headers: { "Content-Type": file.mimeType },
              body: blob
            });
            if (!uploadResponse.ok) {
              throw new Error(`upload failed: ${uploadResponse.status}`);
            }
          }
          // En modo development o si no hay signed URL, mantenemos el blob URL

          setPendingFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, url: finalUrl, status: "ready" as const } : f
            )
          );
        } catch (err) {
          console.error("[client-upload] error", err);
          setPendingFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, status: "error" as const } : f
            )
          );
          setUploadError(`Error subiendo ${file.name}`);
        }
      })
    );
  }

  function handleRemoveFile(fileId: string) {
    setPendingFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file?.url.startsWith("blob:")) {
        URL.revokeObjectURL(file.url);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  }

  /**
   * Envía un mensaje con texto y/o archivos adjuntos.
   * Si hay archivos, serializa el contenido como JSON estructurado V2.
   * IMPL-20260612-03
   */
  function handleSendMessage() {
    const trimmedMessage = messageText.trim();
    const readyFiles = pendingFiles.filter((f) => f.status === "ready");
    const hasContent = trimmedMessage.length > 0 || readyFiles.length > 0;

    if (!currentVersion || !canSend || !hasContent) {
      return;
    }

    // Construir contenido estructurado
    let content: ClientMessageContent;
    if (readyFiles.length === 0) {
      content = { type: "text", text: trimmedMessage };
    } else if (readyFiles.length === 1 && !trimmedMessage) {
      content = { type: "file", file: readyFiles[0] };
    } else if (readyFiles.length === 1) {
      content = { type: "mixed", text: trimmedMessage, files: readyFiles };
    } else {
      content = { type: "mixed", text: trimmedMessage, files: readyFiles };
    }

    // Para el chat legacy, enviamos el texto como messageText
    // y los archivos como JSON al final si hay
    const legacyMessageText =
      readyFiles.length > 0
        ? JSON.stringify(content)
        : trimmedMessage;

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
      messageText: legacyMessageText,
      createdAt: new Date().toISOString(),
      pending: true,
      structuredContent: content
    };

    setOptimisticMessages((current) => [...current, optimisticMessage]);
    setMessageText("");
    setPendingFiles([]);
    setUploadError(null);

    textareaRef.current?.focus();

    startTransition(async () => {
      try {
        await sendClientMessageAction(projectId, brief.id, currentVersion.id, legacyMessageText);
      } catch (error) {
        setOptimisticMessages((current) =>
          current.filter((message) => message.optimisticKey !== optimisticKey)
        );
        setMessageText(trimmedMessage);
        throw error;
      }
    });
  }

  function handleSubmitBrief() {
    if (!currentVersion || !canSend) return;
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
        <p className="mt-1.5 text-xs text-[color:var(--muted)] sm:text-sm">
          {VIKA_INTRO_TEXT}
        </p>
      </section>

      <section className="panel rounded-[22px] px-3 py-3 sm:px-4 sm:py-4">
        {hideConversationSurface ? (
          <div className="space-y-3">
            {clientFacingSummary ? (
              <article className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-3 sm:px-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
                  Esto es lo que capturamos de tu proyecto
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-900">
                  {clientFacingSummary}
                </p>
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
              visibleMessages.map((message) => {
                const content = message.structuredContent ?? parseMessageContent(message.messageText);
                return (
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
                    <ClientMessageContentView content={content} />
                    {message.pending && (
                      <p className="mt-1 text-[10px] font-medium text-stone-500">Enviando...</p>
                    )}
                  </article>
                );
              })
            )}
          </div>
        )}

        <div className="mt-3 border-t border-[color:var(--line)] pt-3">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
            Tu mensaje
          </label>

          {/* Preview de archivos adjuntos pendientes */}
          {pendingFiles.length > 0 && (
            <div
              className="mb-2 flex flex-wrap gap-2"
              role="list"
              aria-label="Archivos adjuntos pendientes"
            >
              {pendingFiles.map((f) => (
                <div
                  key={f.id}
                  role="listitem"
                  className="flex items-center gap-2 rounded-lg bg-stone-50 px-2 py-1 ring-1 ring-[color:var(--line)]"
                >
                  {f.previewUrl && f.mimeType.startsWith("image/") && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={f.previewUrl}
                      alt=""
                      className="h-8 w-8 rounded object-cover"
                    />
                  )}
                  {f.previewUrl && f.mimeType.startsWith("video/") && (
                    <video
                      src={f.previewUrl}
                      className="h-8 w-8 rounded object-cover"
                      muted
                    />
                  )}
                  {!f.previewUrl && (
                    <span className="flex h-8 w-8 items-center justify-center rounded bg-stone-200 text-stone-500">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block max-w-[150px] truncate text-xs">{f.name}</span>
                    <span className="block text-[10px] text-stone-500">
                      {formatClientUploadBytes(f.size)}
                      {f.status === "uploading" && " · subiendo..."}
                      {f.status === "ready" && " · listo"}
                      {f.status === "error" && " · error"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(f.id)}
                    className="text-stone-400 hover:text-red-500"
                    aria-label={`Quitar ${f.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {uploadError && (
            <p className="mb-2 text-xs font-medium text-red-600" role="alert">
              {uploadError}
            </p>
          )}

          <div className="flex items-end gap-2">
            <label
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-stone-100 transition hover:bg-stone-200"
              aria-label="Adjuntar archivo"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                disabled={!canSend || isPending}
              />
              <svg
                className="h-5 w-5 text-stone-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
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
              onPaste={(event) => {
                // Soporte basico para paste de imagenes
                const items = event.clipboardData?.items;
                if (!items) return;
                const files: File[] = [];
                for (let i = 0; i < items.length; i++) {
                  if (items[i].kind === "file") {
                    const file = items[i].getAsFile();
                    if (file) files.push(file);
                  }
                }
                if (files.length > 0) {
                  event.preventDefault();
                  const dt = new DataTransfer();
                  files.forEach((f) => dt.items.add(f));
                  handleFileSelect(dt.files);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (event.dataTransfer?.files) {
                  handleFileSelect(event.dataTransfer.files);
                }
              }}
              rows={2}
              disabled={!canSend || isPending}
              className="min-h-[44px] max-h-[120px] flex-1 resize-none rounded-[12px] border border-[color:var(--line)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[color:var(--line-strong)]"
              placeholder="Escribe tu mensaje o adjunta archivos..."
            />

            <button
              type="button"
              onClick={handleSendMessage}
              disabled={
                !canSend ||
                isPending ||
                (!messageText.trim() && pendingFiles.filter((f) => f.status === "ready").length === 0)
              }
              className="rounded-[12px] bg-[color:var(--accent)] px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Enviar mensaje"
            >
              Enviar
            </button>
          </div>

          {disabledReason && (
            <p className="mt-2 text-xs font-medium text-amber-700">{disabledReason}</p>
          )}

          {canSend && (
            <div className="mt-2.5">
              <button
                type="button"
                onClick={handleSubmitBrief}
                disabled={isPending || !canSend}
                className="rounded-[12px] bg-[color:var(--ink)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cerrar y enviar mi brief
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="panel rounded-[22px] px-4 py-3">
        <p className="text-sm font-semibold text-[color:var(--ink)]">Como trabajamos esta conversacion</p>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Vika te hara algunas preguntas sobre tu negocio, tus clientes y tu presupuesto. Cuando
          considere que ya tenemos lo necesario para armar una propuesta util, cerramos el brief y
          nuestro equipo te contacta por WhatsApp.
        </p>
      </section>
    </div>
  );
}
