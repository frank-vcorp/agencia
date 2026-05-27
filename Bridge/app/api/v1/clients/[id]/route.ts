/**
 * IMPL-20260526-02 | IMPL-20260526-04
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-07_normalizacion_contexto_auth_tenant_rutas_crud_id_v1.md
 */
import { NextRequest, NextResponse } from "next/server";

import {
  getClientById,
  updateClientById,
  isValidEmail,
  sanitizeWhatsapp
} from "@/lib/assets";
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
    const client = await getClientById(requestContext.tenantId, id);
    if (!client) {
      return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, client }, { status: 200 });
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

  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.legalName === "string" || body.legalName === null) patch.legal_name = body.legalName;
  if (typeof body.status === "string") patch.status = body.status;
  if (typeof body.primaryContactName === "string" || body.primaryContactName === null) {
    patch.primary_contact_name = body.primaryContactName;
  }
  if (typeof body.primaryContactEmail === "string" || body.primaryContactEmail === null) {
    if (typeof body.primaryContactEmail === "string" && body.primaryContactEmail.trim() && !isValidEmail(body.primaryContactEmail)) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }
    patch.primary_contact_email = typeof body.primaryContactEmail === "string" ? body.primaryContactEmail.trim() : null;
  }
  if (typeof body.primaryContactWhatsapp === "string" || body.primaryContactWhatsapp === null) {
    patch.primary_contact_whatsapp =
      typeof body.primaryContactWhatsapp === "string"
        ? sanitizeWhatsapp(body.primaryContactWhatsapp)
        : null;
  }
  if (typeof body.primaryContactChannel === "string" || body.primaryContactChannel === null) {
    patch.primary_contact_channel = body.primaryContactChannel;
  }
  if (typeof body.notes === "string" || body.notes === null) patch.notes = body.notes;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "no_valid_fields" }, { status: 400 });
  }

  try {
    const client = await updateClientById(requestContext.tenantId, id, patch);
    if (!client) {
      return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, client }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
