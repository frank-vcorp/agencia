/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 *
 * Tool: bridge_list_trash
 */

import type { BridgeClient } from "../bridge-client.js";

export const listTrashToolDefinition = {
  name: "bridge_list_trash",
  description: "Lista entidades en papelera con días restantes para restauración.",
  inputSchema: { type: "object" as const, properties: {}, required: [] }
};

export async function handleListTrash(client: BridgeClient): Promise<string> {
  try {
    const result = await client.listTrash();

    if (!result.ok) {
      return `Error: ${result.error}`;
    }

    if (result.total === 0) {
      return "No hay entidades en papelera para este tenant.";
    }

    return [
      `Total en papelera: ${result.total}`,
      "",
      ...result.items.map((item) => {
        const estado = item.canRestore ? "restaurable" : "purga_pendiente";
        return [
          `Tipo: ${item.entityType}`,
          `ID: ${item.entityId}`,
          `Etiqueta: ${item.entityLabel}`,
          `DeletedAt: ${item.deletedAt}`,
          `PurgesAt: ${item.purgesAt}`,
          `Dias restantes: ${item.daysRemaining}`,
          `Estado: ${estado}`
        ].join("\n");
      })
    ].join("\n\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error: ${msg}`;
  }
}
