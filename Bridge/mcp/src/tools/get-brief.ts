/**
 * IMPL-20260510-10
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-10_extension_mcp_cotizaciones_y_copias_locales.md
 *
 * Tool: bridge_get_brief
 * Lee el brief consolidado de un proyecto desde Bridge y guarda copia local .md.
 */

import type { BridgeClient } from "../bridge-client.js";
import { saveLocalCopy, type LocalCopyLayout } from "../utils/local-copy.js";

export const getBriefToolDefinition = {
  name: "bridge_get_brief",
  description:
    "Lee el brief consolidado de un proyecto desde Bridge. Retorna los datos estructurados del brief (objetivos, audiencia, tono, referencias, restricciones) y guarda automáticamente una copia .md en context/clientes/[clientSlug]/brief.md para consulta offline.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectId: {
        type: "string",
        description: "UUID del proyecto en Bridge"
      },
      clientSlug: {
        type: "string",
        description: "Slug del cliente para nombrar la copia local (ej: techcorp)"
      },
      localLayout: {
        type: "string",
        enum: ["legacy", "project-folders"],
        description: "Layout local de destino. legacy mantiene context/clientes/[slug]/brief.md; project-folders usa [localProjectPath]/briefing/brief.md"
      },
      localProjectPath: {
        type: "string",
        description: "Ruta relativa a workspaceRoot para guardar la copia local cuando localLayout=project-folders"
      }
    },
    required: ["projectId", "clientSlug"]
  }
};

export async function handleGetBrief(
  client: BridgeClient,
  args: unknown,
  workspaceRoot: string
): Promise<string> {
  const { projectId, clientSlug } = args as {
    projectId: string;
    clientSlug: string;
    localLayout?: LocalCopyLayout;
    localProjectPath?: string;
  };

  if (!projectId || typeof projectId !== "string") {
    return "Error: projectId es requerido y debe ser un string.";
  }
  if (!clientSlug || typeof clientSlug !== "string") {
    return "Error: clientSlug es requerido y debe ser un string.";
  }

  const localLayout =
    args && typeof args === "object" && "localLayout" in (args as Record<string, unknown>)
      ? ((args as { localLayout?: LocalCopyLayout }).localLayout ?? "legacy")
      : "legacy";

  const localProjectPath =
    args && typeof args === "object" && "localProjectPath" in (args as Record<string, unknown>)
      ? (args as { localProjectPath?: string }).localProjectPath
      : undefined;

  if (localLayout === "project-folders" && (!localProjectPath || typeof localProjectPath !== "string")) {
    return "Error: localProjectPath es requerido cuando localLayout=project-folders.";
  }

  try {
    const data = await client.getBrief(projectId);
    const { project, brief } = data;

    // Construir markdown del brief
    const lines: string[] = [
      `# Brief — ${project.name}`,
      ``,
      `**Proyecto:** ${project.name}`,
      `**ID:** ${project.id}`,
      `**Estado:** ${brief.status}`,
      ``,
      `## Resumen`,
      brief.summary || "_Sin resumen disponible_",
      ``,
      `## Objetivos`,
      brief.objectives.length > 0
        ? brief.objectives.map((o) => `- ${o}`).join("\n")
        : "_Sin objetivos definidos_",
      ``,
      `## Audiencia objetivo`,
      brief.targetAudience || "_No especificada_",
      ``,
      `## Tono`,
      brief.tone || "_No especificado_",
      ``,
      `## Referencias`,
      brief.references.length > 0
        ? brief.references.map((r) => `- ${r}`).join("\n")
        : "_Sin referencias_",
      ``,
      `## Restricciones`,
      brief.constraints.length > 0
        ? brief.constraints.map((c) => `- ${c}`).join("\n")
        : "_Sin restricciones_",
      ``,
      `---`,
      `## Contenido completo`,
      brief.rawContent || "_Sin contenido_"
    ];

    const markdownContent = lines.join("\n");
    const localPath = saveLocalCopy("brief", clientSlug, markdownContent, workspaceRoot, {
      layout: localLayout,
      localProjectPath
    });

    return [
      `✓ Brief leído correctamente.`,
      `  Cliente/Proyecto: ${project.name}`,
      `  Estado: ${brief.status}`,
      `  Resumen: ${brief.summary.slice(0, 200)}${brief.summary.length > 200 ? "..." : ""}`,
      `  Audiencia: ${brief.targetAudience || "—"}`,
      `  Tono: ${brief.tone || "—"}`,
      `📄 Copia guardada en: ${localPath}`
    ].join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "project_not_found") {
      return `Error: El proyecto ${projectId} no existe o no pertenece a este tenant.`;
    }
    return `Error al leer el brief: ${msg}`;
  }
}
