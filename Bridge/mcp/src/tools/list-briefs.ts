/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
import type { BridgeClient } from "../bridge-client.js";

export const listBriefsToolDefinition = {
  name: "bridge_list_briefs",
  description: "Lista briefs del tenant activo en Bridge.",
  inputSchema: { type: "object" as const, properties: {}, required: [] }
};

export async function handleListBriefs(client: BridgeClient): Promise<string> {
  try {
    const { briefs } = await client.listBriefs();
    if (briefs.length === 0) return "No hay briefs registrados en este tenant.";

    return [
      `Total de briefs: ${briefs.length}`,
      "",
      ...briefs.map((b) => `ID: ${b.id}\n  Estado: ${b.status}\n  projectId: ${b.project_id ?? "—"}\n  clientId: ${b.client_id ?? "—"}`)
    ].join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al listar briefs: ${msg}`;
  }
}
