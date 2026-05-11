/**
 * IMPL-20260510-08
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-08_mcp_server_bridge_para_agentes_vscode.md
 *
 * Tool: bridge_get_asset_context
 * Obtiene el contexto completo de un activo: metadatos, brief y spec actual.
 */

import type { BridgeClient } from "../bridge-client.js";

export const getAssetContextToolDefinition = {
  name: "bridge_get_asset_context",
  description:
    "Obtiene el contexto completo de un activo de Bridge: metadatos (título, aplicativo, formato), resumen del brief asociado y la especificación de producción activa si existe. Úsalo antes de escribir o actualizar una spec.",
  inputSchema: {
    type: "object" as const,
    properties: {
      assetId: {
        type: "string",
        description: "UUID del activo en Bridge"
      }
    },
    required: ["assetId"]
  }
};

export async function handleGetAssetContext(
  client: BridgeClient,
  args: unknown
): Promise<string> {
  const { assetId } = args as { assetId: string };

  if (!assetId || typeof assetId !== "string") {
    return "Error: assetId es requerido y debe ser un string.";
  }

  try {
    const ctx = await client.getAssetContext(assetId);

    const lines = [
      `=== Activo: ${ctx.asset.title} ===`,
      `ID: ${ctx.asset.id}`,
      `Aplicativo: ${ctx.asset.applicationCode} / ${ctx.asset.pieceTypeCode}`,
      `Placement: ${ctx.asset.placementCode}`,
      `Formato: ${ctx.asset.formatCode}`,
      `Estado: ${ctx.asset.status}`,
      `Listo para spec: ${ctx.readyForSpec ? "Sí" : "No"}`,
      ""
    ];

    if (ctx.briefSummary) {
      lines.push("=== Resumen del Brief ===");
      lines.push(ctx.briefSummary);
      lines.push("");
    }

    if (ctx.activeSpec) {
      lines.push(`=== Spec Activa (v${ctx.activeSpec.versionNumber}) ===`);
      lines.push(`Creada: ${ctx.activeSpec.createdAt}`);
      lines.push("");
      lines.push(ctx.activeSpec.promptText);
    } else {
      lines.push("Sin spec de producción activa. Puedes crear una con bridge_write_production_spec.");
    }

    return lines.join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "asset_not_found") {
      return `Error: El activo ${assetId} no existe o no pertenece a este tenant.`;
    }
    return `Error al obtener contexto: ${msg}`;
  }
}
