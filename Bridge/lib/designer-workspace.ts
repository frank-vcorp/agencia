/**
 * IMPL-20260506-44 | IMPL-20260506-52
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-40_modelo_ejecucion_disenador_sesiones_y_estados.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-41_workspace_disenador_guiado.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-52_disenador_sesiones_reales_y_cierre_jornada.md
 * IMPL-20260513-17
 * Respaldo: context/AGENTE_VIKA_Y_SKILLS_TECNICAS_V1.md
 */
import {
  resolveAssetOperationalKind,
  type AssetOperationalKind
} from "./assets";
import { isSupabaseConfigured, supabaseEnv } from "./supabase";

// ─── Tipos del contrato ───────────────────────────────────────────────────────

/**
 * Estados del pendiente del disenador (SPEC-40).
 * V1: `blocked` no puede persistirse aun — requiere tabla designer_tasks.
 */
export type DesignerTaskStatus =
  | "ready_to_start"
  | "in_progress"
  | "blocked"
  | "completed"
  | "ready_for_review";

/**
 * Herramienta creativa sugerida para cada tipo de pieza.
 * Flujo: Bridge -> estacion Adobe -> Bridge (SPEC-40).
 */
export type CreativeTool = "firefly" | "adobe_express" | "photoshop" | "other";

/** Acciones disponibles segun el estado del pendiente (SPEC-40). */
export type DesignerAction = "start" | "block" | "resume" | "finish" | "ready_for_review";

export type DesignerTask = {
  assetId: string;
  assetTitle: string;
  operationalKind: AssetOperationalKind;
  projectId: string;
  projectName: string;
  clientName: string;
  pieceTypeCode: string;
  applicationCode: string;
  formatCode: string;
  status: DesignerTaskStatus;
  /** Prompt activo del activo, entregado por el operador. */
  promptText: string | null;
  promptVersion: number | null;
  /** Referencia al brief vinculado, si existe. */
  briefId: string | null;
  /** Herramienta creativa sugerida segun el tipo de pieza. */
  suggestedTool: CreativeTool;
  priorityScore: number;
  priorityReason: string;
  suggestedAction: string;
  updatedAt: string;
};

export type DesignerProposalDraft = {
  id: string;
  isPrimary: boolean;
  note: string;
  toolUsed: CreativeTool;
  reviewDecision: string;
  promptVersionId: string | null;
  evidenceFileName: string | null;
  hasEvidence: boolean;
  createdAt: string;
};

export type DailyStats = {
  completedCount: number;
  inProgressCount: number;
  readyToStartCount: number;
  blockedCount: number;
  /** Tiempo efectivo disponible desde work_sessions — ver dailyStatsToday para hoy. */
  effectiveMinutesNote: string;
};

/** Estado operativo de una sesion de trabajo. IMPL-20260506-52 */
export type WorkSessionStatus = "active" | "blocked" | "completed";

/**
 * Sesion de trabajo activa o bloqueada del disenador.
 * Derivada desde work_sessions WHERE status IN ('active','blocked'). IMPL-20260506-52
 */
export type ActiveSession = {
  sessionId: string;
  assetId: string;
  status: WorkSessionStatus;
  startedAt: string;
  blockedReason: string | null;
  /** Minutos transcurridos desde started_at hasta ahora (aproximado). */
  elapsedMinutes: number;
};

/**
 * Estadisticas de la jornada filtradas al dia actual.
 * Derivadas desde work_sessions con started_at >= hoy 00:00. IMPL-20260506-52
 */
export type DailyStatsToday = {
  /** Sesiones completadas hoy (no acumulado historico). */
  completedCountToday: number;
  /** Minutos efectivos hoy (suma de duracion de sesiones completadas). */
  effectiveMinutesToday: number;
  /** Tiempo acumulado en estado blocked hoy (minutos desde started_at hasta updated_at). */
  blockedMinutesToday: number;
  /** ISO de la ultima sesion terminada hoy, o null si ninguna. */
  lastSessionEndedAt: string | null;
  /** Fecha de referencia usada para el filtro ('YYYY-MM-DD'). */
  date: string;
};

