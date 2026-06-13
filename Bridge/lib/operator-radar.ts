/**
 * IMPL-20260506-39
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-39_radar_priorizado_operador_por_proyecto.md
 */
import { isSupabaseConfigured, supabaseEnv } from "./supabase";

// ─── Tipos del contrato del radar ────────────────────────────────────────────

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type PortfolioItem = {
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  projectStatus: string;
  priorityScore: number;
  priorityReason: string;
  primaryAlert: string;
  suggestedAction: string;
  suggestedModule: string;
  lastMovementAt: string | null;
  idleHours: number;
  riskLevel: RiskLevel;
  sourceRefs: string[];
};

export type OperatorRadar = {
  tenantSlug: string;
  generatedAt: string;
  portfolioItems: PortfolioItem[];
  isEmpty: boolean;
};

// ─── Tipos internos de señales ───────────────────────────────────────────────

export type ProjectSignals = {
  project: { id: string; name: string; status: string; clientId: string };
  clientName: string;
  brief: { status: string; updatedAt: string } | null;
  quotation: { status: string; updatedAt: string } | null;
  latestActivityAt: string | null;
  nowIso: string;
};

// ─── Reglas de scoring (funciones puras y trazables) ─────────────────────────

const BRIEF_STATUSES_LOCKED = new Set([
  "approved_locked",
  "pending_operator_review",
  "operator_review_in_progress"
]);

export function computeIdleHours(latestActivityAt: string | null, nowIso: string): number {
  if (!latestActivityAt) return 999;
  const diffMs = new Date(nowIso).getTime() - new Date(latestActivityAt).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
}

/**
 * Calcula el score, la alerta principal y la accion sugerida a partir de senales reales.
 * Funcion pura y testeable sin Supabase.
 * IMPL-20260506-39
 */
export function scoreProjectSignals(signals: ProjectSignals): Pick<
  PortfolioItem,
  | "priorityScore"
  | "priorityReason"
  | "primaryAlert"
  | "suggestedAction"
  | "suggestedModule"
  | "riskLevel"
  | "sourceRefs"
  | "idleHours"
  | "lastMovementAt"
> {
  const refs: string[] = [];
  let score = 0;

  const idleHours = computeIdleHours(signals.latestActivityAt, signals.nowIso);

  // Regla: sin brief vinculado
  if (!signals.brief) {
    score += 25;
    refs.push("rule:brief_absent");
  } else if (!BRIEF_STATUSES_LOCKED.has(signals.brief.status)) {
    // Brief existe pero no consolidado / aprobado
    score += 20;
    refs.push("rule:brief_not_locked");
  }

  // Regla: sin cotizacion vinculada
  if (!signals.quotation) {
    score += 15;
    refs.push("rule:no_quotation");
  } else if (signals.quotation.status === "draft") {
    score += 10;
    refs.push("rule:quotation_draft");
  }

  // Regla: inactividad
  if (idleHours > 48) {
    score += 20;
    refs.push("rule:idle_48h");
  } else if (idleHours > 24) {
    score += 10;
    refs.push("rule:idle_24h");
  }

  // Derivar risk level
  let riskLevel: RiskLevel = "low";
  if (score >= 55) riskLevel = "critical";
  else if (score >= 35) riskLevel = "high";
  else if (score >= 15) riskLevel = "medium";

  // Derivar alerta principal, razon y accion desde la regla de mayor peso que aplica
  let primaryAlert = "Sin alertas activas para este proyecto.";
  let priorityReason = "El proyecto no presenta bloqueos conocidos.";
  let suggestedAction = "Revisar avance general del proyecto.";
  let suggestedModule = "briefs";

  if (refs.includes("rule:brief_absent")) {
    primaryAlert = "El proyecto no tiene brief vinculado.";
    priorityReason = `Sin brief, el equipo no tiene una base estructurada para cotizar o producir. Idle: ${idleHours}h.`;
    suggestedAction = "Crear o vincular un brief a este proyecto.";
    suggestedModule = "briefs";
  } else if (refs.includes("rule:brief_not_locked")) {
    primaryAlert = `Brief en estado '${signals.brief?.status ?? "sin estado"}' — no consolidado.`;
    priorityReason = `El brief existe pero todavia no fue revisado y aprobado. Idle: ${idleHours}h.`;
    suggestedAction = "Revisar y aprobar el brief para habilitar cotizacion y produccion.";
    suggestedModule = "briefs";
  } else if (refs.includes("rule:no_quotation")) {
    primaryAlert = "Proyecto sin cotizacion vinculada a pesar de tener brief.";
    priorityReason = `El brief esta consolidado pero no se genero cotizacion. Idle: ${idleHours}h.`;
    suggestedAction = "Generar cotizacion para este proyecto.";
    suggestedModule = "cotizaciones";
  } else if (refs.includes("rule:quotation_draft")) {
    primaryAlert = "Cotizacion vigente en borrador — no enviada al cliente.";
    priorityReason = `La cotizacion existe pero no fue enviada. Idle: ${idleHours}h.`;
    suggestedAction = "Revisar y enviar la cotizacion al cliente.";
    suggestedModule = "cotizaciones";
  } else if (refs.includes("rule:idle_48h")) {
    primaryAlert = `Sin movimiento en ${idleHours}h — posible bloqueo no reportado.`;
    priorityReason = `El proyecto esta paralizado por mas de 48 horas sin actualizacion.`;
    suggestedAction = "Verificar estado con el equipo y el cliente.";
    suggestedModule = "crm";
  } else if (refs.includes("rule:idle_24h")) {
    primaryAlert = `Sin actualizacion en ${idleHours}h.`;
    priorityReason = `El proyecto lleva mas de 24 horas sin movimiento.`;
    suggestedAction = "Confirmar que el flujo no esta bloqueado.";
    suggestedModule = "crm";
  }

  return {
    priorityScore: score,
    priorityReason,
    primaryAlert,
    suggestedAction,
    suggestedModule,
    riskLevel,
    sourceRefs: refs,
    idleHours,
    lastMovementAt: signals.latestActivityAt
  };
}

