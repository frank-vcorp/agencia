/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
import type { BridgeClient } from "../bridge-client.js";

export const getProjectToolDefinition = {
  name: "bridge_get_project",
  description: "Consulta un proyecto por ID en Bridge.",
  inputSchema: {
    type: "object" as const,
    properties: { projectId: { type: "string", description: "UUID del proyecto" } },
    required: ["projectId"]
  }
};

export async function handleGetProject(client: BridgeClient, args: unknown): Promise<string> {
  const { projectId } = args as { projectId: string };
  if (!projectId || typeof projectId !== "string") return "Error: projectId es requerido.";

  try {
    const project = await client.getProject(projectId);
    return [
      `Proyecto: ${project.name}`,
      `ID: ${project.id}`,
      `Tipo: ${project.project_type}`,
      `Estado: ${project.status}`,
      `Objetivo: ${project.objective ?? "—"}`,
      `Inicio: ${project.start_date ?? "—"}`,
      `Fin: ${project.end_date ?? "—"}`
    ].join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al consultar proyecto: ${msg}`;
  }
}
