/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 *
 * Tool: bridge_restore_entity
 */

import type { BridgeClient } from "../bridge-client.js";

export const restoreEntityToolDefinition = {
  name: "bridge_restore_entity",
  description: "Restaura una entidad (client, lead o brief) desde la papelera.",
  inputSchema: {
    type: "object" as const,
    properties: {
      entityType: {
        type: "string",
        enum: ["client", "lead", "brief"],
        description: "Tipo de entidad a restaurar"
      },
      entityId: { type: "string", description: "ID de la entidad" }
    },
    required: ["entityType", "entityId"]
  }
};

export async function handleRestoreEntity(
  client: BridgeClient,
  args: Record<string, unknown>
): Promise<string> {
  const entityType =
    args.entityType === "client" || args.entityType === "lead" || args.entityType === "brief"
      ? args.entityType
      : undefined;
  const entityId = typeof args.entityId === "string" ? args.entityId : undefined;

  if (!entityType) {
    return "Error: entityType es requerido y debe ser 'client', 'lead' o 'brief'.";
  }

  if (!entityId) {
    return "Error: entityId es requerido y debe ser un string.";
  }

  try {
    const result = await client.restoreEntity(entityType, entityId);

    if (!result.ok) {
      return `Error: ${result.error}`;
    }

    return `Entidad restaurada: ${result.entityLabel}\nTipo: ${result.entityType}\nID: ${result.entityId}\nRestoredAt: ${result.restoredAt}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error: ${msg}`;
  }
}
