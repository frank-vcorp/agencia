/**
 * IMPL-20260506-47
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-47_activo_archivos_y_evidencias_reales.md
 *
 * Capa reusable server-side para la vista detallada del activo creativo.
 * Contrato mínimo (SPEC-45): assetDetail, assetContext, promptVersion,
 * creativeToolSuggestion, proposalDrafts, reviewState, conversationThread,
 * sourceRefs, gaps.
 * Contrato extendido (SPEC-46): primaryProposal, secondaryProposal,
 * proposalComparisonNote, reviewDecision — persistencia real de propuestas.
 * Contrato extendido (SPEC-47): ProposalEvidence, upload real a Storage,
 * signed URL por propuesta — cierra el vacio file_upload.
 */
import { getAssetChat, type EntityChat } from "./chat";
import { suggestCreativeTool, type CreativeTool } from "./designer-workspace";
import { assetStatusLabel, type Asset, type AssetPromptVersion, type AssetStatus } from "./assets";

// Re-exportar AssetPromptVersion: se usa en firmas exportadas de este módulo (IMPL-20260513-19)
export type { AssetPromptVersion };
import { isSupabaseConfigured, supabaseEnv } from "./supabase";

// ─── Tipos del contrato (SPEC-45 + SPEC-46) ──────────────────────────────────

/**
 * Decision operativa interna sobre una propuesta (SPEC-46 §3).
 * pending           — sin decision aun, propuesta recibida
 * needs_adjustment  — devuelta al disenador para ajuste
 * in_review         — en revision por el operador
 * approved_internal — aprobada operativamente, lista para presentar al cliente
 */
export type ReviewDecision =
  | "pending"
  | "needs_adjustment"
  | "in_review"
  | "approved_internal";

/**
 * Decision final del cliente sobre el activo (SPEC-51 §2).
 * pending_client  — pendiente de aprobacion del cliente
 * approved_client — aprobado por el cliente
 * rejected_changes — cliente solicita cambios o rechaza
 */
export type ClientApprovalStatus =
  | "pending_client"
  | "approved_client"
  | "rejected_changes";

/**
 * Registro operativo de la decision final del cliente (SPEC-51 §2).
 * Una fila por activo en asset_client_approvals.
 */
export type ClientApproval = {
  id: string;
  assetId: string;
  tenantId: string;
  status: ClientApprovalStatus;
  /** Comentario corto opcional del operador al registrar la decision. */
  comment: string | null;
  decidedAt: string;
  createdAt: string;
};

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
 * Evidencia real asociada a una propuesta del disenador (SPEC-47).
 * V1: tabla asset_proposal_evidences + bucket proposal-evidences en Supabase Storage.
 */
export type ProposalEvidence = {
  id: string;
  proposalId: string;
  assetId: string;
  fileName: string;
  mimeType: string;
  /** Ruta relativa dentro del bucket proposal-evidences. */
  storagePath: string;
  fileSizeBytes: number | null;
  uploadedAt: string;
  /** URL firmada de Supabase Storage (expira en 1h); null si no se pudo generar. */
  signedUrl: string | null;
};

/**
 * Propuesta candidata del disenador (SPEC-46 §1 + SPEC-47 evidencia).
 * V1: tabla asset_proposals existe desde migracion 20260506060000.
 */
export type ProposalDraft = {
  id: string;
  /** true si es la propuesta principal del corte; false si es alternativa. */
  isPrimary: boolean;
  note: string;
  toolUsed: CreativeTool;
  /** Referencia al prompt origen; puede ser null si el prompt fue eliminado. */
  promptVersionId: string | null;
  reviewDecision: ReviewDecision;
  createdAt: string;
  /** Evidencia real subida a esta propuesta; null si aun no hay archivo. SPEC-47. */
  evidence: ProposalEvidence | null;
  /** true si la propuesta tiene al menos una evidencia real subida. SPEC-47. */
  hasEvidence: boolean;
};

/**
 * Resumen historico compacto del activo (SPEC-51 §3).
 * Derivado desde los datos ya existentes — sin tabla nueva.
 */
