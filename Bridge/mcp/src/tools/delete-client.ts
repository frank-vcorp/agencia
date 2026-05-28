/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 *
 * Tool: bridge_delete_client
 */

import type { BridgeClient } from "../bridge-client.js";

export const deleteClientToolDefinition = {
  name: "bridge_delete_client",
  description:
    "Mueve un cliente a papelera con modo preview/execute. Bloquea si tiene proyectos activos.",
  inputSchema: {
    type: "object" as const,
    properties: {
      clientId: { type: "string", description: "ID del cliente" },
      mode: { type: "string", enum: ["preview", "execute"], description: "Modo de operación" },
      requestedByLabel: { type: "string", description: "Nombre del agente solicitante" },
      approvedByLabel: { type: "string", description: "Nombre del humano aprobador" },
      reason: { type: "string", description: "Razón operativa" },
      confirmationText: { type: "string", description: "Texto de confirmación para execute" }
    },
    required: ["clientId", "mode", "requestedByLabel", "approvedByLabel", "reason"]
  }
};

export async function handleDeleteClient(
  client: BridgeClient,
  args: Record<string, unknown>
): Promise<string> {
  const clientId = typeof args.clientId === "string" ? args.clientId : undefined;
  const mode = args.mode === "preview" || args.mode === "execute" ? args.mode : undefined;
  const requestedByLabel = typeof args.requestedByLabel === "string" ? args.requestedByLabel : undefined;
  const approvedByLabel = typeof args.approvedByLabel === "string" ? args.approvedByLabel : undefined;
  const reason = typeof args.reason === "string" ? args.reason : undefined;
  const confirmationText = typeof args.confirmationText === "string" ? args.confirmationText : undefined;

  if (!clientId) return "Error: clientId es requerido y debe ser un string.";
  if (!mode) return "Error: mode es requerido y debe ser 'preview' o 'execute'.";
  if (!requestedByLabel) return "Error: requestedByLabel es requerido y debe ser un string.";
  if (!approvedByLabel) return "Error: approvedByLabel es requerido y debe ser un string.";
  if (!reason) return "Error: reason es requerido y debe ser un string.";
  if (mode === "execute" && !confirmationText) {
    return "Error: confirmationText es requerido en modo execute.";
  }

  try {
    const result = await client.deleteClient(clientId, {
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
      if (result.blockedReason === "client_has_active_projects") {
        const projects = result.activeProjects ?? [];
        const projectsText = projects.length === 0
          ? "- (sin detalle de proyectos)"
          : projects.map((p) => `- ${p.name} (${p.status})`).join("\n");

        return `Cliente bloqueado para papelera: ${result.entityLabel}\n\nMotivo: ${result.blockedReason}\nProyectos activos:\n${projectsText}`;
      }

      return `Preview papelera de cliente "${result.entityLabel}".\n\nTexto de confirmación para execute:\n${result.confirmationText ?? "(sin confirmación)"}`;
    }

    if (result.blockedReason === "client_has_active_projects") {
      return `Error: no se pudo mover a papelera. Motivo: ${result.blockedReason}`;
    }

    return `Cliente "${result.entityLabel}" movido a papelera.\n\nDeletedAt: ${result.deletedAt ?? "n/a"}\nPurgesAt: ${result.purgesAt ?? "n/a"}\nEvento: ${result.eventId ?? "n/a"}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error: ${msg}`;
  }
}
