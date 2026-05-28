/**
 * IMPL-20260505-24
 * Respaldo: context/ACTIVOS_OPERABLES_V1.md, context/CATALOGO_ACTIVOS_V1.md,
 *           context/SPECs/SPEC_ARCH-20260505-24_activos_vinculados_a_cotizacion_y_project_v1.md
 * IMPL-20260513-17
 * Respaldo: context/AGENTE_VIKA_Y_SKILLS_TECNICAS_V1.md
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 */
import { isSupabaseConfigured, supabaseEnv } from "./supabase";
import { resolveTenantIdBySlug } from "./tenant";

// ─── Catálogo de opciones guiadas (V1) ───────────────────────────────────────

export const APPLICATION_CODES = [
  "whatsapp",
  "instagram",
  "facebook",
  "tiktok",
  "google",
  "youtube",
  "landing_page",
  "sitio_web",
  "email"
] as const;

export const PIECE_TYPE_CODES = [
  "imagen",
  "video",
  "carousel",
  "historia",
  "reel",
  "anuncio_texto",
  "banner",
  "portada",
  "copy",
  "landing_section"
] as const;

export const PLACEMENT_CODES = [
  "feed",
  "story",
  "reel",
  "status",
  "display",
  "search",
  "in_feed",
  "hero",
  "mensaje_directo",
  "remarketing",
  "captacion",
  "conversion",
  "awareness"
] as const;

export const FORMAT_CODES = [
  "cuadrado_1_1",
  "vertical_4_5",
  "vertical_9_16",
  "horizontal_16_9",
  "display_responsive",
  "texto_corto",
  "texto_largo"
] as const;

export type ApplicationCode = (typeof APPLICATION_CODES)[number];
export type PieceTypeCode = (typeof PIECE_TYPE_CODES)[number];
export type PlacementCode = (typeof PLACEMENT_CODES)[number];
export type FormatCode = (typeof FORMAT_CODES)[number];
export type AssetOperationalKind = "captura" | "produccion";

export const applicationLabels: Record<ApplicationCode, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  google: "Google",
  youtube: "YouTube",
  landing_page: "Landing Page",
  sitio_web: "Sitio Web",
  email: "Email"
};

export const pieceTypeLabels: Record<PieceTypeCode, string> = {
  imagen: "Imagen",
  video: "Video",
  carousel: "Carousel",
  historia: "Historia",
  reel: "Reel",
  anuncio_texto: "Anuncio de texto",
  banner: "Banner",
  portada: "Portada",
  copy: "Copy",
  landing_section: "Landing section"
};

export const placementLabels: Record<PlacementCode, string> = {
  feed: "Feed",
  story: "Story",
  reel: "Reel",
  status: "Status",
  display: "Display",
  search: "Search",
  in_feed: "In-feed",
  hero: "Hero",
  mensaje_directo: "Mensaje directo",
  remarketing: "Remarketing",
  captacion: "Captacion",
  conversion: "Conversion",
  awareness: "Awareness"
};

export const formatLabels: Record<FormatCode, string> = {
  cuadrado_1_1: "Cuadrado 1:1",
  vertical_4_5: "Vertical 4:5",
  vertical_9_16: "Vertical 9:16",
  horizontal_16_9: "Horizontal 16:9",
  display_responsive: "Display responsive",
  texto_corto: "Texto corto",
  texto_largo: "Texto largo"
};

// ─── Tipos de dominio ─────────────────────────────────────────────────────────

export type AssetStatus = "draft" | "in_progress" | "in_review" | "approved" | "delivered" | "archived";

export type PromptVersionStatus = "draft" | "active" | "superseded" | "archived";

export type Asset = {
  id: string;
  tenantId: string;
  clientId: string;
  projectId: string;
  quotationId: string | null;
  quotationVersionId: string | null;
  briefId: string | null;
  applicationCode: string;
  pieceTypeCode: string;
  placementCode: string;
  formatCode: string;
  title: string;
  status: AssetStatus;
  createdAt: string;
  updatedAt: string;
};