export type AssetAnalytics = {
  /** ISO string de creacion del activo. */
  createdAt: string;
  /** Numero total de propuestas registradas. */
  proposalCount: number;
  /** Propuestas con al menos una evidencia subida. */
  evidenceCount: number;
  /** ISO string de la ultima actividad detectada (updated_at, propuesta o aprobacion). */
  lastActivityAt: string | null;
  /** Dias desde creacion hasta primera aprobacion interna; null si no ha ocurrido. */
  daysToInternalApproval: number | null;
  /** Dias desde creacion hasta aprobacion del cliente; null si no ha ocurrido. */
  daysToClientApproval: number | null;
};

/**
 * Vista de comparacion visual entre propuesta principal y alternativa (SPEC-51 §1).
 * kind="images"          — ambas tienen evidencia de imagen con signedUrl disponible.
 * kind="no_images"       — no aplica comparacion visual (mime no imagen, URL no disponible, etc.).
 * kind="single_proposal" — no hay propuesta secundaria para comparar.
 */
export type ComparisonView =
  | {
      kind: "images";
      primary: {
        signedUrl: string;
        fileName: string;
        toolUsed: string;
        mimeType: string;
        fileSizeBytes: number | null;
      };
      secondary: {
        signedUrl: string;
        fileName: string;
        toolUsed: string;
        mimeType: string;
        fileSizeBytes: number | null;
      };
    }
  | { kind: "no_images"; reason: string }
  | { kind: "single_proposal"; reason: string }
  | null;

/** Referencia de contexto extraida del referencesJson del prompt. */
export type SourceRef = {
  key: string;
  value: string;
};

/** Vista detallada completa de un activo (SPEC-45 + SPEC-46 + SPEC-51 contrato cerrado). */
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
  /** Propuestas candidatas del disenador; vacio si no se han registrado aun (SPEC-46 §1). */
  proposalDrafts: ProposalDraft[];
  /** Propuesta principal: la marcada is_primary=true o la mas reciente (SPEC-46 §2). */
  primaryProposal: ProposalDraft | null;
  /** Propuesta alternativa si existe mas de una (SPEC-46 §2). */
  secondaryProposal: ProposalDraft | null;
  /** Nota de diferencia entre propuesta principal y alternativa (SPEC-46 §2). */
  proposalComparisonNote: string | null;
  /** Decision operativa interna derivada de la propuesta principal (SPEC-46 §3). */
  reviewDecision: ReviewDecision;
  /** Estado de revision derivado del status del activo (SPEC-45 §4). */
  reviewState: ReviewState;
  /** Conversacion contextual del activo (SPEC-45 §1). */
  conversationThread: EntityChat;
  /** Referencias de contexto derivadas del referencesJson del prompt activo. */
  sourceRefs: SourceRef[];
  /** Comparacion visual entre propuesta principal y alternativa (SPEC-51 §1). */
  comparisonView: ComparisonView;
  /** Decision final del cliente registrada por el operador (SPEC-51 §2). */
  clientApproval: ClientApproval | null;
  /** Resumen historico compacto del activo (SPEC-51 §3). */
  assetAnalytics: AssetAnalytics;
  /** Vacios honestos — vacio tras SPEC-51: todos los gaps fueron cerrados. */
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

// ─── Vacios honestos — cerrados en SPEC-51 ────────────────────────────────────
// proposal_comparison  ✓ SPEC-51 §1
// client_approval      ✓ SPEC-51 §2
// analytics_per_asset  ✓ SPEC-51 §3

const V1_GAPS: string[] = [];

// ─── Labels y helpers de decision operativa ───────────────────────────────────

export const REVIEW_DECISION_LABELS: Record<ReviewDecision, string> = {
  pending:           "Pendiente",
  needs_adjustment:  "Requiere ajuste",
  in_review:         "En revision",
  approved_internal: "Aprobada internamente"
};

export const REVIEW_DECISION_COLORS: Record<ReviewDecision, string> = {
  pending:           "bg-slate-50 text-slate-600 ring-slate-200",
  needs_adjustment:  "bg-amber-50 text-amber-700 ring-amber-200",
  in_review:         "bg-violet-50 text-violet-700 ring-violet-200",
  approved_internal: "bg-emerald-50 text-emerald-700 ring-emerald-200"
};