export type DesignerWorkspace = {
  tenantSlug: string;
  generatedAt: string;
  /** Activo en foco: tarea activa o, si no hay, la siguiente sugerida. IMPL-20260513-20 */
  focusedAsset: DesignerTask | null;
  /** Tarea en curso (status = in_progress). */
  activeTask: DesignerTask | null;
  /** Siguiente tarea sugerida (status = ready_to_start con mayor score). */
  nextSuggestedTask: DesignerTask | null;
  /** Cola de pendientes activos (excluye completados), ordenada por score desc. */
  taskQueue: DesignerTask[];
  dailyStats: DailyStats;
  /** Sesion activa o bloqueada del disenador. IMPL-20260506-52 */
  activeSession: ActiveSession | null;
  /** Estadisticas filtradas al dia actual derivadas de work_sessions. IMPL-20260506-52 */
  dailyStatsToday: DailyStatsToday;
  /** Propuestas reales del activo enfocado (tarea activa o siguiente sugerida). */
  proposalDrafts: DesignerProposalDraft[];
  /** Contexto operativo resumido del proyecto para el rail derecho. IMPL-20260513-20 */
  projectContext: ProjectContext | null;
  /** Vacios honestos documentados. */
  gaps: string[];
  isEmpty: boolean;
};

// ─── Funciones puras y testeables ────────────────────────────────────────────

/**
 * Mapea el estado del activo al estado operativo del disenador.
 * Si hay una sesion bloqueada para ese activo, retorna 'blocked'. IMPL-20260506-52
 */
export function mapAssetStatusToDesignerStatus(
  status: string,
  sessionStatus?: WorkSessionStatus
): DesignerTaskStatus {
  if (sessionStatus === "blocked") return "blocked";
  switch (status) {
    case "draft":
      return "ready_to_start";
    case "in_progress":
      return "in_progress";
    case "in_review":
      return "ready_for_review";
    case "approved":
    case "delivered":
      return "completed";
    default:
      return "ready_to_start";
  }
}

/**
 * Sugiere la herramienta creativa de Adobe segun el tipo de pieza.
 * Orden recomendado por SPEC-40: Firefly -> Express -> Photoshop.
 * IMPL-20260506-44
 */
export function suggestCreativeTool(pieceTypeCode: string): CreativeTool {
  if (["imagen", "portada", "banner"].includes(pieceTypeCode)) return "firefly";
  if (["carousel", "historia", "reel", "video"].includes(pieceTypeCode))
    return "adobe_express";
  if (["copy", "anuncio_texto"].includes(pieceTypeCode)) return "other";
  return "photoshop";
}

/**
 * Devuelve las acciones disponibles segun el estado actual del pendiente (SPEC-40).
 * IMPL-20260506-44
 */
export function getAvailableActions(status: DesignerTaskStatus): DesignerAction[] {
  switch (status) {
    case "ready_to_start":
      return ["start"];
    case "in_progress":
      return ["block", "finish", "ready_for_review"];
    case "blocked":
      return ["resume"];
    case "ready_for_review":
      return ["finish"];
    case "completed":
      return [];
  }
}

/**
 * Calcula el score de prioridad de un pendiente del disenador.
 * Mayor score = mayor urgencia de atencion.
 * IMPL-20260506-44
 */
export function scoreDesignerTask(
  task: Pick<DesignerTask, "status" | "promptText">
): number {
  let score = 0;
  if (task.status === "in_progress") score += 50;
  else if (task.status === "ready_to_start") score += 30;
  else if (task.status === "ready_for_review") score += 20;
  // Prompt activo = listo para saltar a estacion creativa
  if (task.promptText) score += 15;
  return score;
}

