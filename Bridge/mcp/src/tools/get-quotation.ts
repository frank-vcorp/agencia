/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
import type { BridgeClient } from "../bridge-client.js";

export const getQuotationToolDefinition = {
  name: "bridge_get_quotation",
  description: "Consulta una cotización por ID en Bridge.",
  inputSchema: {
    type: "object" as const,
    properties: { quotationId: { type: "string", description: "UUID de la cotización" } },
    required: ["quotationId"]
  }
};

export async function handleGetQuotation(client: BridgeClient, args: unknown): Promise<string> {
  const { quotationId } = args as { quotationId: string };
  if (!quotationId || typeof quotationId !== "string") return "Error: quotationId es requerido.";

  try {
    const q = await client.getQuotation(quotationId);
    return [
      `Cotización: ${q.id}`,
      `Estado: ${q.status}`,
      `projectId: ${q.project_id}`,
      `activeVersionId: ${q.active_version_id ?? "—"}`
    ].join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al consultar cotización: ${msg}`;
  }
}
