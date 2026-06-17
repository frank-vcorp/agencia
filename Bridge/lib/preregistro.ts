/**
 * IMPL-20260613-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260610-05_preregistro_cliente_vendedor.md
 *
 * Lógica de negocio del flujo de pre-registro (lado servidor).
 *
 * Esta función es la fuente única de verdad para "crear un preregistro":
 * la consumen tanto el endpoint HTTP (`app/api/v1/preregistro/route.ts`)
 * como la server action (`app/cliente/preregistro/actions.ts`).
 *
 * Mantener una sola implementación evita drift entre los dos puntos de
 * entrada y facilita el testing unitario (se mockean las dependencias
 * en `lib/assets.ts` y `lib/tenant.ts`).
 */
import { createClient, createProject } from "@/lib/assets";
import { resolveTenantIdBySlug } from "@/lib/tenant";
import { supabaseEnv } from "@/lib/supabase";
import { generateWhatsappUrl, normalizePhoneMX } from "@/lib/preregistro-helpers";

/**
 * Validación de entrada del formulario de pre-registro.
 * Retorna un mensaje de error o `null` si el input es válido.
 */
export function validatePreregistroInput(
  input: Partial<PreregistroInput>
): string | null {
  if (!input.clientName || !input.clientPhone || !input.businessName) {
    return "Campos requeridos: clientName, clientPhone, businessName";
  }
  const digits = String(input.clientPhone).replace(/\D/g, "");
  if (digits.length !== 10) {
    return "Teléfono debe tener 10 dígitos";
  }
  return null;
}

export type PreregistroInput = {
  clientName: string;
  clientPhone: string; // 10 dígitos
  businessName: string; // nombre del negocio
};

export type PreregistroSuccess = {
  ok: true;
  clientId: string;
  projectId: string;
  whatsappUrl: string;
};

export type PreregistroFailure = {
  ok: false;
  error: string;
};

export type PreregistroResult = PreregistroSuccess | PreregistroFailure;

/**
 * Crea cliente + proyecto y genera el link de WhatsApp.
 * Lanza excepciones en caso de error de infraestructura; el caller las
 * traduce a HTTP 500 o a un estado de error del formulario.
 */
export async function createPreregistro(
  input: PreregistroInput
): Promise<PreregistroSuccess> {
  const validationError = validatePreregistroInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const normalizedPhone = normalizePhoneMX(input.clientPhone);

  const tenantId = await resolveTenantIdBySlug(supabaseEnv.defaultTenant);
  if (!tenantId) {
    throw new Error("Tenant no encontrado");
  }

  const client = await createClient(tenantId, {
    name: input.clientName,
    status: "prospect",
    primaryContactName: input.clientName,
    primaryContactWhatsapp: normalizedPhone
  });

  const project = await createProject(tenantId, {
    clientId: client.id,
    name: `Preregistro - ${input.businessName}`,
    projectType: "interno",
    status: "draft"
  });

  const whatsappUrl = generateWhatsappUrl(project.id, normalizedPhone);

  return {
    ok: true,
    clientId: client.id,
    projectId: project.id,
    whatsappUrl
  };
}
