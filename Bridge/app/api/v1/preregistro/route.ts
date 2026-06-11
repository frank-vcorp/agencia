/**
 * IMPL-20260610-04
 * IMPL-20260610-06 - helpers extraídos a lib/preregistro-helpers.ts
 * Endpoint de pre-registro para vendedores.
 * Crea cliente + proyecto + brief y genera link de WhatsApp.
 */
// IMPL-20260610-04 - Endpoint de pre-registro para vendedores
// IMPL-20260610-06 - Refactor: helpers de teléfono y WhatsApp movidos a lib/
import { createClient, createProject } from "@/lib/assets";
import { resolveTenantIdBySlug } from "@/lib/tenant";
import { supabaseEnv } from "@/lib/supabase";
import { generateWhatsappUrl, normalizePhoneMX } from "@/lib/preregistro-helpers";

type PreregistroInput = {
  clientName: string;
  clientPhone: string; // 10 dígitos
  businessName: string; // nombre del negocio = nombre del proyecto
};

type PreregistroResult = {
  ok: true;
  clientId: string;
  projectId: string;
  whatsappUrl: string;
};

type PreregistroError = {
  ok: false;
  error: string;
};

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({})) as PreregistroInput;

  if (!body.clientName || !body.clientPhone || !body.businessName) {
    return Response.json({ ok: false, error: "Campos requeridos: clientName, clientPhone, businessName" } as PreregistroError, { status: 400 });
  }

  const phoneRegex = /^\d{10,}$/;
  if (!phoneRegex.test(body.clientPhone)) {
    return Response.json({ ok: false, error: "Teléfono debe tener 10 dígitos" } as PreregistroError, { status: 400 });
  }

  const normalizedPhone = normalizePhoneMX(body.clientPhone);

  try {
    // Obtener tenantId del tenant por defecto (vectoria)
    const tenantId = await resolveTenantIdBySlug(supabaseEnv.defaultTenant);
    if (!tenantId) {
      return Response.json({ ok: false, error: "Tenant no encontrado" } as PreregistroError, { status: 500 });
    }

    // 1. Crear cliente (usar contacto estructurado)
    const client = await createClient(tenantId, {
      name: body.clientName,
      status: "prospect",
      primaryContactName: body.clientName,
      primaryContactWhatsapp: normalizedPhone
    });

    // 2. Crear proyecto (nombre = businessName "Preregistro - [negocio]")
    const project = await createProject(tenantId, {
      clientId: client.id,
      name: `Preregistro - ${body.businessName}`,
      projectType: "interno",
      status: "draft"
    });

    // 3. Generar link WhatsApp
    const whatsappUrl = generateWhatsappUrl(project.id, normalizedPhone);

    return Response.json({
      ok: true,
      clientId: client.id,
      projectId: project.id,
      whatsappUrl
    } as PreregistroResult);

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: msg } as PreregistroError, { status: 500 });
  }
}