/**
 * Deriva estadisticas de la jornada desde la lista de tareas (acumulado historico).
 * Para el filtro diario real usar deriveDailyStatsFromSessions. IMPL-20260506-44
 */
export function deriveDailyStats(tasks: DesignerTask[]): DailyStats {
  return {
    completedCount: tasks.filter((t) => t.status === "completed").length,
    inProgressCount: tasks.filter((t) => t.status === "in_progress").length,
    readyToStartCount: tasks.filter((t) => t.status === "ready_to_start").length,
    blockedCount: tasks.filter((t) => t.status === "blocked").length,
    effectiveMinutesNote:
      "V1: el resumen historico no expone tiempo efectivo; ver work_sessions y dailyStatsToday para el dia actual"
  };
}

// ─── Tipos internos de sesion (derivacion desde DB) ──────────────────────────

/** Fila interna de work_sessions tal como viene de la DB. */
export type WorkSessionRow = {
  id: string;
  asset_id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  blocked_reason: string | null;
};

/**
 * Construye un ActiveSession desde una fila de work_sessions.
 * Retorna null si la fila no existe o tiene status 'completed'. IMPL-20260506-52
 */
export function buildActiveSession(row: WorkSessionRow | null): ActiveSession | null {
  if (!row || row.status === "completed") return null;
  const status = row.status as WorkSessionStatus;
  const startedMs = new Date(row.started_at).getTime();
  const nowMs = Date.now();
  const elapsedMinutes = Math.floor((nowMs - startedMs) / 60_000);
  return {
    sessionId: row.id,
    assetId: row.asset_id,
    status,
    startedAt: row.started_at,
    blockedReason: row.blocked_reason,
    elapsedMinutes
  };
}

/**
 * Deriva estadisticas filtradas al dia actual desde work_sessions.
 * Solo cuenta sesiones cuyo started_at >= inicio del dia indicado. IMPL-20260506-52
 */
export function deriveDailyStatsFromSessions(
  sessions: WorkSessionRow[],
  date: string
): DailyStatsToday {
  const completed = sessions.filter((s) => s.status === "completed");
  const blocked = sessions.filter((s) => s.status === "blocked");

  let effectiveMinutesToday = 0;
  for (const s of completed) {
    if (s.ended_at) {
      const diff = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
      effectiveMinutesToday += Math.max(0, Math.floor(diff / 60_000));
    }
  }

  // Para bloqueadas: tiempo desde started_at hasta ended_at (si se retoomo) o hasta now
  let blockedMinutesToday = 0;
  for (const s of blocked) {
    const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
    const diff = end - new Date(s.started_at).getTime();
    blockedMinutesToday += Math.max(0, Math.floor(diff / 60_000));
  }

  const lastCompleted = completed
    .filter((s) => s.ended_at)
    .sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime());

  return {
    completedCountToday: completed.length,
    effectiveMinutesToday,
    blockedMinutesToday,
    lastSessionEndedAt: lastCompleted[0]?.ended_at ?? null,
    date
  };
}

// ─── Vacios honestos actualizados (IMPL-20260506-52) ─────────────────────────

const V1_GAPS: string[] = [];

// ─── Tipos internos de filas DB ───────────────────────────────────────────────

// ─── Tipo de contexto general del proyecto (SPEC ARCH-20260513-20) ─────────────

/**
 * Contexto operativo resumido del proyecto para el rail derecho del workspace.
 * Derivado del project.objective, client.name y brief vinculado al activo enfocado.
 * IMPL-20260513-20
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-20_workspace_disenador_estacion_unica_v2.md
 */
