/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
import type { BridgeClient } from "../bridge-client.js";

export const updateAssetToolDefinition = {
  name: "bridge_update_asset",
  description: "Actualiza campos operativos permitidos de un activo en Bridge.",
  inputSchema: {
    type: "object" as const,
    properties: {
      assetId: { type: "string", description: "UUID del activo" },
      title: { type: "string" },
      status: { type: "string", enum: ["draft", "in_progress", "in_review", "approved", "delivered", "archived", "changes_requested"] },
      quotationId: { type: "string" }
    },
    required: ["assetId"]
  }
};

export async function handleUpdateAsset(client: BridgeClient, args: unknown): Promise<string> {
  const { assetId, title, status, quotationId } = args as {
    assetId: string;
    title?: string;
    status?: string;
    quotationId?: string;
  };

  if (!assetId || typeof assetId !== "string") return "Error: assetId es requerido.";

  const patch: Record<string, unknown> = {};
  if (typeof title === "string") patch.title = title;
  if (typeof status === "string") patch.status = status;
  if (typeof quotationId === "string") patch.quotationId = quotationId;
  if (Object.keys(patch).length === 0) return "Error: no se enviaron campos válidos para actualizar.";

  try {
    const asset = await client.updateAsset(assetId, patch);
    return `✓ Activo actualizado: ${asset.id} (${asset.title}) estado=${asset.status}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al actualizar activo: ${msg}`;
  }
}
