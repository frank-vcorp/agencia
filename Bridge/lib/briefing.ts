/**
 * IMPL-20260505-22
 * Respaldo: context/CLIENTS_Y_PROJECTS_V1.md, context/SPECs/SPEC_ARCH-20260505-22_clients_y_projects_v1.md, context/SPECs/SPEC_ARCH-20260505-21_memberships_users_y_actor_efectivo_v1.md, context/SPECs/SPEC_ARCH-20260505-19_agente_briefing_persistido_y_revision_humana.md, context/MODELO_DATOS_MULTITENANT_V1.md, context/CONTRATOS_AGENTES_Y_VSCODE_V1.md
 */
import { isSupabaseConfigured, supabaseEnv } from "./supabase";
import { getTenantIdentityContextByTenantId, resolveActorTrace } from "./identity";

export const briefingStages = ["discovery", "precision", "commercial_fit"] as const;

export type BriefingStage = (typeof briefingStages)[number];

export const briefingStatuses = [
  "draft",
  "stage_1_discovery",
  "stage_2_precision",
  "stage_3_commercial_fit",
  "pending_operator_review",
  "operator_review_in_progress",
  "approved_locked",
  "returned_for_rework",
  "superseded"
] as const;

export type BriefingStatus = (typeof briefingStatuses)[number];

export type StructuredBriefSummary = {
  projectObjective: string;
  expectedResult: string;
  businessContext: string;
  requestReason: string;
  mainOffer: string;
  audience: string;
  platform: string;
  deliverable: string;
  cta: string;
  tone: string;
  restrictions: string;
  references: string;
  urgency: string;
  messageCore: string;
  gaps: string;
  contradictions: string;
  structuringConfidence: string;
  recommendedProductSlotKey: string;
  recommendedProductConfidence: string;
  commercialFitReason: string;
  upsellSignal: string;
  operatorReviewNote: string;
};

export type BriefMessage = {
  id: string;
  versionId: string;
  stage: BriefingStage;
  authorRole: "client" | "assistant" | "operator";
  actorLabel: string;
  actorUserId: string | null;
  actorMembershipId: string | null;
  actorAgentId: string | null;
  effectiveUserId: string | null;
  effectiveMembershipId: string | null;
  messageText: string;
  createdAt: string;
};

export type BriefReviewEvent = {
  id: string;
  versionId: string;
  eventType: "submitted" | "review_started" | "approved" | "returned" | "reconducted" | "derived_version";
  note: string;
  createdByLabel: string;
  actorUserId: string | null;
  actorMembershipId: string | null;
  actorAgentId: string | null;
  effectiveUserId: string | null;
  effectiveMembershipId: string | null;
  recommendedProductSlotKey: string;
  createdAt: string;
};

export type BriefVersion = {
  id: string;
  briefId: string;
  versionNumber: number;
  stage: BriefingStage;
  status: BriefingStatus;
  editable: boolean;
  finalSummaryText: string;
  structuredSummary: StructuredBriefSummary;
  derivedFromVersionId: string | null;
  messages: BriefMessage[];
  reviewEvents: BriefReviewEvent[];
  createdAt: string;
  updatedAt: string;
};

export type BriefClientContainer = {
  id: string;
  tenantId: string;
  name: string;
  legalName: string | null;
  status: "active" | "prospect" | "inactive";
  primaryContactName: string | null;
  primaryContactChannel: string | null;
  notes: string | null;
};

export type BriefProjectContainer = {
  id: string;
  tenantId: string;
  clientId: string;
  projectType: "lanzamiento" | "presencia" | "contenido" | "campana" | "interno";
  name: string;
  objective: string | null;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  ownerMembershipId: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type BriefOperationalContainer = {
  source: "brief" | "tenant_active" | "none";
  client: BriefClientContainer | null;
  project: BriefProjectContainer | null;
};

export type BriefRecord = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  clientId: string | null;
  projectId: string | null;
  status: BriefingStatus;
  sourceChannel: string;
  currentVersionNumber: number;
  createdAt: string;
  updatedAt: string;
  container: BriefOperationalContainer;
  currentVersion: BriefVersion | null;
};

type TenantRecord = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

type BriefRow = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  project_id: string | null;
  status: BriefingStatus;
  source_channel: string;
  current_version_number: number;
  active_version_id: string | null;
  created_at: string;
  updated_at: string;
};

type BriefVersionRow = {
  id: string;
  brief_id: string;
  version_number: number;
  stage_key: BriefingStage;
  status: BriefingStatus;
  final_summary_text: string | null;
  structured_summary_json: StructuredBriefSummary | null;
  derived_from_version_id: string | null;
  created_at: string;
  updated_at: string;
};

