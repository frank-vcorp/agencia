/**
 * IMPL-20260527-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260527-02_timeout_fail_fast_mcp_bridge.md
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 *
 * Cliente HTTP que consume las rutas /api/v1/ de Bridge.
 * Inyecta el token de autenticación y el tenant slug en cada request.
 */

import type { BridgeConfig } from "./config.js";

export type AssetListItem = {
  id: string;
  title: string;
  applicationCode: string;
  pieceTypeCode: string;
  status: string;
  hasActiveSpec: boolean;
  projectId: string;
  clientId: string;
};

export type AssetContext = {
  asset: {
    id: string;
    title: string;
    applicationCode: string;
    pieceTypeCode: string;
    placementCode: string;
    formatCode: string;
    status: string;
  };
  activeSpec: {
    versionNumber: number;
    promptText: string;
    createdAt: string;
  } | null;
  briefSummary: string | null;
  readyForSpec: boolean;
};

export type AssetDownloadFile = {
  evidenceId: string;
  proposalId: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  signedUrl: string | null;
  uploadedAt: string;
};

export type AssetFilesData = {
  asset: {
    id: string;
    title: string;
  };
  files: AssetDownloadFile[];
};

export type PromptWriteResult = {
  ok: true;
  promptVersionId: string;
  versionNumber: number;
  assetId: string;
  message: string;
};

export type BridgeErrorResult = {
  ok: false;
  error: string;
};

export type BriefData = {
  project: { id: string; name: string };
  brief: {
    status: string;
    summary: string;
    objectives: string[];
    targetAudience: string;
    tone: string;
    references: string[];
    constraints: string[];
    rawContent: string;
  };
};

export type QuotationLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  currency: "MXN" | "USD";
};

export type QuotationWriteInput = {
  title: string;
  summaryText: string;
  lineItems: QuotationLineItem[];
  validUntil: string;
  notes?: string;
  setAsActive?: boolean;
};

export type QuotationWriteResult = {
  ok: true;
  quotationId: string;
  version: number;
  status: "draft" | "vigente";
  totalAmount: number;
  currency: string;
  emailSent: boolean;
};

// ─── Tipos para creación de entidades (IMPL-20260510-14) ──────────────────────

export type ClientCreateInput = {
  name: string;
  legalName?: string;
  status?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactWhatsapp?: string;
  primaryContactChannel?: string;
  notes?: string;
};

export type ClientCreateResult = {
  ok: true;
  clientId: string;
  name: string;
  status: string;
  message: string;
};

export type ProjectCreateInput = {
  clientId: string;
  name: string;
  projectType: string;
  objective?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
};

export type ProjectCreateResult = {
  ok: true;
  projectId: string;
  name: string;
  projectType: string;
  status: string;
  clientId: string;
  message: string;
};

export type AssetCreateInput = {
  projectId: string;
  title: string;
  applicationCode: string;
  pieceTypeCode: string;
  placementCode: string;
  formatCode: string;
  status?: string;
};

export type AssetCreateResult = {
  ok: true;
  assetId: string;
  title: string;
  applicationCode: string;
  pieceTypeCode: string;
  status: string;
  projectId: string;
  message: string;
};

export type ProjectListItem = {
  id: string;
  name: string;
  project_type: string;
  status: string;
  client_id: string;
  created_at: string;
};

export type ProjectDetail = ProjectListItem & {
  objective: string | null;
  start_date: string | null;
  end_date: string | null;
  updated_at: string;
};

export type ClientListItem = {
  id: string;
  name: string;
  legal_name: string | null;
  status: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_whatsapp: string | null;
  primary_contact_channel: string | null;
  notes: string | null;
};

export type BriefListItem = {
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
};

