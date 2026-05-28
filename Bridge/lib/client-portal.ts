/**
 * IMPL-20260508-21
 * Respaldo: context/SPECs/SPEC_ARCH-20260508-21_cliente_pwa_resultados_y_leads_v1.md
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 */
import { isSupabaseConfigured, supabaseEnv } from "./supabase";

// ─── Tipos del contrato de Cliente (SPEC-21) ──────────────────────────────────

export type ClientActionType =
  | "approve_quotation"
  | "review_assets"
  | "clarify_brief"
  | "none";

export type NextClientAction = {
  type: ClientActionType;
  label: string;
  detail: string;
  href: string | null;
  requiresAction: boolean;
};

export type ProjectStageStatus = "completado" | "en_revision" | "pendiente_aclaracion" | "pendiente";

export type ProjectStageItem = {
  key: "discovery" | "precision" | "commercial_fit";
  label: string;
  status: ProjectStageStatus;
  active: boolean;
};

export type ProjectStatusSummary = {
  projectName: string | null;
  clientName: string | null;
  stages: ProjectStageItem[];
  briefContextNote: string | null;
};

export type ReviewDecision = "approve" | "reject" | "request_changes";

export type ReviewItemType = "quotation" | "asset";

export type ReviewItem = {
  id: string;
  type: ReviewItemType;
  title: string;
  description: string;
  currentDecision: ReviewDecision | null;
  availableDecisions: ReviewDecision[];
};

export type ChannelCode = "facebook" | "google_ads" | "whatsapp";

export type ChannelStatus = "activo" | "inactivo" | "sin_datos";

export type ChannelResult = {
  channel: ChannelCode;
  label: string;
  status: ChannelStatus;
  contactCount: number;
  recentNote: string | null;
  needsAttention: boolean;
};

export type ChannelResultsSummary = {
  channels: ChannelResult[];
};

export type ClientLeadSummary = {
  id: string;
  canal: string;
  nombreCompleto: string;
  asunto: string;
  etiquetas: string[];
  fechaHora: string;
};

export type CrmLeadSummary = {
  leads: ClientLeadSummary[];
  totalVisible: number;
};

export type InstallabilityState = {
  manifestPresent: boolean;
  note: string;
};

export type ClientPortal = {
  tenantSlug: string;
  generatedAt: string;
  nextClientAction: NextClientAction;
  projectStatusSummary: ProjectStatusSummary;
  reviewItems: ReviewItem[];
  channelResultsSummary: ChannelResultsSummary;
  crmLeadSummary: CrmLeadSummary;
  installabilityState: InstallabilityState;
  sourceRefs: string[];
};

// ─── Constantes de dominio ────────────────────────────────────────────────────

const BRIEF_STATUS_STAGES: Record<string, number> = {
  draft: 1,
  stage_1_discovery: 1,
  stage_2_precision: 2,
  stage_3_commercial_fit: 3,
  pending_operator_review: 3,
  operator_review_in_progress: 3,
  approved_locked: 3,
  returned_for_rework: 2,
  superseded: 3
};

const STAGE_LABELS: Record<ProjectStageItem["key"], string> = {
  discovery: "Entendimos tu necesidad",
  precision: "Definimos los detalles",
  commercial_fit: "Validamos la solución recomendada"
};

const CHANNEL_LABELS: Record<ChannelCode, string> = {
  facebook: "Facebook",
  google_ads: "Google Ads",
  whatsapp: "WhatsApp"
};

const LEAD_STATUS_CLIENT_LABELS: Record<string, string> = {
  nuevo: "Nuevo contacto",
  en_seguimiento: "En seguimiento",
  propuesta_enviada: "Propuesta enviada",
  cerrado_ganado: "Ganado",
  cerrado_perdido: "No continuó"
};

// ─── Funciones puras y testeables ────────────────────────────────────────────

/**
 * Deriva el estado de las 3 etapas del brief para el cliente
 * a partir del status interno del brief.
 * IMPL-20260508-21
 */
