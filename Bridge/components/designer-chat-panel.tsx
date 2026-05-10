"use client";
/**
 * IMPL-20260510-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-03_chat_asistente_produccion_disenador.md
 *
 * Panel de chat lateral del asistente de produccion creativa.
 * Solo se usa en /disenador — interactividad requiere Client Component.
 */
import { useRef, useState } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type DesignerChatAssetContext = {
  tool: string;
  promptText: string;
  format: string;
  name: string;
};

interface DesignerChatPanelProps {
  assetContext?: DesignerChatAssetContext;
}

// ─── Icono de chat ────────────────────────────────────────────────────────────

function ChatIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ─── Icono de clip (adjuntar) ─────────────────────────────────────────────────

function PaperclipIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

// ─── Icono de enviar ──────────────────────────────────────────────────────────

function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 rotate-90"
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

// ─── Utilidad: convertir File a base64 ────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        // Quitar el prefijo data:image/...;base64,
        const base64 = result.split(",")[1];
        resolve(base64 ?? "");
      } else {
        reject(new Error("No se pudo leer el archivo"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function DesignerChatPanel({ assetContext }: DesignerChatPanelProps) {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Imagen adjunta
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyAreaRef = useRef<HTMLDivElement>(null);

  const placeholder = assetContext
    ? `Pregúntame cómo trabajar este activo en ${assetContext.tool}`
    : "Pregúntame sobre Firefly, Express o cualquier herramienta Adobe";

  // ─── Manejar imagen desde file picker o paste ───────────────────────────

  async function applyImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("La imagen supera el límite de 4 MB.");
      return;
    }
    const b64 = await fileToBase64(file);
    setImageBase64(b64);
    setImageMimeType(file.type);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) applyImage(file);
    e.target.value = "";
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items);
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          applyImage(file);
          return;
        }
      }
    }
  }

  function clearImage() {
    setImageBase64(null);
    setImageMimeType(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
  }

  // ─── Enviar mensaje ─────────────────────────────────────────────────────

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setReply(null);

    try {
      const body: Record<string, unknown> = { message: trimmed };
      if (assetContext) body.assetContext = assetContext;
      if (imageBase64) body.imageBase64 = imageBase64;
      if (imageMimeType) body.imageMimeType = imageMimeType;

      const res = await fetch("/api/designer-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = (await res.json()) as { reply?: string; error?: string };

      if (data.reply) {
        setReply(data.reply);
        // Scroll al área de respuesta
        setTimeout(() => {
          replyAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 50);
      } else {
        setReply(data.error ?? "Sin respuesta del asistente.");
      }
    } catch {
      setReply("No pude conectarme al asistente. Intenta de nuevo.");
    } finally {
      setLoading(false);
      setMessage("");
      clearImage();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <aside className="flex w-full flex-col rounded-[28px] bg-white/80 ring-1 ring-[color:var(--line)] lg:h-[calc(100vh-6rem)] lg:w-80 lg:shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[color:var(--line)] px-4 py-3">
        <span className="text-[color:var(--accent)]">
          <ChatIcon />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
          Asistente de producción
        </p>
      </div>

      {/* Área de respuesta */}
      <div className="flex-1 overflow-y-auto px-4 py-3" ref={replyAreaRef}>
        {reply ? (
          <div className="rounded-[16px] bg-[color:var(--background-soft)] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Asistente
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{reply}</p>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="max-w-[200px] text-center text-[11px] leading-5 text-[color:var(--muted)]">
              {assetContext
                ? `Contexto cargado: ${assetContext.name}`
                : "Escribe una pregunta sobre producción creativa con Adobe"}
            </p>
          </div>
        )}
      </div>

      {/* Preview de imagen adjunta */}
      {imagePreviewUrl && (
        <div className="flex items-center gap-2 border-t border-[color:var(--line)] px-4 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreviewUrl}
            alt="Imagen adjunta"
            className="h-12 w-12 rounded-lg object-cover ring-1 ring-[color:var(--line)]"
          />
          <p className="flex-1 truncate text-[11px] text-[color:var(--muted)]">Imagen adjunta</p>
          <button
            type="button"
            onClick={clearImage}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-bold leading-none hover:bg-red-600 transition"
            aria-label="Eliminar imagen"
          >
            ×
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[color:var(--line)] px-3 py-3">
        <div className="flex items-end gap-2">
          {/* Textarea */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            rows={2}
            maxLength={500}
            className="flex-1 resize-none rounded-[14px] bg-[color:var(--background-soft)] px-3 py-2 text-sm leading-6 placeholder:text-[color:var(--muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
          />

          {/* Botón adjuntar imagen */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--background-soft)] text-[color:var(--muted)] transition hover:text-[color:var(--accent-deep)] hover:bg-[color:var(--accent-soft)]"
            title="Adjuntar imagen"
            aria-label="Adjuntar imagen"
          >
            <PaperclipIcon />
          </button>

          {/* Botón enviar */}
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !message.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700 disabled:opacity-40"
            title="Enviar"
            aria-label="Enviar pregunta"
          >
            {loading ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <SendIcon />
            )}
          </button>
        </div>

        {/* Contador de caracteres */}
        <p className="mt-1 text-right text-[10px] text-[color:var(--muted)]">
          {message.length}/500
        </p>

        {/* Pista de carga */}
        {loading && (
          <p className="mt-1 text-center text-[11px] text-[color:var(--muted)]">
            Consultando...
          </p>
        )}

        {/* Input file oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          aria-label="Seleccionar imagen"
        />
      </div>
    </aside>
  );
}
