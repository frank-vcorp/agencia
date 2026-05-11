/**
 * IMPL-20260510-08
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-08_mcp_server_bridge_para_agentes_vscode.md
 *
 * GET /api/v1/assets/[id]/context
 * Retorna contexto completo del activo: metadatos, spec activa y resumen del brief.
 * Auth: Bearer <BRIDGE_MCP_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";

import {
  getTenantIdBySlug,
  getAssetById,
  getActivePrompt,
  getBriefSummaryForAsset
} from "@/lib/assets";
import { verifyAgentToken, getTenantSlug } from "@/lib/agent-auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authError = verifyAgentToken(req);
  if (authError) return authError;

  const { id } = await params;
  const slug = getTenantSlug(req);
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  const asset = await getAssetById(id, tenantId);
  if (!asset) {
    return NextResponse.json({ ok: false, error: "asset_not_found" }, { status: 404 });
  }

  const [activePromptData, briefSummary] = await Promise.all([
    getActivePrompt(asset.id),
    asset.briefId ? getBriefSummaryForAsset(asset.briefId) : Promise.resolve(null)
  ]);

  return NextResponse.json({
    ok: true,
    asset: {
      id: asset.id,
      title: asset.title,
      applicationCode: asset.applicationCode,
      pieceTypeCode: asset.pieceTypeCode,
      placementCode: asset.placementCode,
      formatCode: asset.formatCode,
      status: asset.status
    },
    activeSpec: activePromptData
      ? {
          versionNumber: activePromptData.versionNumber,
          promptText: activePromptData.promptText,
          createdAt: activePromptData.createdAt
        }
      : null,
    briefSummary,
    readyForSpec: asset.status !== "archived"
  });
}
