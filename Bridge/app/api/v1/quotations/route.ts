/**
 * IMPL-20260526-04
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 *
 * GET  /api/v1/quotations — Lista cotizaciones del tenant
 * POST /api/v1/quotations — Crea una nueva cotización en el tenant activo
 * Auth: Bearer <BRIDGE_MCP_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";

import { getTenantIdBySlug, getQuotationsByTenant, createQuotationForProject } from "@/lib/quotations";
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
    const quotations = await getQuotationsByTenant(tenantId);
    return NextResponse.json({ ok: true, quotations }, { status: 200 });
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
  const briefId = typeof body.briefId === "string" ? body.briefId : undefined;

  if (!clientId || !projectId) {
    return NextResponse.json({ ok: false, error: "clientId_and_projectId_required" }, { status: 400 });
  }

  try {
    const quotation = await createQuotationForProject(tenantId, projectId, clientId, briefId);

    return NextResponse.json(
      {
        ok: true,
        quotationId: quotation.id,
        status: quotation.status,
        message: `Cotización creada exitosamente.`
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
