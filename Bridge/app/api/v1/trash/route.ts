/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 *
 * GET /api/v1/trash
 * Lista entidades en papelera para el tenant activo.
 */

import { NextRequest, NextResponse } from "next/server";

import { resolveApiV1RequestContext } from "@/lib/api-v1-context";
import { listTrashItems } from "@/lib/entity-delete";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { context: requestContext, error } = await resolveApiV1RequestContext(req);
  if (error) return error;
  if (!requestContext) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  const result = await listTrashItems(requestContext.tenantId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json(result, { status: 200 });
}