export function deriveBriefStages(
  briefStatus: string | null,
  isReturnedForRework: boolean
): ProjectStageItem[] {
  const stageKeys: ProjectStageItem["key"][] = ["discovery", "precision", "commercial_fit"];

  if (!briefStatus) {
    return stageKeys.map((key, idx) => ({
      key,
      label: STAGE_LABELS[key],
      status: idx === 0 ? "en_revision" : "pendiente",
      active: idx === 0
    }));
  }

  const reachedStage = BRIEF_STATUS_STAGES[briefStatus] ?? 1;
  const isApproved = briefStatus === "approved_locked" || briefStatus === "superseded";
  const isInOperatorReview =
    briefStatus === "pending_operator_review" || briefStatus === "operator_review_in_progress";

  return stageKeys.map((key, idx) => {
    const stageNumber = idx + 1;
    let status: ProjectStageStatus;
    let active = false;

    if (stageNumber < reachedStage) {
      status = "completado";
    } else if (stageNumber === reachedStage) {
      if (isApproved || isInOperatorReview) {
        status = "completado";
      } else if (isReturnedForRework && stageNumber === 2) {
        status = "pendiente_aclaracion";
        active = true;
      } else {
        status = "en_revision";
        active = true;
      }
    } else {
      status = "pendiente";
    }

    return { key, label: STAGE_LABELS[key], status, active };
  });
}

/**
 * Determina la siguiente accion prioritaria para el cliente.
 * Orden: brief devuelto > cotizacion enviada > activos para revision > ninguno.
 * IMPL-20260508-21
 */
export function deriveNextClientAction(signals: {
  briefStatus: string | null;
  hasQuotationPendingApproval: boolean;
  hasAssetsForReview: boolean;
}): NextClientAction {
  if (signals.briefStatus === "returned_for_rework") {
    return {
      type: "clarify_brief",
      label: "Aclarar datos del proyecto",
      detail:
        "El equipo revisó tu solicitud y necesita que confirmes algunos detalles para continuar.",
      href: null,
      requiresAction: true
    };
  }

  if (signals.hasQuotationPendingApproval) {
    return {
      type: "approve_quotation",
      label: "Revisar propuesta",
      detail: "Tienes una propuesta lista para revisar. Puedes aprobarla, rechazarla o pedir ajustes.",
      href: null,
      requiresAction: true
    };
  }

  if (signals.hasAssetsForReview) {
    return {
      type: "review_assets",
      label: "Revisar piezas del proyecto",
      detail: "Hay material listo para que lo revises antes de continuar con la producción.",
      href: null,
      requiresAction: true
    };
  }

  return {
    type: "none",
    label: "No necesitamos nada de tu parte por ahora",
    detail: "El equipo está trabajando en tu proyecto. Te avisaremos cuando haya algo para revisar.",
    href: null,
    requiresAction: false
  };
}

/**
 * Convierte el status del canal CRM a ChannelStatus.
 * IMPL-20260508-21
 */
export function deriveChannelStatus(
  assetCount: number,
  leadCount: number
): ChannelStatus {
  if (assetCount > 0 || leadCount > 0) return "activo";
  return "sin_datos";
}

/**
 * Convierte la etiqueta interna de lead status a texto visible para el cliente.
 * IMPL-20260508-21
 */
export function leadStatusToClientLabel(status: string): string {
  return LEAD_STATUS_CLIENT_LABELS[status] ?? "Contacto";
}

// ─── Tipos de filas DB (mínimo necesario) ────────────────────────────────────

type TenantRow = { id: string; slug: string };

type BriefRow = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  status: string;
  updated_at: string;
};

type ProjectRow = {
  id: string;
  name: string;
  client_id: string;
  status: string;
};

type ClientRow = {
  id: string;
  name: string;
};

type QuotationRow = {
  id: string;
  project_id: string;
  status: string;
  active_version_id: string | null;
  updated_at: string;
};

type QuotationVersionRow = {
  id: string;
  title: string;
};