export const CLIENT_APPROVAL_LABELS: Record<ClientApprovalStatus, string> = {
  pending_client:   "Pendiente de aprobacion",
  approved_client:  "Aprobado por cliente",
  rejected_changes: "Requiere cambios"
};

export const CLIENT_APPROVAL_COLORS: Record<ClientApprovalStatus, string> = {
  pending_client:   "bg-amber-50 text-amber-700 ring-amber-200",
  approved_client:  "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected_changes: "bg-red-50 text-red-700 ring-red-200"
};

// ─── Funciones puras (testeables) ─────────────────────────────────────────────

/**
 * Resuelve el estado de revision del activo desde su status.
 * IMPL-20260506-46
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
 * Devuelve lista de propuestas candidatas vacia (compatibilidad con tests SPEC-45).
 * @deprecated En SPEC-46 se usa fetchAssetProposals(assetId) para propuestas reales.
 * IMPL-20260506-46
 */
export function buildV1ProposalDrafts(): ProposalDraft[] {
  return [];
}

/**
 * Normaliza una fila de asset_proposals a ProposalDraft.
 * evidence y hasEvidence se enriquecen despues con attachEvidenceToProposals.
 * IMPL-20260506-46 (extendido SPEC-47)
 */
export function normalizeProposalRow(row: ProposalRow): ProposalDraft {
  return {
    id:              row.id,
    isPrimary:       row.is_primary,
    note:            row.note,
    toolUsed:        row.tool_used as CreativeTool,
    promptVersionId: row.prompt_version_id,
    reviewDecision:  row.review_decision as ReviewDecision,
    createdAt:       row.created_at,
    evidence:        null,
    hasEvidence:     false
  };
}

/**
 * Normaliza una fila de asset_proposal_evidences a ProposalEvidence (sin signedUrl).
 * La URL firmada se resuelve de forma async en fetchEvidencesForProposals.
 * IMPL-20260506-47
 */
export function normalizeEvidenceRow(
  row: EvidenceRow
): Omit<ProposalEvidence, "signedUrl"> {
  return {
    id:             row.id,
    proposalId:     row.proposal_id,
    assetId:        row.asset_id,
    fileName:       row.file_name,
    mimeType:       row.mime_type,
    storagePath:    row.storage_path,
    fileSizeBytes:  row.file_size_bytes,
    uploadedAt:     row.uploaded_at
  };
}

/**
 * Enriquece una lista de ProposalDraft con sus evidencias correspondientes.
 * Funcion pura: recibe proposals y evidencias ya resueltas.
 * IMPL-20260506-47
 */
export function attachEvidenceToProposals(
  proposals: ProposalDraft[],
  evidences: ProposalEvidence[]
): ProposalDraft[] {
  const byProposal = new Map<string, ProposalEvidence>();
  for (const ev of evidences) {
    // Tomar solo la mas reciente si hay varias por propuesta (ya vienen ordenadas desc)
    if (!byProposal.has(ev.proposalId)) {
      byProposal.set(ev.proposalId, ev);
    }
  }
  return proposals.map((p) => {
    const ev = byProposal.get(p.id) ?? null;
    return { ...p, evidence: ev, hasEvidence: ev !== null };
  });
}

/**
 * Deriva propuesta principal, alternativa y nota de comparacion desde
 * la lista completa de propuestas del activo.
 * Principal = la marcada is_primary=true; si no hay ninguna, la mas reciente.
 * IMPL-20260506-46
 */
export function derivePrimaryAndSecondary(proposals: ProposalDraft[]): {
  primary: ProposalDraft | null;
  secondary: ProposalDraft | null;
  comparisonNote: string | null;
} {
  if (proposals.length === 0) {
    return { primary: null, secondary: null, comparisonNote: null };
  }
  const sorted = [...proposals].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
  const primary   = sorted[0];
  const secondary = sorted[1] ?? null;
  const comparisonNote =
    primary && secondary
      ? `Principal: ${primary.toolUsed} — Alternativa: ${secondary.toolUsed}`
      : null;
  return { primary, secondary, comparisonNote };
}

/**
 * Resuelve la decision operativa interna desde la propuesta principal.
 * Si no hay propuestas, devuelve 'pending'.
 * IMPL-20260506-46
 */
