/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 *
 * POST /api/v1/briefs/[id]/delete
 * Permite eliminar briefs huérfanos sin requerir projectId.
 */

import { NextRequest, NextResponse } from "next/server";

import { resolveApiV1RequestContext } from "@/lib/api-v1-context";
import {
  previewDeleteBrief,
  executeDeleteBrief,
  previewDeleteBriefOrphan,
  executeDeleteBriefOrphan
} from "@/lib/entity-delete";

export const dynamic = "force-dynamic";

type Params = { id: string };

async function getBriefProjectBinding(
  tenantId: string,
  briefId: string
): Promise<{ id: string; projectId: string | null } | null> {
  const params = new URLSearchParams({
    select: "id,project_id",
    id: `eq.${briefId}`,
    tenant_id: `eq.${tenantId}`,
    limit: "1"
  });

  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/briefs?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}`,
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error("supabase_error");
  }

  const rows = (await res.json()) as Array<{ id: string; project_id: string | null }>;
  if (!rows[0]) return null;

  return { id: rows[0].id, projectId: rows[0].project_id };
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<Params> }
): Promise<NextResponse> {
  const { context: requestContext, error } = await resolveApiV1RequestContext(req);
  if (error) return error;
  if (!requestContext) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  const { id: briefId } = await context.params;

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

  let binding: { id: string; projectId: string | null } | null;
  try {
    binding = await getBriefProjectBinding(requestContext.tenantId, briefId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  if (!binding) {
    return NextResponse.json({ ok: false, error: "brief_not_found" }, { status: 404 });
  }

  const isOrphan = binding.projectId === null;

  if (mode === "preview") {
    const result = isOrphan
      ? await previewDeleteBriefOrphan(requestContext.tenantId, briefId)
      : await previewDeleteBrief(requestContext.tenantId, briefId);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  }

  if (!body.confirmationText || typeof body.confirmationText !== "string") {
    return NextResponse.json({ ok: false, error: "confirmationText_required" }, { status: 400 });
  }

  const previewResult = isOrphan
    ? await previewDeleteBriefOrphan(requestContext.tenantId, briefId)
    : await previewDeleteBrief(requestContext.tenantId, briefId);

  if (!previewResult.ok) {
    return NextResponse.json({ ok: false, error: previewResult.error }, { status: 400 });
  }

  if (body.confirmationText !== previewResult.confirmationText) {
    return NextResponse.json({ ok: false, error: "confirmation_mismatch" }, { status: 400 });
  }

  const result = isOrphan
    ? await executeDeleteBriefOrphan(
        requestContext.tenantId,
        briefId,
        requestedByLabel,
        approvedByLabel,
        reason,
        body.confirmationText,
        previewResult.confirmationText ?? ""
      )
    : await executeDeleteBrief(
        requestContext.tenantId,
        briefId,
        requestedByLabel,
        approvedByLabel,
        reason,
        body.confirmationText,
        previewResult.confirmationText ?? ""
      );

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json(result, { status: 200 });
}
