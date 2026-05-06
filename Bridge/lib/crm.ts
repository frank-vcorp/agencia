/**
 * IMPL-20260505-26
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-26_crm_ligero_operativo_y_seguimiento_minimo_v1.md
 * IMPL-20260505-27
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-27_vinculacion_explicita_lead_client_project_v1.md
 * IMPL-20260505-29
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-29_hardening_validacion_cruzada_crm_v1.md
 */
import { isSupabaseConfigured, supabaseEnv } from "./supabase";

// ─── Constantes de dominio ────────────────────────────────────────────────────

export const LEAD_STATUSES = [
  "nuevo",
  "en_seguimiento",
  "propuesta_enviada",
  "cerrado_ganado",
  "cerrado_perdido"
] as const;

export const LEAD_SOURCE_CHANNELS = [
  "directo",
  "instagram",
  "whatsapp",
  "facebook",
  "referido",
  "sitio_web",
  "otro"
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadSourceChannel = (typeof LEAD_SOURCE_CHANNELS)[number];

export const leadStatusLabels: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  en_seguimiento: "En seguimiento",
  propuesta_enviada: "Propuesta enviada",
  cerrado_ganado: "Cerrado ganado",
  cerrado_perdido: "Cerrado perdido"
};

export const leadSourceChannelLabels: Record<LeadSourceChannel, string> = {
  directo: "Directo",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  referido: "Referido",
  sitio_web: "Sitio web",
  otro: "Otro"
};

export function leadStatusLabel(status: LeadStatus): string {
  return leadStatusLabels[status] ?? status;
}

export function leadSourceChannelLabel(channel: LeadSourceChannel): string {
  return leadSourceChannelLabels[channel] ?? channel;
}

/**
 * Regla de estado: devuelve los estados siguientes validos desde el estado actual.
 * El ciclo no es estrictamente lineal — cualquier lead puede cerrarse desde cualquier estado.
 */
export function nextLeadStatuses(current: LeadStatus): LeadStatus[] {
  if (current === "cerrado_ganado" || current === "cerrado_perdido") return [];
  return LEAD_STATUSES.filter((s) => s !== current);
}

// ─── Tipos de dominio ─────────────────────────────────────────────────────────

export type Lead = {
  id: string;
  tenantId: string;
  clientId: string | null;
  projectId: string | null;
  name: string;
  sourceChannel: LeadSourceChannel;
  requestedService: string;
  status: LeadStatus;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadNote = {
  id: string;
  tenantId: string;
  leadId: string;
  noteText: string;
  createdAt: string;
};

export type LeadWorkspace = {
  lead: Lead;
  notes: LeadNote[];
};

// ─── Tipos de vínculo comercial ─────────────────────────────────────────────

export type CrmClient = {
  id: string;
  name: string;
  status: string;
};

export type CrmProject = {
  id: string;
  clientId: string;
  name: string;
  status: string;
};

export type CrmLinkOptions = {
  clients: CrmClient[];
  projects: CrmProject[];
};

// ─── Validación de vínculos lead → client/project ───────────────────────────

/**
 * Resultado de la resolución del vínculo comercial de un lead.
 * IMPL-20260505-29
 */
export type LeadLinkResolution =
  | { ok: true; clientId: string | null; projectId: string | null }
  | { ok: false; error: string };

/**
 * Valida y resuelve la consistencia del vínculo clientId/projectId contra
 * listas reales de clientes y proyectos del tenant. Función pura y testeable.
 *
 * Comportamiento por caso:
 * - Sin vínculos: ok, ambos null.
 * - Solo clientId: valida que el cliente exista.
 * - Solo projectId: valida que el proyecto exista y resuelve su clientId automáticamente.
 * - Ambos: valida existencia de ambos y que el proyecto pertenezca al cliente.
 * IMPL-20260505-29
 */
export function resolveLeadLinksFromData(
  clients: CrmClient[],
  projects: CrmProject[],
  clientId: string | null | undefined,
  projectId: string | null | undefined
): LeadLinkResolution {
  const cid = clientId?.trim() || null;
  const pid = projectId?.trim() || null;

  if (!cid && !pid) return { ok: true, clientId: null, projectId: null };

  if (pid) {
    const project = projects.find((p) => p.id === pid);
    if (!project) {
      return { ok: false, error: `El proyecto '${pid}' no existe en este tenant.` };
    }
    if (cid) {
      const client = clients.find((c) => c.id === cid);
      if (!client) {
        return { ok: false, error: `El cliente '${cid}' no existe en este tenant.` };
      }
      if (project.clientId !== cid) {
        return { ok: false, error: `El proyecto '${project.name}' no pertenece al cliente seleccionado.` };
      }
      return { ok: true, clientId: cid, projectId: pid };
    }
    // Solo projectId: auto-resolver clientId desde el proyecto
    return { ok: true, clientId: project.clientId, projectId: pid };
  }

  // Solo clientId
  const client = clients.find((c) => c.id === cid);
  if (!client) {
    return { ok: false, error: `El cliente '${cid}' no existe en este tenant.` };
  }
  return { ok: true, clientId: cid, projectId: null };
}

// ─── Tipos de filas DB ────────────────────────────────────────────────────────

type CrmClientRow = { id: string; name: string; status: string };
type CrmProjectRow = { id: string; client_id: string; name: string; status: string };

type LeadRow = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  project_id: string | null;
  name: string;
  source_channel: string;
  requested_service: string;
  status: string;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
};