type AssetRow = {
  id: string;
  project_id: string | null;
  title: string;
  application_code: string;
  status: string;
  updated_at: string;
};

type LeadRow = {
  id: string;
  name: string;
  source_channel: string;
  requested_service: string;
  status: string;
  created_at: string;
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

async function fetchMostRecentBrief(tenantId: string): Promise<BriefRow | null> {
  const params = new URLSearchParams({
    select: "id,project_id,client_id,status,updated_at",
    tenant_id: `eq.${tenantId}`,
    order: "updated_at.desc",
    limit: "1"
  });
  const rows = await postgrest<BriefRow[]>(`briefs?${params.toString()}`);
  return rows[0] ?? null;
}

async function fetchProjectById(tenantId: string, projectId: string): Promise<ProjectRow | null> {
  const params = new URLSearchParams({
    select: "id,name,client_id,status",
    tenant_id: `eq.${tenantId}`,
    id: `eq.${projectId}`,
    limit: "1"
  });
  const rows = await postgrest<ProjectRow[]>(`projects?${params.toString()}`);
  return rows[0] ?? null;
}

async function fetchClientById(tenantId: string, clientId: string): Promise<ClientRow | null> {
  const params = new URLSearchParams({
    select: "id,name",
    tenant_id: `eq.${tenantId}`,
    id: `eq.${clientId}`,
    limit: "1"
  });
  const rows = await postgrest<ClientRow[]>(`clients?${params.toString()}`);
  return rows[0] ?? null;
}

async function fetchSentQuotations(tenantId: string): Promise<QuotationRow[]> {
  const params = new URLSearchParams({
    select: "id,project_id,status,active_version_id,updated_at",
    tenant_id: `eq.${tenantId}`,
    status: `eq.sent`,
    order: "updated_at.desc"
  });
  return postgrest<QuotationRow[]>(`quotations?${params.toString()}`);
}

async function fetchQuotationVersionTitle(versionId: string): Promise<string | null> {
  const params = new URLSearchParams({
    select: "id,title",
    id: `eq.${versionId}`,
    limit: "1"
  });
  const rows = await postgrest<QuotationVersionRow[]>(`quotation_versions?${params.toString()}`);
  return rows[0]?.title ?? null;
}

async function fetchAssetsForReview(tenantId: string): Promise<AssetRow[]> {
  const params = new URLSearchParams({
    select: "id,project_id,title,application_code,status,updated_at",
    tenant_id: `eq.${tenantId}`,
    status: `eq.in_review`,
    order: "updated_at.desc"
  });
  return postgrest<AssetRow[]>(`assets?${params.toString()}`);
}

async function fetchAllAssets(tenantId: string): Promise<AssetRow[]> {
  const params = new URLSearchParams({
    select: "id,project_id,title,application_code,status,updated_at",
    tenant_id: `eq.${tenantId}`,
    status: `neq.archived`,
    order: "updated_at.desc"
  });
  return postgrest<AssetRow[]>(`assets?${params.toString()}`);
}

async function fetchRecentLeads(tenantId: string): Promise<LeadRow[]> {
  const params = new URLSearchParams({
    select: "id,name,source_channel,requested_service,status,created_at,updated_at",
    tenant_id: `eq.${tenantId}`,
    deleted_at: "is.null",
    order: "updated_at.desc",
    limit: "20"
  });
  return postgrest<LeadRow[]>(`leads?${params.toString()}`);
}

// ─── Helpers de formateo ─────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Mexico_City"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Obtiene el portal de cliente con los 5 bloques de la SPEC-21:
 * queSigue, estadoDelProyecto, revisiones, resultadosPorCanal y leadsYSeguimiento.
 *
 * Lee señales existentes (briefs, cotizaciones, activos, CRM) sin inventar
 * una verdad paralela. No expone notas internas ni pipeline completo del CRM.
 * IMPL-20260508-21
 */
export async function getClientPortal(
  tenantSlug = supabaseEnv.defaultTenant
): Promise<ClientPortal> {
  const generatedAt = new Date().toISOString();
  const refs: string[] = [];

  const emptyPortal: ClientPortal = {
    tenantSlug,
    generatedAt,
    nextClientAction: {
      type: "none",
      label: "No necesitamos nada de tu parte por ahora",
      detail: "El equipo está trabajando en tu proyecto.",
      href: null,
      requiresAction: false
    },
    projectStatusSummary: {
      projectName: null,
      clientName: null,
      stages: deriveBriefStages(null, false),
      briefContextNote: null
    },
    reviewItems: [],
    channelResultsSummary: {
      channels: [
        { channel: "facebook", label: "Facebook", status: "sin_datos", contactCount: 0, recentNote: null, needsAttention: false },
        { channel: "google_ads", label: "Google Ads", status: "sin_datos", contactCount: 0, recentNote: null, needsAttention: false },
        { channel: "whatsapp", label: "WhatsApp", status: "sin_datos", contactCount: 0, recentNote: null, needsAttention: false }
      ]
    },
    crmLeadSummary: { leads: [], totalVisible: 0 },
    installabilityState: { manifestPresent: true, note: "Instalable como app desde el navegador." },
    sourceRefs: refs
  };

  if (!isSupabaseConfigured) return emptyPortal;

  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return emptyPortal;

  // Fetch paralelo de todas las señales necesarias
  const [brief, sentQuotations, allAssets, assetsForReview, recentLeads] = await Promise.all([
    fetchMostRecentBrief(tenantId),
    fetchSentQuotations(tenantId),
    fetchAllAssets(tenantId),
    fetchAssetsForReview(tenantId),
    fetchRecentLeads(tenantId)
  ]);

  refs.push("signal:briefs", "signal:quotations", "signal:assets", "signal:leads");

  // ─── Proyecto y cliente ─────────────────────────────────────────────────────
  let projectName: string | null = null;
  let clientName: string | null = null;

  if (brief?.project_id) {
    const project = await fetchProjectById(tenantId, brief.project_id);
    if (project) {
      projectName = project.name;
      if (project.client_id) {
        const client = await fetchClientById(tenantId, project.client_id);
        clientName = client?.name ?? null;
      }
    }
  } else if (brief?.client_id) {
    const client = await fetchClientById(tenantId, brief.client_id);
    clientName = client?.name ?? null;
  }

  // ─── Estado del brief en 3 etapas para el cliente ──────────────────────────
  const isReturnedForRework = brief?.status === "returned_for_rework";
  const stages = deriveBriefStages(brief?.status ?? null, isReturnedForRework);

  const briefContextNote = brief
    ? "Este resumen refleja el enfoque acordado al inicio del proyecto."
    : null;

  // ─── Items de revision ──────────────────────────────────────────────────────
  const reviewItems: ReviewItem[] = [];

  // Cotizaciones enviadas → pendiente de aprobación del cliente
  for (const q of sentQuotations) {
    let title = "Propuesta del proyecto";
    if (q.active_version_id) {
      const versionTitle = await fetchQuotationVersionTitle(q.active_version_id);
      if (versionTitle) title = versionTitle;
    }
    reviewItems.push({
      id: q.id,
      type: "quotation",
      title,
      description: "Revisa los detalles de la propuesta y confirma si quieres seguir adelante.",
      currentDecision: null,
      availableDecisions: ["approve", "reject", "request_changes"]
    });
    refs.push(`review:quotation:${q.id}`);
  }

  // Activos en revisión → pendiente de validación del cliente
  for (const asset of assetsForReview) {
    reviewItems.push({
      id: asset.id,
      type: "asset",
      title: asset.title,
      description: "Material listo para que lo revises. Puedes aprobarlo o pedir ajustes.",
      currentDecision: null,
      availableDecisions: ["approve", "request_changes"]
    });
    refs.push(`review:asset:${asset.id}`);
  }

  // ─── Siguiente acción del cliente ───────────────────────────────────────────
  const nextClientAction = deriveNextClientAction({
    briefStatus: brief?.status ?? null,
    hasQuotationPendingApproval: sentQuotations.length > 0,
    hasAssetsForReview: assetsForReview.length > 0
  });

  // ─── Resultados por canal ───────────────────────────────────────────────────
  // Facebook: leads con source_channel='facebook' + activos application_code='facebook'
  const fbLeads = recentLeads.filter((l) => l.source_channel === "facebook");
  const fbAssets = allAssets.filter((a) => a.application_code === "facebook");

  // Google Ads: activos application_code='google' (no hay canal 'google_ads' en CRM V1)
  const googleAssets = allAssets.filter((a) => a.application_code === "google");

  // WhatsApp: leads con source_channel='whatsapp' + activos application_code='whatsapp'
  const waLeads = recentLeads.filter((l) => l.source_channel === "whatsapp");
  const waAssets = allAssets.filter((a) => a.application_code === "whatsapp");

  const channels: ChannelResult[] = [
    {
      channel: "facebook",
      label: CHANNEL_LABELS.facebook,
      status: deriveChannelStatus(fbAssets.length, fbLeads.length),
      contactCount: fbLeads.length,
      recentNote: fbLeads.length > 0 ? `${fbLeads.length} contacto${fbLeads.length !== 1 ? "s" : ""} registrado${fbLeads.length !== 1 ? "s" : ""}.` : null,
      needsAttention: false
    },
    {
      channel: "google_ads",
      label: CHANNEL_LABELS.google_ads,
      status: deriveChannelStatus(googleAssets.length, 0),
      contactCount: 0,
      recentNote: googleAssets.length > 0 ? `${googleAssets.length} pieza${googleAssets.length !== 1 ? "s" : ""} activa${googleAssets.length !== 1 ? "s" : ""} en producción.` : null,
      needsAttention: false
    },
    {
      channel: "whatsapp",
      label: CHANNEL_LABELS.whatsapp,
      status: deriveChannelStatus(waAssets.length, waLeads.length),
      contactCount: waLeads.length,
      recentNote: waLeads.length > 0 ? `${waLeads.length} contacto${waLeads.length !== 1 ? "s" : ""} por WhatsApp.` : null,
      needsAttention: false
    }
  ];

  // ─── Leads resumidos para cliente (sin notas internas ni scoring) ─────────
  // Filtrar solo canales visibles: facebook, whatsapp, más cualquier otro relevante
  const VISIBLE_CHANNELS = new Set(["facebook", "whatsapp", "directo", "referido", "sitio_web", "instagram", "otro"]);
  const visibleLeads = recentLeads.filter((l) => VISIBLE_CHANNELS.has(l.source_channel));

  const CHANNEL_CLIENT_LABELS: Record<string, string> = {
    facebook: "Facebook",
    whatsapp: "WhatsApp",
    directo: "Directo",
    referido: "Referido",
    sitio_web: "Sitio web",
    instagram: "Instagram",
    otro: "Otro"
  };

  const leadSummaries: ClientLeadSummary[] = visibleLeads.map((lead) => ({
    id: lead.id,
    canal: CHANNEL_CLIENT_LABELS[lead.source_channel] ?? lead.source_channel,
    nombreCompleto: lead.name,
    asunto: lead.requested_service,
    // Etiqueta derivada del status del lead — NO se exponen notas internas
    etiquetas: [leadStatusToClientLabel(lead.status)],
    fechaHora: formatTimestamp(lead.updated_at)
  }));

  return {
    tenantSlug,
    generatedAt,
    nextClientAction,
    projectStatusSummary: {
      projectName,
      clientName,
      stages,
      briefContextNote
    },
    reviewItems,
    channelResultsSummary: { channels },
    crmLeadSummary: {
      leads: leadSummaries,
      totalVisible: leadSummaries.length
    },
    installabilityState: {
      manifestPresent: true,
      note: "Instalable como app desde el navegador."
    },
    sourceRefs: refs
  };
}