export function resolveOperativeDecision(proposals: ProposalDraft[]): ReviewDecision {
  if (proposals.length === 0) return "pending";
  const primary = proposals.find((p) => p.isPrimary) ?? proposals[0];
  return primary.reviewDecision;
}

/**
 * Extrae referencias de contexto desde el referencesJson del prompt.
 * Omite entradas con valor null o undefined.
 * IMPL-20260506-46
 */
export function buildSourceRefs(prompt: AssetPromptVersion | null): SourceRef[] {
  if (!prompt?.referencesJson) return [];
  return Object.entries(prompt.referencesJson)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([key, value]) => ({ key, value: String(value) }));
}

/**
 * Construye la vista de comparacion visual entre propuestas (SPEC-51 §1).
 * Solo aplica si ambas propuestas tienen evidencia de imagen con URL firmada.
 * Degrada honestamente si no aplica.
 * IMPL-20260506-51
 */
export function buildComparisonView(
  primary: ProposalDraft | null,
  secondary: ProposalDraft | null
): ComparisonView {
  if (!primary || !secondary) {
    return { kind: "single_proposal", reason: "Solo hay una propuesta registrada" };
  }
  if (!primary.hasEvidence || !secondary.hasEvidence) {
    return { kind: "no_images", reason: "Una o ambas propuestas no tienen evidencia subida" };
  }
  const pMime = primary.evidence!.mimeType;
  const sMime = secondary.evidence!.mimeType;
  if (!pMime.startsWith("image/") || !sMime.startsWith("image/")) {
    return { kind: "no_images", reason: "Comparacion visual aplica solo para evidencias de imagen" };
  }
  if (!primary.evidence!.signedUrl || !secondary.evidence!.signedUrl) {
    return { kind: "no_images", reason: "URL firmada no disponible para una o ambas evidencias" };
  }
  return {
    kind: "images",
    primary: {
      signedUrl:    primary.evidence!.signedUrl,
      fileName:     primary.evidence!.fileName,
      toolUsed:     primary.toolUsed,
      mimeType:     pMime,
      fileSizeBytes: primary.evidence!.fileSizeBytes
    },
    secondary: {
      signedUrl:    secondary.evidence!.signedUrl,
      fileName:     secondary.evidence!.fileName,
      toolUsed:     secondary.toolUsed,
      mimeType:     sMime,
      fileSizeBytes: secondary.evidence!.fileSizeBytes
    }
  };
}

/**
 * Deriva el resumen historico compacto del activo desde datos ya disponibles.
 * No requiere tabla nueva.
 * IMPL-20260506-51
 */
export function buildAssetAnalytics(
  asset: Asset,
  proposals: ProposalDraft[],
  clientApproval: ClientApproval | null
): AssetAnalytics {
  const evidenceCount = proposals.filter((p) => p.hasEvidence).length;

  // lastActivityAt: maximo entre updatedAt, ultima propuesta y ultima decision del cliente
  const candidateDates: string[] = [asset.updatedAt];
  if (proposals.length > 0) candidateDates.push(proposals[0].createdAt); // desc-sorted
  if (clientApproval) candidateDates.push(clientApproval.decidedAt);
  const lastActivityAt = candidateDates.reduce((max, d) => (d > max ? d : max), candidateDates[0]) ?? null;

  // daysToInternalApproval: primera propuesta con approved_internal
  const internallyApproved = proposals.find((p) => p.reviewDecision === "approved_internal");
  const daysToInternalApproval = internallyApproved
    ? Math.round(
        (new Date(internallyApproved.createdAt).getTime() - new Date(asset.createdAt).getTime()) /
          86_400_000
      )
    : null;

  // daysToClientApproval: si hay aprobacion del cliente
  const daysToClientApproval =
    clientApproval?.status === "approved_client"
      ? Math.round(
          (new Date(clientApproval.decidedAt).getTime() - new Date(asset.createdAt).getTime()) /
            86_400_000
        )
      : null;

  return {
    createdAt:              asset.createdAt,
    proposalCount:          proposals.length,
    evidenceCount,
    lastActivityAt,
    daysToInternalApproval,
    daysToClientApproval
  };
}

