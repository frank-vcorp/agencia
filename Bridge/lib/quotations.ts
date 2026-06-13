/**
 * IMPL-20260505-23
 * Respaldo: context/COTIZACIONES_VERSIONADAS_V1.md, context/SPECs/SPEC_ARCH-20260505-23_cotizaciones_versionadas_v1.md, context/MODELO_DATOS_MULTITENANT_V1.md, context/CONTRATOS_AGENTES_Y_VSCODE_V1.md
 * IMPL-20260513-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-03_pdf_cotizaciones_y_propuestas_v1.md
 */
import { isSupabaseConfigured, supabaseEnv } from "./supabase";
import { resolveTenantIdBySlug } from "./tenant";

export type QuotationStatus = "draft" | "sent" | "approved" | "invoiced" | "paid" | "rejected";

export type QuotationVersionAdminStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "rejected"
  | "superseded";

export type CommercialSummary = {
  totalEstimado: string;
  plazo: string;
  alcance: string;
  incluye: string[];
  nota: string;
};

export type QuotationVersion = {
  id: string;
  tenantId: string;
  quotationId: string;
  versionNumber: number;
  title: string;
  bodyMarkdown: string;
  commercialSummaryJson: CommercialSummary | null;
  adminStatus: QuotationVersionAdminStatus;
  internalNote: string | null;
  createdByUserId: string | null;
  createdByAgentId: string | null;
  createdAt: string;
};

export type Quotation = {
  id: string;
  tenantId: string;
  clientId: string;
  projectId: string;
  briefId: string | null;
  status: QuotationStatus;
  activeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuotationWorkspace = {
  quotation: Quotation;
  activeVersion: QuotationVersion | null;
  versions: QuotationVersion[];
};

type QuotationRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  project_id: string;
  brief_id: string | null;
  status: QuotationStatus;
  active_version_id: string | null;
  created_at: string;
  updated_at: string;
};

type QuotationVersionRow = {
  id: string;
  tenant_id: string;
  quotation_id: string;
  version_number: number;
  title: string;
  body_markdown: string;
  commercial_summary_json: CommercialSummary | null;
  admin_status: QuotationVersionAdminStatus;
  internal_note: string | null;
  created_by_user_id: string | null;
  created_by_agent_id: string | null;
  created_at: string;
};

export const quotationStatusLabels: Record<QuotationStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  approved: "Aprobada",
  invoiced: "Facturada",
  paid: "Pagada",
  rejected: "Rechazada"
};

export const versionAdminStatusLabels: Record<QuotationVersionAdminStatus, string> = {
  draft: "Borrador",
  in_review: "En revision",
  approved: "Aprobada",
  rejected: "Rechazada",
  superseded: "Reemplazada"
};

export function quotationStatusLabel(status: QuotationStatus): string {
  return quotationStatusLabels[status] ?? status;
}

export function versionAdminStatusLabel(status: QuotationVersionAdminStatus): string {
  return versionAdminStatusLabels[status] ?? status;
}

export function nextVersionNumber(versions: QuotationVersion[]): number {
  if (versions.length === 0) {
    return 1;
  }

  return Math.max(...versions.map((v) => v.versionNumber)) + 1;
}

function normalizeVersionRow(row: QuotationVersionRow): QuotationVersion {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    quotationId: row.quotation_id,
    versionNumber: row.version_number,
    title: row.title,
    bodyMarkdown: row.body_markdown,
    commercialSummaryJson: row.commercial_summary_json,
    adminStatus: row.admin_status,
    internalNote: row.internal_note,
    createdByUserId: row.created_by_user_id,
    createdByAgentId: row.created_by_agent_id,
    createdAt: row.created_at
  };
}

