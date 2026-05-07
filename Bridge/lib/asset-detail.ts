/**
 * IMPL-20260506-45
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-45_vista_detallada_activo_creativo_y_propuestas.md
 *
 * Capa reusable server-side para la vista detallada del activo creativo.
 * Contrato mínimo (SPEC-45): assetDetail, assetContext, promptVersion,
 * creativeToolSuggestion, proposalDrafts, reviewState, conversationThread,
 * sourceRefs, gaps.
 */
import { getAssetChat, type EntityChat } from "./chat";
import { suggestCreativeTool, type CreativeTool } from "./designer-workspace";
import { assetStatusLabel, type Asset, type AssetPromptVersion, type AssetStatus } from "./assets";
import { isSupabaseConfigured, supabaseEnv } from "./supabase";

// ─── Tipos del contrato (SPEC-45) ─────────────────────────────────────────────

/**
 * Estado de revision y flujo del activo (SPEC-45 §4).
 * V1: isBlocked siempre false — requiere tabla designer_tasks.
 */
export type ReviewState = {
  currentStatus: AssetStatus;
  statusLabel: string;
  /** Activo en borrador, listo para que el diseñador produzca. */
  readyForProduction: boolean;
  /** Activo en produccion activa en la estacion Adobe. */
  inProduction: boolean;
  /** Activo en revision, propuesta devuelta a Bridge. */
  readyForReview: boolean;
  /** Activo aprobado o entregado. */
  isApproved: boolean;
  /** V1: siempre false — requiere tabla designer_tasks para derivar bloqueos. */
  isBlocked: boolean;
};

/**
 * Propuesta candidata del disenador (SPEC-45 §2).
 * V1: tabla asset_proposals no existe — lista siempre vacia.
 */
export type ProposalDraft = {
  id: string;
  note: string;
  toolUsed: CreativeTool;
  promptVersionId: string;
  createdAt: string;
};

/** Referencia de contexto extraida del referencesJson del prompt. */
export type SourceRef = {
  key: string;
  value: string;
};

/** Vista detallada completa de un activo (SPEC-45 contrato minimo). */
export type AssetDetailFull = {
  /** Activo base con historial de versiones de prompt (SPEC-45 §1). */
  assetDetail: {
    asset: Asset;
    promptHistory: AssetPromptVersion[];
  };
  /** IDs de contexto del activo (SPEC-45 §1). */
  assetContext: {
    clientId: string;
    projectId: string;
    briefId: string | null;
    quotationId: string | null;
  };
  /** Prompt vigente del activo — null si no existe (SPEC-45 §1). */
  promptVersion: AssetPromptVersion | null;
  /** Herramienta creativa sugerida y flujo Bridge -> Adobe -> Bridge (SPEC-45 §3). */
  creativeToolSuggestion: {
    tool: CreativeTool;
    label: string;
    description: string;
  };
  /** Propuestas candidatas V1 — siempre vacio, tabla asset_proposals no existe (SPEC-45 §2). */
  proposalDrafts: ProposalDraft[];
  /** Estado de revision derivado del status del activo (SPEC-45 §4). */
  reviewState: ReviewState;
  /** Conversacion contextual del activo (SPEC-45 §1). */
  conversationThread: EntityChat;
  /** Referencias de contexto derivadas del referencesJson del prompt activo. */
  sourceRefs: SourceRef[];
  /** Vacios honestos documentados de V1 (SPEC-45 principios). */
  gaps: string[];
};

// ─── Metadatos de herramientas creativas ──────────────────────────────────────

const CREATIVE_TOOL_META: Record<CreativeTool, { label: string; description: string }> = {
  firefly: {
    label: "Adobe Firefly",
    description: "Generacion inicial de imagenes con IA. Primer paso del flujo creativo."
  },
  adobe_express: {
    label: "Adobe Express",
    description: "Variaciones, adaptaciones de formato y composiciones rapidas."
  },
  photoshop: {
    label: "Photoshop",
    description: "Pulido fino y ajustes avanzados sobre la pieza base."
  },
  other: {
    label: "Herramienta de texto",
    description: "Redaccion y edicion de copy sin herramienta grafica."
  }
};

// ─── Vacios honestos de V1 ────────────────────────────────────────────────────

const V1_GAPS: string[] = [
  "asset_proposals: tabla no existe — propuestas candidatas son vacias en V1",
  "proposal_comparison: sin comparador visual entre propuestas en V1",
  "file_upload: carga binaria de archivos no implementada en V1",
  "client_approval: aprobacion final del cliente no disponible en esta ficha V1",
  "analytics_per_asset: historial de metricas por activo no disponible en V1"
];

// ─── Funciones puras (testeables) ─────────────────────────────────────────────

/**
 * Resuelve el estado de revision del activo desde su status.
 * IMPL-20260506-45
 */
export function resolveReviewState(status: AssetStatus): ReviewState {
  return {
    currentStatus: status,
    statusLabel: assetStatusLabel(status),
    readyForProduction: status === "draft",
    inProduction: status === "in_progress",
    readyForReview: status === "in_review",
    isApproved: status === "approved" || status === "delivered",
    // V1: sin tabla designer_tasks, blocked no se puede derivar del status del activo
    isBlocked: false
  };
}