// ─── Tipos de filas DB (solo los campos necesarios para el radar) ─────────────

type TenantRow = { id: string; slug: string };

type ProjectRow = {
  id: string;
  client_id: string;
  name: string;
  status: string;
  updated_at: string;
};

type ClientRow = {
  id: string;
  name: string;
};

type BriefSummaryRow = {
  id: string;
  project_id: string | null;
  status: string;
  updated_at: string;
};

type QuotationSummaryRow = {
  id: string;
  project_id: string;
  status: string;
  updated_at: string;
};

// ─── Helpers internos de fetch ───────────────────────────────────────────────

function getServerApiKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseEnv.anonKey;
}

async function postgrest<T>(path: string): Promise<T> {
  const response = await fetch(`${supabaseEnv.url}/rest/v1/${path}`, {
    method: "GET",
    headers: {
      apikey: getServerApiKey(),
      Authorization: `Bearer ${getServerApiKey()}`
    },
    cache: "no-store"
  });

  if (!response.ok) return [] as T;
  if (response.status === 204) return [] as T;

  return (await response.json()) as T;
}

async function getTenantId(slug: string): Promise<string | null> {
  const params = new URLSearchParams({ select: "id,slug", slug: `eq.${slug}`, limit: "1" });
  const rows = await postgrest<TenantRow[]>(`tenants?${params.toString()}`);
  return rows[0]?.id ?? null;
}

async function fetchProjects(tenantId: string): Promise<ProjectRow[]> {
  const params = new URLSearchParams({
    select: "id,client_id,name,status,updated_at",
    tenant_id: `eq.${tenantId}`,
    order: "updated_at.desc"
  });
  return postgrest<ProjectRow[]>(`projects?${params.toString()}`);
}

async function fetchClients(tenantId: string): Promise<ClientRow[]> {
  const params = new URLSearchParams({
    select: "id,name",
    tenant_id: `eq.${tenantId}`,
    order: "name.asc"
  });
  return postgrest<ClientRow[]>(`clients?${params.toString()}`);
}

async function fetchBriefsSummary(tenantId: string): Promise<BriefSummaryRow[]> {
  const params = new URLSearchParams({
    select: "id,project_id,status,updated_at",
    tenant_id: `eq.${tenantId}`,
    order: "updated_at.desc"
  });
  return postgrest<BriefSummaryRow[]>(`briefs?${params.toString()}`);
}

async function fetchQuotationsSummary(tenantId: string): Promise<QuotationSummaryRow[]> {
  const params = new URLSearchParams({
    select: "id,project_id,status,updated_at",
    tenant_id: `eq.${tenantId}`,
    order: "updated_at.desc"
  });
  return postgrest<QuotationSummaryRow[]>(`quotations?${params.toString()}`);
}

