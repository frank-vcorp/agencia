/**
 * IMPL-20260510-08
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-08_mcp_server_bridge_para_agentes_vscode.md
 *
 * GET /api/v1/assets
 * Lista todos los activos del tenant con estado y si tienen spec activa.
 * Auth: Bearer <BRIDGE_MCP_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";

import { getTenantIdBySlug, getAssetsByTenant } from "@/lib/assets";
import { verifyAgentToken, getTenantSlug } from "@/lib/agent-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = verifyAgentToken(req);
  if (authError) return authError;

  const slug = getTenantSlug(req);
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  const workspaces = await getAssetsByTenant(tenantId);

  const assets = workspaces.map(({ asset, activePrompt }) => ({
    id: asset.id,
    title: asset.title,
    applicationCode: asset.applicationCode,
    pieceTypeCode: asset.pieceTypeCode,
    status: asset.status,
    hasActiveSpec: activePrompt !== null,
    projectId: asset.projectId,
    clientId: asset.clientId
  }));

  return NextResponse.json({ ok: true, assets, total: assets.length });
}
