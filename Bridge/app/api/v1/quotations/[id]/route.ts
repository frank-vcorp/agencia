/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
import { NextRequest, NextResponse } from "next/server";

import { getTenantIdBySlug, getQuotationById, updateQuotationById } from "@/lib/quotations";
import { verifyAgentToken, getTenantSlug } from "@/lib/agent-auth";

export const dynamic = "force-dynamic";

type Params = { id: string };

export async function GET(
  req: NextRequest,
  context: { params: Promise<Params> }
): Promise<NextResponse> {
  const authError = verifyAgentToken(req);
  if (authError) return authError;

  const slug = getTenantSlug(req);
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  const { id } = await context.params;

  try {
    const quotation = await getQuotationById(tenantId, id);
    if (!quotation) {
      return NextResponse.json({ ok: false, error: "quotation_not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, quotation }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<Params> }
): Promise<NextResponse> {
  const authError = verifyAgentToken(req);
  if (authError) return authError;

  const slug = getTenantSlug(req);
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.status === "string") patch.status = body.status;
  if (typeof body.activeVersionId === "string" || body.activeVersionId === null) {
    patch.active_version_id = body.activeVersionId;
  }
  if (typeof body.briefId === "string" || body.briefId === null) {
    patch.brief_id = body.briefId;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "no_valid_fields" }, { status: 400 });
  }

  try {
    const quotation = await updateQuotationById(tenantId, id, patch);
    if (!quotation) {
      return NextResponse.json({ ok: false, error: "quotation_not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, quotation }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
