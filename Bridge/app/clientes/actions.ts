"use server";

/**
 * IMPL-ARCH-20260612-05
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-05_gestion_clientes_crud_detalle_entidades_relacionadas.md
 * Server actions para el CRUD de clientes desde la UI del operador.
 * Reutilizan las funciones de `lib/clients.ts`.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createClient as createClientLib,
  updateClient as updateClientLib,
  deleteClient as deleteClientLib,
  type ClientStatus,
  type CreateClientInput,
  type UpdateClientInput
} from "@/lib/clients";
import { isValidEmail, sanitizeWhatsapp } from "@/lib/assets";

export type ClientFormState = {
  ok: boolean;
  error: string | null;
  fieldErrors: Partial<Record<keyof CreateClientInput, string>>;
  message?: string;
};

function parseFormData(formData: FormData): {
  name: string;
  status: ClientStatus;
  legalName: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactWhatsapp: string | null;
  primaryContactChannel: string | null;
  notes: string | null;
} {
  return {
    name: String(formData.get("name") ?? "").trim(),
    status: (String(formData.get("status") ?? "active") as ClientStatus) || "active",
    legalName: String(formData.get("legalName") ?? "").trim() || null,
    primaryContactName: String(formData.get("primaryContactName") ?? "").trim() || null,
    primaryContactEmail: String(formData.get("primaryContactEmail") ?? "").trim() || null,
    primaryContactWhatsapp: String(formData.get("primaryContactWhatsapp") ?? "").trim() || null,
    primaryContactChannel: String(formData.get("primaryContactChannel") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null
  };
}

function validate(input: ReturnType<typeof parseFormData>): ClientFormState["fieldErrors"] {
  const errors: ClientFormState["fieldErrors"] = {};
  if (!input.name) errors.name = "El nombre es obligatorio.";
  if (input.primaryContactEmail && !isValidEmail(input.primaryContactEmail)) {
    errors.primaryContactEmail = "Email no válido.";
  }
  if (!["active", "prospect", "inactive"].includes(input.status)) {
    errors.status = "Estado no válido.";
  }
  return errors;
}

export async function createClientAction(
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const parsed = parseFormData(formData);
  const fieldErrors = validate(parsed);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Datos inválidos.", fieldErrors };
  }

  try {
    const created = await createClientLib({
      name: parsed.name,
      legalName: parsed.legalName,
      status: parsed.status,
      primaryContactName: parsed.primaryContactName,
      primaryContactEmail: parsed.primaryContactEmail,
      primaryContactWhatsapp: parsed.primaryContactWhatsapp
        ? sanitizeWhatsapp(parsed.primaryContactWhatsapp)
        : null,
      primaryContactChannel: parsed.primaryContactChannel,
      notes: parsed.notes
    });

    revalidatePath("/clientes");
    revalidatePath(`/cliente/${created.id}`);
    redirect(`/cliente/${created.id}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg, fieldErrors: {} };
  }
}

export async function updateClientAction(
  clientId: string,
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const parsed = parseFormData(formData);
  const fieldErrors = validate(parsed);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Datos inválidos.", fieldErrors };
  }

  const patch: UpdateClientInput = {
    name: parsed.name,
    legalName: parsed.legalName,
    status: parsed.status,
    primaryContactName: parsed.primaryContactName,
    primaryContactEmail: parsed.primaryContactEmail,
    primaryContactWhatsapp: parsed.primaryContactWhatsapp
      ? sanitizeWhatsapp(parsed.primaryContactWhatsapp)
      : null,
    primaryContactChannel: parsed.primaryContactChannel,
    notes: parsed.notes
  };

  try {
    const updatedId = await updateClientLib(clientId, patch);
    if (!updatedId) {
      return { ok: false, error: "client_not_found", fieldErrors: {} };
    }

    revalidatePath("/clientes");
    revalidatePath(`/cliente/${clientId}`);
    redirect(`/cliente/${clientId}`);
  } catch (err) {
    // redirect() throws — re-throw to let Next.js handle it
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg, fieldErrors: {} };
  }
}

/**
 * Server action para eliminar (soft-delete) un cliente.
 * Usado por el modal de confirmación en `client-list.tsx` y `client-detail-view.tsx`.
 */
export async function deleteClientAction(clientId: string): Promise<{ ok: boolean; error?: string }> {
  if (!clientId) return { ok: false, error: "client_id_required" };

  try {
    const ok = await deleteClientLib(clientId);
    if (!ok) return { ok: false, error: "client_not_found" };

    revalidatePath("/clientes");
    revalidatePath(`/cliente/${clientId}`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
