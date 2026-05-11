/**
 * IMPL-20260510-14
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-14_mcp_crear_cliente_proyecto_activo.md
 *
 * GET  /api/v1/clients — Lista clientes del tenant (stub mínimo)
 * POST /api/v1/clients — Crea un nuevo cliente en el tenant activo
 * Auth: Bearer <BRIDGE_MCP_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";

import { getTenantIdBySlug, createClient } from "@/lib/assets";
import { verifyAgentToken, getTenantSlug } from "@/lib/agent-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = verifyAgentToken(req);
  if (authError) return authError;

  const slug = getTenantSlug(req);
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    message: "Usa POST /api/v1/clients para crear un cliente.",
    tenantId
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authError = verifyAgentToken(req);
  if (authError) return authError;

  const slug = getTenantSlug(req);
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
  }

  try {
    const client = await createClient(tenantId, {
      name: body.name as string,
      legalName: typeof body.legalName === "string" ? body.legalName : undefined,
      status: body.status as "active" | "prospect" | "inactive" | undefined,
      primaryContactName:
        typeof body.primaryContactName === "string" ? body.primaryContactName : undefined,
      primaryContactChannel:
        typeof body.primaryContactChannel === "string" ? body.primaryContactChannel : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined
    });

    return NextResponse.json(
      {
        ok: true,
        clientId: client.id,
        name: client.name,
        status: client.status,
        message: `Cliente "${client.name}" creado exitosamente.`
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "name_conflict") {
      return NextResponse.json({ ok: false, error: "name_conflict" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
