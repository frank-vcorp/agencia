/**
 * IMPL-20260510-14
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-14_mcp_crear_cliente_proyecto_activo.md
 * IMPL-20260513-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-01_contacto_cliente_estructurado_email_whatsapp_v1.md
 * IMPL-20260526-04
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 *
 * GET  /api/v1/clients — Lista clientes del tenant
 * POST /api/v1/clients — Crea un nuevo cliente en el tenant activo
 * Auth: Bearer <BRIDGE_MCP_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";

import { getTenantIdBySlug, createClient, getClientsByTenant, isValidEmail, sanitizeWhatsapp } from "@/lib/assets";
import { verifyAgentToken, getTenantSlug } from "@/lib/agent-auth";
import { sendTransactionalEmail, buildWhatsAppLink } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = verifyAgentToken(req);
  if (authError) return authError;

  const slug = getTenantSlug(req);
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  try {
    const clients = await getClientsByTenant(tenantId);
    return NextResponse.json({ ok: true, clients }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
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

  const primaryContactEmail =
    typeof body.primaryContactEmail === "string" ? body.primaryContactEmail.trim() : undefined;
  if (primaryContactEmail && !isValidEmail(primaryContactEmail)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const rawWhatsapp =
    typeof body.primaryContactWhatsapp === "string" ? body.primaryContactWhatsapp.trim() : undefined;

  try {
    const client = await createClient(tenantId, {
      name: body.name as string,
      legalName: typeof body.legalName === "string" ? body.legalName : undefined,
      status: body.status as "active" | "prospect" | "inactive" | undefined,
      primaryContactName:
        typeof body.primaryContactName === "string" ? body.primaryContactName : undefined,
      primaryContactEmail,
      primaryContactWhatsapp: rawWhatsapp,
      primaryContactChannel:
        typeof body.primaryContactChannel === "string" ? body.primaryContactChannel : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined
    });

    // MCT: disparar client.created si hay email válido (IMPL-20260513-02)
    let emailSent = false;
    if (primaryContactEmail) {
      const portalUrl = process.env.BRIDGE_PORTAL_URL ?? "https://vectoria.mx";
      const result = await sendTransactionalEmail("client.created", {
        to: primaryContactEmail,
        clientName: client.name,
        portalUrl,
        magicLink: portalUrl, // V1: sin magic link real implementado
        projectName: "(proyecto en preparación)"
      });
      emailSent = result.success;
      if (!emailSent) {
        console.warn("[clients/POST] Email client.created no enviado.", { reason: result.error });
      }
    }

    // WhatsApp Click-to-Send si hay numero de contacto (IMPL-20260513-02)
    const whatsAppLink = rawWhatsapp
      ? buildWhatsAppLink(
          sanitizeWhatsapp(rawWhatsapp),
          `¡Hola ${client.name}! Bienvenido a ${process.env.BRIDGE_AGENCY_NAME ?? "Vectoria"}. Tu espacio está listo.`
        )
      : undefined;

    return NextResponse.json(
      {
        ok: true,
        clientId: client.id,
        name: client.name,
        status: client.status,
        emailSent,
        ...(whatsAppLink ? { whatsAppLink } : {}),
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
