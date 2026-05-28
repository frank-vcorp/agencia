/**
 * IMPL-20260526-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-03_eliminacion_operativa_entidades_v1.md
 *
 * Capa central de eliminación operativa de entidades.
 * Centraliza lógica reusable para project, quotation, asset y brief.
 */

import { isSupabaseConfigured, supabaseEnv } from "./supabase";

// ─── Tipos de dominio ─────────────────────────────────────────────────────────

export type DeleteMode = "preview" | "execute";

export type DeleteReason =
  | "dato_erroneo"
  | "no_contratado"
  | "reset_pruebas"
  | "duplicado"
  | "otro";

export type EntityDeleteImpact = {
  direct: number;
  cascaded: number;
  detached: number;
};

export type EntityDeletePreview = {
  ok: true;
  mode: "preview";
  entityType: string;
  entityId: string;
  entityLabel: string;
  impact: EntityDeleteImpact;
  confirmationText: string;
};

export type EntityDeleteExecute = {
  ok: true;
  mode: "execute";
  deletedEntityId: string;
  deletedEntityType: string;
  deletedEntityLabel: string;
  impactSummary: EntityDeleteImpact;
  eventId: string;
  message: string;
};

export type EntityDeleteError = {
  ok: false;
  error: string;
};

export type EntityDeleteResult = EntityDeletePreview | EntityDeleteExecute | EntityDeleteError;

/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 */
export type EntitySoftDeleteResult = {
  ok: true;
  mode: "preview" | "execute";
  entityType: "client" | "lead" | "brief";
  entityId: string;
  entityLabel: string;
  blockedReason?: string;
  deletedAt?: string;
  purgesAt?: string;
  confirmationText?: string;
  eventId?: string;
  message?: string;
  activeProjects?: Array<{ id: string; name: string; status: string }>;
};

export type TrashItem = {
  entityType: "client" | "lead" | "brief";
  entityId: string;
  entityLabel: string;
  deletedAt: string;
  purgesAt: string;
  daysRemaining: number;
  canRestore: boolean;
};

export type ListTrashResult = {
  ok: true;
  items: TrashItem[];
  total: number;
};

