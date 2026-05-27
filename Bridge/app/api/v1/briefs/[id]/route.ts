/**
 * IMPL-20260526-02 | IMPL-20260526-04
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-07_normalizacion_contexto_auth_tenant_rutas_crud_id_v1.md
 */
import { NextRequest, NextResponse } from "next/server";

import { getBriefById, updateBriefById } from "@/lib/briefing";
import { resolveApiV1RequestContext } from "@/lib/api-v1-context";

export const dynamic = "force-dynamic";

type Params = { id: string };

export async function GET(
  req: NextRequest,
  context: { params: Promise<Params> }
): Promise<NextResponse> {
  const { context: requestContext, error } = await resolveApiV1RequestContext(req);
  if (error) return error;
  if (!requestContext) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  const { id } = await context.params;

  try {
    const brief = await getBriefById(requestContext.tenantId, id);
    if (!brief) {
      return NextResponse.json({ ok: false, error: "brief_not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, brief }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<Params> }
): Promise<NextResponse> {
  const { context: requestContext, error } = await resolveApiV1RequestContext(req);
  if (error) return error;
  if (!requestContext) {
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
  if (typeof body.sourceChannel === "string") patch.source_channel = body.sourceChannel;
  if (typeof body.clientId === "string" || body.clientId === null) patch.client_id = body.clientId;
  if (typeof body.projectId === "string" || body.projectId === null) patch.project_id = body.projectId;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "no_valid_fields" }, { status: 400 });
  }

  try {
    const brief = await updateBriefById(requestContext.tenantId, id, patch);
    if (!brief) {
      return NextResponse.json({ ok: false, error: "brief_not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, brief }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