export type AssetPromptVersion = {
  id: string;
  tenantId: string;
  assetId: string;
  versionNumber: number;
  promptText: string;
  referencesJson: Record<string, unknown> | null;
  status: PromptVersionStatus;
  createdByUserId: string | null;
  createdByAgentId: string | null;
  createdAt: string;
};

export type AssetWorkspace = {
  asset: Asset;
  activePrompt: AssetPromptVersion | null;
};

/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-02_brand_kit_cliente_bridge_v1.md
 */
export type BrandKitLogo = {
  nombre: string;
  storage_path: string;
  url: string;
};

export type BrandKitColor = {
  nombre: string;
  hex: string;
  uso: string;
};

export type BrandKitTipografia = {
  nombre: string;
  familia: string;
  uso: string;
};

export type BrandKit = {
  logos: BrandKitLogo[];
  colores: BrandKitColor[];
  tipografias: BrandKitTipografia[];
  estilo_visual: string;
  tono_marca: string[];
  carpeta_compartida: string | null;
  notas: string | null;
};

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
  status: PromptVersionStatus;
  created_by_user_id: string | null;
  created_by_agent_id: string | null;
  created_at: string;
};

// ─── Etiquetas de estado ──────────────────────────────────────────────────────

export const assetStatusLabels: Record<AssetStatus, string> = {
  draft: "Borrador",
  in_progress: "En progreso",
  in_review: "En revision",
  approved: "Aprobado",
  delivered: "Entregado",
  archived: "Archivado"
};

export function assetStatusLabel(status: AssetStatus): string {
  return assetStatusLabels[status] ?? status;
}

export function applicationLabel(code: string): string {
  return applicationLabels[code as ApplicationCode] ?? code;
}

export function pieceTypeLabel(code: string): string {
  return pieceTypeLabels[code as PieceTypeCode] ?? code;
}

export function placementLabel(code: string): string {
  return placementLabels[code as PlacementCode] ?? code;
}

export function formatLabel(code: string): string {
  return formatLabels[code as FormatCode] ?? code;
}

function normalizeOperationalText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function resolveAssetOperationalKind(title: string): AssetOperationalKind {
  const normalizedTitle = normalizeOperationalText(title);
  const capturePatterns = [
    /^\[captura\]/,
    /^captura\s*[:\-]/,
    /^activo de captura\b/,
    /^insumo de captura\b/
  ];

  return capturePatterns.some((pattern) => pattern.test(normalizedTitle))
    ? "captura"
    : "produccion";
}

export function assetOperationalKindLabel(kind: AssetOperationalKind): string {
  return kind === "captura" ? "Captura" : "Produccion";
}

export function nextPromptVersionNumber(versions: AssetPromptVersion[]): number {
  if (versions.length === 0) return 1;
  return Math.max(...versions.map((v) => v.versionNumber)) + 1;
}

// ─── Normalización ────────────────────────────────────────────────────────────

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
    status: row.status,
    createdByUserId: row.created_by_user_id,
    createdByAgentId: row.created_by_agent_id,
    createdAt: row.created_at
  };
}

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

/**
 * IMPL-20260526-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-06_unificacion_resolucion_tenant_dominio_bridge_v1.md
 */
async function getTenantId(slug = supabaseEnv.defaultTenant): Promise<string | null> {
  return resolveTenantIdBySlug(slug);
}

// ─── Funciones públicas ───────────────────────────────────────────────────────

export async function getAssetsForDefaultTenant(): Promise<AssetWorkspace[]> {
  if (!isSupabaseConfigured) return [];

  const tenantId = await getTenantId();
  if (!tenantId) return [];

  return getAssetsByTenant(tenantId);
}