export type RestoreEntityResult = {
  ok: true;
  entityType: string;
  entityId: string;
  entityLabel: string;
  restoredAt: string;
  message: string;
};

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
  if (!isSupabaseConfigured) {
    return null;
  }

  const params = new URLSearchParams({
    select: "id,slug",
    slug: `eq.${slug}`,
    limit: "1"
  });

  try {
    const rows = await postgrest<{ id: string; slug: string }[]>(`tenants?${params.toString()}`, {
      method: "GET"
    });
    return rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

const TRASH_RETENTION_DAYS = 30;

function addRetentionDate(isoDate: string): string {
  const value = new Date(isoDate);
  value.setUTCDate(value.getUTCDate() + TRASH_RETENTION_DAYS);
  return value.toISOString();
}

function computeDaysRemaining(deletedAtIso: string): number {
  const deletedAt = new Date(deletedAtIso).getTime();
  const now = Date.now();
  const elapsedDays = Math.floor((now - deletedAt) / (1000 * 60 * 60 * 24));
  return TRASH_RETENTION_DAYS - elapsedDays;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export async function previewDeleteProject(
  tenantId: string,
  projectId: string
): Promise<EntityDeletePreview | EntityDeleteError> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "supabase_no_configured" };
  }

  try {
    // Verificar pertenencia al tenant
    const projectParams = new URLSearchParams({
      select: "id,name,client_id,status",
      id: `eq.${projectId}`,
      tenant_id: `eq.${tenantId}`,
      limit: "1"
    });

    const projects = await postgrest<{ id: string; name: string; client_id: string; status: string }[]>(
      `projects?${projectParams.toString()}`,
      { method: "GET" }
    );

    if (projects.length === 0) {
      return { ok: false, error: "project_not_found" };
    }

    const project = projects[0];

    // Contar cotizaciones y activos
    const quotationParams = new URLSearchParams({
      select: "id",
      project_id: `eq.${projectId}`,
      limit: "1"
    });

    const quotations = await postgrest<{ id: string }[]>(`quotations?${quotationParams.toString()}`, {
      method: "GET"
    });

    const assetParams = new URLSearchParams({
      select: "id",
      project_id: `eq.${projectId}`,
      limit: "1"
    });

    const assets = await postgrest<{ id: string }[]>(`assets?${assetParams.toString()}`, {
      method: "GET"
    });

    // Briefs que se desvincularán (no se borran)
    const briefParams = new URLSearchParams({
      select: "id",
      project_id: `eq.${projectId}`,
      limit: "1"
    });

    const briefs = await postgrest<{ id: string }[]>(`briefs?${briefParams.toString()}`, {
      method: "GET"
    });

    const impact: EntityDeleteImpact = {
      direct: 1, // project
      cascaded: quotations.length + assets.length,
      detached: briefs.length
    };

    const confirmationText = `ELIMINAR PROYECTO ${project.name.toUpperCase()}`;

    return {
      ok: true,
      mode: "preview",
      entityType: "project",
      entityId: project.id,
      entityLabel: project.name,
      impact,
      confirmationText
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

export async function executeDeleteProject(
  tenantId: string,
  projectId: string,
  requestedByLabel: string,
  approvedByLabel: string,
  reason: string,
  confirmationText: string,
  previewConfirmationText: string
): Promise<EntityDeleteExecute | EntityDeleteError> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "supabase_no_configured" };
  }

  // Validar confirmación
  if (confirmationText !== previewConfirmationText) {
    return { ok: false, error: "confirmation_mismatch" };
  }

  try {
    // Verificar pertenencia al tenant
    const projectParams = new URLSearchParams({
      select: "id,name,client_id,status",
      id: `eq.${projectId}`,
      tenant_id: `eq.${tenantId}`,
      limit: "1"
    });

    const projects = await postgrest<{ id: string; name: string; client_id: string; status: string }[]>(
      `projects?${projectParams.toString()}`,
      { method: "GET" }
    );

    if (projects.length === 0) {
      return { ok: false, error: "project_not_found" };
    }

    const project = projects[0];

    // Contar impacto antes de borrar
    const quotationParams = new URLSearchParams({
      select: "id",
      project_id: `eq.${projectId}`,
      limit: "1"
    });

    const quotations = await postgrest<{ id: string }[]>(`quotations?${quotationParams.toString()}`, {
      method: "GET"
    });

    const assetParams = new URLSearchParams({
      select: "id",
      project_id: `eq.${projectId}`,
      limit: "1"
    });

    const assets = await postgrest<{ id: string }[]>(`assets?${assetParams.toString()}`, {
      method: "GET"
    });

    const briefParams = new URLSearchParams({
      select: "id",
      project_id: `eq.${projectId}`,
      limit: "1"
    });

    const briefs = await postgrest<{ id: string }[]>(`briefs?${briefParams.toString()}`, {
      method: "GET"
    });

    const impact: EntityDeleteImpact = {
      direct: 1,
      cascaded: quotations.length + assets.length,
      detached: briefs.length
    };

    // Borrar el proyecto (cascada sobre quotations y assets)
    const deleteParams = new URLSearchParams({
      id: `eq.${projectId}`
    });

    await postgrest<{ id: string }[]>(`projects?${deleteParams.toString()}`, {
      method: "DELETE"
    });

    // Registrar auditoría
    const auditParams = new URLSearchParams({
      select: "*"
    });

    const auditRow = await postgrest<{ id: string }[]>(`entity_delete_events?${auditParams.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        entity_type: "project",
        entity_id: projectId,
        entity_label: project.name,
        requested_by_label: requestedByLabel,
        approved_by_label: approvedByLabel,
        reason: reason,
        mode: "execute",
        impact_summary_json: {
          direct: impact.direct,
          cascaded: impact.cascaded,
          detached: impact.detached
        }
      })
    });

    return {
      ok: true,
      mode: "execute",
      deletedEntityId: projectId,
      deletedEntityType: "project",
      deletedEntityLabel: project.name,
      impactSummary: impact,
      eventId: auditRow[0]?.id ?? "",
      message: `Proyecto "${project.name}" eliminado con éxito dentro del tenant activo.`
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

// ─── Asset ────────────────────────────────────────────────────────────────────

export async function previewDeleteAsset(
  tenantId: string,
  assetId: string
): Promise<EntityDeletePreview | EntityDeleteError> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "supabase_no_configured" };
  }

  try {
    // Verificar pertenencia al tenant
    const assetParams = new URLSearchParams({
      select: "id,title,project_id,quotation_id,brief_id",
      id: `eq.${assetId}`,
      tenant_id: `eq.${tenantId}`,
      limit: "1"
    });

    const assets = await postgrest<{ id: string; title: string; project_id: string; quotation_id: string | null; brief_id: string | null }[]>(
      `assets?${assetParams.toString()}`,
      { method: "GET" }
    );

    if (assets.length === 0) {
      return { ok: false, error: "asset_not_found" };
    }

    const asset = assets[0];

    // Contar prompts, propuestas, evidencias, aprobaciones y sesiones
    const promptParams = new URLSearchParams({
      select: "id",
      asset_id: `eq.${assetId}`,
      limit: "1"
    });

    const prompts = await postgrest<{ id: string }[]>(`asset_prompt_versions?${promptParams.toString()}`, {
      method: "GET"
    });

    const proposalParams = new URLSearchParams({
      select: "id",
      asset_id: `eq.${assetId}`,
      limit: "1"
    });

    const proposals = await postgrest<{ id: string }[]>(`asset_proposals?${proposalParams.toString()}`, {
      method: "GET"
    });

    const evidenceParams = new URLSearchParams({
      select: "id",
      asset_id: `eq.${assetId}`,
      limit: "1"
    });

    const evidences = await postgrest<{ id: string }[]>(`asset_proposal_evidences?${evidenceParams.toString()}`, {
      method: "GET"
    });

    const approvalParams = new URLSearchParams({
      select: "id",
      asset_id: `eq.${assetId}`,
      limit: "1"
    });

    const approvals = await postgrest<{ id: string }[]>(`asset_client_approvals?${approvalParams.toString()}`, {
      method: "GET"
    });

    const sessionParams = new URLSearchParams({
      select: "id",
      asset_id: `eq.${assetId}`,
      limit: "1"
    });

    const sessions = await postgrest<{ id: string }[]>(`work_sessions?${sessionParams.toString()}`, {
      method: "GET"
    });

    const impact: EntityDeleteImpact = {
      direct: 1, // asset
      cascaded: prompts.length + proposals.length + evidences.length + approvals.length + sessions.length,
      detached: 0
    };

    const confirmationText = `ELIMINAR ACTIVO ${asset.title.toUpperCase()}`;

    return {
      ok: true,
      mode: "preview",
      entityType: "asset",
      entityId: asset.id,
      entityLabel: asset.title,
      impact,
      confirmationText
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

export async function executeDeleteAsset(
  tenantId: string,
  assetId: string,
  requestedByLabel: string,
  approvedByLabel: string,
  reason: string,
  confirmationText: string,
  previewConfirmationText: string
): Promise<EntityDeleteExecute | EntityDeleteError> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "supabase_no_configured" };
  }

  // Validar confirmación
  if (confirmationText !== previewConfirmationText) {
    return { ok: false, error: "confirmation_mismatch" };
  }

  try {
    // Verificar pertenencia al tenant
    const assetParams = new URLSearchParams({
      select: "id,title,project_id,quotation_id,brief_id",
      id: `eq.${assetId}`,
      tenant_id: `eq.${tenantId}`,
      limit: "1"
    });

    const assets = await postgrest<{ id: string; title: string; project_id: string; quotation_id: string | null; brief_id: string | null }[]>(
      `assets?${assetParams.toString()}`,
      { method: "GET" }
    );

    if (assets.length === 0) {
      return { ok: false, error: "asset_not_found" };
    }

    const asset = assets[0];

    // Contar impacto antes de borrar
    const promptParams = new URLSearchParams({
      select: "id",
      asset_id: `eq.${assetId}`,
      limit: "1"
    });

    const prompts = await postgrest<{ id: string }[]>(`asset_prompt_versions?${promptParams.toString()}`, {
      method: "GET"
    });

    const proposalParams = new URLSearchParams({
      select: "id",
      asset_id: `eq.${assetId}`,
      limit: "1"
    });

    const proposals = await postgrest<{ id: string }[]>(`asset_proposals?${proposalParams.toString()}`, {
      method: "GET"
    });

    const evidenceParams = new URLSearchParams({
      select: "id",
      asset_id: `eq.${assetId}`,
      limit: "1"
    });

    const evidences = await postgrest<{ id: string }[]>(`asset_proposal_evidences?${evidenceParams.toString()}`, {
      method: "GET"
    });

    const approvalParams = new URLSearchParams({
      select: "id",
      asset_id: `eq.${assetId}`,
      limit: "1"
    });

    const approvals = await postgrest<{ id: string }[]>(`asset_client_approvals?${approvalParams.toString()}`, {
      method: "GET"
    });

    const sessionParams = new URLSearchParams({
      select: "id",
      asset_id: `eq.${assetId}`,
      limit: "1"
    });

    const sessions = await postgrest<{ id: string }[]>(`work_sessions?${sessionParams.toString()}`, {
      method: "GET"
    });

    const impact: EntityDeleteImpact = {
      direct: 1,
      cascaded: prompts.length + proposals.length + evidences.length + approvals.length + sessions.length,
      detached: 0
    };

    // Borrar el activo (cascada sobre prompts, propuestas, evidencias, aprobaciones y sesiones)
    const deleteParams = new URLSearchParams({
      id: `eq.${assetId}`
    });

    await postgrest<{ id: string }[]>(`assets?${deleteParams.toString()}`, {
      method: "DELETE"
    });

    // Registrar auditoría
    const auditParams = new URLSearchParams({
      select: "*"
    });

    const auditRow = await postgrest<{ id: string }[]>(`entity_delete_events?${auditParams.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        entity_type: "asset",
        entity_id: assetId,
        entity_label: asset.title,
        requested_by_label: requestedByLabel,
        approved_by_label: approvedByLabel,
        reason: reason,
        mode: "execute",
        impact_summary_json: {
          direct: impact.direct,
          cascaded: impact.cascaded,
          detached: impact.detached
        }
      })
    });

    return {
      ok: true,
      mode: "execute",
      deletedEntityId: assetId,
      deletedEntityType: "asset",
      deletedEntityLabel: asset.title,
      impactSummary: impact,
      eventId: auditRow[0]?.id ?? "",
      message: `Activo "${asset.title}" eliminado con éxito.`
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

// ─── Quotation ────────────────────────────────────────────────────────────────

export async function previewDeleteQuotation(
  tenantId: string,
  quotationId: string
): Promise<EntityDeletePreview | EntityDeleteError> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "supabase_no_configured" };
  }

  try {
    // Verificar pertenencia al tenant
    const quotationParams = new URLSearchParams({
      select: "id,project_id,active_version_id",
      id: `eq.${quotationId}`,
      tenant_id: `eq.${tenantId}`,
      limit: "1"
    });

    const quotations = await postgrest<{ id: string; project_id: string; active_version_id: string | null }[]>(
      `quotations?${quotationParams.toString()}`,
      { method: "GET" }
    );

    if (quotations.length === 0) {
      return { ok: false, error: "quotation_not_found" };
    }

    const quotation = quotations[0];

    // Contar versiones
    const versionParams = new URLSearchParams({
      select: "id",
      quotation_id: `eq.${quotationId}`,
      limit: "1"
    });

    const versions = await postgrest<{ id: string }[]>(`quotation_versions?${versionParams.toString()}`, {
      method: "GET"
    });

    // Contar activos que referencian esta cotización
    const assetParams = new URLSearchParams({
      select: "id",
      quotation_id: `eq.${quotationId}`,
      limit: "1"
    });

    const assets = await postgrest<{ id: string }[]>(`assets?${assetParams.toString()}`, {
      method: "GET"
    });

    const impact: EntityDeleteImpact = {
      direct: 1, // quotation
      cascaded: versions.length,
      detached: assets.length
    };

    const confirmationText = `ELIMINAR COTIZACIÓN ${quotation.id}`;

    return {
      ok: true,
      mode: "preview",
      entityType: "quotation",
      entityId: quotation.id,
      entityLabel: `Cotización ${quotation.id}`,
      impact,
      confirmationText
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

export async function executeDeleteQuotation(
  tenantId: string,
  quotationId: string,
  requestedByLabel: string,
  approvedByLabel: string,
  reason: string,
  confirmationText: string,
  previewConfirmationText: string
): Promise<EntityDeleteExecute | EntityDeleteError> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "supabase_no_configured" };
  }

  // Validar confirmación
  if (confirmationText !== previewConfirmationText) {
    return { ok: false, error: "confirmation_mismatch" };
  }

  try {
    // Verificar pertenencia al tenant
    const quotationParams = new URLSearchParams({
      select: "id,project_id,active_version_id",
      id: `eq.${quotationId}`,
      tenant_id: `eq.${tenantId}`,
      limit: "1"
    });

    const quotations = await postgrest<{ id: string; project_id: string; active_version_id: string | null }[]>(
      `quotations?${quotationParams.toString()}`,
      { method: "GET" }
    );

    if (quotations.length === 0) {
      return { ok: false, error: "quotation_not_found" };
    }

    const quotation = quotations[0];

    // Contar impacto antes de borrar
    const versionParams = new URLSearchParams({
      select: "id",
      quotation_id: `eq.${quotationId}`,
      limit: "1"
    });

    const versions = await postgrest<{ id: string }[]>(`quotation_versions?${versionParams.toString()}`, {
      method: "GET"
    });

    const assetParams = new URLSearchParams({
      select: "id",
      quotation_id: `eq.${quotationId}`,
      limit: "1"
    });

    const assets = await postgrest<{ id: string }[]>(`assets?${assetParams.toString()}`, {
      method: "GET"
    });

    const impact: EntityDeleteImpact = {
      direct: 1,
      cascaded: versions.length,
      detached: assets.length
    };

    // Borrar la cotización (cascada sobre versiones)
    const deleteParams = new URLSearchParams({
      id: `eq.${quotationId}`
    });

    await postgrest<{ id: string }[]>(`quotations?${deleteParams.toString()}`, {
      method: "DELETE"
    });

    // Registrar auditoría
    const auditParams = new URLSearchParams({
      select: "*"
    });

    const auditRow = await postgrest<{ id: string }[]>(`entity_delete_events?${auditParams.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        entity_type: "quotation",
        entity_id: quotationId,
        entity_label: `Cotización ${quotationId}`,
        requested_by_label: requestedByLabel,
        approved_by_label: approvedByLabel,
        reason: reason,
        mode: "execute",
        impact_summary_json: {
          direct: impact.direct,
          cascaded: impact.cascaded,
          detached: impact.detached
        }
      })
    });

    return {
      ok: true,
      mode: "execute",
      deletedEntityId: quotationId,
      deletedEntityType: "quotation",
      deletedEntityLabel: `Cotización ${quotationId}`,
      impactSummary: impact,
      eventId: auditRow[0]?.id ?? "",
      message: `Cotización "${quotationId}" eliminada con éxito.`
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

// ─── Brief ────────────────────────────────────────────────────────────────────

export async function previewDeleteBrief(
  tenantId: string,
  briefId: string
): Promise<EntityDeletePreview | EntityDeleteError> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "supabase_no_configured" };
  }

  try {
    // Verificar pertenencia al tenant
    const briefParams = new URLSearchParams({
      select: "id,client_id,project_id,status",
      id: `eq.${briefId}`,
      tenant_id: `eq.${tenantId}`,
      limit: "1"
    });

    const briefs = await postgrest<{ id: string; client_id: string | null; project_id: string | null; status: string }[]>(
      `briefs?${briefParams.toString()}`,
      { method: "GET" }
    );

    if (briefs.length === 0) {
      return { ok: false, error: "brief_not_found" };
    }

    const brief = briefs[0];

    // Contar versiones
    const versionParams = new URLSearchParams({
      select: "id",
      brief_id: `eq.${briefId}`,
      limit: "1"
    });

    const versions = await postgrest<{ id: string }[]>(`brief_versions?${versionParams.toString()}`, {
      method: "GET"
    });

    // Contar cotizaciones y activos que referencian este brief
    const quotationParams = new URLSearchParams({
      select: "id",
      brief_id: `eq.${briefId}`,
      limit: "1"
    });

    const quotations = await postgrest<{ id: string }[]>(`quotations?${quotationParams.toString()}`, {
      method: "GET"
    });

    const assetParams = new URLSearchParams({
      select: "id",
      brief_id: `eq.${briefId}`,
      limit: "1"
    });

    const assets = await postgrest<{ id: string }[]>(`assets?${assetParams.toString()}`, {
      method: "GET"
    });

    const impact: EntityDeleteImpact = {
      direct: 1, // brief
      cascaded: versions.length,
      detached: quotations.length + assets.length
    };

    const confirmationText = `ELIMINAR BRIEF ${brief.id}`;

    return {
      ok: true,
      mode: "preview",
      entityType: "brief",
      entityId: brief.id,
      entityLabel: `Brief ${brief.id}`,
      impact,
      confirmationText
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

export async function executeDeleteBrief(
  tenantId: string,
  briefId: string,
  requestedByLabel: string,
  approvedByLabel: string,
  reason: string,
  confirmationText: string,
  previewConfirmationText: string
): Promise<EntityDeleteExecute | EntityDeleteError> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "supabase_no_configured" };
  }

  // Validar confirmación
  if (confirmationText !== previewConfirmationText) {
    return { ok: false, error: "confirmation_mismatch" };
  }

  try {
    // Verificar pertenencia al tenant
    const briefParams = new URLSearchParams({
      select: "id,client_id,project_id,status",
      id: `eq.${briefId}`,
      tenant_id: `eq.${tenantId}`,
      limit: "1"
    });

    const briefs = await postgrest<{ id: string; client_id: string | null; project_id: string | null; status: string }[]>(
      `briefs?${briefParams.toString()}`,
      { method: "GET" }
    );

    if (briefs.length === 0) {
      return { ok: false, error: "brief_not_found" };
    }

    const brief = briefs[0];

    // Contar impacto antes de borrar
    const versionParams = new URLSearchParams({
      select: "id",
      brief_id: `eq.${briefId}`,
      limit: "1"
    });

    const versions = await postgrest<{ id: string }[]>(`brief_versions?${versionParams.toString()}`, {
      method: "GET"
    });

    const quotationParams = new URLSearchParams({
      select: "id",
      brief_id: `eq.${briefId}`,
      limit: "1"
    });

    const quotations = await postgrest<{ id: string }[]>(`quotations?${quotationParams.toString()}`, {
      method: "GET"
    });

    const assetParams = new URLSearchParams({
      select: "id",
      brief_id: `eq.${briefId}`,
      limit: "1"
    });

    const assets = await postgrest<{ id: string }[]>(`assets?${assetParams.toString()}`, {
      method: "GET"
    });

    const impact: EntityDeleteImpact = {
      direct: 1,
      cascaded: versions.length,
      detached: quotations.length + assets.length
    };

    // Borrar el brief (cascada sobre versiones)
    const deleteParams = new URLSearchParams({
      id: `eq.${briefId}`
    });

    await postgrest<{ id: string }[]>(`briefs?${deleteParams.toString()}`, {
      method: "DELETE"
    });

    // Registrar auditoría
    const auditParams = new URLSearchParams({
      select: "*"
    });

    const auditRow = await postgrest<{ id: string }[]>(`entity_delete_events?${auditParams.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        entity_type: "brief",
        entity_id: briefId,
        entity_label: `Brief ${briefId}`,
        requested_by_label: requestedByLabel,
        approved_by_label: approvedByLabel,
        reason: reason,
        mode: "execute",
        impact_summary_json: {
          direct: impact.direct,
          cascaded: impact.cascaded,
          detached: impact.detached
        }
      })
    });

    return {
      ok: true,
      mode: "execute",
      deletedEntityId: briefId,
      deletedEntityType: "brief",
      deletedEntityLabel: `Brief ${briefId}`,
      impactSummary: impact,
      eventId: auditRow[0]?.id ?? "",
      message: `Brief "${briefId}" eliminado con éxito.`
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

// ─── Papelera de reciclaje ───────────────────────────────────────────────────

/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 */
export async function softDeleteClient(
  tenantId: string,
  clientId: string,
  mode: DeleteMode,
  requestedByLabel: string,
  approvedByLabel: string,
  reason: string,
  confirmationText?: string
): Promise<EntitySoftDeleteResult | EntityDeleteError> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "supabase_no_configured" };
  }

  try {
    const clientParams = new URLSearchParams({
      select: "id,name,deleted_at",
      id: `eq.${clientId}`,
      tenant_id: `eq.${tenantId}`,
      limit: "1"
    });

    const clients = await postgrest<{ id: string; name: string; deleted_at: string | null }[]>(
      `clients?${clientParams.toString()}`,
      { method: "GET" }
    );

    if (clients.length === 0) {
      return { ok: false, error: "client_not_found" };
    }

    const client = clients[0];
    const previewConfirmationText = `MOVER A PAPELERA ${client.name.toUpperCase()}`;

    const activeProjectsParams = new URLSearchParams({
      select: "id,name,status",
      tenant_id: `eq.${tenantId}`,
      client_id: `eq.${clientId}`,
      status: "neq.archived",
      order: "created_at.desc"
    });

    const activeProjects = await postgrest<{ id: string; name: string; status: string }[]>(
      `projects?${activeProjectsParams.toString()}`,
      { method: "GET" }
    );

    if (mode === "preview") {
      if (activeProjects.length > 0) {
        return {
          ok: true,
          mode: "preview",
          entityType: "client",
          entityId: client.id,
          entityLabel: client.name,
          blockedReason: "client_has_active_projects",
          activeProjects,
          confirmationText: previewConfirmationText,
          message: "El cliente tiene proyectos activos y no puede moverse a papelera."
        };
      }

      return {
        ok: true,
        mode: "preview",
        entityType: "client",
        entityId: client.id,
        entityLabel: client.name,
        confirmationText: previewConfirmationText
      };
    }

    if (activeProjects.length > 0) {
      return {
        ok: true,
        mode: "execute",
        entityType: "client",
        entityId: client.id,
        entityLabel: client.name,
        blockedReason: "client_has_active_projects",
        activeProjects,
        message: "El cliente tiene proyectos activos y no puede moverse a papelera."
      };
    }

    if (confirmationText !== previewConfirmationText) {
      return { ok: false, error: "confirmation_mismatch" };
    }

    const deletedAt = new Date().toISOString();
    const updateParams = new URLSearchParams({
      id: `eq.${clientId}`,
      tenant_id: `eq.${tenantId}`
    });

    await postgrest<{ id: string }[]>(`clients?${updateParams.toString()}`, {
      method: "PATCH",
      body: JSON.stringify({ deleted_at: deletedAt })
    });

    const auditRow = await postgrest<{ id: string }[]>("entity_delete_events?select=*", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        entity_type: "client",
        entity_id: clientId,
        entity_label: client.name,
        requested_by_label: requestedByLabel,
        approved_by_label: approvedByLabel,
        reason,
        mode: "soft_delete",
        impact_summary_json: { direct: 1, cascaded: 0, detached: 0 }
      })
    });

    return {
      ok: true,
      mode: "execute",
      entityType: "client",
      entityId: client.id,
      entityLabel: client.name,
      deletedAt,
      purgesAt: addRetentionDate(deletedAt),
      eventId: auditRow[0]?.id ?? "",
      message: `Cliente "${client.name}" movido a papelera.`
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 */
export async function softDeleteLead(
  tenantId: string,
  leadId: string,
  mode: DeleteMode,
  requestedByLabel: string,
  approvedByLabel: string,
  reason: string,
  confirmationText?: string
): Promise<EntitySoftDeleteResult | EntityDeleteError> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "supabase_no_configured" };
  }

  try {
    const leadParams = new URLSearchParams({
      select: "id,name,source_channel,status,deleted_at",
      id: `eq.${leadId}`,
      tenant_id: `eq.${tenantId}`,
      limit: "1"
    });

    const leads = await postgrest<
      { id: string; name: string; source_channel: string; status: string; deleted_at: string | null }[]
    >(`leads?${leadParams.toString()}`, { method: "GET" });

    if (leads.length === 0) {
      return { ok: false, error: "lead_not_found" };
    }

    const lead = leads[0];
    const previewConfirmationText = `MOVER A PAPELERA ${lead.name.toUpperCase()}`;

    if (mode === "preview") {
      return {
        ok: true,
        mode: "preview",
        entityType: "lead",
        entityId: lead.id,
        entityLabel: lead.name,
        confirmationText: previewConfirmationText,
        message: `Canal: ${lead.source_channel}. Estado: ${lead.status}.`
      };
    }

    if (confirmationText !== previewConfirmationText) {
      return { ok: false, error: "confirmation_mismatch" };
    }

    const deletedAt = new Date().toISOString();
    const updateParams = new URLSearchParams({
      id: `eq.${leadId}`,
      tenant_id: `eq.${tenantId}`
    });

    await postgrest<{ id: string }[]>(`leads?${updateParams.toString()}`, {
      method: "PATCH",
      body: JSON.stringify({ deleted_at: deletedAt })
    });

    const auditRow = await postgrest<{ id: string }[]>("entity_delete_events?select=*", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        entity_type: "lead",
        entity_id: leadId,
        entity_label: lead.name,
        requested_by_label: requestedByLabel,
        approved_by_label: approvedByLabel,
        reason,
        mode: "soft_delete",
        impact_summary_json: { direct: 1, cascaded: 0, detached: 0 }
      })
    });

    return {
      ok: true,
      mode: "execute",
      entityType: "lead",
      entityId: lead.id,
      entityLabel: lead.name,
      deletedAt,
      purgesAt: addRetentionDate(deletedAt),
      eventId: auditRow[0]?.id ?? "",
      message: `Lead "${lead.name}" movido a papelera.`
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 */
export async function previewDeleteBriefOrphan(
  tenantId: string,
  briefId: string
): Promise<EntitySoftDeleteResult | EntityDeleteError> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "supabase_no_configured" };
  }

  try {
    const briefParams = new URLSearchParams({
      select: "id,project_id,status,deleted_at",
      id: `eq.${briefId}`,
      tenant_id: `eq.${tenantId}`,
      limit: "1"
    });

    const briefs = await postgrest<
      { id: string; project_id: string | null; status: string; deleted_at: string | null }[]
    >(`briefs?${briefParams.toString()}`, { method: "GET" });

    if (briefs.length === 0) {
      return { ok: false, error: "brief_not_found" };
    }

    const brief = briefs[0];
    if (brief.project_id) {
      return { ok: false, error: "brief_not_orphan" };
    }

    return {
      ok: true,
      mode: "preview",
      entityType: "brief",
      entityId: brief.id,
      entityLabel: `Brief ${brief.id}`,
      confirmationText: `MOVER A PAPELERA BRIEF ${brief.id}`
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 */
export async function executeDeleteBriefOrphan(
  tenantId: string,
  briefId: string,
  requestedByLabel: string,
  approvedByLabel: string,
  reason: string,
  confirmationText: string,
  previewConfirmationText: string
): Promise<EntitySoftDeleteResult | EntityDeleteError> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "supabase_no_configured" };
  }

  if (confirmationText !== previewConfirmationText) {
    return { ok: false, error: "confirmation_mismatch" };
  }

  try {
    const briefParams = new URLSearchParams({
      select: "id,project_id",
      id: `eq.${briefId}`,
      tenant_id: `eq.${tenantId}`,
      limit: "1"
    });

    const briefs = await postgrest<{ id: string; project_id: string | null }[]>(
      `briefs?${briefParams.toString()}`,
      { method: "GET" }
    );

    if (briefs.length === 0) {
      return { ok: false, error: "brief_not_found" };
    }

    if (briefs[0].project_id) {
      return { ok: false, error: "brief_not_orphan" };
    }

    const deletedAt = new Date().toISOString();
    const updateParams = new URLSearchParams({
      id: `eq.${briefId}`,
      tenant_id: `eq.${tenantId}`
    });

    await postgrest<{ id: string }[]>(`briefs?${updateParams.toString()}`, {
      method: "PATCH",
      body: JSON.stringify({ deleted_at: deletedAt })
    });

    const auditRow = await postgrest<{ id: string }[]>("entity_delete_events?select=*", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        entity_type: "brief",
        entity_id: briefId,
        entity_label: `Brief ${briefId}`,
        requested_by_label: requestedByLabel,
        approved_by_label: approvedByLabel,
        reason,
        mode: "soft_delete",
        impact_summary_json: { direct: 1, cascaded: 0, detached: 0 }
      })
    });

    return {
      ok: true,
      mode: "execute",
      entityType: "brief",
      entityId: briefId,
      entityLabel: `Brief ${briefId}`,
      deletedAt,
      purgesAt: addRetentionDate(deletedAt),
      eventId: auditRow[0]?.id ?? "",
      message: `Brief huérfano "${briefId}" movido a papelera.`
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 */
export async function listTrashItems(tenantId: string): Promise<ListTrashResult | EntityDeleteError> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "supabase_no_configured" };
  }

  try {
    const clientsParams = new URLSearchParams({
      select: "id,name,deleted_at",
      tenant_id: `eq.${tenantId}`,
      deleted_at: "not.is.null",
      order: "deleted_at.desc"
    });
    const leadsParams = new URLSearchParams({
      select: "id,name,deleted_at",
      tenant_id: `eq.${tenantId}`,
      deleted_at: "not.is.null",
      order: "deleted_at.desc"
    });
    const briefsParams = new URLSearchParams({
      select: "id,deleted_at",
      tenant_id: `eq.${tenantId}`,
      deleted_at: "not.is.null",
      order: "deleted_at.desc"
    });

    const [clients, leads, briefs] = await Promise.all([
      postgrest<{ id: string; name: string; deleted_at: string }[]>(`clients?${clientsParams.toString()}`, {
        method: "GET"
      }),
      postgrest<{ id: string; name: string; deleted_at: string }[]>(`leads?${leadsParams.toString()}`, {
        method: "GET"
      }),
      postgrest<{ id: string; deleted_at: string }[]>(`briefs?${briefsParams.toString()}`, {
        method: "GET"
      })
    ]);

    const items: TrashItem[] = [
      ...clients.map((item) => {
        const daysRemaining = computeDaysRemaining(item.deleted_at);
        return {
          entityType: "client" as const,
          entityId: item.id,
          entityLabel: item.name,
          deletedAt: item.deleted_at,
          purgesAt: addRetentionDate(item.deleted_at),
          daysRemaining,
          canRestore: daysRemaining > 0
        };
      }),
      ...leads.map((item) => {
        const daysRemaining = computeDaysRemaining(item.deleted_at);
        return {
          entityType: "lead" as const,
          entityId: item.id,
          entityLabel: item.name,
          deletedAt: item.deleted_at,
          purgesAt: addRetentionDate(item.deleted_at),
          daysRemaining,
          canRestore: daysRemaining > 0
        };
      }),
      ...briefs.map((item) => {
        const daysRemaining = computeDaysRemaining(item.deleted_at);
        return {
          entityType: "brief" as const,
          entityId: item.id,
          entityLabel: `Brief ${item.id}`,
          deletedAt: item.deleted_at,
          purgesAt: addRetentionDate(item.deleted_at),
          daysRemaining,
          canRestore: daysRemaining > 0
        };
      })
    ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));

    return {
      ok: true,
      items,
      total: items.length
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 */
export async function restoreEntity(
  tenantId: string,
  entityType: "client" | "lead" | "brief",
  entityId: string
): Promise<RestoreEntityResult | EntityDeleteError> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "supabase_no_configured" };
  }

  const table = entityType === "client" ? "clients" : entityType === "lead" ? "leads" : "briefs";
  const labelField = entityType === "brief" ? "id" : "name";

  try {
    const params = new URLSearchParams({
      select: `id,${labelField},deleted_at`,
      id: `eq.${entityId}`,
      tenant_id: `eq.${tenantId}`,
      limit: "1"
    });

    const rows = await postgrest<Array<{ id: string; name?: string; deleted_at: string | null }>>(
      `${table}?${params.toString()}`,
      { method: "GET" }
    );

    if (rows.length === 0) {
      return { ok: false, error: `${entityType}_not_found` };
    }

    const row = rows[0];
    if (!row.deleted_at) {
      return { ok: false, error: "entity_not_in_trash" };
    }

    const daysRemaining = computeDaysRemaining(row.deleted_at);
    if (daysRemaining <= 0) {
      return { ok: false, error: "retention_period_expired" };
    }

    const updateParams = new URLSearchParams({
      id: `eq.${entityId}`,
      tenant_id: `eq.${tenantId}`
    });

    await postgrest<{ id: string }[]>(`${table}?${updateParams.toString()}`, {
      method: "PATCH",
      body: JSON.stringify({ deleted_at: null })
    });

    const restoredAt = new Date().toISOString();
    const entityLabel = entityType === "brief" ? `Brief ${entityId}` : row.name ?? entityId;

    return {
      ok: true,
      entityType,
      entityId,
      entityLabel,
      restoredAt,
      message: `${entityLabel} restaurado correctamente.`
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

export async function executeRestoreClient(
  tenantId: string,
  clientId: string
): Promise<RestoreEntityResult | EntityDeleteError> {
  return restoreEntity(tenantId, "client", clientId);
}

export async function executeRestoreLead(
  tenantId: string,
  leadId: string
): Promise<RestoreEntityResult | EntityDeleteError> {
  return restoreEntity(tenantId, "lead", leadId);
}