/**
 * Construye la sugerencia de herramienta creativa para el tipo de pieza.
 * Reutiliza la logica del workspace del disenador (SPEC-40).
 * IMPL-20260506-46
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

/** Fila de asset_proposal_evidences (SPEC-47). */
export type EvidenceRow = {
  id: string;
  tenant_id: string;
  asset_id: string;
  proposal_id: string;
  file_name: string;
  mime_type: string;
  storage_path: string;
  file_size_bytes: number | null;
  uploaded_at: string;
};

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

/** Fila de asset_proposals (SPEC-46). */
export type ProposalRow = {
  id: string;
  tenant_id: string;
  asset_id: string;
  prompt_version_id: string | null;
  is_primary: boolean;
  note: string;
  tool_used: string;
  review_decision: string;
  created_at: string;
};

/** Fila de asset_client_approvals (SPEC-51). */
type ClientApprovalRow = {
  id: string;
  tenant_id: string;
  asset_id: string;
  status: string;
  comment: string | null;
  decided_at: string;
  created_at: string;
};

// ─── Helpers internos ─────────────────────────────────────────────────────────

function normalizeClientApprovalRow(row: ClientApprovalRow): ClientApproval {
  return {
    id:         row.id,
    assetId:    row.asset_id,
    tenantId:   row.tenant_id,
    status:     row.status as ClientApprovalStatus,
    comment:    row.comment,
    decidedAt:  row.decided_at,
    createdAt:  row.created_at
  };
}

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
 * Obtiene las propuestas persistidas de un activo desde asset_proposals.
 * Devuelve array vacio si no hay propuestas o si Supabase no esta configurado.
 * IMPL-20260506-46
 */
async function fetchAssetProposals(assetId: string): Promise<ProposalDraft[]> {
  if (!isSupabaseConfigured) return [];
  const params = new URLSearchParams({
    select: "id,tenant_id,asset_id,prompt_version_id,is_primary,note,tool_used,review_decision,created_at",
    asset_id: `eq.${assetId}`,
    order: "created_at.desc"
  });
  try {
    const rows = await postgrest<ProposalRow[]>(`asset_proposals?${params.toString()}`, {
      method: "GET"
    });
    return rows.map(normalizeProposalRow);
  } catch {
    // Tabla puede no existir en entornos sin migracion aplicada — degradar honestamente
    return [];
  }
}

/**
 * Persiste una nueva propuesta para el activo en asset_proposals.
 * Requiere service_role key configurada.
 * IMPL-20260506-46
 */
export async function insertAssetProposal(input: {
  tenantId: string;
  assetId: string;
  promptVersionId: string | null;
  note: string;
  toolUsed: CreativeTool;
  isPrimary: boolean;
  reviewDecision: ReviewDecision;
}): Promise<ProposalDraft | null> {
  if (!isSupabaseConfigured) return null;
  const body = {
    tenant_id:         input.tenantId,
    asset_id:          input.assetId,
    prompt_version_id: input.promptVersionId ?? null,
    is_primary:        input.isPrimary,
    note:              input.note,
    tool_used:         input.toolUsed,
    review_decision:   input.reviewDecision
  };
  const rows = await postgrest<ProposalRow[]>("asset_proposals", {
    method: "POST",
    body: JSON.stringify(body)
  });
  return rows[0] ? normalizeProposalRow(rows[0]) : null;
}

/**
 * Genera una URL firmada de Supabase Storage para una evidencia.
 * Expira en 3600 segundos (1 hora).
 * Devuelve null si la generacion falla o Supabase no esta configurado.
 * IMPL-20260506-47
 */
async function generateSignedUrl(storagePath: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const serviceKey = getServerApiKey();
  try {
    const res = await fetch(
      `${supabaseEnv.url}/storage/v1/object/sign/proposal-evidences/${storagePath}`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ expiresIn: 3600 }),
        cache: "no-store"
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { signedURL?: string };
    if (!data.signedURL) return null;
    // signedURL puede ser absoluta o relativa; Supabase suele devolverla relativa
    // a /storage/v1, asi que la completamos explicitamente para evitar URLs rotas.
    if (data.signedURL.startsWith("http")) return data.signedURL;
    const normalizedPath = data.signedURL.startsWith("/")
      ? data.signedURL
      : `/${data.signedURL}`;
    return `${supabaseEnv.url}/storage/v1${normalizedPath}`;
  } catch {
    return null;
  }
}

