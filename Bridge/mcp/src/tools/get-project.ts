/**
 * IMPL-20260526-02 | IMPL-20260526-05
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-08_hardening_parsing_args_tools_mcp_crud_v1.md
 */
import type { BridgeClient } from "../bridge-client.js";

function parseGetProjectArgs(args: unknown): { projectId: string | null } {
  if (!args || typeof args !== "object") {
    return { projectId: null };
  }

  const projectId = "projectId" in args && typeof args.projectId === "string" ? args.projectId : null;
  return { projectId };
}

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
  const { projectId } = parseGetProjectArgs(args);
  if (!projectId) return "Error: projectId es requerido.";

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
