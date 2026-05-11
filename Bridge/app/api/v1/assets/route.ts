/**
 * IMPL-20260510-08 | IMPL-20260510-14
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-08_mcp_server_bridge_para_agentes_vscode.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-14_mcp_crear_cliente_proyecto_activo.md
 *
 * GET  /api/v1/assets — Lista todos los activos del tenant con estado y si tienen spec activa.
 * POST /api/v1/assets — Crea un nuevo activo ligado a un proyecto existente.
 * Auth: Bearer <BRIDGE_MCP_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";

import { getTenantIdBySlug, getAssetsByTenant, createAssetForProject } from "@/lib/assets";
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authError = verifyAgentToken(req);
  if (authError) return authError;

  const slug = getTenantSlug(req);
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const required = ["projectId", "title", "applicationCode", "pieceTypeCode", "placementCode", "formatCode"];
  for (const field of required) {
    if (!body[field] || typeof body[field] !== "string") {
      return NextResponse.json({ ok: false, error: `${field}_required` }, { status: 400 });
    }
  }

  try {
    const asset = await createAssetForProject(tenantId, {
      projectId: body.projectId as string,
      title: body.title as string,
      applicationCode: body.applicationCode as string,
      pieceTypeCode: body.pieceTypeCode as string,
      placementCode: body.placementCode as string,
      formatCode: body.formatCode as string,
      status: typeof body.status === "string" ? body.status : undefined
    });

    return NextResponse.json(
      {
        ok: true,
        assetId: asset.id,
        title: asset.title,
        applicationCode: asset.applicationCode,
        pieceTypeCode: asset.pieceTypeCode,
        status: asset.status,
        projectId: asset.projectId,
        message: `Activo "${asset.title}" creado exitosamente.`
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "project_not_found") {
      return NextResponse.json({ ok: false, error: "project_not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
