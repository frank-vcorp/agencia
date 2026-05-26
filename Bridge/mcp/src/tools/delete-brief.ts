/**
 * IMPL-20260526-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-03_eliminacion_operativa_entidades_v1.md
 *
 * Tool: bridge_delete_brief
 *
 * Preview y execute de eliminación de brief.
 */

import type { BridgeClient } from "../bridge-client.js";

export const deleteBriefToolDefinition = {
  type: "function" as const,
  function: {
    name: "bridge_delete_brief",
    description:
      "Elimina un brief de Bridge con sus versiones. Soporta modo preview y execute.",
    parameters: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "ID del proyecto contenedor (opcional)" },
        briefId: { type: "string", description: "ID del brief a eliminar" },
        mode: { type: "string", enum: ["preview", "execute"], description: "Modo de operación" },
        requestedByLabel: { type: "string", description: "Nombre del agente que solicitó la eliminación" },
        approvedByLabel: { type: "string", description: "Nombre del humano que aprobó la eliminación" },
        reason: { type: "string", description: "Razón operativa: dato_erroneo, no_contratado, reset_pruebas, duplicado, otro" },
        confirmationText: { type: "string", description: "Texto de confirmación obligatorio en modo execute" }
      },
      required: ["briefId", "mode", "requestedByLabel", "approvedByLabel", "reason"]
    }
  }
};

export async function handleDeleteBrief(
  client: BridgeClient,
  args: Record<string, unknown>
): Promise<string> {
  const projectId = args.projectId;
  const briefId = args.briefId;
  const mode = args.mode;
  const requestedByLabel = args.requestedByLabel;
  const approvedByLabel = args.approvedByLabel;
  const reason = args.reason;
  const confirmationText = args.confirmationText;

  if (!briefId || typeof briefId !== "string") {
    return "Error: briefId es requerido y debe ser un string.";
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
    const result = await client.deleteBrief(projectId as string | undefined, briefId, {
      mode: mode as "preview" | "execute",
      requestedByLabel,
      approvedByLabel,
      reason,
      confirmationText: mode === "execute" ? confirmationText : undefined
    });

    if (!result.ok) {
      return `Error: ${result.error}`;
    }

    if (result.mode === "preview") {
      return `Preview de eliminación de brief "${result.entityLabel}":

Impacto estimado:
- Directos (versiones): ${result.impact.direct}
- Desvinculados (cotizaciones, activos): ${result.impact.detached}

Texto de confirmación para execute:
${result.confirmationText}`;
    }

    if (result.mode === "execute") {
      return `Brief "${result.deletedEntityLabel}" eliminado con éxito.

Impacto ejecutado:
- Directos: ${result.impactSummary.direct}
- Desvinculados: ${result.impactSummary.detached}

Evento de auditoría: ${result.eventId}`;
    }

    return "Error: modo desconocido.";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error: ${msg}`;
  }
}