/**
 * Obtiene las evidencias mas recientes de una lista de propuestas.
 * Genera signed URLs para cada evidencia encontrada.
 * IMPL-20260506-47
 */
async function fetchEvidencesForProposals(
  proposalIds: string[]
): Promise<ProposalEvidence[]> {
  if (!isSupabaseConfigured || proposalIds.length === 0) return [];
  const params = new URLSearchParams({
    select: "id,tenant_id,asset_id,proposal_id,file_name,mime_type,storage_path,file_size_bytes,uploaded_at",
    proposal_id: `in.(${proposalIds.join(",")})`,
    order: "uploaded_at.desc"
  });
  try {
    const rows = await postgrest<EvidenceRow[]>(
      `asset_proposal_evidences?${params.toString()}`,
      { method: "GET" }
    );
    const evidences = await Promise.all(
      rows.map(async (row) => {
        const base = normalizeEvidenceRow(row);
        const signedUrl = await generateSignedUrl(row.storage_path);
        return { ...base, signedUrl };
      })
    );
    return evidences;
  } catch {
    return [];
  }
}

/**
 * Lista todas las evidencias reales asociadas a un activo.
 * No colapsa por propuesta: devuelve cada archivo persistido en asset_proposal_evidences.
 * IMPL-20260513-16
 */
export async function listAssetEvidences(assetId: string): Promise<ProposalEvidence[]> {
  if (!isSupabaseConfigured) return [];
  const params = new URLSearchParams({
    select: "id,tenant_id,asset_id,proposal_id,file_name,mime_type,storage_path,file_size_bytes,uploaded_at",
    asset_id: `eq.${assetId}`,
    order: "uploaded_at.desc"
  });

  try {
    const rows = await postgrest<EvidenceRow[]>(
      `asset_proposal_evidences?${params.toString()}`,
      { method: "GET" }
    );

    return await Promise.all(
      rows.map(async (row) => {
        const base = normalizeEvidenceRow(row);
        const signedUrl = await generateSignedUrl(row.storage_path);
        return { ...base, signedUrl };
      })
    );
  } catch {
    return [];
  }
}

/**
 * Sube un archivo binario al bucket proposal-evidences de Supabase Storage.
 * Requiere service_role key. Devuelve true si el upload fue exitoso.
 * IMPL-20260506-47
 */
