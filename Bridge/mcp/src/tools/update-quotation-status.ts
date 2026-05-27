/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
import type { BridgeClient } from "../bridge-client.js";

export const updateQuotationStatusToolDefinition = {
  name: "bridge_update_quotation_status",
  description: "Actualiza estado y metadatos administrativos seguros de una cotización.",
  inputSchema: {
    type: "object" as const,
    properties: {
      quotationId: { type: "string", description: "UUID de la cotización" },
      status: { type: "string", enum: ["draft", "sent", "approved", "invoiced", "paid"] },
      activeVersionId: { type: "string" },
      briefId: { type: "string" }
    },
    required: ["quotationId"]
  }
};

export async function handleUpdateQuotationStatus(client: BridgeClient, args: unknown): Promise<string> {
  const { quotationId, status, activeVersionId, briefId } = args as {
    quotationId: string;
    status?: string;
    activeVersionId?: string;
    briefId?: string;
  };

  if (!quotationId || typeof quotationId !== "string") return "Error: quotationId es requerido.";

  const patch: Record<string, unknown> = {};
  if (typeof status === "string") patch.status = status;
  if (typeof activeVersionId === "string") patch.activeVersionId = activeVersionId;
  if (typeof briefId === "string") patch.briefId = briefId;
  if (Object.keys(patch).length === 0) return "Error: no se enviaron campos válidos para actualizar.";

  try {
    const q = await client.updateQuotationStatus(quotationId, patch);
    return `✓ Cotización actualizada: ${q.id} estado=${q.status}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al actualizar cotización: ${msg}`;
  }
}