export type QuotationListItem = {
  id: string;
  tenant_id: string;
  client_id: string;
  project_id: string;
  brief_id: string | null;
  status: string;
  active_version_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientUpdateInput = Partial<{
  name: string;
  legalName: string | null;
  status: string;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactWhatsapp: string | null;
  primaryContactChannel: string | null;
  notes: string | null;
}>;

export type ProjectUpdateInput = Partial<{
  name: string;
  objective: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
}>;

export type BriefUpdateInput = Partial<{
  status: string;
  sourceChannel: string;
  clientId: string | null;
  projectId: string | null;
}>;

export type QuotationUpdateInput = Partial<{
  status: string;
  activeVersionId: string | null;
  briefId: string | null;
}>;

export type AssetUpdateInput = Partial<{
  title: string;
  status: string;
  quotationId: string | null;
}>;

export type AssetDetail = {
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
  status: string;
  createdAt: string;
  updatedAt: string;
};

// ─── Tipos para eliminación de entidades (IMPL-20260526-01) ───────────────────

export type EntityDeleteMode = "preview" | "execute";

export type EntityDeletePreviewResult = {
  ok: true;
  mode: "preview";
  entityType: string;
  entityId: string;
  entityLabel: string;
  impact: {
    direct: number;
    cascaded: number;
    detached: number;
  };
  confirmationText: string;
};

export type EntityDeleteExecuteResult = {
  ok: true;
  mode: "execute";
  deletedEntityId: string;
  deletedEntityType: string;
  deletedEntityLabel: string;
  impactSummary: {
    direct: number;
    cascaded: number;
    detached: number;
  };
  eventId: string;
  message: string;
};

export type EntityDeleteInput = {
  mode: EntityDeleteMode;
  requestedByLabel: string;
  approvedByLabel: string;
  reason: string;
  confirmationText?: string;
};

/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 */
export type EntitySoftDeletePreviewResult = {
  ok: true;
  mode: "preview";
  entityType: "client" | "lead" | "brief";
  entityId: string;
  entityLabel: string;
  confirmationText?: string;
  blockedReason?: string;
  message?: string;
  activeProjects?: Array<{ id: string; name: string; status: string }>;
};

export type EntitySoftDeleteExecuteResult = {
  ok: true;
  mode: "execute";
  entityType: "client" | "lead" | "brief";
  entityId: string;
  entityLabel: string;
  deletedAt?: string;
  purgesAt?: string;
  blockedReason?: string;
  eventId?: string;
  message?: string;
  activeProjects?: Array<{ id: string; name: string; status: string }>;
};

export type TrashItem = {
  entityType: "client" | "lead" | "brief";
  entityId: string;
  entityLabel: string;
  deletedAt: string;
  purgesAt: string;
  daysRemaining: number;
  canRestore: boolean;
};

export type ListTrashData = {
  ok: true;
  items: TrashItem[];
  total: number;
};

export type RestoreEntityData = {
  ok: true;
  entityType: string;
  entityId: string;
  entityLabel: string;
  restoredAt: string;
  message: string;
};

const BRIDGE_HTTP_TIMEOUT_MS = 10_000;

export class BridgeClient {
  private readonly baseUrl: string;
  private readonly secret: string;
  private readonly tenantSlug: string;

  constructor(config: BridgeConfig) {
    this.baseUrl = config.bridgeUrl.replace(/\/$/, "");
    this.secret = config.bridgeMcpSecret;
    this.tenantSlug = config.bridgeTenantSlug;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.secret}`,
      "Content-Type": "application/json",
      "X-Bridge-Tenant": this.tenantSlug
    };
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BRIDGE_HTTP_TIMEOUT_MS);

    try {
      return await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: this.headers(),
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`bridge_timeout_error:Bridge no respondio en ${BRIDGE_HTTP_TIMEOUT_MS}ms`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async listAssets(): Promise<{ assets: AssetListItem[]; total: number }> {
    const res = await this.request("/api/v1/assets", {
      method: "GET",
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }

    const data = (await res.json()) as { assets: AssetListItem[]; total: number };
    return data;
  }

  async getAssetContext(assetId: string): Promise<AssetContext> {
    const res = await this.request(`/api/v1/assets/${assetId}/context`, {
      method: "GET",
    });

    if (res.status === 404) {
      throw new Error("asset_not_found");
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }

    return (await res.json()) as AssetContext;
  }

  async writeProductionSpec(
    assetId: string,
    specContent: string,
    versionNote?: string
  ): Promise<PromptWriteResult | BridgeErrorResult> {
    const res = await this.request(`/api/v1/assets/${assetId}/prompts`, {
      method: "POST",
      body: JSON.stringify({ specContent, versionNote })
    });

    return (await res.json()) as PromptWriteResult | BridgeErrorResult;
  }

  async getBrief(projectId: string): Promise<BriefData> {
    const res = await this.request(`/api/v1/projects/${projectId}/brief`, {
      method: "GET",
    });

    if (res.status === 404) {
      throw new Error("project_not_found");
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }

    return (await res.json()) as BriefData;
  }

  async getAssetFiles(assetId: string): Promise<AssetFilesData> {
    const res = await this.request(`/api/v1/assets/${assetId}/files`, {
      method: "GET",
    });

    if (res.status === 404) {
      throw new Error("asset_not_found");
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }

    return (await res.json()) as AssetFilesData;
  }

  async writeQuotation(
    projectId: string,
    input: QuotationWriteInput
  ): Promise<QuotationWriteResult | BridgeErrorResult> {
    const res = await this.request(`/api/v1/projects/${projectId}/quotation`, {
      method: "POST",
      body: JSON.stringify(input)
    });

    return (await res.json()) as QuotationWriteResult | BridgeErrorResult;
  }

  // ─── Métodos de creación (IMPL-20260510-14) ──────────────────────────────────

  async createClient(
    input: ClientCreateInput
  ): Promise<ClientCreateResult | BridgeErrorResult> {
    const res = await this.request("/api/v1/clients", {
      method: "POST",
      body: JSON.stringify(input)
    });

    return (await res.json()) as ClientCreateResult | BridgeErrorResult;
  }

  async createProject(
    input: ProjectCreateInput
  ): Promise<ProjectCreateResult | BridgeErrorResult> {
    const res = await this.request("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify(input)
    });

    return (await res.json()) as ProjectCreateResult | BridgeErrorResult;
  }

  async createAsset(
    input: AssetCreateInput
  ): Promise<AssetCreateResult | BridgeErrorResult> {
    const res = await this.request("/api/v1/assets", {
      method: "POST",
      body: JSON.stringify(input)
    });

    return (await res.json()) as AssetCreateResult | BridgeErrorResult;
  }

  async listProjects(): Promise<{ projects: ProjectListItem[] }> {
    const res = await this.request("/api/v1/projects", {
      method: "GET",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }
    return (await res.json()) as { projects: ProjectListItem[] };
  }

  async getProject(projectId: string): Promise<ProjectDetail> {
    const res = await this.request(`/api/v1/projects/${projectId}`, {
      method: "GET",
    });
    if (res.status === 404) throw new Error("project_not_found");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }
    const data = (await res.json()) as { project: ProjectDetail };
    return data.project;
  }

  async updateProject(projectId: string, input: ProjectUpdateInput): Promise<ProjectDetail> {
    const res = await this.request(`/api/v1/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
    if (res.status === 404) throw new Error("project_not_found");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }
    const data = (await res.json()) as { project: ProjectDetail };
    return data.project;
  }

  async listClients(): Promise<{ clients: ClientListItem[] }> {
    const res = await this.request("/api/v1/clients", {
      method: "GET",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }
    return (await res.json()) as { clients: ClientListItem[] };
  }

  async getClient(clientId: string): Promise<ClientListItem> {
    const res = await this.request(`/api/v1/clients/${clientId}`, {
      method: "GET",
    });
    if (res.status === 404) throw new Error("client_not_found");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }
    const data = (await res.json()) as { client: ClientListItem };
    return data.client;
  }

  async updateClient(clientId: string, input: ClientUpdateInput): Promise<ClientListItem> {
    const res = await this.request(`/api/v1/clients/${clientId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
    if (res.status === 404) throw new Error("client_not_found");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }
    const data = (await res.json()) as { client: ClientListItem };
    return data.client;
  }

  async listBriefs(): Promise<{ briefs: BriefListItem[] }> {
    const res = await this.request("/api/v1/briefs", {
      method: "GET",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }
    return (await res.json()) as { briefs: BriefListItem[] };
  }

  async updateBrief(briefId: string, input: BriefUpdateInput): Promise<BriefListItem> {
    const res = await this.request(`/api/v1/briefs/${briefId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
    if (res.status === 404) throw new Error("brief_not_found");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }
    const data = (await res.json()) as { brief: BriefListItem };
    return data.brief;
  }

  async listQuotations(): Promise<{ quotations: QuotationListItem[] }> {
    const res = await this.request("/api/v1/quotations", {
      method: "GET",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }
    return (await res.json()) as { quotations: QuotationListItem[] };
  }

  async getQuotation(quotationId: string): Promise<QuotationListItem> {
    const res = await this.request(`/api/v1/quotations/${quotationId}`, {
      method: "GET",
    });
    if (res.status === 404) throw new Error("quotation_not_found");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }
    const data = (await res.json()) as { quotation: QuotationListItem };
    return data.quotation;
  }

  async updateQuotationStatus(
    quotationId: string,
    input: QuotationUpdateInput
  ): Promise<QuotationListItem> {
    const res = await this.request(`/api/v1/quotations/${quotationId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
    if (res.status === 404) throw new Error("quotation_not_found");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }
    const data = (await res.json()) as { quotation: QuotationListItem };
    return data.quotation;
  }

  async updateAsset(assetId: string, input: AssetUpdateInput): Promise<AssetDetail> {
    const res = await this.request(`/api/v1/assets/${assetId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
    if (res.status === 404) throw new Error("asset_not_found");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }
    const data = (await res.json()) as { asset: AssetDetail };
    return data.asset;
  }

  // ─── Métodos de eliminación (IMPL-20260526-01) ───────────────────────────────

  async deleteProject(
    projectId: string,
    input: EntityDeleteInput
  ): Promise<EntityDeletePreviewResult | EntityDeleteExecuteResult | BridgeErrorResult> {
    const res = await this.request(`/api/v1/projects/${projectId}/delete`, {
      method: "POST",
      body: JSON.stringify(input)
    });

    return (await res.json()) as EntityDeletePreviewResult | EntityDeleteExecuteResult | BridgeErrorResult;
  }

  async deleteAsset(
    assetId: string,
    input: EntityDeleteInput
  ): Promise<EntityDeletePreviewResult | EntityDeleteExecuteResult | BridgeErrorResult> {
    const res = await this.request(`/api/v1/assets/${assetId}/delete`, {
      method: "POST",
      body: JSON.stringify(input)
    });

    return (await res.json()) as EntityDeletePreviewResult | EntityDeleteExecuteResult | BridgeErrorResult;
  }

  async deleteQuotation(
    projectId: string,
    quotationId: string,
    input: EntityDeleteInput
  ): Promise<EntityDeletePreviewResult | EntityDeleteExecuteResult | BridgeErrorResult> {
    const res = await this.request(`/api/v1/projects/${projectId}/quotation/${quotationId}/delete`, {
      method: "POST",
      body: JSON.stringify(input)
    });

    return (await res.json()) as EntityDeletePreviewResult | EntityDeleteExecuteResult | BridgeErrorResult;
  }

  async deleteBrief(
    projectId: string | undefined,
    briefId: string,
    input: EntityDeleteInput
  ): Promise<EntityDeletePreviewResult | EntityDeleteExecuteResult | BridgeErrorResult> {
    const path = projectId
      ? `/api/v1/projects/${projectId}/brief/${briefId}/delete`
      : `/api/v1/briefs/${briefId}/delete`;

    const res = await this.request(path, {
      method: "POST",
      body: JSON.stringify(input)
    });

    return (await res.json()) as EntityDeletePreviewResult | EntityDeleteExecuteResult | BridgeErrorResult;
  }

  async deleteClient(
    clientId: string,
    input: EntityDeleteInput
  ): Promise<EntitySoftDeletePreviewResult | EntitySoftDeleteExecuteResult | BridgeErrorResult> {
    const res = await this.request(`/api/v1/clients/${clientId}/delete`, {
      method: "POST",
      body: JSON.stringify(input)
    });

    return (await res.json()) as
      | EntitySoftDeletePreviewResult
      | EntitySoftDeleteExecuteResult
      | BridgeErrorResult;
  }

  async deleteLead(
    leadId: string,
    input: EntityDeleteInput
  ): Promise<EntitySoftDeletePreviewResult | EntitySoftDeleteExecuteResult | BridgeErrorResult> {
    const res = await this.request(`/api/v1/leads/${leadId}/delete`, {
      method: "POST",
      body: JSON.stringify(input)
    });

    return (await res.json()) as
      | EntitySoftDeletePreviewResult
      | EntitySoftDeleteExecuteResult
      | BridgeErrorResult;
  }

  async listTrash(): Promise<ListTrashData | BridgeErrorResult> {
    const res = await this.request("/api/v1/trash", {
      method: "GET"
    });

    return (await res.json()) as ListTrashData | BridgeErrorResult;
  }

  async restoreEntity(
    entityType: "client" | "lead" | "brief",
    entityId: string
  ): Promise<RestoreEntityData | BridgeErrorResult> {
    const res = await this.request("/api/v1/trash/restore", {
      method: "POST",
      body: JSON.stringify({ entityType, entityId })
    });

    return (await res.json()) as RestoreEntityData | BridgeErrorResult;
  }
}
