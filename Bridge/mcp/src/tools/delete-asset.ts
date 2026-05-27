/**
 * IMPL-20260526-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-03_eliminacion_operativa_entidades_v1.md
 *
 * Tool: bridge_delete_asset
 *
 * Preview y execute de eliminación de activo.
 */

import type { BridgeClient } from "../bridge-client.js";

export const deleteAssetToolDefinition = {
  name: "bridge_delete_asset",
  description:
    "Elimina un activo de Bridge con sus dependencias (prompts, propuestas, evidencias, aprobaciones, sesiones). Soporta modo preview y execute.",
  inputSchema: {
    type: "object" as const,
    properties: {
      assetId: { type: "string", description: "ID del activo a eliminar" },
      mode: { type: "string", enum: ["preview", "execute"], description: "Modo de operación" },
      requestedByLabel: { type: "string", description: "Nombre del agente que solicitó la eliminación" },
      approvedByLabel: { type: "string", description: "Nombre del humano que aprobó la eliminación" },
      reason: { type: "string", description: "Razón operativa: dato_erroneo, no_contratado, reset_pruebas, duplicado, otro" },
      confirmationText: { type: "string", description: "Texto de confirmación obligatorio en modo execute" }
    },
    required: ["assetId", "mode", "requestedByLabel", "approvedByLabel", "reason"]
  }
};

export async function handleDeleteAsset(
  client: BridgeClient,
  args: Record<string, unknown>
): Promise<string> {
  const assetId = typeof args.assetId === "string" ? args.assetId : undefined;
  const mode = args.mode === "preview" || args.mode === "execute" ? args.mode : undefined;
  const requestedByLabel = typeof args.requestedByLabel === "string" ? args.requestedByLabel : undefined;
  const approvedByLabel = typeof args.approvedByLabel === "string" ? args.approvedByLabel : undefined;
  const reason = typeof args.reason === "string" ? args.reason : undefined;
  const confirmationText = typeof args.confirmationText === "string" ? args.confirmationText : undefined;

  if (!assetId || typeof assetId !== "string") {
    return "Error: assetId es requerido y debe ser un string.";
  }

  if (!mode || (mode !== "preview" && mode !== "execute")) {
    return "Error: mode es requerido y debe ser 'preview' o 'execute'.";
  }

  if (!requestedByLabel || typeof requestedByLabel !== "string") {
    return "Error: requestedByLabel es requerido y debe ser un string.";
  }

  if (!approvedByLabel || typeof approvedByLabel !== "string") {
    return "Error: approvedByLabel es requerido y debe ser un string.";
  }

  if (!reason || typeof reason !== "string") {
    return "Error: reason es requerido y debe ser un string.";
  }

  if (mode === "execute" && (!confirmationText || typeof confirmationText !== "string")) {
    return "Error: confirmationText es requerido en modo execute.";
  }

  try {
    const result = await client.deleteAsset(assetId, {
      mode,
      requestedByLabel,
      approvedByLabel,
      reason,
      confirmationText: mode === "execute" ? confirmationText : undefined
    });

    if (!result.ok) {
      return `Error: ${result.error}`;
    }

    if (result.mode === "preview") {
      return `Preview de eliminación de activo "${result.entityLabel}":

Impacto estimado:
- Directos: ${result.impact.direct}
- Cascada (prompts, propuestas, evidencias, aprobaciones, sesiones): ${result.impact.cascaded}

Texto de confirmación para execute:
${result.confirmationText}`;
    }

    if (result.mode === "execute") {
      return `Activo "${result.deletedEntityLabel}" eliminado con éxito.

Impacto ejecutado:
- Directos: ${result.impactSummary.direct}
- Cascada: ${result.impactSummary.cascaded}

Evento de auditoría: ${result.eventId}`;
    }

    return "Error: modo desconocido.";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error: ${msg}`;
  }
}