type BriefMessageRow = {
  id: string;
  brief_version_id: string;
  stage_key: BriefingStage;
  author_role: "client" | "assistant" | "operator";
  actor_label: string;
  actor_user_id: string | null;
  actor_membership_id: string | null;
  actor_agent_id: string | null;
  effective_user_id: string | null;
  effective_membership_id: string | null;
  message_text: string;
  created_at: string;
};

type BriefReviewEventRow = {
  id: string;
  brief_version_id: string;
  event_type: BriefReviewEvent["eventType"];
  note: string | null;
  created_by_label: string;
  actor_user_id: string | null;
  actor_membership_id: string | null;
  actor_agent_id: string | null;
  effective_user_id: string | null;
  effective_membership_id: string | null;
  recommended_product_slot_key: string | null;
  created_at: string;
};

type ClientRow = {
  id: string;
  tenant_id: string;
  name: string;
  legal_name: string | null;
  status: BriefClientContainer["status"];
  primary_contact_name: string | null;
  primary_contact_channel: string | null;
  notes: string | null;
};

type ProjectRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  project_type: BriefProjectContainer["projectType"];
  name: string;
  objective: string | null;
  status: BriefProjectContainer["status"];
  owner_membership_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  clients:
    | ClientRow
    | ClientRow[]
    | null;
};

type MutationContext = {
  briefId: string;
  versionId: string;
};

export const emptyStructuredBriefSummary = (): StructuredBriefSummary => ({
  projectObjective: "",
  expectedResult: "",
  businessContext: "",
  requestReason: "",
  mainOffer: "",
  audience: "",
  platform: "",
  deliverable: "",
  cta: "",
  tone: "",
  restrictions: "",
  references: "",
  urgency: "",
  messageCore: "",
  gaps: "",
  contradictions: "",
  structuringConfidence: "",
  recommendedProductSlotKey: "",
  recommendedProductConfidence: "",
  commercialFitReason: "",
  upsellSignal: "",
  operatorReviewNote: ""
});

export function normalizeSummary(input: Partial<StructuredBriefSummary> | null | undefined): StructuredBriefSummary {
  const base = emptyStructuredBriefSummary();

  if (!input) {
    return base;
  }

  return Object.fromEntries(
    Object.entries(base).map(([key, value]) => {
      const nextValue = input[key as keyof StructuredBriefSummary];
      return [key, typeof nextValue === "string" ? nextValue.trim() : value];
    })
  ) as StructuredBriefSummary;
}

export function statusFromStage(stage: BriefingStage): BriefingStatus {
  if (stage === "discovery") {
    return "stage_1_discovery";
  }

  if (stage === "precision") {
    return "stage_2_precision";
  }

  return "stage_3_commercial_fit";
}

export function nextStage(stage: BriefingStage): BriefingStage | null {
  if (stage === "discovery") {
    return "precision";
  }

  if (stage === "precision") {
    return "commercial_fit";
  }

  return null;
}

export function isVersionEditable(status: BriefingStatus): boolean {
  return !["pending_operator_review", "operator_review_in_progress", "approved_locked", "superseded"].includes(status);
}

export function mergeStructuredBriefSummary(
  current: StructuredBriefSummary,
  patch: Partial<StructuredBriefSummary>
): StructuredBriefSummary {
  return normalizeSummary({
    ...current,
    ...patch
  });
}

export function getCriticalMissingFields(summary: StructuredBriefSummary): string[] {
  const missing: string[] = [];

  if (!summary.projectObjective) {
    missing.push("objetivo del proyecto");
  }

  if (!summary.mainOffer) {
    missing.push("oferta principal");
  }

  if (!summary.audience) {
    missing.push("publico objetivo");
  }

  if (!summary.platform) {
    missing.push("plataforma o canal");
  }

  if (!summary.deliverable) {
    missing.push("entregable esperado");
  }

  if (!summary.cta) {
    missing.push("CTA");
  }

  const hasCommercialRoute =
    Boolean(summary.recommendedProductSlotKey) ||
    /revision comercial/i.test(`${summary.commercialFitReason} ${summary.operatorReviewNote}`);

  if (!hasCommercialRoute) {
    missing.push("encaje comercial o nota explicita de revision comercial");
  }

  return missing;
}