// ─── Funcion principal ────────────────────────────────────────────────────────

/**
 * Obtiene el radar priorizado del operador por proyecto.
 * Deriva senales desde entidades existentes (projects, briefs, quotations).
 * No abre fuentes paralelas ni modifica datos.
 * IMPL-20260506-39
 */
export async function getOperatorRadar(
  tenantSlug = supabaseEnv.defaultTenant
): Promise<OperatorRadar> {
  const generatedAt = new Date().toISOString();
  const base: OperatorRadar = {
    tenantSlug,
    generatedAt,
    portfolioItems: [],
    isEmpty: true
  };

  if (!isSupabaseConfigured) return base;

  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return base;

  const [projects, clients, briefs, quotations] = await Promise.all([
    fetchProjects(tenantId),
    fetchClients(tenantId),
    fetchBriefsSummary(tenantId),
    fetchQuotationsSummary(tenantId)
  ]);

  if (projects.length === 0) return base;

  // Indexar por projectId para lookup O(1)
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  // El brief mas reciente por proyecto
  const briefByProject = new Map<string, BriefSummaryRow>();
  for (const brief of briefs) {
    if (brief.project_id && !briefByProject.has(brief.project_id)) {
      briefByProject.set(brief.project_id, brief);
    }
  }

  // La cotizacion mas reciente por proyecto
  const quotationByProject = new Map<string, QuotationSummaryRow>();
  for (const q of quotations) {
    if (!quotationByProject.has(q.project_id)) {
      quotationByProject.set(q.project_id, q);
    }
  }

  const nowIso = generatedAt;

  const items: PortfolioItem[] = projects.map((project) => {
    const brief = briefByProject.get(project.id) ?? null;
    const quotation = quotationByProject.get(project.id) ?? null;

    // Ultima actividad: maximo de updated_at entre el proyecto, brief y cotizacion
    const candidates = [project.updated_at, brief?.updated_at, quotation?.updated_at].filter(
      (v): v is string => Boolean(v)
    );
    const latestActivityAt = candidates.reduce<string | null>((max, val) => {
      if (!max) return val;
      return new Date(val) > new Date(max) ? val : max;
    }, null);

    const signals: ProjectSignals = {
      project: { id: project.id, name: project.name, status: project.status, clientId: project.client_id },
      clientName: clientMap.get(project.client_id) ?? "Cliente desconocido",
      brief: brief ? { status: brief.status, updatedAt: brief.updated_at } : null,
      quotation: quotation ? { status: quotation.status, updatedAt: quotation.updated_at } : null,
      latestActivityAt,
      nowIso
    };

    const scored = scoreProjectSignals(signals);

    return {
      clientId: project.client_id,
      clientName: signals.clientName,
      projectId: project.id,
      projectName: project.name,
      projectStatus: project.status,
      ...scored
    };
  });

  // Ordenar por score descendente; empates: idle mayor primero
  items.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return b.idleHours - a.idleHours;
  });

  return {
    tenantSlug,
    generatedAt,
    portfolioItems: items,
    isEmpty: items.length === 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPL-20260612-01
// Respaldo: context/SPECs/SPEC_ARCH-20260612-01_operador_dashboard_acciones_crud_comentarios_agente_v1.md
//
// Cabina de Control V2: capa adicional sobre el radar que agrega
// - Detalle de proyecto seleccionado (brief, cotizaciones, activos, leads)
// - Propuestas estructuradas del agente remoto
// - Comentarios contextuales anclados a entidad
// - Acción primaria 1-clic derivable del estado del portfolio
// Todas las funciones nuevas son puras y testeables. Los fetches a Supabase
// hacen fallback gracioso a `[]` si las tablas no existen.
// ─────────────────────────────────────────────────────────────────────────────

import {
  type AgentProposal,
  type OperatorComment,
  AGENT_PROPOSAL_TYPE_LABELS
} from "./operator-comments";

// ─── Tipos del detalle de proyecto ────────────────────────────────────────────

export type OperatorProjectRecord = {
  id: string;
  clientId: string;
  name: string;
  status: string;
  updatedAt: string;
};

export type OperatorClientRecord = {
  id: string;
  name: string;
};

export type OperatorBriefRecord = {
  id: string;
  projectId: string | null;
  status: string;
  updatedAt: string;
  currentVersionNumber: number | null;
};

export type OperatorQuotationRecord = {
  id: string;
  projectId: string;
  status: string;
  updatedAt: string;
  briefId: string | null;
};

export type OperatorAssetRecord = {
  id: string;
  projectId: string;
  clientId: string;
  applicationCode: string;
  pieceTypeCode: string;
  placementCode: string;
  formatCode: string;
  title: string;
  status: string;
  updatedAt: string;
};

export type OperatorLeadRecord = {
  id: string;
  projectId: string | null;
  clientId: string | null;
  name: string;
  status: string;
  sourceChannel: string;
  requestedService: string;
  updatedAt: string;
};

/**
 * Detalle completo de un proyecto para la zona central de la cabina.
 * IMPL-20260612-01
 */
export type OperatorProjectDetail = {
  project: OperatorProjectRecord;
  client: OperatorClientRecord;
  brief: OperatorBriefRecord | null;
  quotations: OperatorQuotationRecord[];
  assets: OperatorAssetRecord[];
  leads: OperatorLeadRecord[];
};

/**
 * Cabina de Control V2: agrega radar + detalle + propuestas + comentarios.
 * IMPL-20260612-01
 */
export type OperatorCabin = {
  tenantSlug: string;
  generatedAt: string;
  radar: OperatorRadar;
  selectedProjectId: string | null;
  selectedProjectDetail: OperatorProjectDetail | null;
  agentProposals: AgentProposal[];
  contextualComments: OperatorComment[];
};

// ─── computePrimaryAction — función pura testeable ────────────────────────────

/**
 * Señales necesarias para derivar la acción primaria 1-clic.
 * IMPL-20260612-01
 */
export type PrimaryActionSignals = {
  brief: { status: string } | null;
  quotation: { status: string } | null;
  asset: { status: string } | null;
  crm: { isNew: boolean; hasOpenLead: boolean };
};

export type PrimaryActionVariant = "primary" | "warning" | "success" | "neutral";

export type PrimaryAction = {
  label: string;
  href: string;
  variant: PrimaryActionVariant;
  reason: string;
};

/**
 * Determina la acción primaria 1-clic para una tarjeta del radar.
 * Reglas en orden de prioridad (mismas que la SPEC):
 * 1. brief: draft → "Editar Brief" → /operador?project=X&tab=briefs
 * 2. quotation: draft → "Editar Cotización" → /operador?project=X&tab=cotizaciones
 * 3. quotation: sent → "Ver Respuesta Cliente" → /operador?project=X&tab=cotizaciones
 * 4. asset: in_review → "Aprobar/Devolver" → /operador?project=X&tab=activos
 * 5. asset: approved → "Validar Final" → /operador?project=X&tab=activos
 * 6. crm: nuevo → "Contactar Lead" → /operador?project=X&tab=crm
 * 7. sin reglas aplicables → "Revisar avance" → /operador?project=X
 *
 * Función pura y testeable sin Supabase.
 * IMPL-20260612-01
 */
export function computePrimaryAction(
  item: PortfolioItem,
  signals: PrimaryActionSignals
): PrimaryAction {
  const base = (tab: string) => `/operador?project=${item.projectId}&tab=${tab}`;
  const baseProject = `/operador?project=${item.projectId}`;

  if (!signals.brief) {
    return {
      label: "Crear brief",
      href: base("briefs"),
      variant: "primary",
      reason: "El proyecto no tiene brief vinculado."
    };
  }

  if (signals.brief.status === "draft") {
    return {
      label: "Editar Brief",
      href: base("briefs"),
      variant: "primary",
      reason: "Brief en estado draft — requiere estructuracion."
    };
  }

  if (!signals.quotation) {
    return {
      label: "Crear cotización",
      href: base("cotizaciones"),
      variant: "primary",
      reason: "El brief esta consolidado pero no hay cotizacion."
    };
  }

  if (signals.quotation.status === "draft") {
    return {
      label: "Editar Cotización",
      href: base("cotizaciones"),
      variant: "primary",
      reason: "Cotizacion vigente en borrador."
    };
  }

  if (signals.quotation.status === "sent") {
    return {
      label: "Ver Respuesta Cliente",
      href: base("cotizaciones"),
      variant: "warning",
      reason: "Cotizacion enviada — pendiente de respuesta del cliente."
    };
  }

  if (signals.asset) {
    if (signals.asset.status === "in_review") {
      return {
        label: "Aprobar/Devolver",
        href: base("activos"),
        variant: "warning",
        reason: "Activo en revision — pendiente de decision."
      };
    }
    if (signals.asset.status === "approved" || signals.asset.status === "approved_designer") {
      return {
        label: "Validar Final",
        href: base("activos"),
        variant: "success",
        reason: "Activo aprobado por el diseñador — listo para validacion final."
      };
    }
  }

  if (signals.crm.isNew || signals.crm.hasOpenLead) {
    return {
      label: "Contactar Lead",
      href: base("crm"),
      variant: "primary",
      reason: "Hay un lead abierto o nuevo en el CRM."
    };
  }

  return {
    label: "Revisar avance",
    href: baseProject,
    variant: "neutral",
    reason: "Sin alertas activas para este proyecto."
  };
}

// ─── groupProposalsByProject — agrupador puro ──────────────────────────────────

/**
 * Agrupa propuestas de agente por projectId. El orden interno de cada grupo
 * sigue receivedAt descendente (más recientes primero).
 * Función pura y testeable.
 * IMPL-20260612-01
 */
export function groupProposalsByProject(
  proposals: AgentProposal[]
): Record<string, AgentProposal[]> {
  const out: Record<string, AgentProposal[]> = {};
  const sorted = [...proposals].sort((a, b) =>
    a.receivedAt < b.receivedAt ? 1 : a.receivedAt > b.receivedAt ? -1 : 0
  );
  for (const proposal of sorted) {
    const list = out[proposal.projectId] ?? [];
    list.push(proposal);
    out[proposal.projectId] = list;
  }
  return out;
}

// ─── filterCommentsByContext — filtrador puro ──────────────────────────────────

import type { CommentEntityType } from "./operator-comments";

/**
 * Filtra comentarios por contexto de entidad. Si no se provee entityId,
 * incluye todos los comentarios de ese tipo de entidad. Si se provee,
 * filtra además por entityId.
 * Función pura y testeable.
 * IMPL-20260612-01
 */
export function filterCommentsByContext(
  comments: OperatorComment[],
  entityType: CommentEntityType,
  entityId?: string
): OperatorComment[] {
  return comments
    .filter((c) => c.entityType === entityType)
    .filter((c) => (entityId ? c.entityId === entityId : true))
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

// ─── Helpers de fetch con fallback gracioso ───────────────────────────────────

type RawRow = Record<string, unknown>;

function safeArray<T>(rows: T[] | null | undefined): T[] {
  return Array.isArray(rows) ? rows : [];
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asStringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function asNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

/**
 * Fetch con fallback gracioso. Si la tabla no existe (status 404) o cualquier
 * otro error, retorna `[]` en lugar de lanzar.
 * IMPL-20260612-01
 */
async function safePostgrest<T = RawRow>(path: string): Promise<T[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const response = await fetch(`${supabaseEnv.url}/rest/v1/${path}`, {
      method: "GET",
      headers: {
        apikey: getServerApiKey(),
        Authorization: `Bearer ${getServerApiKey()}`
      },
      cache: "no-store"
    });
    if (!response.ok) return [];
    if (response.status === 204) return [];
    const data = (await response.json()) as T[] | null;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ─── fetchProjectDetail — agrega entidades de un proyecto ─────────────────────

/**
 * Trae brief, cotizaciones, activos y leads asociados al proyecto.
 * Todas las llamadas son tolerantes a tablas inexistentes.
 * IMPL-20260612-01
 */
export async function fetchProjectDetail(
  tenantId: string,
  projectId: string
): Promise<OperatorProjectDetail | null> {
  // 1. Proyecto + cliente
  const projectParams = new URLSearchParams({
    select: "id,client_id,name,status,updated_at",
    tenant_id: `eq.${tenantId}`,
    id: `eq.${projectId}`,
    limit: "1"
  });
  const projectRows = await safePostgrest<RawRow>(`projects?${projectParams.toString()}`);
  const projectRow = projectRows[0];
  if (!projectRow) return null;

  const project: OperatorProjectRecord = {
    id: asString(projectRow.id),
    clientId: asString(projectRow.client_id),
    name: asString(projectRow.name, "Proyecto"),
    status: asString(projectRow.status, "active"),
    updatedAt: asString(projectRow.updated_at, new Date().toISOString())
  };

  // Cliente
  const clientParams = new URLSearchParams({
    select: "id,name",
    tenant_id: `eq.${tenantId}`,
    id: `eq.${project.clientId}`,
    limit: "1"
  });
  const clientRows = await safePostgrest<RawRow>(`clients?${clientParams.toString()}`);
  const clientRow = clientRows[0];
  const client: OperatorClientRecord = {
    id: project.clientId,
    name: clientRow ? asString(clientRow.name, "Cliente") : "Cliente desconocido"
  };

  // Brief mas reciente
  const briefParams = new URLSearchParams({
    select: "id,project_id,status,updated_at,current_version_number",
    tenant_id: `eq.${tenantId}`,
    project_id: `eq.${projectId}`,
    order: "updated_at.desc",
    limit: "1"
  });
  const briefRows = await safePostgrest<RawRow>(`briefs?${briefParams.toString()}`);
  const briefRow = briefRows[0];
  const brief: OperatorBriefRecord | null = briefRow
    ? {
        id: asString(briefRow.id),
        projectId: asStringOrNull(briefRow.project_id),
        status: asString(briefRow.status, "draft"),
        updatedAt: asString(briefRow.updated_at, new Date().toISOString()),
        currentVersionNumber: asNumberOrNull(briefRow.current_version_number)
      }
    : null;

  // Cotizaciones
  const quotationParams = new URLSearchParams({
    select: "id,project_id,status,updated_at,brief_id",
    tenant_id: `eq.${tenantId}`,
    project_id: `eq.${projectId}`,
    order: "updated_at.desc"
  });
  const quotationRows = await safePostgrest<RawRow>(`quotations?${quotationParams.toString()}`);
  const quotations: OperatorQuotationRecord[] = safeArray(quotationRows).map((q) => ({
    id: asString(q.id),
    projectId: asString(q.project_id, projectId),
    status: asString(q.status, "draft"),
    updatedAt: asString(q.updated_at, new Date().toISOString()),
    briefId: asStringOrNull(q.brief_id)
  }));

  // Activos
  const assetParams = new URLSearchParams({
    select:
      "id,project_id,client_id,application_code,piece_type_code,placement_code,format_code,title,status,updated_at",
    tenant_id: `eq.${tenantId}`,
    project_id: `eq.${projectId}`,
    order: "updated_at.desc"
  });
  const assetRows = await safePostgrest<RawRow>(`assets?${assetParams.toString()}`);
  const assets: OperatorAssetRecord[] = safeArray(assetRows).map((a) => ({
    id: asString(a.id),
    projectId: asString(a.project_id, projectId),
    clientId: asString(a.client_id, project.clientId),
    applicationCode: asString(a.application_code, ""),
    pieceTypeCode: asString(a.piece_type_code, ""),
    placementCode: asString(a.placement_code, ""),
    formatCode: asString(a.format_code, ""),
    title: asString(a.title, "Activo"),
    status: asString(a.status, "draft"),
    updatedAt: asString(a.updated_at, new Date().toISOString())
  }));

  // Leads
  const leadParams = new URLSearchParams({
    select: "id,project_id,client_id,name,status,source_channel,requested_service,updated_at",
    tenant_id: `eq.${tenantId}`,
    project_id: `eq.${projectId}`,
    order: "updated_at.desc"
  });
  const leadRows = await safePostgrest<RawRow>(`leads?${leadParams.toString()}`);
  const leads: OperatorLeadRecord[] = safeArray(leadRows).map((l) => ({
    id: asString(l.id),
    projectId: asStringOrNull(l.project_id),
    clientId: asStringOrNull(l.client_id),
    name: asString(l.name, "Lead"),
    status: asString(l.status, "nuevo"),
    sourceChannel: asString(l.source_channel, "otro"),
    requestedService: asString(l.requested_service, ""),
    updatedAt: asString(l.updated_at, new Date().toISOString())
  }));

  return { project, client, brief, quotations, assets, leads };
}

// ─── fetchAgentProposals — propuestas del agente con fallback ──────────────────

/**
 * Lee propuestas estructuradas del agente remoto.
 * Si la tabla `agent_proposals` no existe, retorna `[]`.
 * IMPL-20260612-01
 */
export async function fetchAgentProposals(tenantId: string): Promise<AgentProposal[]> {
  const params = new URLSearchParams({
    select: "id,type,project_id,agent_id,status,payload,summary,diff,received_at",
    tenant_id: `eq.${tenantId}`,
    order: "received_at.desc",
    limit: "50"
  });
  const rows = await safePostgrest<RawRow>(`agent_proposals?${params.toString()}`);
  return safeArray(rows).map((r) => {
    const type = asString(r.type, "sync_context");
    const typeKey = (AGENT_PROPOSAL_TYPE_LABELS as Record<string, string>)[type]
      ? type
      : "sync_context";
    return {
      id: asString(r.id),
      type: typeKey as AgentProposal["type"],
      projectId: asString(r.project_id),
      agentId: asString(r.agent_id, "unknown-agent"),
      status: (asString(r.status, "pending") as AgentProposal["status"]),
      payload: (r.payload && typeof r.payload === "object" ? r.payload : {}) as Record<string, unknown>,
      summary: asString(r.summary, `${typeKey} para proyecto ${asString(r.project_id)}`),
      receivedAt: asString(r.received_at, new Date().toISOString()),
      diff:
        r.diff && typeof r.diff === "object" && !Array.isArray(r.diff)
          ? (r.diff as AgentProposal["diff"])
          : undefined
    };
  });
}

// ─── fetchContextualComments — comentarios anclados con fallback ───────────────

/**
 * Lee comentarios contextuales anclados a una entidad.
 * Si la tabla `operator_comments` no existe, retorna `[]`.
 * IMPL-20260612-01
 */
export async function fetchContextualComments(
  tenantId: string,
  entityType: CommentEntityType,
  entityId: string
): Promise<OperatorComment[]> {
  const params = new URLSearchParams({
    select:
      "id,entity_type,entity_id,visibility,author,body,mentions,created_at,updated_at",
    tenant_id: `eq.${tenantId}`,
    entity_type: `eq.${entityType}`,
    entity_id: `eq.${entityId}`,
    order: "created_at.desc",
    limit: "100"
  });
  const rows = await safePostgrest<RawRow>(`operator_comments?${params.toString()}`);
  return safeArray(rows).map((r) => ({
    id: asString(r.id),
    entityType: (asString(r.entity_type, entityType) as OperatorComment["entityType"]),
    entityId: asString(r.entity_id, entityId),
    visibility: (asString(r.visibility, "internal") as OperatorComment["visibility"]),
    author: (r.author && typeof r.author === "object" && !Array.isArray(r.author)
      ? (r.author as OperatorComment["author"])
      : { type: "operator", userId: "unknown", name: "Operador" }),
    body: asString(r.body),
    mentions: Array.isArray(r.mentions) ? (r.mentions as string[]) : [],
    createdAt: asString(r.created_at, new Date().toISOString()),
    updatedAt: asString(r.updated_at, new Date().toISOString())
  }));
}

// ─── getOperatorCabin — orquestador principal ─────────────────────────────────

/**
 * Orquesta la carga de la cabina de control V2.
 * - Trae el radar priorizado.
 * - Si se provee projectId, trae el detalle completo.
 * - Trae las propuestas del agente pendientes.
 * - Trae los comentarios contextuales anclados al proyecto seleccionado.
 *
 * Tolerante a Supabase no configurado y a tablas inexistentes.
 * IMPL-20260612-01
 */
export async function getOperatorCabin(
  tenantSlug = supabaseEnv.defaultTenant,
  projectId: string | null = null
): Promise<OperatorCabin> {
  const generatedAt = new Date().toISOString();
  const base: OperatorCabin = {
    tenantSlug,
    generatedAt,
    radar: {
      tenantSlug,
      generatedAt,
      portfolioItems: [],
      isEmpty: true
    },
    selectedProjectId: projectId,
    selectedProjectDetail: null,
    agentProposals: [],
    contextualComments: []
  };

  if (!isSupabaseConfigured) return base;

  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return base;

  // Radar siempre
  const radar = await getOperatorRadar(tenantSlug);

  // Detalle + propuestas + comentarios (en paralelo)
  const [detail, proposals] = await Promise.all([
    projectId ? fetchProjectDetail(tenantId, projectId) : Promise.resolve(null),
    fetchAgentProposals(tenantId)
  ]);

  let comments: OperatorComment[] = [];
  if (projectId) {
    comments = await fetchContextualComments(tenantId, "project", projectId);
  }

  return {
    tenantSlug,
    generatedAt,
    radar,
    selectedProjectId: projectId,
    selectedProjectDetail: detail,
    agentProposals: proposals,
    contextualComments: comments
  };
}
