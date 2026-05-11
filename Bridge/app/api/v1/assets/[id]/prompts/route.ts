/**
 * IMPL-20260510-08
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-08_mcp_server_bridge_para_agentes_vscode.md
 *
 * POST /api/v1/assets/[id]/prompts
 * Crea o actualiza la spec de producción de un activo (supersede la versión activa anterior).
 * Auth: Bearer <BRIDGE_MCP_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";

import { getTenantIdBySlug, createOrUpdateAssetPrompt } from "@/lib/assets";
import { verifyAgentToken, getTenantSlug } from "@/lib/agent-auth";

export const dynamic = "force-dynamic";

export async function POST(
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const { specContent } = body as Record<string, unknown>;
  if (typeof specContent !== "string" || specContent.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: "specContent_required" },
      { status: 400 }
    );
  }

  try {
    const version = await createOrUpdateAssetPrompt(
      id,
      tenantId,
      specContent.trim(),
      "vscode-agent"
    );

    return NextResponse.json({
      ok: true,
      promptVersionId: version.id,
      versionNumber: version.versionNumber,
      assetId: version.assetId,
      message: "Especificación publicada. El diseñador la verá en su workspace de Bridge."
    });
  } catch (err) {
    if (err instanceof Error && err.message === "asset_not_found") {
      return NextResponse.json({ ok: false, error: "asset_not_found" }, { status: 404 });
    }
    throw err;
  }
}