export function buildFinalSummaryText(summary: StructuredBriefSummary): string {
  const lines = [
    summary.projectObjective && `Objetivo: ${summary.projectObjective}.`,
    summary.mainOffer && `Oferta: ${summary.mainOffer}.`,
    summary.audience && `Publico: ${summary.audience}.`,
    summary.platform && `Canal o plataforma: ${summary.platform}.`,
    summary.deliverable && `Entregable esperado: ${summary.deliverable}.`,
    summary.cta && `CTA principal: ${summary.cta}.`,
    summary.restrictions && `Restricciones: ${summary.restrictions}.`,
    summary.gaps && `Faltantes o alertas: ${summary.gaps}.`,
    summary.recommendedProductSlotKey && `Slot comercial sugerido: ${summary.recommendedProductSlotKey}.`,
    summary.commercialFitReason && `Razon de encaje: ${summary.commercialFitReason}.`,
    summary.upsellSignal && `Oportunidad comercial: ${summary.upsellSignal}.`
  ].filter(Boolean);

  return lines.join(" ");
}

export function buildAssistantGuidance(stage: BriefingStage, summary: StructuredBriefSummary): string {
  if (stage === "discovery") {
    return "Cuéntame qué quieres lograr con este proyecto, qué estás ofreciendo y por qué ahora es importante moverlo.";
  }

  if (stage === "precision") {
    const openPoints = [summary.audience ? "" : "publico", summary.platform ? "" : "plataforma", summary.deliverable ? "" : "entregable", summary.cta ? "" : "CTA"]
      .filter(Boolean)
      .join(", ");

    return openPoints
      ? `Ya tengo la base. Ahora necesito aterrizar ${openPoints} para que el brief quede utilizable por produccion y cotizacion.`
      : "Ya tenemos base suficiente. Precisa tono, restricciones, referencias y tiempos para consolidar esta etapa.";
  }

  return summary.recommendedProductSlotKey
    ? `Voy cerrando el encaje comercial sobre el slot ${summary.recommendedProductSlotKey}. Confirma si el resumen refleja bien la necesidad o si debemos reconducir algo antes de enviarlo a revision humana.`
    : "Necesito cerrar el encaje comercial. Si aun no hay un slot claro, deja una nota explicita de revision comercial para que el operador lo tome.";
}

export function selectPreferredProject<T extends { status: BriefProjectContainer["status"] }>(projects: T[]): T | null {
  const priority: BriefProjectContainer["status"][] = ["active", "draft", "paused", "completed", "archived"];

  for (const status of priority) {
    const project = projects.find((candidate) => candidate.status === status);

    if (project) {
      return project;
    }
  }

  return projects[0] ?? null;
}

function normalizeClientRow(row: ClientRow): BriefClientContainer {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    legalName: row.legal_name,
    status: row.status,
    primaryContactName: row.primary_contact_name,
    primaryContactChannel: row.primary_contact_channel,
    notes: row.notes
  };
}

