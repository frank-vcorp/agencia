/**
 * IMPL-20260510-14
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-14_mcp_crear_cliente_proyecto_activo.md
 *
 * Tool: bridge_create_asset
 * Crea un nuevo activo creativo ligado a un proyecto existente en Bridge.
 */

import type { BridgeClient } from "../bridge-client.js";

export const createAssetToolDefinition = {
  name: "bridge_create_asset",
  description:
    "Crea un nuevo activo creativo en Bridge, ligado a un proyecto existente. El client_id se resuelve automáticamente desde el proyecto. Retorna el assetId (UUID) para usarlo al escribir specs.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectId: {
        type: "string",
        description: "UUID del proyecto al que pertenece el activo"
      },
      title: {
        type: "string",
        description: "Título del activo"
      },
      applicationCode: {
        type: "string",
        enum: [
          "whatsapp",
          "instagram",
          "facebook",
          "tiktok",
          "google",
          "youtube",
          "landing_page",
          "sitio_web",
          "email"
        ],
        description: "Plataforma o aplicación destino"
      },
      pieceTypeCode: {
        type: "string",
        enum: [
          "imagen",
          "video",
          "carousel",
          "historia",
          "reel",
          "anuncio_texto",
          "banner",
          "portada",
          "copy",
          "landing_section"
        ],
        description: "Tipo de pieza creativa"
      },
      placementCode: {
        type: "string",
        enum: [
          "feed",
          "story",
          "reel",
          "status",
          "display",
          "search",
          "in_feed",
          "hero",
          "mensaje_directo",
          "remarketing",
          "captacion",
          "conversion",
          "awareness"
        ],
        description: "Ubicación o placement del activo"
      },
      formatCode: {
        type: "string",
        enum: [
          "cuadrado_1_1",
          "vertical_4_5",
          "vertical_9_16",
          "horizontal_16_9",
          "display_responsive",
          "texto_corto",
          "texto_largo"
        ],
        description: "Formato del activo"
      },
      status: {
        type: "string",
        description: "Estado inicial. Por defecto: 'draft'"
      }
    },
    required: ["projectId", "title", "applicationCode", "pieceTypeCode", "placementCode", "formatCode"]
  }
};

export async function handleCreateAsset(
  client: BridgeClient,
  args: unknown
): Promise<string> {
  const { projectId, title, applicationCode, pieceTypeCode, placementCode, formatCode, status } =
    args as {
      projectId: string;
      title: string;
      applicationCode: string;
      pieceTypeCode: string;
      placementCode: string;
      formatCode: string;
      status?: string;
    };

  if (!projectId || typeof projectId !== "string") {
    return "Error: projectId es requerido.";
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    return "Error: title es requerido y no puede estar vacío.";
  }
  if (!applicationCode || !pieceTypeCode || !placementCode || !formatCode) {
    return "Error: applicationCode, pieceTypeCode, placementCode y formatCode son requeridos.";
  }

  try {
    const result = await client.createAsset({
      projectId,
      title,
      applicationCode,
      pieceTypeCode,
      placementCode,
      formatCode,
      status
    });

    if (!result.ok) {
      if (result.error === "project_not_found") {
        return `Error: El proyecto ${projectId} no existe en este tenant.`;
      }
      if (result.error === "tenant_not_found") {
        return "Error: Tenant no encontrado. Verifica la configuración BRIDGE_TENANT_SLUG.";
      }
      return `Error al crear activo: ${result.error}`;
    }

    return [
      `✓ ${result.message}`,
      `  assetId: ${result.assetId}`,
      `  Título: ${result.title}`,
      `  Aplicación: ${result.applicationCode}`,
      `  Tipo: ${result.pieceTypeCode}`,
      `  Estado: ${result.status}`,
      `  projectId: ${result.projectId}`
    ].join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al crear activo: ${msg}`;
  }
}