export async function getAssetsByTenant(tenantId: string): Promise<AssetWorkspace[]> {
  const params = new URLSearchParams({
    select:
      "id,tenant_id,client_id,project_id,quotation_id,quotation_version_id,brief_id," +
      "application_code,piece_type_code,placement_code,format_code,title,status,created_at,updated_at",
    tenant_id: `eq.${tenantId}`,
    order: "created_at.desc"
  });
  const rows = await postgrest<AssetRow[]>(`assets?${params.toString()}`, { method: "GET" });
  const assets = rows.map(normalizeAssetRow);

  const workspaces: AssetWorkspace[] = await Promise.all(
    assets.map(async (asset) => {
      const activePrompt = await getActivePromptForAsset(asset.id);
      return { asset, activePrompt };
    })
  );

  return workspaces;
}

async function getActivePromptForAsset(assetId: string): Promise<AssetPromptVersion | null> {
  const params = new URLSearchParams({
    select:
      "id,tenant_id,asset_id,version_number,prompt_text,references_json," +
      "status,created_by_user_id,created_by_agent_id,created_at",
    asset_id: `eq.${assetId}`,
    status: `eq.active`,
    order: "version_number.desc",
    limit: "1"
  });
  const rows = await postgrest<PromptVersionRow[]>(
    `asset_prompt_versions?${params.toString()}`,
    { method: "GET" }
  );
  return rows[0] ? normalizePromptVersionRow(rows[0]) : null;
}

export type CreateAssetInput = {
  tenantId: string;
  clientId: string;
  projectId: string;
  quotationId?: string | null;
  briefId?: string | null;
  applicationCode: string;
  pieceTypeCode: string;
  placementCode: string;
  formatCode: string;
  title: string;
  promptText?: string;
};

export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  const rows = await postgrest<AssetRow[]>("assets", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: input.tenantId,
      client_id: input.clientId,
      project_id: input.projectId,
      quotation_id: input.quotationId ?? null,
      brief_id: input.briefId ?? null,
      application_code: input.applicationCode,
      piece_type_code: input.pieceTypeCode,
      placement_code: input.placementCode,
      format_code: input.formatCode,
      title: input.title.trim(),
      status: "draft"
    })
  });

  const row = rows[0];
  if (!row) throw new Error("assets:create_failed");
  const asset = normalizeAssetRow(row);

  if (input.promptText?.trim()) {
    await postgrest<PromptVersionRow[]>("asset_prompt_versions", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: input.tenantId,
        asset_id: asset.id,
        version_number: 1,
        prompt_text: input.promptText.trim(),
        status: "active"
      })
    });
  }

  return asset;
}

export async function getContextIdsForDefaultTenant(): Promise<{
  tenantId: string | null;
  clientId: string | null;
  projectId: string | null;
  quotationId: string | null;
}> {
  if (!isSupabaseConfigured) {
    return { tenantId: null, clientId: null, projectId: null, quotationId: null };
  }

  const tenantId = await getTenantId();
  if (!tenantId) {
    return { tenantId: null, clientId: null, projectId: null, quotationId: null };
  }

  const clientParams = new URLSearchParams({
    select: "id",
    tenant_id: `eq.${tenantId}`,
    status: `eq.active`,
    order: "created_at.desc",
    limit: "1"
  });
  const clientRows = await postgrest<{ id: string }[]>(
    `clients?${clientParams.toString()}`,
    { method: "GET" }
  );
  const clientId = clientRows[0]?.id ?? null;

  if (!clientId) {
    return { tenantId, clientId: null, projectId: null, quotationId: null };
  }

  const projectParams = new URLSearchParams({
    select: "id",
    tenant_id: `eq.${tenantId}`,
    client_id: `eq.${clientId}`,
    status: `eq.active`,
    order: "created_at.desc",
    limit: "1"
  });
  const projectRows = await postgrest<{ id: string }[]>(
    `projects?${projectParams.toString()}`,
    { method: "GET" }
  );
  const projectId = projectRows[0]?.id ?? null;

  if (!projectId) {
    return { tenantId, clientId, projectId: null, quotationId: null };
  }

  const quotationParams = new URLSearchParams({
    select: "id",
    project_id: `eq.${projectId}`,
    order: "created_at.desc",
    limit: "1"
  });
  const quotationRows = await postgrest<{ id: string }[]>(
    `quotations?${quotationParams.toString()}`,
    { method: "GET" }
  );
  const quotationId = quotationRows[0]?.id ?? null;

  return { tenantId, clientId, projectId, quotationId };
}

