/**
 * IMPL-20260613-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260610-05_preregistro_cliente_vendedor.md
 *
 * Server action del flujo de pre-registro (vendedor).
 *
 * Se usa desde el formulario en `app/cliente/preregistro/page.tsx` vía
 * `useActionState` de React 19. Devuelve un objeto con `ok` + datos o `ok=false`
 * + mensaje de error, para que el componente cliente pueda mostrar feedback
 * sin manejar excepciones.
 *
 * El endpoint HTTP `app/api/v1/preregistro/route.ts` y esta action comparten
 * la misma lógica de negocio (`createPreregistro` en `lib/preregistro.ts`).
 */
"use server";

import {
  createPreregistro,
  validatePreregistroInput
} from "@/lib/preregistro";

export type PreregistroSuccessState = {
  status: "success";
  clientId: string;
  projectId: string;
  whatsappUrl: string;
};

export type PreregistroActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | PreregistroSuccessState;

export async function submitPreregistroAction(
  _prev: PreregistroActionState,
  formData: FormData
): Promise<PreregistroActionState> {
  const input = {
    clientName: String(formData.get("clientName") ?? "").trim(),
    clientPhone: String(formData.get("clientPhone") ?? "").trim(),
    businessName: String(formData.get("businessName") ?? "").trim()
  };

  // Validación rápida del lado del servidor (la página ya valida en cliente).
  const validationError = validatePreregistroInput(input);
  if (validationError) {
    return { status: "error", error: validationError };
  }

  try {
    const result = await createPreregistro(input);
    return {
      status: "success" as const,
      clientId: result.clientId,
      projectId: result.projectId,
      whatsappUrl: result.whatsappUrl
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { status: "error", error: msg };
  }
}
