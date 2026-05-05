/**
 * IMPL-20260505-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-19_agente_briefing_persistido_y_revision_humana.md, context/BRIEFING_ESTRUCTURADO_CLAUDE_V1.md, context/MODELO_DATOS_MULTITENANT_V1.md, context/CONTRATOS_AGENTES_Y_VSCODE_V1.md
 */
import { isSupabaseConfigured, supabaseEnv } from "./supabase";

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
  messageText: string;
  createdAt: string;
};

export type BriefReviewEvent = {
  id: string;
  versionId: string;
  eventType: "submitted" | "review_started" | "approved" | "returned" | "reconducted" | "derived_version";
  note: string;
  createdByLabel: string;
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

export type BriefRecord = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  status: BriefingStatus;
  sourceChannel: string;
  currentVersionNumber: number;
  createdAt: string;
  updatedAt: string;
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
  message_text: string;
  created_at: string;
};

type BriefReviewEventRow = {
  id: string;
  brief_version_id: string;
  event_type: BriefReviewEvent["eventType"];
  note: string | null;
  created_by_label: string;
  recommended_product_slot_key: string | null;
  created_at: string;
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
    select: "id,tenant_id,status,source_channel,current_version_number,active_version_id,created_at,updated_at",
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
    select: "id,brief_version_id,stage_key,author_role,actor_label,message_text,created_at",
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
    messageText: row.message_text,
    createdAt: row.created_at
  }));
}

async function getBriefReviewEvents(versionId: string): Promise<BriefReviewEvent[]> {
  const params = new URLSearchParams({
    select: "id,brief_version_id,event_type,note,created_by_label,recommended_product_slot_key,created_at",
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
  const currentVersion = currentVersionRow ? await serializeVersion(currentVersionRow) : null;

  return {
    id: briefRow.id,
    tenantId: briefRow.tenant_id,
    tenantSlug: tenant.slug,
    status: briefRow.status,
    sourceChannel: briefRow.source_channel,
    currentVersionNumber: briefRow.current_version_number,
    createdAt: briefRow.created_at,
    updatedAt: briefRow.updated_at,
    currentVersion
  };
}

export async function createBriefForDefaultTenant(tenantSlug = supabaseEnv.defaultTenant): Promise<BriefRecord> {
  const tenant = await getTenantRecord(tenantSlug);

  if (!tenant) {
    throw new Error("tenant_not_found");
  }

  const [briefRow] = await postgrest<BriefRow[]>("briefs", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: tenant.id,
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

  await updateBriefStatus(briefRow.id, "stage_1_discovery", versionRow.id, 1);
  await appendBriefMessage({
    briefId: briefRow.id,
    versionId: versionRow.id,
    authorRole: "assistant",
    actorLabel: "Bridge briefing",
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
      message_text: params.messageText
    })
  });
}

async function getBriefRowById(briefId: string): Promise<BriefRow | null> {
  const params = new URLSearchParams({
    select: "id,tenant_id,status,source_channel,current_version_number,active_version_id,created_at,updated_at",
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
    actorLabel: "Bridge briefing",
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
    createdByLabel: "Bridge briefing",
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
    createdByLabel: "Operador Bridge",
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
    createdByLabel: "Operador Bridge",
    recommendedProductSlotKey: normalizeSummary(version.structured_summary_json).recommendedProductSlotKey
  });
  await appendBriefMessage({
    briefId: context.briefId,
    versionId: derived.id,
    authorRole: "assistant",
    actorLabel: "Bridge briefing",
    messageText: "Se abrio una nueva version derivada. Revalida los cambios materiales desde discovery antes de volver a revision.",
    stage: "discovery"
  });

  const current = await getBriefVersionRow(derived.id);

  if (!current) {
    throw new Error("version_not_found");
  }

  return serializeVersion(current);
}