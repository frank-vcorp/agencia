/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
import type { BridgeClient } from "../bridge-client.js";

export const listQuotationsToolDefinition = {
  name: "bridge_list_quotations",
  description: "Lista cotizaciones del tenant activo en Bridge.",
  inputSchema: { type: "object" as const, properties: {}, required: [] }
};

export async function handleListQuotations(client: BridgeClient): Promise<string> {
  try {
    const { quotations } = await client.listQuotations();
    if (quotations.length === 0) return "No hay cotizaciones registradas en este tenant.";

    return [
      `Total de cotizaciones: ${quotations.length}`,
      "",
      ...quotations.map((q) => `ID: ${q.id}\n  Estado: ${q.status}\n  projectId: ${q.project_id}`)
    ].join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al listar cotizaciones: ${msg}`;
  }
}