export async function uploadEvidenceToStorage(
  storagePath: string,
  fileBuffer: ArrayBuffer,
  mimeType: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const serviceKey = getServerApiKey();
  try {
    const res = await fetch(
      `${supabaseEnv.url}/storage/v1/object/proposal-evidences/${storagePath}`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": mimeType,
          "x-upsert": "true"
        },
        body: fileBuffer,
        cache: "no-store"
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Persiste la referencia de una evidencia subida en asset_proposal_evidences.
 * Requiere service_role key configurada.
 * IMPL-20260506-47
 */
export async function insertProposalEvidence(input: {
  tenantId: string;
  assetId: string;
  proposalId: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  fileSizeBytes: number | null;
}): Promise<ProposalEvidence | null> {
  if (!isSupabaseConfigured) return null;
  const body = {
    tenant_id:       input.tenantId,
    asset_id:        input.assetId,
    proposal_id:     input.proposalId,
    file_name:       input.fileName,
    mime_type:       input.mimeType,
    storage_path:    input.storagePath,
    file_size_bytes: input.fileSizeBytes ?? null
  };
  try {
    const rows = await postgrest<EvidenceRow[]>("asset_proposal_evidences", {
      method: "POST",
      body: JSON.stringify(body)
    });
    if (!rows[0]) return null;
    const base = normalizeEvidenceRow(rows[0]);
    const signedUrl = await generateSignedUrl(rows[0].storage_path);
    return { ...base, signedUrl };
  } catch {
    return null;
  }
}

/**
 * Actualiza la decision operativa de una propuesta existente.
 * Requiere service_role key configurada.
 * IMPL-20260506-46
 */
export async function updateProposalDecision(
  proposalId: string,
  reviewDecision: ReviewDecision
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const params = new URLSearchParams({ id: `eq.${proposalId}` });
  await postgrest(`asset_proposals?${params.toString()}`, {
    method: "PATCH",
    body: JSON.stringify({ review_decision: reviewDecision })
  });
  return true;
}

/**
 * Obtiene la decision final del cliente para un activo.
 * Devuelve null si no hay registro o si Supabase no esta configurado.
 * IMPL-20260506-51
 */
async function fetchClientApproval(assetId: string): Promise<ClientApproval | null> {
  if (!isSupabaseConfigured) return null;
  const params = new URLSearchParams({
    select: "id,tenant_id,asset_id,status,comment,decided_at,created_at",
    asset_id: `eq.${assetId}`,
    limit: "1"
  });
  try {
    const rows = await postgrest<ClientApprovalRow[]>(
      `asset_client_approvals?${params.toString()}`,
      { method: "GET" }
    );
    return rows[0] ? normalizeClientApprovalRow(rows[0]) : null;
  } catch {
    return null;
  }
}

/**
 * Registra o actualiza la decision final del cliente para un activo.
 * Usa ON CONFLICT asset_id para upsert (UNIQUE constraint en la tabla).
 * Requiere service_role key.
 * IMPL-20260506-51
 */
export async function upsertClientApproval(input: {
  tenantId: string;
  assetId: string;
  status: ClientApprovalStatus;
  comment: string | null;
}): Promise<ClientApproval | null> {
  if (!isSupabaseConfigured) return null;
  const body = {
    tenant_id:  input.tenantId,
    asset_id:   input.assetId,
    status:     input.status,
    comment:    input.comment ?? null,
    decided_at: new Date().toISOString()
  };
  try {
    const rows = await postgrest<ClientApprovalRow[]>(
      "asset_client_approvals?on_conflict=asset_id",
      {
        method:  "POST",
        body:    JSON.stringify(body),
        headers: { Prefer: "return=representation,resolution=merge-duplicates" }
      }
    );
    return rows[0] ? normalizeClientApprovalRow(rows[0]) : null;
  } catch {
    return null;
  }
}

/**
 * Obtiene la vista detallada completa de un activo por ID.
 * Reune: activo, historial de prompts, chat, herramienta sugerida,
 * estado de revision, propuestas persistidas (SPEC-46) y vacios honestos.
 * Devuelve null si Supabase no esta configurado o el activo no existe.
 * IMPL-20260506-46
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

  const [chat, rawProposalDrafts, clientApproval] = await Promise.all([
    getAssetChat(assetId),
    fetchAssetProposals(assetId),
    fetchClientApproval(assetId)
  ]);

  const proposalIds = rawProposalDrafts.map((p) => p.id);
  const evidences = await fetchEvidencesForProposals(proposalIds);
  const proposalDrafts = attachEvidenceToProposals(rawProposalDrafts, evidences);

  const { primary, secondary, comparisonNote } = derivePrimaryAndSecondary(proposalDrafts);
  const comparisonView  = buildComparisonView(primary, secondary);
  const assetAnalytics  = buildAssetAnalytics(asset, proposalDrafts, clientApproval);

  return {
    assetDetail: { asset, promptHistory },
    assetContext: {
      clientId:    asset.clientId,
      projectId:   asset.projectId,
      briefId:     asset.briefId,
      quotationId: asset.quotationId
    },
    promptVersion:            activePrompt,
    creativeToolSuggestion:   buildCreativeToolSuggestion(asset.pieceTypeCode),
    proposalDrafts,
    primaryProposal:          primary,
    secondaryProposal:        secondary,
    proposalComparisonNote:   comparisonNote,
    reviewDecision:           resolveOperativeDecision(proposalDrafts),
    reviewState:              resolveReviewState(asset.status),
    conversationThread:       chat,
    sourceRefs:               buildSourceRefs(activePrompt),
    comparisonView,
    clientApproval,
    assetAnalytics,
    gaps:                     V1_GAPS  // vacio: todos los gaps cerrados en SPEC-51
  };
}