function normalizeProjectContainer(row: ProjectRow): BriefOperationalContainer {
  const client = Array.isArray(row.clients) ? row.clients[0] ?? null : row.clients;

  return {
    source: "brief",
    client: client ? normalizeClientRow(client) : null,
    project: {
      id: row.id,
      tenantId: row.tenant_id,
      clientId: row.client_id,
      projectType: row.project_type,
      name: row.name,
      objective: row.objective,
      status: row.status,
      ownerMembershipId: row.owner_membership_id,
      startDate: row.start_date,
      endDate: row.end_date
    }
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

async function getTenantRecord(slug = supabaseEnv.defaultTenant): Promise<TenantRecord | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const params = new URLSearchParams({
    select: "id,slug,name,status",
    slug: `eq.${slug}`,
    limit: "1"
  });
  const rows = await postgrest<TenantRecord[]>(`tenants?${params.toString()}`, {
    method: "GET"
  });

  return rows[0] ?? null;
}

async function getLatestBriefRow(tenantId: string): Promise<BriefRow | null> {
  const params = new URLSearchParams({
    select: "id,tenant_id,client_id,project_id,status,source_channel,current_version_number,active_version_id,created_at,updated_at",
    tenant_id: `eq.${tenantId}`,
    order: "updated_at.desc",
    limit: "1"
  });
  const rows = await postgrest<BriefRow[]>(`briefs?${params.toString()}`, {
    method: "GET"
  });

  return rows[0] ?? null;
}

async function getBriefVersionRow(versionId: string): Promise<BriefVersionRow | null> {
  const params = new URLSearchParams({
    select: "id,brief_id,version_number,stage_key,status,final_summary_text,structured_summary_json,derived_from_version_id,created_at,updated_at",
    id: `eq.${versionId}`,
    limit: "1"
  });
  const rows = await postgrest<BriefVersionRow[]>(`brief_versions?${params.toString()}`, {
    method: "GET"
  });

  return rows[0] ?? null;
}

async function getClientRowById(clientId: string): Promise<ClientRow | null> {
  const params = new URLSearchParams({
    select: "id,tenant_id,name,legal_name,status,primary_contact_name,primary_contact_channel,notes",
    id: `eq.${clientId}`,
    limit: "1"
  });
  const rows = await postgrest<ClientRow[]>(`clients?${params.toString()}`, {
    method: "GET"
  });

  return rows[0] ?? null;
}

async function getProjectContainerById(projectId: string): Promise<BriefOperationalContainer | null> {
  const params = new URLSearchParams({
    select: "id,tenant_id,client_id,project_type,name,objective,status,owner_membership_id,start_date,end_date,created_at,updated_at,clients!projects_client_id_fkey(id,tenant_id,name,legal_name,status,primary_contact_name,primary_contact_channel,notes)",
    id: `eq.${projectId}`,
    limit: "1"
  });
  const rows = await postgrest<ProjectRow[]>(`projects?${params.toString()}`, {
    method: "GET"
  });
  const project = rows[0] ?? null;

  return project ? normalizeProjectContainer(project) : null;
}

async function getTenantActiveContainer(tenantId: string): Promise<BriefOperationalContainer> {
  const params = new URLSearchParams({
    select: "id,tenant_id,client_id,project_type,name,objective,status,owner_membership_id,start_date,end_date,created_at,updated_at,clients!projects_client_id_fkey(id,tenant_id,name,legal_name,status,primary_contact_name,primary_contact_channel,notes)",
    tenant_id: `eq.${tenantId}`,
    order: "created_at.asc"
  });
  const rows = await postgrest<ProjectRow[]>(`projects?${params.toString()}`, {
    method: "GET"
  });
  const selectedProject = selectPreferredProject(rows);

  if (selectedProject) {
    return {
      ...normalizeProjectContainer(selectedProject),
      source: "tenant_active"
    };
  }

  return {
    source: "none",
    client: null,
    project: null
  };
}

async function resolveBriefOperationalContainer(brief: BriefRow): Promise<BriefOperationalContainer> {
  if (brief.project_id) {
    const projectContainer = await getProjectContainerById(brief.project_id);

    if (projectContainer) {
      return {
        ...projectContainer,
        source: "brief"
      };
    }
  }

  if (brief.client_id) {
    const client = await getClientRowById(brief.client_id);

    if (client) {
      return {
        source: "brief",
        client: normalizeClientRow(client),
        project: null
      };
    }
  }

  return getTenantActiveContainer(brief.tenant_id);
}

async function getLatestBriefVersionRow(briefId: string): Promise<BriefVersionRow | null> {
  const params = new URLSearchParams({
    select: "id,brief_id,version_number,stage_key,status,final_summary_text,structured_summary_json,derived_from_version_id,created_at,updated_at",
    brief_id: `eq.${briefId}`,
    order: "version_number.desc",
    limit: "1"
  });
  const rows = await postgrest<BriefVersionRow[]>(`brief_versions?${params.toString()}`, {
    method: "GET"
  });

  return rows[0] ?? null;
}

async function getBriefMessages(versionId: string): Promise<BriefMessage[]> {
  const params = new URLSearchParams({
    select: "id,brief_version_id,stage_key,author_role,actor_label,actor_user_id,actor_membership_id,actor_agent_id,effective_user_id,effective_membership_id,message_text,created_at",
    brief_version_id: `eq.${versionId}`,
    order: "created_at.asc"
  });
  const rows = await postgrest<BriefMessageRow[]>(`brief_messages?${params.toString()}`, {
    method: "GET"
  });

  return rows.map((row) => ({
    id: row.id,
    versionId: row.brief_version_id,
    stage: row.stage_key,
    authorRole: row.author_role,
    actorLabel: row.actor_label,
    actorUserId: row.actor_user_id,
    actorMembershipId: row.actor_membership_id,
    actorAgentId: row.actor_agent_id,
    effectiveUserId: row.effective_user_id,
    effectiveMembershipId: row.effective_membership_id,
    messageText: row.message_text,
    createdAt: row.created_at
  }));
}

async function getBriefReviewEvents(versionId: string): Promise<BriefReviewEvent[]> {
  const params = new URLSearchParams({
    select: "id,brief_version_id,event_type,note,created_by_label,actor_user_id,actor_membership_id,actor_agent_id,effective_user_id,effective_membership_id,recommended_product_slot_key,created_at",
    brief_version_id: `eq.${versionId}`,
    order: "created_at.desc"
  });
  const rows = await postgrest<BriefReviewEventRow[]>(`brief_review_events?${params.toString()}`, {
    method: "GET"
  });

  return rows.map((row) => ({
    id: row.id,
    versionId: row.brief_version_id,
    eventType: row.event_type,
    note: row.note ?? "",
    createdByLabel: row.created_by_label,
    actorUserId: row.actor_user_id,
    actorMembershipId: row.actor_membership_id,
    actorAgentId: row.actor_agent_id,
    effectiveUserId: row.effective_user_id,
    effectiveMembershipId: row.effective_membership_id,
    recommendedProductSlotKey: row.recommended_product_slot_key ?? "",
    createdAt: row.created_at
  }));
}

async function serializeVersion(row: BriefVersionRow): Promise<BriefVersion> {
  const [messages, reviewEvents] = await Promise.all([getBriefMessages(row.id), getBriefReviewEvents(row.id)]);

  return {
    id: row.id,
    briefId: row.brief_id,
    versionNumber: row.version_number,
    stage: row.stage_key,
    status: row.status,
    editable: isVersionEditable(row.status),
    finalSummaryText: row.final_summary_text ?? buildFinalSummaryText(normalizeSummary(row.structured_summary_json)),
    structuredSummary: normalizeSummary(row.structured_summary_json),
    derivedFromVersionId: row.derived_from_version_id,
    messages,
    reviewEvents,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function updateBriefStatus(briefId: string, status: BriefingStatus, activeVersionId?: string | null, currentVersionNumber?: number) {
  const patch: Record<string, string | number | null> = { status };

  if (typeof activeVersionId !== "undefined") {
    patch.active_version_id = activeVersionId;
  }

  if (typeof currentVersionNumber !== "undefined") {
    patch.current_version_number = currentVersionNumber;
  }

  await postgrest<BriefRow[]>(`briefs?id=eq.${briefId}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
}

async function insertReviewEvent(params: {
  tenantId: string;
  briefId: string;
  versionId: string;
  eventType: BriefReviewEvent["eventType"];
  note?: string;
  createdByLabel: string;
  actorUserId?: string | null;
  actorMembershipId?: string | null;
  actorAgentId?: string | null;
  effectiveUserId?: string | null;
  effectiveMembershipId?: string | null;
  recommendedProductSlotKey?: string;
}) {
  await postgrest<BriefReviewEventRow[]>("brief_review_events", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: params.tenantId,
      brief_id: params.briefId,
      brief_version_id: params.versionId,
      event_type: params.eventType,
      note: params.note ?? "",
      created_by_label: params.createdByLabel,
      actor_user_id: params.actorUserId ?? null,
      actor_membership_id: params.actorMembershipId ?? null,
      actor_agent_id: params.actorAgentId ?? null,
      effective_user_id: params.effectiveUserId ?? null,
      effective_membership_id: params.effectiveMembershipId ?? null,
      recommended_product_slot_key: params.recommendedProductSlotKey ?? ""
    })
  });
}

async function updateVersionRecord(versionId: string, patch: Partial<BriefVersionRow>) {
  await postgrest<BriefVersionRow[]>(`brief_versions?id=eq.${versionId}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
}

export async function getBriefWorkspace(tenantSlug = supabaseEnv.defaultTenant): Promise<BriefRecord | null> {
  const tenant = await getTenantRecord(tenantSlug);

  if (!tenant) {
    return null;
  }

  const briefRow = await getLatestBriefRow(tenant.id);

  if (!briefRow) {
    return null;
  }

  const currentVersionRow = briefRow.active_version_id
    ? await getBriefVersionRow(briefRow.active_version_id)
    : await getLatestBriefVersionRow(briefRow.id);
  const container = await resolveBriefOperationalContainer(briefRow);
  const currentVersion = currentVersionRow ? await serializeVersion(currentVersionRow) : null;

  return {
    id: briefRow.id,
    tenantId: briefRow.tenant_id,
    tenantSlug: tenant.slug,
    clientId: briefRow.client_id,
    projectId: briefRow.project_id,
    status: briefRow.status,
    sourceChannel: briefRow.source_channel,
    currentVersionNumber: briefRow.current_version_number,
    createdAt: briefRow.created_at,
    updatedAt: briefRow.updated_at,
    container,
    currentVersion
  };
}

export async function createBriefForDefaultTenant(tenantSlug = supabaseEnv.defaultTenant): Promise<BriefRecord> {
  const tenant = await getTenantRecord(tenantSlug);

  if (!tenant) {
    throw new Error("tenant_not_found");
  }

  const activeContainer = await getTenantActiveContainer(tenant.id);

  const [briefRow] = await postgrest<BriefRow[]>("briefs", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: tenant.id,
      client_id: activeContainer.client?.id ?? null,
      project_id: activeContainer.project?.id ?? null,
      status: "stage_1_discovery",
      source_channel: "bridge_web",
      current_version_number: 1
    })
  });
  const [versionRow] = await postgrest<BriefVersionRow[]>("brief_versions", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: tenant.id,
      brief_id: briefRow.id,
      version_number: 1,
      stage_key: "discovery",
      status: "stage_1_discovery",
      structured_summary_json: emptyStructuredBriefSummary(),
      final_summary_text: ""
    })
  });

  const identity = await getTenantIdentityContextByTenantId(tenant.id);
  const assistantTrace = resolveActorTrace({
    fallbackLabel: "Bridge briefing",
    technicalActor: identity?.serviceAgent,
    effectiveMembership: identity?.operatorMembership
  });

  await updateBriefStatus(briefRow.id, "stage_1_discovery", versionRow.id, 1);
  await appendBriefMessage({
    briefId: briefRow.id,
    versionId: versionRow.id,
    authorRole: "assistant",
    actorLabel: assistantTrace.actorLabel,
    actorUserId: assistantTrace.actorUserId,
    actorMembershipId: assistantTrace.actorMembershipId,
    actorAgentId: assistantTrace.actorAgentId,
    effectiveUserId: assistantTrace.effectiveUserId,
    effectiveMembershipId: assistantTrace.effectiveMembershipId,
    messageText: buildAssistantGuidance("discovery", emptyStructuredBriefSummary()),
    stage: "discovery"
  });

  const workspace = await getBriefWorkspace(tenantSlug);

  if (!workspace) {
    throw new Error("brief_creation_failed");
  }

  return workspace;
}

