/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
import type { BridgeClient } from "../bridge-client.js";

export const listProjectsToolDefinition = {
  name: "bridge_list_projects",
  description: "Lista los proyectos del tenant activo en Bridge.",
  inputSchema: { type: "object" as const, properties: {}, required: [] }
};

export async function handleListProjects(client: BridgeClient): Promise<string> {
  try {
    const { projects } = await client.listProjects();
    if (projects.length === 0) return "No hay proyectos registrados en este tenant.";

    return [
      `Total de proyectos: ${projects.length}`,
      "",
      ...projects.map((p) =>
        [
          `ID: ${p.id}`,
          `  Nombre: ${p.name}`,
          `  Tipo: ${p.project_type}`,
          `  Estado: ${p.status}`,
          `  clientId: ${p.client_id}`
        ].join("\n")
      )
    ].join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al listar proyectos: ${msg}`;
  }
}
