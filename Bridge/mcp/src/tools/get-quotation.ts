/**
 * IMPL-20260526-02 | IMPL-20260526-05
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-08_hardening_parsing_args_tools_mcp_crud_v1.md
 */
import type { BridgeClient } from "../bridge-client.js";

function parseGetQuotationArgs(args: unknown): { quotationId: string | null } {
  if (!args || typeof args !== "object") {
    return { quotationId: null };
  }

  const quotationId =
    "quotationId" in args && typeof args.quotationId === "string" ? args.quotationId : null;
  return { quotationId };
}

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
  const { quotationId } = parseGetQuotationArgs(args);
  if (!quotationId) return "Error: quotationId es requerido.";

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
