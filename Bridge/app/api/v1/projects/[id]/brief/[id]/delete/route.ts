/**
 * IMPL-20260527-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260527-03_normalizacion_slug_dinamico_projects_delete.md
 *
 * DELETE /api/v1/projects/[id]/brief/[id]/delete
 * Preview y execute de eliminacion de brief.
 *
 * Auth: Bearer <BRIDGE_MCP_SECRET>
 * Tenant: X-Bridge-Tenant
 */

import { NextRequest, NextResponse } from "next/server";

import { verifyAgentToken, getTenantSlug } from "@/lib/agent-auth";
import { getTenantIdBySlug } from "@/lib/assets";
import { previewDeleteBrief, executeDeleteBrief } from "@/lib/entity-delete";

export const dynamic = "force-dynamic";

function getProjectAndBriefIds(pathname: string): { projectId: string; briefId: string } | null {
  const segments = pathname.split("/").filter(Boolean);
  const projectsIndex = segments.indexOf("projects");
  const briefIndex = segments.indexOf("brief");

  if (projectsIndex === -1 || briefIndex === -1) {
    return null;
  }

  const projectId = segments[projectsIndex + 1];
  const briefId = segments[briefIndex + 1];

  if (!projectId || !briefId) {
    return null;
  }

  return { projectId, briefId };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authError = verifyAgentToken(req);
  if (authError) return authError;

  const ids = getProjectAndBriefIds(req.nextUrl.pathname);
  if (!ids) {
    return NextResponse.json({ ok: false, error: "invalid_route_params" }, { status: 400 });
  }

  const { projectId, briefId } = ids;

  const slug = getTenantSlug(req);
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  const briefParams = new URLSearchParams({
    select: "id,project_id,tenant_id",
    id: `eq.${briefId}`,
    tenant_id: `eq.${tenantId}`,
    limit: "1"
  });

  try {
    const briefs = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/briefs?${briefParams.toString()}`,
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

    if (!briefs.ok) {
      return NextResponse.json({ ok: false, error: "brief_not_found" }, { status: 404 });
    }

    const data = (await briefs.json()) as Array<{ id: string; project_id: string | null; tenant_id: string }>;
    if (data.length === 0) {
      return NextResponse.json({ ok: false, error: "brief_not_found" }, { status: 404 });
    }

    if (projectId && data[0].project_id !== projectId) {
      return NextResponse.json({ ok: false, error: "brief_not_associated_to_project" }, { status: 400 });
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
    const result = await previewDeleteBrief(tenantId, briefId);

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
    const previewResult = await previewDeleteBrief(tenantId, briefId);

    if (!previewResult.ok) {
      return NextResponse.json({ ok: false, error: previewResult.error }, { status: 400 });
    }

    if (confirmationText !== previewResult.confirmationText) {
      return NextResponse.json(
        { ok: false, error: "confirmation_mismatch" },
        { status: 400 }
      );
    }

    const result = await executeDeleteBrief(
      tenantId,
      briefId,
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