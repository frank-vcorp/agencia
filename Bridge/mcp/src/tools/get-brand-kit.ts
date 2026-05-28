/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-02_brand_kit_cliente_bridge_v1.md
 */
import type { BridgeClient } from "../bridge-client.js";

function parseArgs(args: unknown): { client_id: string | null } {
  if (!args || typeof args !== "object") {
    return { client_id: null };
  }

  const clientId =
    "client_id" in args && typeof args.client_id === "string"
      ? args.client_id
      : null;

  return { client_id: clientId };
}

export const getBrandKitToolDefinition = {
  name: "bridge_get_brand_kit",
  description: "Obtiene el brand kit de un cliente en Bridge.",
  inputSchema: {
    type: "object" as const,
    properties: {
      client_id: { type: "string", description: "UUID del cliente" }
    },
    required: ["client_id"]
  }
};

export async function handleGetBrandKit(client: BridgeClient, args: unknown): Promise<string> {
  const { client_id } = parseArgs(args);
  if (!client_id) return "Error: client_id es requerido.";

  try {
    const brandKit = await client.getBrandKit(client_id);
    if (!brandKit) {
      return "Sin brand kit registrado para este cliente.";
    }

    return JSON.stringify({ ok: true, brand_kit: brandKit }, null, 2);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al consultar brand kit: ${msg}`;
  }
}
