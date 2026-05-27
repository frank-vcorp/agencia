/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
import type { BridgeClient } from "../bridge-client.js";

export const updateProjectToolDefinition = {
  name: "bridge_update_project",
  description: "Actualiza campos permitidos de un proyecto en Bridge.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectId: { type: "string", description: "UUID del proyecto" },
      name: { type: "string" },
      objective: { type: "string" },
      status: { type: "string", enum: ["draft", "active", "paused", "completed", "archived"] },
      startDate: { type: "string" },
      endDate: { type: "string" }
    },
    required: ["projectId"]
  }
};

export async function handleUpdateProject(client: BridgeClient, args: unknown): Promise<string> {
  const { projectId, name, objective, status, startDate, endDate } = args as {
    projectId: string;
    name?: string;
    objective?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  };

  if (!projectId || typeof projectId !== "string") return "Error: projectId es requerido.";

  const patch: Record<string, unknown> = {};
  if (typeof name === "string") patch.name = name;
  if (typeof objective === "string") patch.objective = objective;
  if (typeof status === "string") patch.status = status;
  if (typeof startDate === "string") patch.startDate = startDate;
  if (typeof endDate === "string") patch.endDate = endDate;
  if (Object.keys(patch).length === 0) return "Error: no se enviaron campos válidos para actualizar.";

  try {
    const project = await client.updateProject(projectId, patch);
    return `✓ Proyecto actualizado: ${project.id} (${project.name}) estado=${project.status}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al actualizar proyecto: ${msg}`;
  }
}