// ─── Funciones auxiliares exportadas para rutas API ──────────────────────────

/**
 * Resuelve el tenantId dado su slug.
 * Retorna null si no existe.
 */
export async function getTenantIdBySlug(slug: string): Promise<string | null> {
  return getTenantId(slug);
}

/**
 * Obtiene un activo por su ID verificando que pertenece al tenant.
 * Retorna null si no existe o no pertenece al tenant.
 */
export async function getAssetById(
  assetId: string,
  tenantId: string
): Promise<Asset | null> {
  const params = new URLSearchParams({
    select:
      "id,tenant_id,client_id,project_id,quotation_id,quotation_version_id,brief_id," +
      "application_code,piece_type_code,placement_code,format_code,title,status,created_at,updated_at",
    id: `eq.${assetId}`,
    tenant_id: `eq.${tenantId}`,
    limit: "1"
  });
  const rows = await postgrest<AssetRow[]>(`assets?${params.toString()}`, { method: "GET" });
  return rows[0] ? normalizeAssetRow(rows[0]) : null;
}

/**
 * Obtiene el prompt activo de un activo (exportado para las rutas API).
 */
export async function getActivePrompt(assetId: string): Promise<AssetPromptVersion | null> {
  return getActivePromptForAsset(assetId);
}

/**
 * Obtiene el resumen del brief de un activo (primeras 500 chars del contenido).
 * Retorna null si no hay briefId o no se encuentra el brief.
 */
export async function getBriefSummaryForAsset(briefId: string): Promise<string | null> {
  const params = new URLSearchParams({
    select: "id,consolidated_content,raw_content",
    id: `eq.${briefId}`,
    limit: "1"
  });
  const rows = await postgrest<{
    id: string;
    consolidated_content: string | null;
    raw_content: string | null;
  }[]>(`briefs?${params.toString()}`, { method: "GET" });

  if (!rows[0]) return null;
  const content = rows[0].consolidated_content ?? rows[0].raw_content ?? null;
  if (!content) return null;
  return content.slice(0, 500);
}

// ─── Funciones de listado para MCP (ARCH-20260526-04) ────────────────────────

/**
 * Lista proyectos de un tenant.
 * Retorna array con id, name, project_type, status, client_id, created_at.
 */
export async function getProjectsByTenant(tenantId: string): Promise<
  Array<{
    id: string;
    name: string;
    project_type: string;
    status: string;
    client_id: string;
    created_at: string;
  }>
> {
  const activeClientParams = new URLSearchParams({
    select: "id",
    tenant_id: `eq.${tenantId}`,
    deleted_at: "is.null"
  });
  const activeClients = await postgrest<{ id: string }[]>(`clients?${activeClientParams.toString()}`, {
    method: "GET"
  });

  if (activeClients.length === 0) {
    return [];
  }

  const clientIdsFilter = `in.(${activeClients.map((row) => row.id).join(",")})`;
  const params = new URLSearchParams({
    select: "id,name,project_type,status,client_id,created_at",
    tenant_id: `eq.${tenantId}`,
    client_id: clientIdsFilter,
    order: "created_at.desc"
  });
  const rows = await postgrest<{
    id: string;
    name: string;
    project_type: string;
    status: string;
    client_id: string;
    created_at: string;
  }[]>(`projects?${params.toString()}`, { method: "GET" });
  return rows;
}

/**
 * Lista clientes de un tenant.
 * Retorna array con id, name, legal_name, status, primary_contact_name, primary_contact_email, primary_contact_whatsapp, primary_contact_channel, notes.
 */
