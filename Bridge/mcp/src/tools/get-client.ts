/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
import type { BridgeClient } from "../bridge-client.js";

export const getClientToolDefinition = {
  name: "bridge_get_client",
  description: "Consulta un cliente por ID en Bridge.",
  inputSchema: {
    type: "object" as const,
    properties: { clientId: { type: "string", description: "UUID del cliente" } },
    required: ["clientId"]
  }
};

export async function handleGetClient(client: BridgeClient, args: unknown): Promise<string> {
  const { clientId } = args as { clientId: string };
  if (!clientId || typeof clientId !== "string") return "Error: clientId es requerido.";

  try {
    const data = await client.getClient(clientId);
    return [
      `Cliente: ${data.name}`,
      `ID: ${data.id}`,
      `Estado: ${data.status}`,
      `Email: ${data.primary_contact_email ?? "—"}`,
      `WhatsApp: ${data.primary_contact_whatsapp ?? "—"}`
    ].join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al consultar cliente: ${msg}`;
  }
}
