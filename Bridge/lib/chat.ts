/**
 * IMPL-20260506-28
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-28_chat_contextual_por_entidad_v1.md
 *
 * Chat contextual por entidad V1.
 * Módulo desacoplado del dominio briefing.
 * Patrón: patrón postgrest() de crm.ts + actor_label fijo "Operador" para el primer corte.
 */
import { isSupabaseConfigured, supabaseEnv } from "./supabase";

// ─── Constantes de dominio ────────────────────────────────────────────────────

export const ENTITY_TYPES = ["lead", "brief", "quotation", "asset"] as const;
export const ACTOR_ROLES = ["operator", "designer", "client", "agent"] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];
export type ActorRole = (typeof ACTOR_ROLES)[number];

// ─── Tipos de dominio ─────────────────────────────────────────────────────────

export type ConversationThread = {
  id: string;
  tenantId: string;
  entityType: EntityType;
  entityId: string;
  createdAt: string;
  updatedAt: string;
};

export type ConversationMessage = {
  id: string;
  threadId: string;
  tenantId: string;
  actorRole: ActorRole;
  actorLabel: string;
  messageText: string;
  createdAt: string;
};

export type LeadChat = {
  thread: ConversationThread | null;
  messages: ConversationMessage[];
};

// ─── Funciones puras de dominio ───────────────────────────────────────────────

export function isValidEntityType(value: string): value is EntityType {
  return (ENTITY_TYPES as readonly string[]).includes(value);
}

export function isValidActorRole(value: string): value is ActorRole {
  return (ACTOR_ROLES as readonly string[]).includes(value);
}

export function actorRoleLabel(role: ActorRole): string {
  const labels: Record<ActorRole, string> = {
    operator: "Operador",
    designer: "Diseñador",
    client: "Cliente",
    agent: "Agente"
  };
  return labels[role];
}

export function formatMessageTimestamp(isoString: string): string {
  return new Date(isoString).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ─── Tipos de filas DB ────────────────────────────────────────────────────────

type ThreadRow = {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  tenant_id: string;
  actor_role: string;
  actor_label: string;
  message_text: string;
  created_at: string;
};

type TenantRow = { id: string; slug: string };

// ─── Normalización ────────────────────────────────────────────────────────────

function normalizeThreadRow(row: ThreadRow): ConversationThread {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    entityType: row.entity_type as EntityType,
    entityId: row.entity_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeMessageRow(row: MessageRow): ConversationMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    tenantId: row.tenant_id,
    actorRole: row.actor_role as ActorRole,
    actorLabel: row.actor_label,
    messageText: row.message_text,
    createdAt: row.created_at
  };
}

// ─── HTTP helper (mismo patrón que crm.ts) ────────────────────────────────────

function getServerApiKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseEnv.anonKey;
}

async function postgrest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${supabaseEnv.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: getServerApiKey(),
      Authorization: `Bearer ${getServerApiKey()}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`supabase_postgrest_error:${response.status}`);
  }

  if (response.status === 204) {
    return [] as T;
  }

  return (await response.json()) as T;
}

async function getDefaultTenantId(): Promise<string | null> {
  const slug = supabaseEnv.defaultTenant;
  const params = new URLSearchParams({ select: "id,slug", slug: `eq.${slug}`, limit: "1" });
  const rows = await postgrest<TenantRow[]>(`tenants?${params.toString()}`, { method: "GET" });
  return rows[0]?.id ?? null;
}

// ─── Funciones públicas — lectura ─────────────────────────────────────────────

/**
 * Obtiene el thread de conversación de una entidad por tipo e id.
 * Devuelve null si no existe aún (vacío honesto).
 */
export async function getThreadForEntity(
  tenantId: string,
  entityType: EntityType,
  entityId: string
): Promise<ConversationThread | null> {
  const params = new URLSearchParams({
    select: "id,tenant_id,entity_type,entity_id,created_at,updated_at",
    tenant_id: `eq.${tenantId}`,
    entity_type: `eq.${entityType}`,
    entity_id: `eq.${entityId}`,
    limit: "1"
  });
  const rows = await postgrest<ThreadRow[]>(`conversation_threads?${params.toString()}`, { method: "GET" });
  return rows[0] ? normalizeThreadRow(rows[0]) : null;
}

/**
 * Obtiene los mensajes de un thread ordenados cronológicamente.
 */
export async function getMessagesByThread(threadId: string): Promise<ConversationMessage[]> {
  const params = new URLSearchParams({
    select: "id,thread_id,tenant_id,actor_role,actor_label,message_text,created_at",
    thread_id: `eq.${threadId}`,
    order: "created_at.asc"
  });
  const rows = await postgrest<MessageRow[]>(`conversation_messages?${params.toString()}`, { method: "GET" });
  return rows.map(normalizeMessageRow);
}

/**
 * Obtiene el chat completo de un lead: thread (null si no existe) + mensajes.
 */
export async function getLeadChat(leadId: string): Promise<LeadChat> {
  if (!isSupabaseConfigured) return { thread: null, messages: [] };

  const tenantId = await getDefaultTenantId();
  if (!tenantId) return { thread: null, messages: [] };

  const thread = await getThreadForEntity(tenantId, "lead", leadId);
  if (!thread) return { thread: null, messages: [] };

  const messages = await getMessagesByThread(thread.id);
  return { thread, messages };
}

// ─── Funciones públicas — escritura ──────────────────────────────────────────

/**
 * Obtiene o crea el thread de conversación para una entidad.
 * Usa upsert con clave única (tenant_id, entity_type, entity_id).
 */
export async function getOrCreateThread(
  tenantId: string,
  entityType: EntityType,
  entityId: string
): Promise<ConversationThread> {
  const existing = await getThreadForEntity(tenantId, entityType, entityId);
  if (existing) return existing;

  const body = JSON.stringify({
    tenant_id: tenantId,
    entity_type: entityType,
    entity_id: entityId
  });

  const rows = await postgrest<ThreadRow[]>("conversation_threads", { method: "POST", body });

  if (!rows[0]) {
    throw new Error("chat:thread_create_failed");
  }

  return normalizeThreadRow(rows[0]);
}

export type AppendMessageInput = {
  threadId: string;
  tenantId: string;
  actorRole: ActorRole;
  actorLabel: string;
  messageText: string;
};

/**
 * Agrega un mensaje a un thread existente.
 */
export async function appendMessage(input: AppendMessageInput): Promise<ConversationMessage> {
  const body = JSON.stringify({
    thread_id: input.threadId,
    tenant_id: input.tenantId,
    actor_role: input.actorRole,
    actor_label: input.actorLabel.trim(),
    message_text: input.messageText.trim()
  });

  const rows = await postgrest<MessageRow[]>("conversation_messages", { method: "POST", body });

  if (!rows[0]) {
    throw new Error("chat:message_create_failed");
  }

  return normalizeMessageRow(rows[0]);
}

/**
 * Publicar un mensaje en el chat de un lead.
 * Crea el thread si no existe todavía.
 * Actor por defecto: operador del sistema en este primer corte.
 */
export async function appendLeadMessage(
  leadId: string,
  tenantId: string,
  messageText: string
): Promise<ConversationMessage> {
  const thread = await getOrCreateThread(tenantId, "lead", leadId);

  return appendMessage({
    threadId: thread.id,
    tenantId,
    actorRole: "operator",
    actorLabel: "Operador",
    messageText
  });
}