/**
 * Devuelve lista de propuestas candidatas.
 * V1: siempre vacio honesto — tabla asset_proposals no existe.
 * IMPL-20260506-45
 */
export function buildV1ProposalDrafts(): ProposalDraft[] {
  return [];
}

/**
 * Extrae referencias de contexto desde el referencesJson del prompt.
 * Omite entradas con valor null o undefined.
 * IMPL-20260506-45
 */
export function buildSourceRefs(prompt: AssetPromptVersion | null): SourceRef[] {
  if (!prompt?.referencesJson) return [];
  return Object.entries(prompt.referencesJson)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([key, value]) => ({ key, value: String(value) }));
}

/**
 * Construye la sugerencia de herramienta creativa para el tipo de pieza.
 * Reutiliza la logica del workspace del disenador (SPEC-40).
 * IMPL-20260506-45
 */
export function buildCreativeToolSuggestion(pieceTypeCode: string): {
  tool: CreativeTool;
  label: string;
  description: string;
} {
  const tool = suggestCreativeTool(pieceTypeCode);
  return { tool, ...CREATIVE_TOOL_META[tool] };
}

// ─── Tipos de filas DB ────────────────────────────────────────────────────────

type AssetRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  project_id: string;
  quotation_id: string | null;
  quotation_version_id: string | null;
  brief_id: string | null;
  application_code: string;
  piece_type_code: string;
  placement_code: string;
  format_code: string;
  title: string;
  status: AssetStatus;
  created_at: string;
  updated_at: string;
};

type PromptVersionRow = {
  id: string;
  tenant_id: string;
  asset_id: string;
  version_number: number;
  prompt_text: string;
  references_json: Record<string, unknown> | null;
  status: string;
  created_by_user_id: string | null;
  created_by_agent_id: string | null;
  created_at: string;
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

function normalizeAssetRow(row: AssetRow): Asset {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    projectId: row.project_id,
    quotationId: row.quotation_id,
    quotationVersionId: row.quotation_version_id,
    briefId: row.brief_id,
    applicationCode: row.application_code,
    pieceTypeCode: row.piece_type_code,
    placementCode: row.placement_code,
    formatCode: row.format_code,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizePromptVersionRow(row: PromptVersionRow): AssetPromptVersion {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    assetId: row.asset_id,
    versionNumber: row.version_number,
    promptText: row.prompt_text,
    referencesJson: row.references_json,
    status: row.status as AssetPromptVersion["status"],
    createdByUserId: row.created_by_user_id,
    createdByAgentId: row.created_by_agent_id,
    createdAt: row.created_at
  };
}

// ─── Función pública ──────────────────────────────────────────────────────────

/**
 * Obtiene la vista detallada completa de un activo por ID.
 * Reune: activo, historial de prompts, chat, herramienta sugerida,
 * estado de revision, propuestas V1 vacias y vacios honestos.
 * Devuelve null si Supabase no esta configurado o el activo no existe.
 * IMPL-20260506-45
 */
export async function getFullAssetDetail(assetId: string): Promise<AssetDetailFull | null> {
  if (!isSupabaseConfigured) return null;

  const assetParams = new URLSearchParams({
    select:
      "id,tenant_id,client_id,project_id,quotation_id,quotation_version_id,brief_id," +
      "application_code,piece_type_code,placement_code,format_code,title,status,created_at,updated_at",
    id: `eq.${assetId}`,
    limit: "1"
  });
  const assetRows = await postgrest<AssetRow[]>(`assets?${assetParams.toString()}`, {
    method: "GET"
  });
  if (!assetRows[0]) return null;
  const asset = normalizeAssetRow(assetRows[0]);

  const promptParams = new URLSearchParams({
    select:
      "id,tenant_id,asset_id,version_number,prompt_text,references_json," +
      "status,created_by_user_id,created_by_agent_id,created_at",
    asset_id: `eq.${assetId}`,
    order: "version_number.desc"
  });
  const promptRows = await postgrest<PromptVersionRow[]>(
    `asset_prompt_versions?${promptParams.toString()}`,
    { method: "GET" }
  );
  const promptHistory = promptRows.map(normalizePromptVersionRow);
  const activePrompt =
    promptHistory.find((p) => p.status === "active") ?? promptHistory[0] ?? null;

  const chat = await getAssetChat(assetId);

  return {
    assetDetail: { asset, promptHistory },
    assetContext: {
      clientId: asset.clientId,
      projectId: asset.projectId,
      briefId: asset.briefId,
      quotationId: asset.quotationId
    },
    promptVersion: activePrompt,
    creativeToolSuggestion: buildCreativeToolSuggestion(asset.pieceTypeCode),
    proposalDrafts: buildV1ProposalDrafts(),
    reviewState: resolveReviewState(asset.status),
    conversationThread: chat,
    sourceRefs: buildSourceRefs(activePrompt),
    gaps: V1_GAPS
  };
}