export type ProjectContext = {
  clientName: string | null;
  projectName: string | null;
  /** Resumen del negocio del cliente — de brief_versions.structured_summary_json.businessContext. */
  businessSummary: string | null;
  /** Objetivo del proyecto — de projects.objective. */
  projectObjective: string | null;
  /** Oferta o mensaje principal — de brief_versions.structured_summary_json.mainOffer. */
  offerSummary: string | null;
  /** Tono o direccion general — de brief_versions.structured_summary_json.tone. */
  toneSummary: string | null;
  /** Criterios que no deben romperse — de brief_versions.structured_summary_json.restrictions. */
  nonNegotiables: string[];
};

// ─── Tipos internos de filas DB ───────────────────────────────────────────────

type TenantRow = { id: string; slug: string };
type ProjectRow = { id: string; client_id: string; name: string; objective: string | null };
type ClientRow = { id: string; name: string };

type AssetRow = {
  id: string;
  client_id: string;
  project_id: string;
  brief_id: string | null;
  application_code: string;
  piece_type_code: string;
  format_code: string;
  title: string;
  status: string;
  updated_at: string;
};

type PromptVersionRow = {
  id: string;
  asset_id: string;
  version_number: number;
  prompt_text: string;
  status: string;
};

type ProposalRow = {
  id: string;
  asset_id: string;
  prompt_version_id: string | null;
  is_primary: boolean;
  note: string;
  tool_used: string;
  review_decision: string;
  created_at: string;
};

type ProposalEvidenceRow = {
  proposal_id: string;
  file_name: string;
  uploaded_at: string;
};

// ─── Helpers de fetch ─────────────────────────────────────────────────────────

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

async function fetchTenantId(slug: string): Promise<string | null> {
  const params = new URLSearchParams({ select: "id,slug", slug: `eq.${slug}`, limit: "1" });
  const rows = await postgrest<TenantRow[]>(`tenants?${params.toString()}`);
  return rows[0]?.id ?? null;
}

async function fetchAssets(tenantId: string): Promise<AssetRow[]> {
  const params = new URLSearchParams({
    select:
      "id,client_id,project_id,brief_id,application_code,piece_type_code,format_code,title,status,updated_at",
    tenant_id: `eq.${tenantId}`,
    status: "not.eq.archived",
    order: "updated_at.desc"
  });
  return postgrest<AssetRow[]>(`assets?${params.toString()}`);
}

async function fetchActivePrompts(tenantId: string): Promise<PromptVersionRow[]> {
  const params = new URLSearchParams({
    select: "id,asset_id,version_number,prompt_text,status",
    tenant_id: `eq.${tenantId}`,
    status: "eq.active"
  });
  return postgrest<PromptVersionRow[]>(`asset_prompt_versions?${params.toString()}`);
}

async function fetchProjects(tenantId: string): Promise<ProjectRow[]> {
  const params = new URLSearchParams({
    select: "id,client_id,name,objective",
    tenant_id: `eq.${tenantId}`
  });
  return postgrest<ProjectRow[]>(`projects?${params.toString()}`);
}

/** Fila interna de brief_versions con el resumen estructurado. */
type BriefVersionRow = {
  brief_id: string;
  structured_summary_json: Record<string, unknown>;
};

/**
 * Obtiene el resumen estructurado del brief para un activo via su briefId.
 * Solo trae la version con estado aprobado o en revision — la mas reciente.
 * IMPL-20260513-20
 */
async function fetchBriefSummary(briefId: string): Promise<BriefVersionRow | null> {
  const params = new URLSearchParams({
    select: "brief_id,structured_summary_json",
    brief_id: `eq.${briefId}`,
    status: "in.(approved_locked,pending_operator_review,operator_review_in_progress,stage_3_commercial_fit)",
    order: "version_number.desc",
    limit: "1"
  });
  const rows = await postgrest<BriefVersionRow[]>(`brief_versions?${params.toString()}`);
  return rows[0] ?? null;
}

/**
 * Construye el ProjectContext a partir de los datos ya disponibles y el brief resumen.
 * IMPL-20260513-20
 */
