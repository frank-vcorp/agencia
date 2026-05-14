/**
 * IMPL-20260513-16
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-16_mcp_vika_sincronizacion_local_v1.md
 *
 * Tool: bridge_download_asset_files
 * Descarga archivos reales de un activo al workspace local.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { basename, join, relative, resolve, sep } from "path";

import type { BridgeClient } from "../bridge-client.js";
import type { LocalCopyLayout } from "../utils/local-copy.js";

export const downloadAssetFilesToolDefinition = {
  name: "bridge_download_asset_files",
  description:
    "Descarga al workspace los archivos reales asociados a un activo de Bridge. Soporta layout legacy o project-folders y guarda los binarios dentro de activos/[assetSlug]/.",
  inputSchema: {
    type: "object" as const,
    properties: {
      assetId: {
        type: "string",
        description: "UUID del activo en Bridge"
      },
      assetSlug: {
        type: "string",
        description: "Slug local para nombrar la carpeta del activo"
      },
      localLayout: {
        type: "string",
        enum: ["legacy", "project-folders"],
        description: "Layout local de destino. project-folders usa [localProjectPath]/activos/[assetSlug]/"
      },
      localProjectPath: {
        type: "string",
        description: "Ruta relativa a workspaceRoot cuando localLayout=project-folders"
      },
      overwriteExisting: {
        type: "boolean",
        description: "Si false, omite archivos que ya existan. Default: true"
      }
    },
    required: ["assetId", "assetSlug"]
  }
};

function resolveAssetDir(
  workspaceRoot: string,
  assetSlug: string,
  localLayout: LocalCopyLayout,
  localProjectPath?: string
): string {
  const normalizedWorkspaceRoot = resolve(workspaceRoot);

  if (localLayout === "project-folders") {
    if (!localProjectPath || typeof localProjectPath !== "string") {
      throw new Error("localProjectPath es requerido cuando localLayout=project-folders");
    }

    const projectRoot = resolve(normalizedWorkspaceRoot, localProjectPath);
    const rel = relative(normalizedWorkspaceRoot, projectRoot);
    if (rel.startsWith("..") || rel.includes(`${sep}..`)) {
      throw new Error("localProjectPath debe permanecer dentro de workspaceRoot");
    }

    return resolve(projectRoot, "activos", assetSlug);
  }

  return resolve(normalizedWorkspaceRoot, "context", "activos", assetSlug);
}

function sanitizeSlug(value: string): string {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  const normalized = sanitized.replace(/^-+|-+$/g, "");

  if (!normalized || normalized === "." || normalized === "..") {
    throw new Error("assetSlug inválido para escritura local");
  }

  return normalized;
}

function sanitizeFilename(fileName: string): string {
  const normalized = basename(fileName).trim();
  if (!normalized || normalized === "." || normalized === "..") {
    throw new Error("fileName inválido para escritura local");
  }
  return normalized;
}

function buildLocalEvidenceFileName(evidenceId: string, fileName: string): string {
  return `${evidenceId}__${fileName}`;
}

export async function handleDownloadAssetFiles(
  client: BridgeClient,
  args: unknown,
  workspaceRoot: string
): Promise<string> {
  const {
    assetId,
    assetSlug,
    localLayout = "legacy",
    localProjectPath,
    overwriteExisting = true
  } = args as {
    assetId: string;
    assetSlug: string;
    localLayout?: LocalCopyLayout;
    localProjectPath?: string;
    overwriteExisting?: boolean;
  };

  if (!assetId || typeof assetId !== "string") {
    return "Error: assetId es requerido.";
  }
  if (!assetSlug || typeof assetSlug !== "string" || !assetSlug.trim()) {
    return "Error: assetSlug es requerido y no puede estar vacío.";
  }
  if (localLayout === "project-folders" && (!localProjectPath || typeof localProjectPath !== "string")) {
    return "Error: localProjectPath es requerido cuando localLayout=project-folders.";
  }

  try {
    const safeAssetSlug = sanitizeSlug(assetSlug);
    const targetDir = resolveAssetDir(workspaceRoot, safeAssetSlug, localLayout, localProjectPath);
    const data = await client.getAssetFiles(assetId);

    if (data.files.length === 0) {
      return `No hay archivos reales descargables para el activo ${data.asset.title}.`;
    }

    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    const downloaded: string[] = [];
    const skipped: string[] = [];

    for (const file of data.files) {
      const safeFileName = sanitizeFilename(file.fileName);
      const localFileName = buildLocalEvidenceFileName(file.evidenceId, safeFileName);

      if (!file.signedUrl) {
        skipped.push(`${safeFileName} (sin signedUrl)`);
        continue;
      }

      const destination = join(targetDir, localFileName);
      if (!overwriteExisting && existsSync(destination)) {
        skipped.push(`${localFileName} (ya existe)`);
        continue;
      }

      const res = await fetch(file.signedUrl);
      if (!res.ok) {
        skipped.push(`${localFileName} (descarga fallida ${res.status})`);
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      writeFileSync(destination, buffer);
      downloaded.push(destination);
    }

    const lines = [
      `✓ Archivos del activo leídos correctamente.`,
      `  Activo: ${data.asset.title}`,
      `  Descargados: ${downloaded.length}`
    ];

    if (downloaded.length > 0) {
      lines.push("  Rutas:");
      downloaded.forEach((path) => lines.push(`  - ${path}`));
    }

    if (skipped.length > 0) {
      lines.push(`  Omitidos: ${skipped.length}`);
      skipped.forEach((item) => lines.push(`  - ${item}`));
    }

    return lines.join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "asset_not_found") {
      return `Error: El activo ${assetId} no existe o no pertenece a este tenant.`;
    }
    return `Error al descargar archivos del activo: ${msg}`;
  }
}