export async function getClientsByTenant(tenantId: string): Promise<
  Array<{
    id: string;
    name: string;
    legal_name: string | null;
    status: string;
    primary_contact_name: string | null;
    primary_contact_email: string | null;
    primary_contact_whatsapp: string | null;
    primary_contact_channel: string | null;
    notes: string | null;
  }>
> {
  const params = new URLSearchParams({
    select: "id,name,legal_name,status,primary_contact_name,primary_contact_email,primary_contact_whatsapp,primary_contact_channel,notes",
    tenant_id: `eq.${tenantId}`,
    deleted_at: "is.null",
    order: "created_at.desc"
  });
  const rows = await postgrest<{
    id: string;
    name: string;
    legal_name: string | null;
    status: string;
    primary_contact_name: string | null;
    primary_contact_email: string | null;
    primary_contact_whatsapp: string | null;
    primary_contact_channel: string | null;
    notes: string | null;
  }[]>(`clients?${params.toString()}`, { method: "GET" });
  return rows;
}

/**
 * Lista briefs de un tenant.
 * Retorna array con id, tenant_id, client_id, project_id, status, source_channel, current_version_number, active_version_id, created_at, updated_at.
 */
export async function getBriefsByTenant(tenantId: string): Promise<
  Array<{
    id: string;
    tenant_id: string;
    client_id: string | null;
    project_id: string | null;
    status: string;
    source_channel: string;
    current_version_number: number;
    active_version_id: string | null;
    created_at: string;
    updated_at: string;
  }>
> {
  const params = new URLSearchParams({
    select: "id,tenant_id,client_id,project_id,status,source_channel,current_version_number,active_version_id,created_at,updated_at",
    tenant_id: `eq.${tenantId}`,
    deleted_at: "is.null",
    order: "updated_at.desc"
  });
  const rows = await postgrest<{
    id: string;
    tenant_id: string;
    client_id: string | null;
    project_id: string | null;
    status: string;
    source_channel: string;
    current_version_number: number;
    active_version_id: string | null;
    created_at: string;
    updated_at: string;
  }[]>(`briefs?${params.toString()}`, { method: "GET" });
  return rows;
}

/**
 * Lista cotizaciones de un tenant.
 * Retorna array con id, tenant_id, client_id, project_id, brief_id, status, active_version_id, created_at, updated_at.
 */
export async function getQuotationsByTenant(tenantId: string): Promise<
  Array<{
    id: string;
    tenant_id: string;
    client_id: string;
    project_id: string;
    brief_id: string | null;
    status: string;
    active_version_id: string | null;
    created_at: string;
    updated_at: string;
  }>
> {
  const params = new URLSearchParams({
    select: "id,tenant_id,client_id,project_id,brief_id,status,active_version_id,created_at,updated_at",
    tenant_id: `eq.${tenantId}`,
    order: "created_at.desc"
  });
  const rows = await postgrest<{
    id: string;
    tenant_id: string;
    client_id: string;
    project_id: string;
    brief_id: string | null;
    status: string;
    active_version_id: string | null;
    created_at: string;
    updated_at: string;
  }[]>(`quotations?${params.toString()}`, { method: "GET" });
  return rows;
}

// ─── createOrUpdateAssetPrompt ────────────────────────────────────────────────

/**
 * IMPL-20260510-08
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-08_mcp_server_bridge_para_agentes_vscode.md
 *
 * Crea una nueva versión activa de la spec de producción para un activo,
 * marcando la versión activa anterior como superseded.
 * Si assetId no pertenece al tenant lanza Error("asset_not_found").
 */
