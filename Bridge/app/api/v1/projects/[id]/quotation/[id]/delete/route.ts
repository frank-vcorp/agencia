/**
 * IMPL-20260527-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260527-03_normalizacion_slug_dinamico_projects_delete.md
 *
 * DELETE /api/v1/projects/[id]/quotation/[id]/delete
 * Preview y execute de eliminacion de cotizacion.
 *
 * Auth: Bearer <BRIDGE_MCP_SECRET>
 * Tenant: X-Bridge-Tenant
 */

import { NextRequest, NextResponse } from "next/server";

import { verifyAgentToken, getTenantSlug } from "@/lib/agent-auth";
import { getTenantIdBySlug } from "@/lib/assets";
import { previewDeleteQuotation, executeDeleteQuotation } from "@/lib/entity-delete";

export const dynamic = "force-dynamic";

function getProjectAndQuotationIds(pathname: string): { projectId: string; quotationId: string } | null {
  const segments = pathname.split("/").filter(Boolean);
  const projectsIndex = segments.indexOf("projects");
  const quotationIndex = segments.indexOf("quotation");

  if (projectsIndex === -1 || quotationIndex === -1) {
    return null;
  }

  const projectId = segments[projectsIndex + 1];
  const quotationId = segments[quotationIndex + 1];

  if (!projectId || !quotationId) {
    return null;
  }

  return { projectId, quotationId };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authError = verifyAgentToken(req);
  if (authError) return authError;

  const ids = getProjectAndQuotationIds(req.nextUrl.pathname);
  if (!ids) {
    return NextResponse.json({ ok: false, error: "invalid_route_params" }, { status: 400 });
  }

  const { projectId, quotationId } = ids;

  const slug = getTenantSlug(req);
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  const quotationParams = new URLSearchParams({
    select: "id,project_id",
    id: `eq.${quotationId}`,
    project_id: `eq.${projectId}`,
    tenant_id: `eq.${tenantId}`,
    limit: "1"
  });

  try {
    const quotations = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/quotations?${quotationParams.toString()}`,
      {
        method: "GET",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}`,
          "Content-Type": "application/json"
        },
        cache: "no-store"
      }
    );

    if (!quotations.ok) {
      return NextResponse.json({ ok: false, error: "quotation_not_found" }, { status: 404 });
    }

    const data = (await quotations.json()) as Array<{ id: string; project_id: string }>;
    if (data.length === 0) {
      return NextResponse.json({ ok: false, error: "quotation_not_found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "supabase_error" }, { status: 500 });
  }

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
    const result = await previewDeleteQuotation(tenantId, quotationId);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      mode: "preview",
      entityType: result.entityType,
      entityId: result.entityId,
      entityLabel: result.entityLabel,
      impact: result.impact,
      confirmationText: result.confirmationText
    });
  }

  if (mode === "execute") {
    if (!body.confirmationText || typeof body.confirmationText !== "string") {
      return NextResponse.json({ ok: false, error: "confirmationText_required" }, { status: 400 });
    }

    const confirmationText = body.confirmationText as string;
    const previewResult = await previewDeleteQuotation(tenantId, quotationId);

    if (!previewResult.ok) {
      return NextResponse.json({ ok: false, error: previewResult.error }, { status: 400 });
    }

    if (confirmationText !== previewResult.confirmationText) {
      return NextResponse.json(
        { ok: false, error: "confirmation_mismatch" },
        { status: 400 }
      );
    }

    const result = await executeDeleteQuotation(
      tenantId,
      quotationId,
      requestedByLabel,
      approvedByLabel,
      reason,
      confirmationText,
      previewResult.confirmationText
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      mode: "execute",
      deletedEntityId: result.deletedEntityId,
      deletedEntityType: result.deletedEntityType,
      deletedEntityLabel: result.deletedEntityLabel,
      impactSummary: result.impactSummary,
      eventId: result.eventId,
      message: result.message
    });
  }

  return NextResponse.json({ ok: false, error: "mode_invalid" }, { status: 400 });
}