/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
import type { BridgeClient } from "../bridge-client.js";

export const listClientsToolDefinition = {
  name: "bridge_list_clients",
  description: "Lista los clientes del tenant activo en Bridge.",
  inputSchema: { type: "object" as const, properties: {}, required: [] }
};

export async function handleListClients(client: BridgeClient): Promise<string> {
  try {
    const { clients } = await client.listClients();
    if (clients.length === 0) return "No hay clientes registrados en este tenant.";

    return [
      `Total de clientes: ${clients.length}`,
      "",
      ...clients.map((c) => `ID: ${c.id}\n  Nombre: ${c.name}\n  Estado: ${c.status}\n  Contacto: ${c.primary_contact_name ?? "—"}`)
    ].join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al listar clientes: ${msg}`;
  }
}
