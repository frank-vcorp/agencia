/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-02_brand_kit_cliente_bridge_v1.md
 */
import { NextRequest, NextResponse } from "next/server";

import { verifyAgentToken, getTenantSlug } from "@/lib/agent-auth";
import {
  getTenantIdBySlug,
  getClientById,
  updateClientBrandKit,
  type BrandKit
} from "@/lib/assets";

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
    const client = await getClientById(tenantId, id);
    if (!client) {
      return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, brand_kit: client.brand_kit }, { status: 200 });
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

  if (!body.brand_kit || typeof body.brand_kit !== "object" || Array.isArray(body.brand_kit)) {
    return NextResponse.json({ ok: false, error: "invalid_brand_kit" }, { status: 400 });
  }

  try {
    const client = await getClientById(tenantId, id);
    if (!client) {
      return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });
    }

    await updateClientBrandKit(tenantId, id, body.brand_kit as BrandKit);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "client_not_found") {
      return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