export async function appendBriefMessage(params: {
  briefId: string;
  versionId: string;
  authorRole: BriefMessage["authorRole"];
  actorLabel: string;
  actorUserId?: string | null;
  actorMembershipId?: string | null;
  actorAgentId?: string | null;
  effectiveUserId?: string | null;
  effectiveMembershipId?: string | null;
  messageText: string;
  stage: BriefingStage;
}) {
  const version = await getBriefVersionRow(params.versionId);
  const brief = await getBriefRowById(params.briefId);

  if (!version || !brief || !isVersionEditable(version.status)) {
    throw new Error("version_not_editable");
  }

  await postgrest<BriefMessageRow[]>("brief_messages", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: brief.tenant_id,
      brief_id: params.briefId,
      brief_version_id: params.versionId,
      stage_key: params.stage,
      author_role: params.authorRole,
      actor_label: params.actorLabel,
      actor_user_id: params.actorUserId ?? null,
      actor_membership_id: params.actorMembershipId ?? null,
      actor_agent_id: params.actorAgentId ?? null,
      effective_user_id: params.effectiveUserId ?? null,
      effective_membership_id: params.effectiveMembershipId ?? null,
      message_text: params.messageText
    })
  });
}

export async function appendClientBriefMessage(context: MutationContext, messageText: string): Promise<void> {
  const brief = await getBriefRowById(context.briefId);
  const version = await getBriefVersionRow(context.versionId);

  if (!brief || !version) {
    throw new Error("brief_not_found");
  }

  const identity = await getTenantIdentityContextByTenantId(brief.tenant_id);
  const clientTrace = resolveActorTrace({
    fallbackLabel: "Cliente demo",
    effectiveMembership: identity?.clientMembership
  });

  await appendBriefMessage({
    briefId: context.briefId,
    versionId: context.versionId,
    stage: version.stage_key,
    authorRole: "client",
    actorLabel: clientTrace.actorLabel,
    actorUserId: clientTrace.actorUserId,
    actorMembershipId: clientTrace.actorMembershipId,
    actorAgentId: clientTrace.actorAgentId,
    effectiveUserId: clientTrace.effectiveUserId,
    effectiveMembershipId: clientTrace.effectiveMembershipId,
    messageText
  });
}

