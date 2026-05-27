/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
import type { BridgeClient } from "../bridge-client.js";

export const updateBriefToolDefinition = {
  name: "bridge_update_brief",
  description: "Actualiza metadatos permitidos de un brief en Bridge.",
  inputSchema: {
    type: "object" as const,
    properties: {
      briefId: { type: "string", description: "UUID del brief" },
      status: { type: "string" },
      sourceChannel: { type: "string" },
      clientId: { type: "string" },
      projectId: { type: "string" }
    },
    required: ["briefId"]
  }
};

export async function handleUpdateBrief(client: BridgeClient, args: unknown): Promise<string> {
  const { briefId, status, sourceChannel, clientId, projectId } = args as {
    briefId: string;
    status?: string;
    sourceChannel?: string;
    clientId?: string;
    projectId?: string;
  };

  if (!briefId || typeof briefId !== "string") return "Error: briefId es requerido.";

  const patch: Record<string, unknown> = {};
  if (typeof status === "string") patch.status = status;
  if (typeof sourceChannel === "string") patch.sourceChannel = sourceChannel;
  if (typeof clientId === "string") patch.clientId = clientId;
  if (typeof projectId === "string") patch.projectId = projectId;
  if (Object.keys(patch).length === 0) return "Error: no se enviaron campos válidos para actualizar.";

  try {
    const brief = await client.updateBrief(briefId, patch);
    return `✓ Brief actualizado: ${brief.id} estado=${brief.status}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al actualizar brief: ${msg}`;
  }
}
