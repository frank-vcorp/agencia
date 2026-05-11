/**
 * IMPL-20260510-14
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-14_mcp_crear_cliente_proyecto_activo.md
 *
 * Tool: bridge_create_project
 * Crea un nuevo proyecto ligado a un cliente existente en el tenant activo de Bridge.
 */

import type { BridgeClient } from "../bridge-client.js";

export const createProjectToolDefinition = {
  name: "bridge_create_project",
  description:
    "Crea un nuevo proyecto en Bridge, asociado a un cliente existente. El nombre debe ser único dentro de (tenant, cliente). Retorna el projectId (UUID) para usarlo al crear activos.",
  inputSchema: {
    type: "object" as const,
    properties: {
      clientId: {
        type: "string",
        description: "UUID del cliente al que pertenece el proyecto"
      },
      name: {
        type: "string",
        description: "Nombre del proyecto (único dentro del tenant + cliente)"
      },
      projectType: {
        type: "string",
        enum: ["lanzamiento", "presencia", "contenido", "campana", "interno"],
        description: "Tipo de proyecto"
      },
      objective: {
        type: "string",
        description: "Objetivo del proyecto (opcional)"
      },
      status: {
        type: "string",
        enum: ["draft", "active", "paused", "completed", "archived"],
        description: "Estado del proyecto. Por defecto: 'draft'"
      },
      startDate: {
        type: "string",
        description: "Fecha de inicio ISO, ej: '2026-05-15' (opcional)"
      },
      endDate: {
        type: "string",
        description: "Fecha de fin ISO, ej: '2026-06-30' (opcional)"
      }
    },
    required: ["clientId", "name", "projectType"]
  }
};

export async function handleCreateProject(
  client: BridgeClient,
  args: unknown
): Promise<string> {
  const { clientId, name, projectType, objective, status, startDate, endDate } =
    args as {
      clientId: string;
      name: string;
      projectType: string;
      objective?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    };

  if (!clientId || typeof clientId !== "string") {
    return "Error: clientId es requerido.";
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return "Error: name es requerido y no puede estar vacío.";
  }
  if (!projectType || typeof projectType !== "string") {
    return "Error: projectType es requerido.";
  }

  try {
    const result = await client.createProject({
      clientId,
      name,
      projectType,
      objective,
      status,
      startDate,
      endDate
    });

    if (!result.ok) {
      if (result.error === "name_conflict") {
        return `Error: Ya existe un proyecto con el nombre "${name}" para este cliente.`;
      }
      if (result.error === "client_not_found") {
        return `Error: El cliente ${clientId} no existe en este tenant.`;
      }
      if (result.error === "tenant_not_found") {
        return "Error: Tenant no encontrado. Verifica la configuración BRIDGE_TENANT_SLUG.";
      }
      return `Error al crear proyecto: ${result.error}`;
    }

    return [
      `✓ ${result.message}`,
      `  projectId: ${result.projectId}`,
      `  Nombre: ${result.name}`,
      `  Tipo: ${result.projectType}`,
      `  Estado: ${result.status}`,
      `  clientId: ${result.clientId}`
    ].join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al crear proyecto: ${msg}`;
  }
}