type LeadNoteRow = {
  id: string;
  tenant_id: string;
  lead_id: string;
  note_text: string;
  created_at: string;
};

type TenantRow = { id: string; slug: string };

// ─── Normalización ────────────────────────────────────────────────────────────

function normalizeLeadRow(row: LeadRow): Lead {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    projectId: row.project_id,
    name: row.name,
    sourceChannel: row.source_channel as LeadSourceChannel,
    requestedService: row.requested_service,
    status: row.status as LeadStatus,
    nextFollowUpAt: row.next_follow_up_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeLeadNoteRow(row: LeadNoteRow): LeadNote {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    leadId: row.lead_id,
    noteText: row.note_text,
    createdAt: row.created_at
  };
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

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

async function getTenantId(slug = supabaseEnv.defaultTenant): Promise<string | null> {
  const params = new URLSearchParams({ select: "id,slug", slug: `eq.${slug}`, limit: "1" });
  const rows = await postgrest<TenantRow[]>(`tenants?${params.toString()}`, { method: "GET" });
  return rows[0]?.id ?? null;
}

/**
 * Obtiene clientes y proyectos del tenant para validación de vínculos.
 * Uso interno de resolveLeadLinks. IMPL-20260505-29
 */
async function fetchCrmLinkDataForTenant(tenantId: string): Promise<{ clients: CrmClient[]; projects: CrmProject[] }> {
  const clientParams = new URLSearchParams({
    select: "id,name,status",
    tenant_id: `eq.${tenantId}`,
    order: "name.asc"
  });
  const projectParams = new URLSearchParams({
    select: "id,client_id,name,status",
    tenant_id: `eq.${tenantId}`,
    order: "name.asc"
  });
  const [clientRows, projectRows] = await Promise.all([
    postgrest<CrmClientRow[]>(`clients?${clientParams.toString()}`, { method: "GET" }),
    postgrest<CrmProjectRow[]>(`projects?${projectParams.toString()}`, { method: "GET" })
  ]);
  return {
    clients: clientRows.map((r) => ({ id: r.id, name: r.name, status: r.status })),
    projects: projectRows.map((r) => ({ id: r.id, clientId: r.client_id, name: r.name, status: r.status }))
  };
}

/**
 * Resuelve y valida el vínculo clientId/projectId contra datos reales del tenant.
 * IMPL-20260505-29
 */
async function resolveLeadLinks(
  tenantId: string,
  clientId: string | null | undefined,
  projectId: string | null | undefined
): Promise<LeadLinkResolution> {
  const cid = clientId?.trim() || null;
  const pid = projectId?.trim() || null;
  if (!cid && !pid) return { ok: true, clientId: null, projectId: null };
  const { clients, projects } = await fetchCrmLinkDataForTenant(tenantId);
  return resolveLeadLinksFromData(clients, projects, cid, pid);
}

// ─── Funciones públicas — lectura ─────────────────────────────────────────────

/**
 * Devuelve las opciones de cliente y proyecto disponibles para vincular a un lead.
 * Retorna listas vacías si Supabase no está configurado o si no hay tenant.
 * IMPL-20260505-27
 */
export async function getCrmLinkOptionsForDefaultTenant(): Promise<CrmLinkOptions> {
  if (!isSupabaseConfigured) return { clients: [], projects: [] };

  const tenantId = await getTenantId();
  if (!tenantId) return { clients: [], projects: [] };

  const clientParams = new URLSearchParams({
    select: "id,name,status",
    tenant_id: `eq.${tenantId}`,
    order: "name.asc"
  });
  const projectParams = new URLSearchParams({
    select: "id,client_id,name,status",
    tenant_id: `eq.${tenantId}`,
    order: "name.asc"
  });

  const [clientRows, projectRows] = await Promise.all([
    postgrest<CrmClientRow[]>(`clients?${clientParams.toString()}`, { method: "GET" }),
    postgrest<CrmProjectRow[]>(`projects?${projectParams.toString()}`, { method: "GET" })
  ]);

  return {
    clients: clientRows.map((r) => ({ id: r.id, name: r.name, status: r.status })),
    projects: projectRows.map((r) => ({ id: r.id, clientId: r.client_id, name: r.name, status: r.status }))
  };
}

export async function getLeadsForDefaultTenant(): Promise<Lead[]> {
  if (!isSupabaseConfigured) return [];

  const tenantId = await getTenantId();
  if (!tenantId) return [];

  return getLeadsByTenant(tenantId);
}

export async function getLeadsByTenant(tenantId: string): Promise<Lead[]> {
  const params = new URLSearchParams({
    select:
      "id,tenant_id,client_id,project_id,name,source_channel,requested_service," +
      "status,next_follow_up_at,created_at,updated_at",
    tenant_id: `eq.${tenantId}`,
    order: "created_at.desc"
  });
  const rows = await postgrest<LeadRow[]>(`leads?${params.toString()}`, { method: "GET" });
  return rows.map(normalizeLeadRow);
}

export async function getNotesByLead(leadId: string): Promise<LeadNote[]> {
  const params = new URLSearchParams({
    select: "id,tenant_id,lead_id,note_text,created_at",
    lead_id: `eq.${leadId}`,
    order: "created_at.asc"
  });
  const rows = await postgrest<LeadNoteRow[]>(`lead_notes?${params.toString()}`, { method: "GET" });
  return rows.map(normalizeLeadNoteRow);
}

export async function getLeadWorkspace(leadId: string): Promise<LeadWorkspace | null> {
  if (!isSupabaseConfigured) return null;

  const params = new URLSearchParams({
    select:
      "id,tenant_id,client_id,project_id,name,source_channel,requested_service," +
      "status,next_follow_up_at,created_at,updated_at",
    id: `eq.${leadId}`,
    limit: "1"
  });
  const rows = await postgrest<LeadRow[]>(`leads?${params.toString()}`, { method: "GET" });
  if (!rows[0]) return null;

  const lead = normalizeLeadRow(rows[0]);
  const notes = await getNotesByLead(leadId);

  return { lead, notes };
}

// ─── Funciones públicas — escritura ──────────────────────────────────────────

export type CreateLeadInput = {
  name: string;
  sourceChannel: LeadSourceChannel;
  requestedService: string;
  /** Vínculo explícito a cliente existente. Nullable — sin default requerido. IMPL-20260505-27 */
  clientId?: string | null;
  /** Vínculo explícito a proyecto existente. Nullable — sin default requerido. IMPL-20260505-27 */
  projectId?: string | null;
};

export async function createLeadForDefaultTenant(input: CreateLeadInput): Promise<Lead | null> {
  if (!isSupabaseConfigured) return null;

  const tenantId = await getTenantId();
  if (!tenantId) return null;

  // Validación cruzada server-side — IMPL-20260505-29
  const linkResult = await resolveLeadLinks(tenantId, input.clientId, input.projectId);
  if (!linkResult.ok) {
    throw new Error(linkResult.error);
  }

  const payload: Record<string, string | null> = {
    tenant_id: tenantId,
    name: input.name.trim(),
    source_channel: input.sourceChannel,
    requested_service: input.requestedService.trim(),
    status: "nuevo",
    client_id: linkResult.clientId,
    project_id: linkResult.projectId
  };

  const body = JSON.stringify(payload);

  const rows = await postgrest<LeadRow[]>("leads", { method: "POST", body });
  return rows[0] ? normalizeLeadRow(rows[0]) : null;
}

export async function updateLeadStatus(leadId: string, status: LeadStatus): Promise<void> {
  if (!isSupabaseConfigured) return;

  const body = JSON.stringify({
    status,
    updated_at: new Date().toISOString()
  });

  await postgrest<LeadRow[]>(`leads?id=eq.${leadId}`, { method: "PATCH", body });
}

export type AddLeadNoteInput = {
  tenantId: string;
  leadId: string;
  noteText: string;
};

export async function addLeadNote(input: AddLeadNoteInput): Promise<LeadNote | null> {
  if (!isSupabaseConfigured) return null;

  const body = JSON.stringify({
    tenant_id: input.tenantId,
    lead_id: input.leadId,
    note_text: input.noteText.trim()
  });

  const rows = await postgrest<LeadNoteRow[]>("lead_notes", { method: "POST", body });
  return rows[0] ? normalizeLeadNoteRow(rows[0]) : null;
}

// ─── Métricas para shell ──────────────────────────────────────────────────────

export type CrmMetrics = {
  totalLeads: number;
  activeLeads: number;
  label: string;
};

export function buildCrmMetrics(leads: Lead[]): CrmMetrics {
  const activeStatuses: LeadStatus[] = ["nuevo", "en_seguimiento", "propuesta_enviada"];
  const activeLeads = leads.filter((l) => activeStatuses.includes(l.status)).length;

  let label: string;
  if (leads.length === 0) {
    label = "Sin leads";
  } else if (activeLeads > 0) {
    label = `${activeLeads} activo${activeLeads !== 1 ? "s" : ""}`;
  } else {
    label = `${leads.length} cerrado${leads.length !== 1 ? "s" : ""}`;
  }

  return { totalLeads: leads.length, activeLeads, label };
}
