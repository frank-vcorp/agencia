/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 *
 * Tool: bridge_delete_lead
 */

import type { BridgeClient } from "../bridge-client.js";

export const deleteLeadToolDefinition = {
  name: "bridge_delete_lead",
  description: "Mueve un lead a papelera con modo preview/execute.",
  inputSchema: {
    type: "object" as const,
    properties: {
      leadId: { type: "string", description: "ID del lead" },
      mode: { type: "string", enum: ["preview", "execute"], description: "Modo de operación" },
      requestedByLabel: { type: "string", description: "Nombre del agente solicitante" },
      approvedByLabel: { type: "string", description: "Nombre del humano aprobador" },
      reason: { type: "string", description: "Razón operativa" },
      confirmationText: { type: "string", description: "Texto de confirmación para execute" }
    },
    required: ["leadId", "mode", "requestedByLabel", "approvedByLabel", "reason"]
  }
};

export async function handleDeleteLead(
  client: BridgeClient,
  args: Record<string, unknown>
): Promise<string> {
  const leadId = typeof args.leadId === "string" ? args.leadId : undefined;
  const mode = args.mode === "preview" || args.mode === "execute" ? args.mode : undefined;
  const requestedByLabel = typeof args.requestedByLabel === "string" ? args.requestedByLabel : undefined;
  const approvedByLabel = typeof args.approvedByLabel === "string" ? args.approvedByLabel : undefined;
  const reason = typeof args.reason === "string" ? args.reason : undefined;
  const confirmationText = typeof args.confirmationText === "string" ? args.confirmationText : undefined;

  if (!leadId) return "Error: leadId es requerido y debe ser un string.";
  if (!mode) return "Error: mode es requerido y debe ser 'preview' o 'execute'.";
  if (!requestedByLabel) return "Error: requestedByLabel es requerido y debe ser un string.";
  if (!approvedByLabel) return "Error: approvedByLabel es requerido y debe ser un string.";
  if (!reason) return "Error: reason es requerido y debe ser un string.";
  if (mode === "execute" && !confirmationText) {
    return "Error: confirmationText es requerido en modo execute.";
  }

  try {
    const result = await client.deleteLead(leadId, {
      mode,
      requestedByLabel,
      approvedByLabel,
      reason,
      confirmationText: mode === "execute" ? confirmationText : undefined
    });

    if (!result.ok) {
      return `Error: ${result.error}`;
    }

    if (result.mode === "preview") {
      return `Preview papelera de lead "${result.entityLabel}".\n${result.message ?? ""}\n\nTexto de confirmación:\n${result.confirmationText ?? "(sin confirmación)"}`;
    }

    return `Lead "${result.entityLabel}" movido a papelera.\n\nDeletedAt: ${result.deletedAt ?? "n/a"}\nPurgesAt: ${result.purgesAt ?? "n/a"}\nEvento: ${result.eventId ?? "n/a"}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error: ${msg}`;
  }
}
