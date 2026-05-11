/**
 * IMPL-20260510-10
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-10_extension_mcp_cotizaciones_y_copias_locales.md
 *
 * Función para guardar copias locales .md de documentos operativos de clientes
 * en context/clientes/[slug]/[type].md dentro del workspace raíz.
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve } from "path";

export type LocalCopyType = "brief" | "propuesta" | "prompts-produccion";

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
  workspaceRoot: string
): string {
  const dir = resolve(workspaceRoot, "context", "clientes", clientSlug);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const filename = `${type}.md`;
  const filepath = join(dir, filename);

  const header =
    `<!-- Copia local generada por Bridge MCP — ${new Date().toISOString()} -->\n` +
    `<!-- Fuente de verdad: Bridge/Supabase. No editar manualmente. -->\n\n`;

  writeFileSync(filepath, header + content, "utf-8");

  return filepath;
}
