/**
 * IMPL-20260510-08 | IMPL-20260510-10
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-08_mcp_server_bridge_para_agentes_vscode.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-10_extension_mcp_cotizaciones_y_copias_locales.md
 *
 * Tool: bridge_write_production_spec
 * Escribe o actualiza la especificación de producción de un activo en Bridge.
 * Si se proporciona clientSlug, guarda copia local en context/clientes/[slug]/prompts-produccion.md
 */

import type { BridgeClient } from "../bridge-client.js";
import { saveLocalCopy } from "../utils/local-copy.js";

export const writeProductionSpecToolDefinition = {
  name: "bridge_write_production_spec",
  description:
    "Escribe o actualiza la especificación de producción de un activo en Bridge. La versión anterior queda como 'superseded' y el diseñador verá la nueva spec en su workspace inmediatamente. Si se proporciona clientSlug, guarda copia local en context/clientes/[slug]/prompts-produccion.md.",
  inputSchema: {
    type: "object" as const,
    properties: {
      assetId: {
        type: "string",
        description: "UUID del activo en Bridge"
      },
      specContent: {
        type: "string",
        description: "Contenido markdown de la especificación de producción"
      },
      versionNote: {
        type: "string",
        description: "Nota opcional sobre qué cambió en esta versión"
      },
      clientSlug: {
        type: "string",
        description: "Slug del cliente para guardar copia local (opcional, ej: techcorp)"
      }
    },
    required: ["assetId", "specContent"]
  }
};

export async function handleWriteProductionSpec(
  client: BridgeClient,
  args: unknown,
  workspaceRoot: string
): Promise<string> {
  const { assetId, specContent, versionNote, clientSlug } = args as {
    assetId: string;
    specContent: string;
    versionNote?: string;
    clientSlug?: string;
  };

  if (!assetId || typeof assetId !== "string") {
    return "Error: assetId es requerido y debe ser un string.";
  }
  if (!specContent || typeof specContent !== "string" || specContent.trim().length === 0) {
    return "Error: specContent es requerido y no puede estar vacío.";
  }

  try {
    const result = await client.writeProductionSpec(assetId, specContent, versionNote);

    if (!result.ok) {
      if (result.error === "asset_not_found") {
        return `Error: El activo ${assetId} no existe o no pertenece a este tenant.`;
      }
      return `Error al publicar spec: ${result.error}`;
    }

    const lines = [
      `✓ ${result.message}`,
      `  Version: ${result.versionNumber}`,
      `  ID de versión: ${result.promptVersionId}`
    ];

    // Guardar copia local si se proporcionó clientSlug
    if (clientSlug && typeof clientSlug === "string" && clientSlug.trim().length > 0) {
      const localPath = saveLocalCopy(
        "prompts-produccion",
        clientSlug.trim(),
        specContent,
        workspaceRoot
      );
      lines.push(`📄 Copia guardada en: ${localPath}`);
    }

    return lines.join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al publicar spec: ${msg}`;
  }
}