function normalizeQuotationRow(row: QuotationRow): Quotation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    projectId: row.project_id,
    briefId: row.brief_id,
    status: row.status,
    activeVersionId: row.active_version_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getServerApiKey() {
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

/**
 * IMPL-20260526-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-06_unificacion_resolucion_tenant_dominio_bridge_v1.md
 */
async function getTenantId(slug = supabaseEnv.defaultTenant): Promise<string | null> {
  return resolveTenantIdBySlug(slug);
}

async function getLatestQuotationRow(tenantId: string): Promise<QuotationRow | null> {
  const params = new URLSearchParams({
    select:
      "id,tenant_id,client_id,project_id,brief_id,status,active_version_id,created_at,updated_at",
    tenant_id: `eq.${tenantId}`,
    order: "created_at.desc",
    limit: "1"
  });
  const rows = await postgrest<QuotationRow[]>(`quotations?${params.toString()}`, {
    method: "GET"
  });

  return rows[0] ?? null;
}

async function getQuotationVersionRows(quotationId: string): Promise<QuotationVersionRow[]> {
  const params = new URLSearchParams({
    select:
      "id,tenant_id,quotation_id,version_number,title,body_markdown,commercial_summary_json,admin_status,internal_note,created_by_user_id,created_by_agent_id,created_at",
    quotation_id: `eq.${quotationId}`,
    order: "version_number.asc"
  });
  return postgrest<QuotationVersionRow[]>(`quotation_versions?${params.toString()}`, {
    method: "GET"
  });
}

export async function getQuotationWorkspace(
  slug = supabaseEnv.defaultTenant
): Promise<QuotationWorkspace | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const tenantId = await getTenantId(slug);

  if (!tenantId) {
    return null;
  }

  const quotationRow = await getLatestQuotationRow(tenantId);

  if (!quotationRow) {
    return null;
  }

  const versionRows = await getQuotationVersionRows(quotationRow.id);
  const versions = versionRows.map(normalizeVersionRow);
  const quotation = normalizeQuotationRow(quotationRow);
  const activeVersion =
    versions.find((v) => v.id === quotation.activeVersionId) ?? null;

  return { quotation, activeVersion, versions };
}

export async function createQuotationDraftVersion(
  quotationId: string,
  tenantId: string,
  title: string,
  bodyMarkdown: string,
  versionNumber: number
): Promise<QuotationVersion> {
  const rows = await postgrest<QuotationVersionRow[]>("quotation_versions", {
    method: "POST",
    body: JSON.stringify({
      quotation_id: quotationId,
      tenant_id: tenantId,
      version_number: versionNumber,
      title: title.trim(),
      body_markdown: bodyMarkdown.trim(),
      admin_status: "draft"
    })
  });

  const row = rows[0];

  if (!row) {
    throw new Error("quotations:create_version_failed");
  }

  return normalizeVersionRow(row);
}

/**
 * Crea una nueva cotización para un proyecto.
 * Lanza Error('project_not_found') si el proyecto no existe en el tenant.
 */
export async function createQuotationForProject(
  tenantId: string,
  projectId: string,
  clientId: string,
  briefId?: string | null
): Promise<{ id: string; status: string }> {
  const rows = await postgrest<{ id: string; status: string }[]>("quotations", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: tenantId,
      project_id: projectId,
      client_id: clientId,
      brief_id: briefId ?? null,
      status: "draft"
    })
  });

  const row = rows[0];
  if (!row) throw new Error("quotations:create_failed");
  return row;
}

