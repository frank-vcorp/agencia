"use client";
/**
 * IMPL-20260612-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-01_ux_chat_bubbles_briefs_v1.md
 *
 * Vista de chat tipica (WhatsApp/ Messenger) para mostrar mensajes de conversacion
 * dentro de la pagina de briefs. Burbujas izquierda/derecha, sin cajas gigantes.
 * Agrupa mensajes consecutivos del mismo autor para evitar repetir headers.
 */
import { useEffect, useMemo, useRef, useState } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ChatSide = "left" | "right";

export type ChatBubbleItem = {
  id: string;
  text: string;
  /** Quien envio el mensaje: client, assistant, operator, agent, designer */
  role: string;
  /** Etiqueta legible que se muestra en el header del grupo */
  actorLabel: string;
  /** ISO string de creacion */
  createdAt: string;
  /** Lado del bubble. Por defecto se infiere del role. */
  side?: ChatSide;
};

interface BriefChatBubblesProps {
  messages: ChatBubbleItem[];
  /** Altura maxima del area scrolleable. Default 520px. */
  maxHeight?: string;
  /** Indica si el autor es cliente (alinea a la derecha). Default: client, operator? false : true. */
  rightRoles?: string[];
  /** Header custom encima del chat */
  header?: React.ReactNode;
  /** Footer custom debajo del chat (formulario de input, etc.) */
  footer?: React.ReactNode;
  /** Mensaje vacio */
  emptyState?: React.ReactNode;
  /** className para el contenedor raiz */
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIME_FORMATTER = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit"
});

function formatTime(iso: string): string {
  try {
    return TIME_FORMATTER.format(new Date(iso));
  } catch {
    return "";
  }
}

function isRightRole(role: string, rightRoles: string[]): boolean {
  return rightRoles.includes(role.toLowerCase());
}

type BubbleGroup = {
  id: string;
  side: ChatSide;
  actorLabel: string;
  role: string;
  messages: ChatBubbleItem[];
  lastCreatedAt: string;
};

function groupConsecutive(messages: ChatBubbleItem[], rightRoles: string[]): BubbleGroup[] {
  const groups: BubbleGroup[] = [];
  for (const msg of messages) {
    const side: ChatSide = msg.side ?? (isRightRole(msg.role, rightRoles) ? "right" : "left");
    const last = groups[groups.length - 1];
    if (last && last.side === side && last.role === msg.role) {
      last.messages.push(msg);
      last.lastCreatedAt = msg.createdAt;
    } else {
      groups.push({
        id: msg.id,
        side,
        actorLabel: msg.actorLabel,
        role: msg.role,
        messages: [msg],
        lastCreatedAt: msg.createdAt
      });
    }
  }
  return groups;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function BriefChatBubbles({
  messages,
  maxHeight = "520px",
  rightRoles = ["client", "cliente", "user"],
  header,
  footer,
  emptyState,
  className
}: BriefChatBubblesProps) {
  const groups = useMemo(() => groupConsecutive(messages, rightRoles), [messages, rightRoles]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  // Auto-scroll al fondo cuando llegan mensajes nuevos (solo si el usuario ya estaba al fondo)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (stickToBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [groups.length, stickToBottom]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickToBottom(distanceFromBottom < 60);
  }

  return (
    <div className={`flex flex-col overflow-hidden rounded-[20px] border border-[color:var(--line)] bg-[color:var(--background-soft)]/60 ${className ?? ""}`}>
      {header}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3"
        style={{ maxHeight }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[120px] items-center justify-center">
            {emptyState ?? (
              <p className="text-center text-[11px] text-[color:var(--muted)]">
                Aun no hay mensajes en esta conversacion.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((group) => (
              <ChatGroup key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>

      {footer}
    </div>
  );
}

// ─── Grupo de mensajes consecutivos del mismo autor ──────────────────────────

function ChatGroup({ group }: { group: BubbleGroup }) {
  const isRight = group.side === "right";
  const bubbleColor = isRight
    ? "bg-[color:var(--accent)] text-white"
    : "bg-white text-[color:var(--foreground)] ring-1 ring-[color:var(--line)]";
  const radius = isRight
    ? "rounded-[18px] rounded-br-md"
    : "rounded-[18px] rounded-bl-md";

  return (
    <div className={`flex flex-col gap-1 ${isRight ? "items-end" : "items-start"}`}>
      <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {group.actorLabel}
      </p>
      <div className={`flex max-w-[88%] flex-col gap-1 ${isRight ? "items-end" : "items-start"}`}>
        {group.messages.map((msg, index) => {
          const isFirst = index === 0;
          const isLast = index === group.messages.length - 1;
          return (
            <div
              key={msg.id}
              className={`px-3 py-2 text-sm leading-6 ${bubbleColor} ${radius} break-words`}
              style={{ whiteSpace: "pre-wrap" }}
            >
              {msg.text}
              {isLast ? (
                <span
                  className={`ml-2 align-baseline text-[10px] ${
                    isRight ? "text-white/70" : "text-[color:var(--muted)]"
                  }`}
                >
                  {formatTime(msg.createdAt)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