export async function createOrUpdateAssetPrompt(
  assetId: string,
  tenantId: string,
  promptText: string,
  agentId: string = "vscode-agent"
): Promise<AssetPromptVersion> {
  // Verificar que el asset existe y pertenece al tenant
  const assetParams = new URLSearchParams({
    select: "id",
    id: `eq.${assetId}`,
    tenant_id: `eq.${tenantId}`,
    limit: "1"
  });
  const assetRows = await postgrest<{ id: string }[]>(
    `assets?${assetParams.toString()}`,
    { method: "GET" }
  );
  if (assetRows.length === 0) {
    throw new Error("asset_not_found");
  }

  // Obtener todas las versiones para calcular el siguiente número
  const versionsParams = new URLSearchParams({
    select: "id,version_number,status",
    asset_id: `eq.${assetId}`,
    order: "version_number.desc"
  });
  const versionRows = await postgrest<{ id: string; version_number: number; status: string }[]>(
    `asset_prompt_versions?${versionsParams.toString()}`,
    { method: "GET" }
  );

  const nextVersionNumber = versionRows.length > 0
    ? Math.max(...versionRows.map((v) => v.version_number)) + 1
    : 1;

  // Marcar versiones activas anteriores como superseded
  const activeIds = versionRows
    .filter((v) => v.status === "active")
    .map((v) => v.id);

  for (const id of activeIds) {
    await postgrest<PromptVersionRow[]>(
      `asset_prompt_versions?id=eq.${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "superseded" })
      }
    );
  }

  // Crear nueva versión activa
  // Nota: created_by_agent_id referencia public.service_agents(id) (UUID FK),
  // no se envía para evitar violación de FK — queda NULL.
  const newRows = await postgrest<PromptVersionRow[]>("asset_prompt_versions", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: tenantId,
      asset_id: assetId,
      version_number: nextVersionNumber,
      prompt_text: promptText,
      status: "active"
    })
  });

  const newRow = newRows[0];
  if (!newRow) throw new Error("asset_prompt_version:create_failed");
  return normalizePromptVersionRow(newRow);
}

// ─── Funciones de creación MCP (IMPL-20260510-14) ────────────────────────────
// Respaldo: context/SPECs/SPEC_ARCH-20260510-14_mcp_crear_cliente_proyecto_activo.md

/**
 * Helper de inserción con manejo de errores Postgres (ej. 23505 unicidad).
 * A diferencia de `postgrest`, no descarta el cuerpo del error antes de lanzar.
 */
async function postgrestInsert<T>(table: string, body: unknown): Promise<T> {
  const key = getServerApiKey();
  const res = await fetch(`${supabaseEnv.url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    cache: "no-store",
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (err?.code === "23505") throw new Error("name_conflict");
    throw new Error(`supabase_postgrest_error:${res.status}`);
  }

  return (await res.json()) as T;
}

// ─── Helpers de validación de contacto (IMPL-20260513-01) ───────────────────

/**
 * Valida que el string tenga forma de email con un patrón pragmático.
 * No intenta RFC 5322 completo — basta para un corte operativo.
 */
export function isValidEmail(value: string): boolean {
  // TLD mínimo 2 chars — más honesto que 1 char (IMPL-20260513-02 / observación GEM)
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/**
 * Limpia un número de WhatsApp: elimina todo lo que no sea dígito ni el + inicial.
 * Ejemplo: "+52 (55) 1234-5678" → "+5215512345678"
 */
export function sanitizeWhatsapp(value: string): string {
  const trimmed = value.trim();
  const prefix = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "");
  return `${prefix}${digits}`;
}

export type CreateClientInput = {
  name: string;
  legalName?: string;
  status?: "active" | "prospect" | "inactive";
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactWhatsapp?: string;
  primaryContactChannel?: string;
  notes?: string;
};

export type CreateProjectInput = {
  clientId: string;
  name: string;
  projectType: "lanzamiento" | "presencia" | "contenido" | "campana" | "interno";
  objective?: string;
  status?: "draft" | "active" | "paused" | "completed" | "archived";
  startDate?: string;
  endDate?: string;
};

export type CreateAssetViaProjectInput = {
  projectId: string;
  title: string;
  applicationCode: string;
  pieceTypeCode: string;
  placementCode: string;
  formatCode: string;
  status?: string;
};

/**
 * Crea un nuevo cliente en el tenant indicado.
 * Lanza Error('name_conflict') si ya existe un cliente con ese nombre en el tenant.
 */
export async function createClient(
  tenantId: string,
  data: CreateClientInput
): Promise<{ id: string; name: string; status: string }> {
  const rows = await postgrestInsert<{ id: string; name: string; status: string }[]>("clients", {
    tenant_id: tenantId,
    name: data.name.trim(),
    legal_name: data.legalName ?? null,
    status: data.status ?? "active",
    primary_contact_name: data.primaryContactName ?? null,
    primary_contact_email: data.primaryContactEmail?.trim() ?? null,
    primary_contact_whatsapp:
      data.primaryContactWhatsapp ? sanitizeWhatsapp(data.primaryContactWhatsapp) : null,
    primary_contact_channel: data.primaryContactChannel ?? null,
    notes: data.notes ?? null
  });

  const row = rows[0];
  if (!row) throw new Error("clients:create_failed");
  return row;
}

/**
 * Crea un nuevo proyecto asociado a un cliente en el tenant indicado.
 * Lanza Error('name_conflict') si ya existe un proyecto con ese nombre en (tenant, client).
 */
export async function createProject(
  tenantId: string,
  data: CreateProjectInput
): Promise<{ id: string; name: string; project_type: string; status: string; client_id: string }> {
  const rows = await postgrestInsert<
    { id: string; name: string; project_type: string; status: string; client_id: string }[]
  >("projects", {
    tenant_id: tenantId,
    client_id: data.clientId,
    name: data.name.trim(),
    project_type: data.projectType,
    objective: data.objective ?? null,
    status: data.status ?? "draft",
    start_date: data.startDate ?? null,
    end_date: data.endDate ?? null
  });

  const row = rows[0];
  if (!row) throw new Error("projects:create_failed");
  return row;
}

/**
 * Crea un nuevo activo ligado a un proyecto existente.
 * Resuelve el client_id automáticamente consultando el proyecto.
 * Lanza Error('project_not_found') si el proyecto no existe en el tenant.
 */
export async function createAssetForProject(
  tenantId: string,
  data: CreateAssetViaProjectInput
): Promise<Asset> {
  // Obtener client_id desde el proyecto
  const projectParams = new URLSearchParams({
    select: "id,client_id",
    id: `eq.${data.projectId}`,
    tenant_id: `eq.${tenantId}`,
    limit: "1"
  });
  const projectRows = await postgrest<{ id: string; client_id: string }[]>(
    `projects?${projectParams.toString()}`,
    { method: "GET" }
  );
  if (!projectRows[0]) throw new Error("project_not_found");
  const clientId = projectRows[0].client_id;

  const rows = await postgrestInsert<AssetRow[]>("assets", {
    tenant_id: tenantId,
    client_id: clientId,
    project_id: data.projectId,
    application_code: data.applicationCode,
    piece_type_code: data.pieceTypeCode,
    placement_code: data.placementCode,
    format_code: data.formatCode,
    title: data.title.trim(),
    status: data.status ?? "draft"
  });

  const row = rows[0];
  if (!row) throw new Error("assets:create_failed");
  return normalizeAssetRow(row);
}

/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
export async function getClientById(
  tenantId: string,
  clientId: string
): Promise<{
  id: string;
  name: string;
  legal_name: string | null;
  status: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_whatsapp: string | null;
  primary_contact_channel: string | null;
  notes: string | null;
  brand_kit: BrandKit | null;
} | null> {
  const params = new URLSearchParams({
    select: "id,name,legal_name,status,primary_contact_name,primary_contact_email,primary_contact_whatsapp,primary_contact_channel,notes,brand_kit",
    tenant_id: `eq.${tenantId}`,
    id: `eq.${clientId}`,
    deleted_at: "is.null",
    limit: "1"
  });

  const rows = await postgrest<
    Array<{
      id: string;
      name: string;
      legal_name: string | null;
      status: string;
      primary_contact_name: string | null;
      primary_contact_email: string | null;
      primary_contact_whatsapp: string | null;
      primary_contact_channel: string | null;
      notes: string | null;
      brand_kit: BrandKit | null;
    }>
  >(`clients?${params.toString()}`, { method: "GET" });

  return rows[0] ?? null;
}

/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-02_brand_kit_cliente_bridge_v1.md
 */
export async function updateClientBrandKit(
  tenantId: string,
  clientId: string,
  brandKit: BrandKit
): Promise<void> {
  const params = new URLSearchParams({
    tenant_id: `eq.${tenantId}`,
    id: `eq.${clientId}`,
    select: "id"
  });

  const rows = await postgrest<Array<{ id: string }>>(`clients?${params.toString()}`, {
    method: "PATCH",
    body: JSON.stringify({ brand_kit: brandKit })
  });

  if (!rows[0]) {
    throw new Error("client_not_found");
  }
}

/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
export async function updateClientById(
  tenantId: string,
  clientId: string,
  patch: Partial<{
    name: string;
    legal_name: string | null;
    status: "active" | "prospect" | "inactive";
    primary_contact_name: string | null;
    primary_contact_email: string | null;
    primary_contact_whatsapp: string | null;
    primary_contact_channel: string | null;
    notes: string | null;
  }>
): Promise<{
  id: string;
  name: string;
  legal_name: string | null;
  status: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_whatsapp: string | null;
  primary_contact_channel: string | null;
  notes: string | null;
} | null> {
  const params = new URLSearchParams({
    tenant_id: `eq.${tenantId}`,
    id: `eq.${clientId}`
  });

  const rows = await postgrest<
    Array<{
      id: string;
      name: string;
      legal_name: string | null;
      status: string;
      primary_contact_name: string | null;
      primary_contact_email: string | null;
      primary_contact_whatsapp: string | null;
      primary_contact_channel: string | null;
      notes: string | null;
    }>
  >(`clients?${params.toString()}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });

  return rows[0] ?? null;
}

/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
export async function getProjectById(
  tenantId: string,
  projectId: string
): Promise<{
  id: string;
  name: string;
  project_type: string;
  status: string;
  client_id: string;
  objective: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
} | null> {
  const params = new URLSearchParams({
    select: "id,name,project_type,status,client_id,objective,start_date,end_date,created_at,updated_at",
    tenant_id: `eq.${tenantId}`,
    id: `eq.${projectId}`,
    limit: "1"
  });

  const rows = await postgrest<
    Array<{
      id: string;
      name: string;
      project_type: string;
      status: string;
      client_id: string;
      objective: string | null;
      start_date: string | null;
      end_date: string | null;
      created_at: string;
      updated_at: string;
    }>
  >(`projects?${params.toString()}`, { method: "GET" });

  return rows[0] ?? null;
}

/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
export async function updateProjectById(
  tenantId: string,
  projectId: string,
  patch: Partial<{
    name: string;
    objective: string | null;
    status: "draft" | "active" | "paused" | "completed" | "archived";
    start_date: string | null;
    end_date: string | null;
  }>
): Promise<{
  id: string;
  name: string;
  project_type: string;
  status: string;
  client_id: string;
  objective: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
} | null> {
  const params = new URLSearchParams({
    tenant_id: `eq.${tenantId}`,
    id: `eq.${projectId}`
  });

  const rows = await postgrest<
    Array<{
      id: string;
      name: string;
      project_type: string;
      status: string;
      client_id: string;
      objective: string | null;
      start_date: string | null;
      end_date: string | null;
      created_at: string;
      updated_at: string;
    }>
  >(`projects?${params.toString()}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });

  return rows[0] ?? null;
}

/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
export async function updateAssetById(
  tenantId: string,
  assetId: string,
  patch: Partial<{
    title: string;
    status: AssetStatus;
    quotation_id: string | null;
  }>
): Promise<Asset | null> {
  const params = new URLSearchParams({
    tenant_id: `eq.${tenantId}`,
    id: `eq.${assetId}`
  });

  const rows = await postgrest<AssetRow[]>(`assets?${params.toString()}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });

  return rows[0] ? normalizeAssetRow(rows[0]) : null;
}