export async function setQuotationActiveVersion(
  quotationId: string,
  versionId: string
): Promise<void> {
  await postgrest<QuotationRow[]>(
    `quotations?id=eq.${encodeURIComponent(quotationId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ active_version_id: versionId })
    }
  );
}

// ─── Exportación PDF (IMPL-20260513-03) ────────────────────────────────────────

type ProjectExportRow = {
  id: string;
  name: string;
  client_id: string | null;
};

type ClientExportRow = {
  id: string;
  name: string;
};

export type QuotationExportData = {
  quotationId: string;
  projectId: string;
  projectName: string;
  clientName: string;
  version: QuotationVersion;
  generatedAt: string;
};

/**
 * Resuelve todos los datos necesarios para generar el PDF de la cotización vigente
 * de un proyecto. Retorna null si no hay cotización o no hay versión activa.
 */
export async function getActiveQuotationExportData(
  projectId: string,
  tenantSlug = supabaseEnv.defaultTenant
): Promise<QuotationExportData | null> {
  if (!isSupabaseConfigured) return null;

  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return null;

  // Cotización del proyecto
  const qParams = new URLSearchParams({
    select:
      "id,tenant_id,client_id,project_id,brief_id,status,active_version_id,created_at,updated_at",
    project_id: `eq.${projectId}`,
    tenant_id: `eq.${tenantId}`,
    order: "created_at.desc",
    limit: "1"
  });
  const quotationRows = await postgrest<QuotationRow[]>(
    `quotations?${qParams.toString()}`,
    { method: "GET" }
  ).catch(() => [] as QuotationRow[]);

  const quotationRow = quotationRows[0];
  if (!quotationRow?.active_version_id) return null;

  // Versión activa
  const vParams = new URLSearchParams({
    select:
      "id,tenant_id,quotation_id,version_number,title,body_markdown,commercial_summary_json,admin_status,internal_note,created_by_user_id,created_by_agent_id,created_at",
    id: `eq.${quotationRow.active_version_id}`,
    limit: "1"
  });
  const versionRows = await postgrest<QuotationVersionRow[]>(
    `quotation_versions?${vParams.toString()}`,
    { method: "GET" }
  ).catch(() => [] as QuotationVersionRow[]);

  const versionRow = versionRows[0];
  if (!versionRow) return null;

  // Nombre del proyecto
  const projectParams = new URLSearchParams({
    select: "id,name,client_id",
    id: `eq.${projectId}`,
    tenant_id: `eq.${tenantId}`,
    limit: "1"
  });
  const projectRows = await postgrest<ProjectExportRow[]>(
    `projects?${projectParams.toString()}`,
    { method: "GET" }
  ).catch(() => [] as ProjectExportRow[]);

  const projectRow = projectRows[0];

  // Nombre del cliente
  let clientName = "Cliente";
  if (projectRow?.client_id) {
    const clientParams = new URLSearchParams({
      select: "id,name",
      id: `eq.${projectRow.client_id}`,
      tenant_id: `eq.${tenantId}`,
      limit: "1"
    });
    const clientRows = await postgrest<ClientExportRow[]>(
      `clients?${clientParams.toString()}`,
      { method: "GET" }
    ).catch(() => [] as ClientExportRow[]);
    clientName = clientRows[0]?.name ?? "Cliente";
  }

  return {
    quotationId: quotationRow.id,
    projectId,
    projectName: projectRow?.name ?? "Proyecto",
    clientName,
    version: normalizeVersionRow(versionRow),
    generatedAt: new Date().toISOString()
  };
}

/**
 * Genera un nombre de archivo estable para el PDF de cotización.
 * Formato: cotizacion-[client]-[project]-v[version].pdf
 */
export function buildPdfFilename(
  clientName: string,
  projectName: string,
  versionNumber: number
): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return `cotizacion-${slug(clientName)}-${slug(projectName)}-v${versionNumber}.pdf`;
}

/**
 * IMPL-20260526-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
export async function getTenantIdBySlug(slug: string): Promise<string | null> {
  return getTenantId(slug);
}

/**
 * IMPL-20260526-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 * IMPL-ARCH-20260612-05
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-05_gestion_clientes_crud_detalle_entidades_relacionadas.md
 * Acepta filtro opcional `clientId` para alimentar la pestaña de cotizaciones
 * dentro de la vista de detalle del cliente.
 */
export async function getQuotationsByTenant(
  tenantId: string,
  clientId?: string
): Promise<
  Array<{
    id: string;
    tenant_id: string;
    client_id: string;
    project_id: string;
    brief_id: string | null;
    status: string;
    active_version_id: string | null;
    created_at: string;
    updated_at: string;
  }>
> {
  const params = new URLSearchParams({
    select: "id,tenant_id,client_id,project_id,brief_id,status,active_version_id,created_at,updated_at",
    tenant_id: `eq.${tenantId}`,
    order: "created_at.desc"
  });
  if (clientId) {
    params.set("client_id", `eq.${clientId}`);
  }

  return postgrest<
    Array<{
      id: string;
      tenant_id: string;
      client_id: string;
      project_id: string;
      brief_id: string | null;
      status: string;
      active_version_id: string | null;
      created_at: string;
      updated_at: string;
    }>
  >(`quotations?${params.toString()}`, {
    method: "GET"
  });
}

/**
 * Helper semántico para el listado de cotizaciones filtrado por cliente.
 * Útil para la pestaña de cotizaciones dentro del detalle de cliente.
 * IMPL-ARCH-20260612-05
 */
export async function getQuotationsByClient(
  tenantId: string,
  clientId: string
): ReturnType<typeof getQuotationsByTenant> {
  return getQuotationsByTenant(tenantId, clientId);
}

/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
export async function getQuotationById(
  tenantId: string,
  quotationId: string
): Promise<Quotation | null> {
  const params = new URLSearchParams({
    select: "id,tenant_id,client_id,project_id,brief_id,status,active_version_id,created_at,updated_at",
    tenant_id: `eq.${tenantId}`,
    id: `eq.${quotationId}`,
    limit: "1"
  });

  const rows = await postgrest<QuotationRow[]>(`quotations?${params.toString()}`, {
    method: "GET"
  });

  return rows[0] ? normalizeQuotationRow(rows[0]) : null;
}

/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
export async function updateQuotationById(
  tenantId: string,
  quotationId: string,
  patch: Partial<{
    status: QuotationStatus;
    active_version_id: string | null;
    brief_id: string | null;
  }>
): Promise<Quotation | null> {
  const params = new URLSearchParams({
    tenant_id: `eq.${tenantId}`,
    id: `eq.${quotationId}`
  });

  const rows = await postgrest<QuotationRow[]>(`quotations?${params.toString()}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });

  return rows[0] ? normalizeQuotationRow(rows[0]) : null;
}
