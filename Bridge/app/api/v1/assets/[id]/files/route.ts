/**
 * IMPL-20260513-16
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-16_mcp_vika_sincronizacion_local_v1.md
 *
 * GET /api/v1/assets/[id]/files
 * Retorna archivos reales descargables asociados a un activo.
 * Auth: Bearer <BRIDGE_MCP_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";

import { getTenantIdBySlug, getAssetById } from "@/lib/assets";
import { listAssetEvidences } from "@/lib/asset-detail";
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

  const files = (await listAssetEvidences(asset.id)).map((evidence) => ({
    evidenceId: evidence.id,
    proposalId: evidence.proposalId,
    fileName: evidence.fileName,
    mimeType: evidence.mimeType,
    storagePath: evidence.storagePath,
    signedUrl: evidence.signedUrl,
    uploadedAt: evidence.uploadedAt
  }));

  return NextResponse.json({
    ok: true,
    asset: {
      id: asset.id,
      title: asset.title
    },
    files
  });
}