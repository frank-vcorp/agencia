/**
 * IMPL-20260510-08
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-08_mcp_server_bridge_para_agentes_vscode.md
 *
 * Tool: bridge_list_assets
 * Lista todos los activos del tenant con su estado y si tienen spec activa.
 */

import type { BridgeClient } from "../bridge-client.js";

export const listAssetsToolDefinition = {
  name: "bridge_list_assets",
  description:
    "Lista todos los activos creativos del tenant en Bridge con su estado y si tienen una especificación de producción activa. Úsalo para explorar qué activos existen antes de escribir specs.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: []
  }
};

export async function handleListAssets(client: BridgeClient): Promise<string> {
  try {
    const { assets, total } = await client.listAssets();

    if (total === 0) {
      return "No hay activos registrados en este tenant.";
    }

    const lines = [
      `Total de activos: ${total}`,
      "",
      ...assets.map((a) =>
        [
          `ID: ${a.id}`,
          `  Título: ${a.title}`,
          `  Aplicativo: ${a.applicationCode} / ${a.pieceTypeCode}`,
          `  Estado: ${a.status}`,
          `  Spec activa: ${a.hasActiveSpec ? "Sí" : "No"}`
        ].join("\n")
      )
    ];

    return lines.join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al obtener activos: ${msg}`;
  }
}
