/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 *
 * POST /api/v1/leads/[id]/delete
 * Soft-delete con preview/execute para leads.
 */

import { NextRequest, NextResponse } from "next/server";

import { resolveApiV1RequestContext } from "@/lib/api-v1-context";
import { softDeleteLead } from "@/lib/entity-delete";

export const dynamic = "force-dynamic";

type Params = { id: string };

export async function POST(
  req: NextRequest,
  context: { params: Promise<Params> }
): Promise<NextResponse> {
  const { context: requestContext, error } = await resolveApiV1RequestContext(req);
  if (error) return error;
  if (!requestContext) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  const { id: leadId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.mode || (body.mode !== "preview" && body.mode !== "execute")) {
    return NextResponse.json({ ok: false, error: "mode_required" }, { status: 400 });
  }

  if (!body.requestedByLabel || typeof body.requestedByLabel !== "string") {
    return NextResponse.json({ ok: false, error: "requestedByLabel_required" }, { status: 400 });
  }

  if (!body.approvedByLabel || typeof body.approvedByLabel !== "string") {
    return NextResponse.json({ ok: false, error: "approvedByLabel_required" }, { status: 400 });
  }

  if (!body.reason || typeof body.reason !== "string") {
    return NextResponse.json({ ok: false, error: "reason_required" }, { status: 400 });
  }

  const mode = body.mode as "preview" | "execute";
  const requestedByLabel = body.requestedByLabel as string;
  const approvedByLabel = body.approvedByLabel as string;
  const reason = body.reason as string;

  if (mode === "preview") {
    const result = await softDeleteLead(
      requestContext.tenantId,
      leadId,
      "preview",
      requestedByLabel,
      approvedByLabel,
      reason
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  }

  if (!body.confirmationText || typeof body.confirmationText !== "string") {
    return NextResponse.json({ ok: false, error: "confirmationText_required" }, { status: 400 });
  }

  const previewResult = await softDeleteLead(
    requestContext.tenantId,
    leadId,
    "preview",
    requestedByLabel,
    approvedByLabel,
    reason
  );

  if (!previewResult.ok) {
    return NextResponse.json({ ok: false, error: previewResult.error }, { status: 400 });
  }

  const result = await softDeleteLead(
    requestContext.tenantId,
    leadId,
    "execute",
    requestedByLabel,
    approvedByLabel,
    reason,
    body.confirmationText as string
  );

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json(result, { status: 200 });
}
