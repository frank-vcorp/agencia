/**
 * IMPL-20260526-02 | IMPL-20260526-05
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-08_hardening_parsing_args_tools_mcp_crud_v1.md
 */
import type { BridgeClient } from "../bridge-client.js";

type UpdateClientArgs = {
  clientId: string | null;
  name?: string;
  legalName?: string;
  status?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactWhatsapp?: string;
  primaryContactChannel?: string;
  notes?: string;
};

function parseUpdateClientArgs(args: unknown): UpdateClientArgs {
  if (!args || typeof args !== "object") {
    return { clientId: null };
  }

  return {
    clientId: "clientId" in args && typeof args.clientId === "string" ? args.clientId : null,
    name: "name" in args && typeof args.name === "string" ? args.name : undefined,
    legalName: "legalName" in args && typeof args.legalName === "string" ? args.legalName : undefined,
    status: "status" in args && typeof args.status === "string" ? args.status : undefined,
    primaryContactName:
      "primaryContactName" in args && typeof args.primaryContactName === "string"
        ? args.primaryContactName
        : undefined,
    primaryContactEmail:
      "primaryContactEmail" in args && typeof args.primaryContactEmail === "string"
        ? args.primaryContactEmail
        : undefined,
    primaryContactWhatsapp:
      "primaryContactWhatsapp" in args && typeof args.primaryContactWhatsapp === "string"
        ? args.primaryContactWhatsapp
        : undefined,
    primaryContactChannel:
      "primaryContactChannel" in args && typeof args.primaryContactChannel === "string"
        ? args.primaryContactChannel
        : undefined,
    notes: "notes" in args && typeof args.notes === "string" ? args.notes : undefined
  };
}

export const updateClientToolDefinition = {
  name: "bridge_update_client",
  description: "Actualiza campos permitidos de un cliente en Bridge.",
  inputSchema: {
    type: "object" as const,
    properties: {
      clientId: { type: "string", description: "UUID del cliente" },
      name: { type: "string" },
      legalName: { type: "string" },
      status: { type: "string", enum: ["active", "prospect", "inactive"] },
      primaryContactName: { type: "string" },
      primaryContactEmail: { type: "string" },
      primaryContactWhatsapp: { type: "string" },
      primaryContactChannel: { type: "string" },
      notes: { type: "string" }
    },
    required: ["clientId"]
  }
};

export async function handleUpdateClient(client: BridgeClient, args: unknown): Promise<string> {
  const {
    clientId,
    name,
    legalName,
    status,
    primaryContactName,
    primaryContactEmail,
    primaryContactWhatsapp,
    primaryContactChannel,
    notes
  } = parseUpdateClientArgs(args);

  if (!clientId) return "Error: clientId es requerido.";

  const patch: Record<string, unknown> = {};
  if (typeof name === "string") patch.name = name;
  if (typeof legalName === "string") patch.legalName = legalName;
  if (typeof status === "string") patch.status = status;
  if (typeof primaryContactName === "string") patch.primaryContactName = primaryContactName;
  if (typeof primaryContactEmail === "string") patch.primaryContactEmail = primaryContactEmail;
  if (typeof primaryContactWhatsapp === "string") patch.primaryContactWhatsapp = primaryContactWhatsapp;
  if (typeof primaryContactChannel === "string") patch.primaryContactChannel = primaryContactChannel;
  if (typeof notes === "string") patch.notes = notes;
  if (Object.keys(patch).length === 0) return "Error: no se enviaron campos válidos para actualizar.";

  try {
    const data = await client.updateClient(clientId, patch);
    return `✓ Cliente actualizado: ${data.id} (${data.name}) estado=${data.status}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al actualizar cliente: ${msg}`;
  }
}
