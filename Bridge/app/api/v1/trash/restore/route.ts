/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 *
 * POST /api/v1/trash/restore
 * Restaura una entidad desde papelera si sigue en ventana de retención.
 */

import { NextRequest, NextResponse } from "next/server";

import { resolveApiV1RequestContext } from "@/lib/api-v1-context";
import { restoreEntity } from "@/lib/entity-delete";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { context: requestContext, error } = await resolveApiV1RequestContext(req);
  if (error) return error;
  if (!requestContext) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const entityType = body.entityType;
  const entityId = body.entityId;

  if (entityType !== "client" && entityType !== "lead" && entityType !== "brief") {
    return NextResponse.json({ ok: false, error: "entityType_invalid" }, { status: 400 });
  }

  if (!entityId || typeof entityId !== "string") {
    return NextResponse.json({ ok: false, error: "entityId_required" }, { status: 400 });
  }

  const result = await restoreEntity(requestContext.tenantId, entityType, entityId);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json(result, { status: 200 });
}
