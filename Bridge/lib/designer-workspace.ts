/**
 * IMPL-20260506-44
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-40_modelo_ejecucion_disenador_sesiones_y_estados.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-41_workspace_disenador_guiado.md
 */
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

export type DailyStats = {
  completedCount: number;
  inProgressCount: number;
  readyToStartCount: number;
  blockedCount: number;
  /** V1: sin tabla work_sessions — tiempo efectivo no disponible. */
  effectiveMinutesNote: string;
};

export type DesignerWorkspace = {
  tenantSlug: string;
  generatedAt: string;
  /** Tarea en curso (status = in_progress). */
  activeTask: DesignerTask | null;
  /** Siguiente tarea sugerida (status = ready_to_start con mayor score). */
  nextSuggestedTask: DesignerTask | null;
  /** Cola de pendientes activos (excluye completados), ordenada por score desc. */
  taskQueue: DesignerTask[];
  dailyStats: DailyStats;
  /** V1: tabla asset_proposals pendiente — propuestas registradas manualmente. */
  proposalDraftsNote: string;
  /** Vacios honestos documentados de V1. */
  gaps: string[];
  isEmpty: boolean;
};

// ─── Funciones puras y testeables ────────────────────────────────────────────

/**
 * Mapea el estado del activo al estado operativo del disenador.
 * V1: `blocked` no se puede derivar de asset status (requiere designer_tasks).
 * IMPL-20260506-44
 */
export function mapAssetStatusToDesignerStatus(status: string): DesignerTaskStatus {
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
  else if (task.status === "ready_for_review") score += 30;
  else if (task.status === "ready_to_start") score += 20;
  // Prompt activo = listo para saltar a estacion creativa
  if (task.promptText) score += 15;
  return score;
}

/**
 * Deriva estadisticas de la jornada desde la lista de tareas.
 * V1: sin tabla work_sessions, sin filtro de "hoy".
 * IMPL-20260506-44
 */
export function deriveDailyStats(tasks: DesignerTask[]): DailyStats {
  return {
    completedCount: tasks.filter((t) => t.status === "completed").length,
    inProgressCount: tasks.filter((t) => t.status === "in_progress").length,
    readyToStartCount: tasks.filter((t) => t.status === "ready_to_start").length,
    blockedCount: tasks.filter((t) => t.status === "blocked").length,
    effectiveMinutesNote:
      "No disponible en V1 — requiere tabla work_sessions para registrar sesiones"
  };
}

// ─── Vacios honestos de V1 ────────────────────────────────────────────────────

const V1_GAPS = [
  "work_sessions: tabla no existe — duracion y tiempo efectivo de sesion no disponible",
  "designer_tasks: tabla no existe — estado blocked no persiste, depende de asset status",
  "asset_proposals: tabla no existe — propuestas de regreso a Bridge se registran manualmente",
  "daily_time_filter: completedCount incluye todos los completados, no solo los de hoy"
];

// ─── Tipos de filas DB ────────────────────────────────────────────────────────

type TenantRow = { id: string; slug: string };
type ProjectRow = { id: string; client_id: string; name: string };
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
    select: "id,client_id,name",
    tenant_id: `eq.${tenantId}`
  });
  return postgrest<ProjectRow[]>(`projects?${params.toString()}`);
}

async function fetchClients(tenantId: string): Promise<ClientRow[]> {
  const params = new URLSearchParams({
    select: "id,name",
    tenant_id: `eq.${tenantId}`
  });
  return postgrest<ClientRow[]>(`clients?${params.toString()}`);
}

// ─── Funcion principal ────────────────────────────────────────────────────────

/**
 * Obtiene el workspace del disenador derivado desde entidades existentes.
 * Vacios V1 documentados en el campo `gaps`.
 * IMPL-20260506-44
 */
export async function getDesignerWorkspace(
  tenantSlug = supabaseEnv.defaultTenant
): Promise<DesignerWorkspace> {
  const generatedAt = new Date().toISOString();
  const proposalDraftsNote =
    "V1: tabla asset_proposals pendiente — propuestas se registran manualmente hasta ese corte";

  const base: DesignerWorkspace = {
    tenantSlug,
    generatedAt,
    activeTask: null,
    nextSuggestedTask: null,
    taskQueue: [],
    dailyStats: deriveDailyStats([]),
    proposalDraftsNote,
    gaps: V1_GAPS,
    isEmpty: true
  };

  if (!isSupabaseConfigured) return base;

  const tenantId = await fetchTenantId(tenantSlug);
  if (!tenantId) return base;

  const [assets, prompts, projects, clients] = await Promise.all([
    fetchAssets(tenantId),
    fetchActivePrompts(tenantId),
    fetchProjects(tenantId),
    fetchClients(tenantId)
  ]);

  if (assets.length === 0) return base;

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const promptByAsset = new Map(prompts.map((p) => [p.asset_id, p]));

  const tasks: DesignerTask[] = assets.map((asset): DesignerTask => {
    const project = projectMap.get(asset.project_id);
    const clientName = project
      ? (clientMap.get(project.client_id) ?? "Cliente desconocido")
      : "Cliente desconocido";
    const prompt = promptByAsset.get(asset.id) ?? null;
    const status = mapAssetStatusToDesignerStatus(asset.status);
    const suggestedTool = suggestCreativeTool(asset.piece_type_code);
    const score = scoreDesignerTask({ status, promptText: prompt?.prompt_text ?? null });

    let priorityReason = "";
    let suggestedAction = "";

    if (status === "in_progress") {
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

  // Tarea activa: primera in_progress (mayor score)
  const activeTask = taskQueue.find((t) => t.status === "in_progress") ?? null;

  // Siguiente sugerida: primera ready_to_start (distinta a activeTask)
  const nextSuggestedTask =
    taskQueue.find((t) => t.status === "ready_to_start" && t !== activeTask) ??
    taskQueue.find((t) => t.status === "ready_for_review" && t !== activeTask) ??
    null;

  return {
    tenantSlug,
    generatedAt,
    activeTask,
    nextSuggestedTask,
    taskQueue,
    dailyStats: deriveDailyStats(tasks),
    proposalDraftsNote,
    gaps: V1_GAPS,
    isEmpty: taskQueue.length === 0
  };
}
