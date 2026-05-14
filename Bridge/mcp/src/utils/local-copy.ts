/**
 * IMPL-20260510-10
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-10_extension_mcp_cotizaciones_y_copias_locales.md
 *
 * Función para guardar copias locales .md de documentos operativos de clientes
 * en context/clientes/[slug]/[type].md dentro del workspace raíz.
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, relative, resolve, sep } from "path";

export type LocalCopyType = "brief" | "propuesta" | "prompts-produccion";
export type LocalCopyLayout = "legacy" | "project-folders";

export type SaveLocalCopyOptions = {
  layout?: LocalCopyLayout;
  localProjectPath?: string;
};

function resolveProjectFolderPath(type: LocalCopyType): string[] {
  switch (type) {
    case "brief":
      return ["briefing", "brief.md"];
    case "propuesta":
      return ["propuesta.md"];
    case "prompts-produccion":
      return ["prompts-produccion.md"];
  }
}

function resolveContainedProjectRoot(workspaceRoot: string, localProjectPath: string): string {
  const normalizedWorkspaceRoot = resolve(workspaceRoot);
  const projectRoot = resolve(normalizedWorkspaceRoot, localProjectPath);
  const rel = relative(normalizedWorkspaceRoot, projectRoot);

  if (rel.startsWith("..") || rel.includes(`${sep}..`) || rel === "") {
    if (rel === "") {
      return projectRoot;
    }
    throw new Error("localProjectPath debe permanecer dentro de workspaceRoot");
  }

  return projectRoot;
}

/**
 * Guarda una copia .md en context/clientes/[slug]/[type].md
 * relativo al workspace raíz (donde está el mcp configurado).
 * Crea el directorio si no existe. Sobreescribe si ya existe.
 *
 * @returns Ruta absoluta del archivo generado
 */
export function saveLocalCopy(
  type: LocalCopyType,
  clientSlug: string,
  content: string,
  workspaceRoot: string,
  options: SaveLocalCopyOptions = {}
): string {
  const layout = options.layout ?? "legacy";

  let dir: string;
  let filename: string;

  if (layout === "project-folders") {
    if (!options.localProjectPath || typeof options.localProjectPath !== "string") {
      throw new Error("localProjectPath es requerido cuando layout=project-folders");
    }

    const targetSegments = resolveProjectFolderPath(type);
    filename = targetSegments[targetSegments.length - 1];
    const projectRoot = resolveContainedProjectRoot(workspaceRoot, options.localProjectPath);
    dir = resolve(projectRoot, ...targetSegments.slice(0, -1));
  } else {
    dir = resolve(workspaceRoot, "context", "clientes", clientSlug);
    filename = `${type}.md`;
  }

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const filepath = join(dir, filename);

  const header =
    `<!-- Copia local generada por Bridge MCP — ${new Date().toISOString()} -->\n` +
    `<!-- Fuente de verdad: Bridge/Supabase. No editar manualmente. -->\n\n`;

  writeFileSync(filepath, header + content, "utf-8");

  return filepath;
}
