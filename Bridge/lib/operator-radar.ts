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