async function getBriefRowById(briefId: string): Promise<BriefRow | null> {
  const params = new URLSearchParams({
    select: "id,tenant_id,client_id,project_id,status,source_channel,current_version_number,active_version_id,created_at,updated_at",
    id: `eq.${briefId}`,
    limit: "1"
  });
  const rows = await postgrest<BriefRow[]>(`briefs?${params.toString()}`, {
    method: "GET"
  });

  return rows[0] ?? null;
}

export async function updateBriefSummary(
  context: MutationContext,
  patch: Partial<StructuredBriefSummary>
): Promise<BriefVersion> {
  const version = await getBriefVersionRow(context.versionId);

  if (!version || !isVersionEditable(version.status)) {
    throw new Error("version_not_editable");
  }

  const merged = mergeStructuredBriefSummary(normalizeSummary(version.structured_summary_json), patch);
  await updateVersionRecord(context.versionId, {
    structured_summary_json: merged,
    final_summary_text: buildFinalSummaryText(merged)
  });

  const current = await getBriefVersionRow(context.versionId);

  if (!current) {
    throw new Error("version_not_found");
  }

  return serializeVersion(current);
}

export async function advanceBriefStage(context: MutationContext): Promise<BriefVersion> {
  const version = await getBriefVersionRow(context.versionId);

  if (!version || !isVersionEditable(version.status)) {
    throw new Error("version_not_editable");
  }

  const upcomingStage = nextStage(version.stage_key);

  if (!upcomingStage) {
    throw new Error("final_stage_reached");
  }

  const brief = await getBriefRowById(context.briefId);
  const identity = brief ? await getTenantIdentityContextByTenantId(brief.tenant_id) : null;
  const assistantTrace = resolveActorTrace({
    fallbackLabel: "Bridge briefing",
    technicalActor: identity?.serviceAgent,
    effectiveMembership: identity?.operatorMembership
  });

  await updateVersionRecord(context.versionId, {
    stage_key: upcomingStage,
    status: statusFromStage(upcomingStage)
  });
  await updateBriefStatus(context.briefId, statusFromStage(upcomingStage));

  const currentSummary = normalizeSummary(version.structured_summary_json);
  await appendBriefMessage({
    briefId: context.briefId,
    versionId: context.versionId,
    authorRole: "assistant",
    actorLabel: assistantTrace.actorLabel,
    actorUserId: assistantTrace.actorUserId,
    actorMembershipId: assistantTrace.actorMembershipId,
    actorAgentId: assistantTrace.actorAgentId,
    effectiveUserId: assistantTrace.effectiveUserId,
    effectiveMembershipId: assistantTrace.effectiveMembershipId,
    messageText: buildAssistantGuidance(upcomingStage, currentSummary),
    stage: upcomingStage
  });

  const current = await getBriefVersionRow(context.versionId);

  if (!current) {
    throw new Error("version_not_found");
  }

  return serializeVersion(current);
}

