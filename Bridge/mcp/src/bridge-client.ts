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
}