function buildProjectContext(
  focusedTask: DesignerTask | null,
  projectMap: Map<string, ProjectRow>,
  briefVersion: BriefVersionRow | null
): ProjectContext | null {
  if (!focusedTask) return null;
  const project = projectMap.get(focusedTask.projectId);
  const summary = briefVersion?.structured_summary_json ?? {};

  const restrictionsRaw = typeof summary.restrictions === "string" ? summary.restrictions : "";
  const nonNegotiables = restrictionsRaw
    ? restrictionsRaw
        .split(/\n|;/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return {
    clientName: focusedTask.clientName,
    projectName: focusedTask.projectName,
    projectObjective: project?.objective ?? null,
    businessSummary:
      typeof summary.businessContext === "string" ? summary.businessContext || null : null,
    offerSummary:
      typeof summary.mainOffer === "string" ? summary.mainOffer || null : null,
    toneSummary:
      typeof summary.tone === "string" ? summary.tone || null : null,
    nonNegotiables
  };
}

async function fetchClients(tenantId: string): Promise<ClientRow[]> {
  const params = new URLSearchParams({
    select: "id,name",
    tenant_id: `eq.${tenantId}`
  });
  return postgrest<ClientRow[]>(`clients?${params.toString()}`);
}

/**
 * Obtiene la sesion activa o bloqueada del disenador.
 * Retorna la mas reciente con status IN ('active', 'blocked'). IMPL-20260506-52
 */
async function fetchActiveSessionRow(tenantId: string): Promise<WorkSessionRow | null> {
  const params = new URLSearchParams({
    select: "id,asset_id,started_at,ended_at,status,blocked_reason",
    tenant_id: `eq.${tenantId}`,
    status: "in.(active,blocked)",
    order: "updated_at.desc",
    limit: "1"
  });
  const rows = await postgrest<WorkSessionRow[]>(`work_sessions?${params.toString()}`);
  return rows[0] ?? null;
}

/**
 * Obtiene todas las sesiones cuyo started_at >= inicio del dia indicado.
 * El parametro `todayIso` debe ser '2026-05-06T00:00:00.000Z'. IMPL-20260506-52
 */
async function fetchTodaySessions(
  tenantId: string,
  todayIso: string
): Promise<WorkSessionRow[]> {
  const params = new URLSearchParams({
    select: "id,asset_id,started_at,ended_at,status,blocked_reason",
    tenant_id: `eq.${tenantId}`,
    started_at: `gte.${todayIso}`,
    order: "started_at.desc"
  });
  return postgrest<WorkSessionRow[]>(`work_sessions?${params.toString()}`);
}

async function fetchProposalDraftsForAsset(assetId: string): Promise<DesignerProposalDraft[]> {
  const proposalParams = new URLSearchParams({
    select: "id,asset_id,prompt_version_id,is_primary,note,tool_used,review_decision,created_at",
    asset_id: `eq.${assetId}`,
    order: "created_at.desc"
  });

  const proposals = await postgrest<ProposalRow[]>(`asset_proposals?${proposalParams.toString()}`);
  if (proposals.length === 0) return [];

  const proposalIds = proposals.map((proposal) => proposal.id);
  const evidenceParams = new URLSearchParams({
    select: "proposal_id,file_name,uploaded_at",
    proposal_id: `in.(${proposalIds.join(",")})`,
    order: "uploaded_at.desc"
  });

  let evidences: ProposalEvidenceRow[] = [];
  try {
    evidences = await postgrest<ProposalEvidenceRow[]>(
      `asset_proposal_evidences?${evidenceParams.toString()}`
    );
  } catch {
    evidences = [];
  }

  const evidenceByProposalId = new Map<string, ProposalEvidenceRow>();
  for (const evidence of evidences) {
    if (!evidenceByProposalId.has(evidence.proposal_id)) {
      evidenceByProposalId.set(evidence.proposal_id, evidence);
    }
  }

  return proposals.map((proposal) => {
    const evidence = evidenceByProposalId.get(proposal.id) ?? null;
    return {
      id: proposal.id,
      isPrimary: proposal.is_primary,
      note: proposal.note,
      toolUsed: proposal.tool_used as CreativeTool,
      reviewDecision: proposal.review_decision,
      promptVersionId: proposal.prompt_version_id,
      evidenceFileName: evidence?.file_name ?? null,
      hasEvidence: Boolean(evidence),
      createdAt: proposal.created_at
    };
  });
}

// ─── Funcion principal ────────────────────────────────────────────────────────

/**
 * Obtiene el workspace del disenador con sesiones reales y jornada diaria.
 * IMPL-20260506-44 | IMPL-20260506-52
 */
export async function getDesignerWorkspace(
  tenantSlug = supabaseEnv.defaultTenant
): Promise<DesignerWorkspace> {
  const generatedAt = new Date().toISOString();

  // Inicio del dia actual en UTC para filtrar jornada
  const now = new Date(generatedAt);
  const todayDateStr = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const todayIso = `${todayDateStr}T00:00:00.000Z`;

  const emptyDailyStatsToday: DailyStatsToday = {
    completedCountToday: 0,
    effectiveMinutesToday: 0,
    blockedMinutesToday: 0,
    lastSessionEndedAt: null,
    date: todayDateStr
  };

  const base: DesignerWorkspace = {
    tenantSlug,
    generatedAt,
    focusedAsset: null,
    activeTask: null,
    nextSuggestedTask: null,
    taskQueue: [],
    dailyStats: deriveDailyStats([]),
    activeSession: null,
    dailyStatsToday: emptyDailyStatsToday,
    proposalDrafts: [],
    projectContext: null,
    gaps: V1_GAPS,
    isEmpty: true
  };

  if (!isSupabaseConfigured) return base;

  const tenantId = await fetchTenantId(tenantSlug);
  if (!tenantId) return base;

  const [assets, prompts, projects, clients, activeSessionRow, todaySessions] =
    await Promise.all([
      fetchAssets(tenantId),
      fetchActivePrompts(tenantId),
      fetchProjects(tenantId),
      fetchClients(tenantId),
      fetchActiveSessionRow(tenantId),
      fetchTodaySessions(tenantId, todayIso)
    ]);

  if (assets.length === 0) {
    return {
      ...base,
      activeSession: buildActiveSession(activeSessionRow),
      dailyStatsToday: deriveDailyStatsFromSessions(todaySessions, todayDateStr),
      projectContext: null
    };
  }

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const promptByAsset = new Map(prompts.map((p) => [p.asset_id, p]));

  // Sesion activa: enriquecer el asset correspondiente con estado blocked si aplica
  const activeSessionAssetId = activeSessionRow?.asset_id ?? null;
  const activeSessionStatus =
    activeSessionRow && activeSessionRow.status !== "completed"
      ? (activeSessionRow.status as WorkSessionStatus)
      : undefined;

  const tasks: DesignerTask[] = assets.map((asset): DesignerTask => {
    const project = projectMap.get(asset.project_id);
    const clientName = project
      ? (clientMap.get(project.client_id) ?? "Cliente desconocido")
      : "Cliente desconocido";
    const prompt = promptByAsset.get(asset.id) ?? null;
    // Si este activo tiene la sesion activa/bloqueada, propagar el sessionStatus
    const thisAssetSessionStatus =
      asset.id === activeSessionAssetId ? activeSessionStatus : undefined;
    const status = mapAssetStatusToDesignerStatus(asset.status, thisAssetSessionStatus);
    const suggestedTool = suggestCreativeTool(asset.piece_type_code);
    const score = scoreDesignerTask({ status, promptText: prompt?.prompt_text ?? null });

    let priorityReason = "";
    let suggestedAction = "";

    if (status === "blocked") {
      const reason = activeSessionRow?.blocked_reason ?? "";
      priorityReason = reason
        ? `Bloqueado: ${reason}`
        : "Tarea bloqueada — el disenador reporto un impedimento.";
      suggestedAction = "Resolver el bloqueo y retomar la sesion desde /disenador.";
    } else if (status === "in_progress") {
      priorityReason = prompt
        ? "En produccion con prompt activo — listo para saltar a estacion creativa."
        : "En produccion sin prompt activo — requiere definicion antes de avanzar.";
      suggestedAction = prompt
        ? "Abrir contexto y saltar a estacion creativa (Firefly / Express / Photoshop)."
        : "Solicitar prompt al operador antes de continuar produccion.";
    } else if (status === "ready_to_start") {
      priorityReason = prompt
        ? "Listo para empezar — tiene prompt activo y contexto disponible."
        : "Pendiente de prompt — el brief puede estar incompleto.";
      suggestedAction = prompt
        ? "Iniciar tarea y saltar a estacion creativa."
        : "Esperar prompt del operador o revisar el brief vinculado.";
    } else if (status === "ready_for_review") {
      priorityReason = "Propuestas listas para regreso a Bridge — pendiente de revision.";
      suggestedAction = "Registrar propuestas y marcar para revision del operador.";
    } else {
      priorityReason = "Activo completado o entregado — sin accion requerida.";
      suggestedAction = "Revisar historial del activo si hay dudas.";
    }

    return {
      assetId: asset.id,
      assetTitle: asset.title,
      operationalKind: resolveAssetOperationalKind(asset.title),
      projectId: asset.project_id,
      projectName: project?.name ?? "Proyecto desconocido",
      clientName,
      pieceTypeCode: asset.piece_type_code,
      applicationCode: asset.application_code,
      formatCode: asset.format_code,
      status,
      promptText: prompt?.prompt_text ?? null,
      promptVersion: prompt?.version_number ?? null,
      briefId: asset.brief_id,
      suggestedTool,
      priorityScore: score,
      priorityReason,
      suggestedAction,
      updatedAt: asset.updated_at
    };
  });

  // Cola: todo excepto completados, ordenada por score desc
  const taskQueue = tasks
    .filter((t) => t.status !== "completed")
    .sort((a, b) => b.priorityScore - a.priorityScore);

  // Tarea activa: priorizar blocked (sesion bloqueada), luego in_progress
  const activeTask =
    taskQueue.find((t) => t.status === "blocked") ??
    taskQueue.find((t) => t.status === "in_progress") ??
    null;

  // Siguiente sugerida: primera ready_to_start (distinta a activeTask)
  const nextSuggestedTask =
    taskQueue.find((t) => t.status === "ready_to_start" && t !== activeTask) ??
    taskQueue.find((t) => t.status === "ready_for_review" && t !== activeTask) ??
    null;

  const focusedAsset = activeTask ?? nextSuggestedTask ?? null;
  const focusAssetId = focusedAsset?.assetId ?? null;

  // Fetch en paralelo: propuestas y resumen del brief del activo enfocado
  const [proposalDrafts, briefVersion] = await Promise.all([
    focusAssetId ? fetchProposalDraftsForAsset(focusAssetId) : Promise.resolve([]),
    focusedAsset?.briefId
      ? fetchBriefSummary(focusedAsset.briefId)
      : Promise.resolve(null)
  ]);

  const projectContext = buildProjectContext(focusedAsset, projectMap, briefVersion);

  return {
    tenantSlug,
    generatedAt,
    focusedAsset,
    activeTask,
    nextSuggestedTask,
    taskQueue,
    dailyStats: deriveDailyStats(tasks),
    activeSession: buildActiveSession(activeSessionRow),
    dailyStatsToday: deriveDailyStatsFromSessions(todaySessions, todayDateStr),
    proposalDrafts,
    projectContext,
    gaps: V1_GAPS,
    isEmpty: taskQueue.length === 0
  };
}
