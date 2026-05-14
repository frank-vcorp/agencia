/**
 * IMPL-20260510-14
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-14_mcp_crear_cliente_proyecto_activo.md
 * IMPL-20260513-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-01_contacto_cliente_estructurado_email_whatsapp_v1.md
 *
 * Tool: bridge_create_client
 * Crea un nuevo cliente en el tenant activo de Bridge.
 */

import type { BridgeClient } from "../bridge-client.js";

export const createClientToolDefinition = {
  name: "bridge_create_client",
  description:
    "Crea un nuevo cliente en el tenant activo de Bridge. El nombre debe ser único dentro del tenant. Retorna el clientId (UUID) para usarlo al crear proyectos.",
  inputSchema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description: "Nombre del cliente (único dentro del tenant)"
      },
      legalName: {
        type: "string",
        description: "Nombre legal del cliente (opcional)"
      },
      status: {
        type: "string",
        enum: ["active", "prospect", "inactive"],
        description: "Estado del cliente. Por defecto: 'active'"
      },
      primaryContactName: {
        type: "string",
        description: "Nombre del contacto principal (opcional)"
      },
      primaryContactEmail: {
        type: "string",
        description: "Email del contacto principal, ej: ana@cliente.com (opcional)"
      },
      primaryContactWhatsapp: {
        type: "string",
        description: "Número WhatsApp del contacto principal, ej: +5215512345678 (opcional)"
      },
      primaryContactChannel: {
        type: "string",
        description: "Canal de contacto libre complementario, ej: 'WhatsApp oficina' (opcional)"
      },
      notes: {
        type: "string",
        description: "Notas adicionales (opcional)"
      }
    },
    required: ["name"]
  }
};

export async function handleCreateClient(
  client: BridgeClient,
  args: unknown
): Promise<string> {
  const {
    name,
    legalName,
    status,
    primaryContactName,
    primaryContactEmail,
    primaryContactWhatsapp,
    primaryContactChannel,
    notes
  } =
    args as {
      name: string;
      legalName?: string;
      status?: string;
      primaryContactName?: string;
      primaryContactEmail?: string;
      primaryContactWhatsapp?: string;
      primaryContactChannel?: string;
      notes?: string;
    };

  if (!name || typeof name !== "string" || !name.trim()) {
    return "Error: name es requerido y no puede estar vacío.";
  }

  try {
    const result = await client.createClient({
      name,
      legalName,
      status,
      primaryContactName,
      primaryContactEmail,
      primaryContactWhatsapp,
      primaryContactChannel,
      notes
    });

    if (!result.ok) {
      if (result.error === "name_conflict") {
        return `Error: Ya existe un cliente con el nombre "${name}" en este tenant.`;
      }
      if (result.error === "tenant_not_found") {
        return "Error: Tenant no encontrado. Verifica la configuración BRIDGE_TENANT_SLUG.";
      }
      return `Error al crear cliente: ${result.error}`;
    }

    return [
      `✓ ${result.message}`,
      `  clientId: ${result.clientId}`,
      `  Nombre: ${result.name}`,
      `  Estado: ${result.status}`
    ].join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al crear cliente: ${msg}`;
  }
}