export async function submitBriefForOperatorReview(context: MutationContext): Promise<BriefVersion> {
  const version = await getBriefVersionRow(context.versionId);

  if (!version || !isVersionEditable(version.status)) {
    throw new Error("version_not_editable");
  }

  const summary = normalizeSummary(version.structured_summary_json);
  const missing = getCriticalMissingFields(summary);

  if (missing.length > 0) {
    throw new Error(`missing_required_fields:${missing.join(",")}`);
  }

  const finalSummaryText = buildFinalSummaryText(summary);
  const brief = await getBriefRowById(context.briefId);

  if (!brief) {
    throw new Error("brief_not_found");
  }

  const identity = await getTenantIdentityContextByTenantId(brief.tenant_id);
  const submittedTrace = resolveActorTrace({
    fallbackLabel: "Bridge briefing",
    technicalActor: identity?.serviceAgent,
    effectiveMembership: identity?.operatorMembership
  });

  await updateVersionRecord(context.versionId, {
    status: "pending_operator_review",
    final_summary_text: finalSummaryText
  });
  await updateBriefStatus(context.briefId, "pending_operator_review");
  await insertReviewEvent({
    tenantId: brief.tenant_id,
    briefId: context.briefId,
    versionId: context.versionId,
    eventType: "submitted",
    note: finalSummaryText,
    createdByLabel: submittedTrace.actorLabel,
    actorUserId: submittedTrace.actorUserId,
    actorMembershipId: submittedTrace.actorMembershipId,
    actorAgentId: submittedTrace.actorAgentId,
    effectiveUserId: submittedTrace.effectiveUserId,
    effectiveMembershipId: submittedTrace.effectiveMembershipId,
    recommendedProductSlotKey: summary.recommendedProductSlotKey
  });

  const current = await getBriefVersionRow(context.versionId);

  if (!current) {
    throw new Error("version_not_found");
  }

  return serializeVersion(current);
}

