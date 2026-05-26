/**
 * IMPL-20260526-04
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 *
 * GET  /api/v1/briefs — Lista briefs del tenant
 * POST /api/v1/briefs — Crea un nuevo brief en el tenant activo
 * Auth: Bearer <BRIDGE_MCP_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";

import { getTenantIdBySlug, getBriefsByTenant, createBriefForDefaultTenant } from "@/lib/briefing";
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

  try {
    const briefs = await getBriefsByTenant(tenantId);
    return NextResponse.json({ ok: true, briefs }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
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

  const clientId = typeof body.clientId === "string" ? body.clientId : undefined;
  const projectId = typeof body.projectId === "string" ? body.projectId : undefined;
  const sourceChannel = typeof body.sourceChannel === "string" ? body.sourceChannel : "manual";

  if (!clientId && !projectId) {
    return NextResponse.json({ ok: false, error: "clientId_or_projectId_required" }, { status: 400 });
  }

  try {
    const brief = await createBriefForDefaultTenant(tenantId, {
      clientId,
      projectId,
      sourceChannel
    });

    return NextResponse.json(
      {
        ok: true,
        briefId: brief.id,
        status: brief.status,
        message: `Brief creado exitosamente.`
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
