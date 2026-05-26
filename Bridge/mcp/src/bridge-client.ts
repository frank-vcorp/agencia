/**
 * IMPL-20260510-08
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-08_mcp_server_bridge_para_agentes_vscode.md
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

  async listAssets(): Promise<{ assets: AssetListItem[]; total: number }> {
    const res = await fetch(`${this.baseUrl}/api/v1/assets`, {
      method: "GET",
      headers: this.headers()
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(`bridge_api_error:${res.status}:${body.error ?? "unknown"}`);
    }

    const data = (await res.json()) as { assets: AssetListItem[]; total: number };
    return data;
  }

  async getAssetContext(assetId: string): Promise<AssetContext> {
    const res = await fetch(`${this.baseUrl}/api/v1/assets/${assetId}/context`, {
      method: "GET",
      headers: this.headers()
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
    const res = await fetch(`${this.baseUrl}/api/v1/assets/${assetId}/prompts`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ specContent, versionNote })
    });

    return (await res.json()) as PromptWriteResult | BridgeErrorResult;
  }

  async getBrief(projectId: string): Promise<BriefData> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/brief`, {
      method: "GET",
      headers: this.headers()
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
    const res = await fetch(`${this.baseUrl}/api/v1/assets/${assetId}/files`, {
      method: "GET",
      headers: this.headers()
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
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/quotation`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(input)
    });

    return (await res.json()) as QuotationWriteResult | BridgeErrorResult;
  }

  // ─── Métodos de creación (IMPL-20260510-14) ──────────────────────────────────

  async createClient(
    input: ClientCreateInput
  ): Promise<ClientCreateResult | BridgeErrorResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/clients`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(input)
    });

    return (await res.json()) as ClientCreateResult | BridgeErrorResult;
  }

  async createProject(
    input: ProjectCreateInput
  ): Promise<ProjectCreateResult | BridgeErrorResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(input)
    });

    return (await res.json()) as ProjectCreateResult | BridgeErrorResult;
  }

  async createAsset(
    input: AssetCreateInput
  ): Promise<AssetCreateResult | BridgeErrorResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/assets`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(input)
    });

    return (await res.json()) as AssetCreateResult | BridgeErrorResult;
  }

  // ─── Métodos de eliminación (IMPL-20260526-01) ───────────────────────────────

  async deleteProject(
    projectId: string,
    input: EntityDeleteInput
  ): Promise<EntityDeletePreviewResult | EntityDeleteExecuteResult | BridgeErrorResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/delete`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(input)
    });

    return (await res.json()) as EntityDeletePreviewResult | EntityDeleteExecuteResult | BridgeErrorResult;
  }

  async deleteAsset(
    assetId: string,
    input: EntityDeleteInput
  ): Promise<EntityDeletePreviewResult | EntityDeleteExecuteResult | BridgeErrorResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/assets/${assetId}/delete`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(input)
    });

    return (await res.json()) as EntityDeletePreviewResult | EntityDeleteExecuteResult | BridgeErrorResult;
  }

  async deleteQuotation(
    projectId: string,
    quotationId: string,
    input: EntityDeleteInput
  ): Promise<EntityDeletePreviewResult | EntityDeleteExecuteResult | BridgeErrorResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/quotation/${quotationId}/delete`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(input)
    });

    return (await res.json()) as EntityDeletePreviewResult | EntityDeleteExecuteResult | BridgeErrorResult;
  }

  async deleteBrief(
    projectId: string,
    briefId: string,
    input: EntityDeleteInput
  ): Promise<EntityDeletePreviewResult | EntityDeleteExecuteResult | BridgeErrorResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/brief/${briefId}/delete`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(input)
    });

    return (await res.json()) as EntityDeletePreviewResult | EntityDeleteExecuteResult | BridgeErrorResult;
  }
}