export async function reviewBriefVersion(
  context: MutationContext,
  decision: "review_started" | "approved" | "returned" | "reconducted",
  note: string,
  recommendedProductSlotKey = ""
): Promise<BriefVersion> {
  const version = await getBriefVersionRow(context.versionId);
  const brief = await getBriefRowById(context.briefId);

  if (!version || !brief) {
    throw new Error("brief_not_found");
  }

  const identity = await getTenantIdentityContextByTenantId(brief.tenant_id);

  if (!identity?.operatorMembership) {
    throw new Error("membership_required:operator");
  }

  const operatorTrace = resolveActorTrace({
    fallbackLabel: "Operador Bridge",
    effectiveMembership: identity.operatorMembership
  });

  let nextStatus: BriefingStatus = version.status;
  let eventType: BriefReviewEvent["eventType"] = "review_started";
  let nextSummary = normalizeSummary(version.structured_summary_json);

  if (decision === "review_started") {
    nextStatus = "operator_review_in_progress";
    eventType = "review_started";
  }

  if (decision === "approved") {
    nextStatus = "approved_locked";
    eventType = "approved";
  }

  if (decision === "returned") {
    nextStatus = "returned_for_rework";
    eventType = "returned";
  }

  if (decision === "reconducted") {
    nextStatus = "returned_for_rework";
    eventType = "reconducted";
    nextSummary = mergeStructuredBriefSummary(nextSummary, {
      recommendedProductSlotKey: recommendedProductSlotKey || nextSummary.recommendedProductSlotKey,
      operatorReviewNote: note || nextSummary.operatorReviewNote
    });
  }

  await updateVersionRecord(context.versionId, {
    status: nextStatus,
    structured_summary_json: nextSummary,
    final_summary_text: buildFinalSummaryText(nextSummary)
  });
  await updateBriefStatus(context.briefId, nextStatus);
  await insertReviewEvent({
    tenantId: brief.tenant_id,
    briefId: context.briefId,
    versionId: context.versionId,
    eventType,
    note,
    createdByLabel: operatorTrace.actorLabel,
    actorUserId: operatorTrace.actorUserId,
    actorMembershipId: operatorTrace.actorMembershipId,
    actorAgentId: operatorTrace.actorAgentId,
    effectiveUserId: operatorTrace.effectiveUserId,
    effectiveMembershipId: operatorTrace.effectiveMembershipId,
    recommendedProductSlotKey
  });

  const current = await getBriefVersionRow(context.versionId);

  if (!current) {
    throw new Error("version_not_found");
  }

  return serializeVersion(current);
}

export async function createDerivedBriefVersion(context: MutationContext): Promise<BriefVersion> {
  const version = await getBriefVersionRow(context.versionId);
  const brief = await getBriefRowById(context.briefId);

  if (!version || !brief) {
    throw new Error("brief_not_found");
  }

  if (version.status !== "approved_locked") {
    throw new Error("version_must_be_approved");
  }

  const identity = await getTenantIdentityContextByTenantId(brief.tenant_id);

  if (!identity?.operatorMembership) {
    throw new Error("membership_required:operator");
  }

  const operatorTrace = resolveActorTrace({
    fallbackLabel: "Operador Bridge",
    effectiveMembership: identity.operatorMembership
  });
  const assistantTrace = resolveActorTrace({
    fallbackLabel: "Bridge briefing",
    technicalActor: identity.serviceAgent,
    effectiveMembership: identity.operatorMembership
  });

  const [derived] = await postgrest<BriefVersionRow[]>("brief_versions", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: brief.tenant_id,
      brief_id: context.briefId,
      version_number: version.version_number + 1,
      stage_key: "discovery",
      status: "stage_1_discovery",
      structured_summary_json: normalizeSummary(version.structured_summary_json),
      final_summary_text: buildFinalSummaryText(normalizeSummary(version.structured_summary_json)),
      derived_from_version_id: version.id
    })
  });

  await updateBriefStatus(context.briefId, "stage_1_discovery", derived.id, derived.version_number);
  await insertReviewEvent({
    tenantId: brief.tenant_id,
    briefId: context.briefId,
    versionId: derived.id,
    eventType: "derived_version",
    note: "Nueva version derivada desde una version aprobada por cambio material del brief.",
    createdByLabel: operatorTrace.actorLabel,
    actorUserId: operatorTrace.actorUserId,
    actorMembershipId: operatorTrace.actorMembershipId,
    actorAgentId: operatorTrace.actorAgentId,
    effectiveUserId: operatorTrace.effectiveUserId,
    effectiveMembershipId: operatorTrace.effectiveMembershipId,
    recommendedProductSlotKey: normalizeSummary(version.structured_summary_json).recommendedProductSlotKey
  });
  await appendBriefMessage({
    briefId: context.briefId,
    versionId: derived.id,
    authorRole: "assistant",
    actorLabel: assistantTrace.actorLabel,
    actorUserId: assistantTrace.actorUserId,
    actorMembershipId: assistantTrace.actorMembershipId,
    actorAgentId: assistantTrace.actorAgentId,
    effectiveUserId: assistantTrace.effectiveUserId,
    effectiveMembershipId: assistantTrace.effectiveMembershipId,
    messageText: "Se abrio una nueva version derivada. Revalida los cambios materiales desde discovery antes de volver a revision.",
    stage: "discovery"
  });

  const current = await getBriefVersionRow(derived.id);

  if (!current) {
    throw new Error("version_not_found");
  }

  return serializeVersion(current);
}