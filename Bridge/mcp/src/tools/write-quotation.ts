/**
 * IMPL-20260510-10
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-10_extension_mcp_cotizaciones_y_copias_locales.md
 *
 * Tool: bridge_write_quotation
 * Escribe o actualiza la cotización de un proyecto en Bridge y guarda copia local.
 */

import type { BridgeClient, QuotationLineItem } from "../bridge-client.js";
import { saveLocalCopy } from "../utils/local-copy.js";

export const writeQuotationToolDefinition = {
  name: "bridge_write_quotation",
  description:
    "Escribe o actualiza la cotización de un proyecto en Bridge desde VS Code. Crea una nueva versión versionada. Con setAsActive=true la cotización pasa a estado 'vigente'. Guarda automáticamente una copia .md en context/clientes/[clientSlug]/propuesta.md.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectId: {
        type: "string",
        description: "UUID del proyecto en Bridge"
      },
      clientSlug: {
        type: "string",
        description: "Slug del cliente para la copia local (ej: techcorp)"
      },
      title: {
        type: "string",
        description: "Título de la cotización (ej: 'Propuesta Mayo 2026')"
      },
      summaryText: {
        type: "string",
        description: "Descripción ejecutiva de la propuesta"
      },
      lineItems: {
        type: "array",
        description: "Ítems de la cotización",
        items: {
          type: "object",
          properties: {
            description: { type: "string", description: "Descripción del ítem" },
            quantity: { type: "number", description: "Cantidad" },
            unitPrice: { type: "number", description: "Precio unitario" },
            currency: { type: "string", enum: ["MXN", "USD"], description: "Moneda" }
          },
          required: ["description", "quantity", "unitPrice", "currency"]
        }
      },
      validUntil: {
        type: "string",
        description: "Fecha ISO de vencimiento (ej: '2026-06-10')"
      },
      notes: {
        type: "string",
        description: "Notas adicionales opcionales"
      },
      setAsActive: {
        type: "boolean",
        description: "Si true, cambia estado a 'vigente'"
      }
    },
    required: ["projectId", "clientSlug", "title", "summaryText", "lineItems", "validUntil"]
  }
};

export async function handleWriteQuotation(
  client: BridgeClient,
  args: unknown,
  workspaceRoot: string
): Promise<string> {
  const {
    projectId,
    clientSlug,
    title,
    summaryText,
    lineItems,
    validUntil,
    notes,
    setAsActive
  } = args as {
    projectId: string;
    clientSlug: string;
    title: string;
    summaryText: string;
    lineItems: QuotationLineItem[];
    validUntil: string;
    notes?: string;
    setAsActive?: boolean;
  };

  if (!projectId || typeof projectId !== "string") {
    return "Error: projectId es requerido y debe ser un string.";
  }
  if (!clientSlug || typeof clientSlug !== "string") {
    return "Error: clientSlug es requerido y debe ser un string.";
  }
  if (!title || typeof title !== "string") {
    return "Error: title es requerido.";
  }
  if (!summaryText || typeof summaryText !== "string") {
    return "Error: summaryText es requerido.";
  }
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return "Error: lineItems debe ser un array no vacío.";
  }
  if (!validUntil || typeof validUntil !== "string") {
    return "Error: validUntil es requerido (formato ISO: 2026-06-10).";
  }

  try {
    const result = await client.writeQuotation(projectId, {
      title,
      summaryText,
      lineItems,
      validUntil,
      notes,
      setAsActive
    });

    if (!result.ok) {
      return `Error al crear cotización: ${result.error}`;
    }

    // Construir markdown de la propuesta para copia local
    const rows = lineItems.map((item) => {
      const subtotal = (item.quantity * item.unitPrice).toLocaleString("es-MX");
      const unit = item.unitPrice.toLocaleString("es-MX");
      return `| ${item.description} | ${item.quantity} | $${unit} | $${subtotal} | ${item.currency} |`;
    });

    const total = result.totalAmount.toLocaleString("es-MX");

    const propuestaLines = [
      `# ${title}`,
      ``,
      summaryText,
      ``,
      `## Desglose de servicios`,
      ``,
      `| Descripción | Cantidad | Precio Unitario | Subtotal | Moneda |`,
      `|-------------|----------|-----------------|----------|--------|`,
      ...rows,
      ``,
      `**Total: $${total} ${result.currency}**`,
      ``,
      `**Válido hasta:** ${validUntil}`,
      `**Estado:** ${result.status}`,
      `**Versión:** ${result.version}`
    ];

    if (notes) {
      propuestaLines.push(``, `## Notas`, notes);
    }

    const propuestaMarkdown = propuestaLines.join("\n");
    const localPath = saveLocalCopy("propuesta", clientSlug, propuestaMarkdown, workspaceRoot);

    const lines = [
      `✓ Cotización #${result.version} creada exitosamente.`,
      `  ID: ${result.quotationId}`,
      `  Estado: ${result.status}`,
      `  Total: $${total} ${result.currency}`,
      `  Válido hasta: ${validUntil}`
    ];

    if (result.emailSent) {
      lines.push(`📧 Email enviado automáticamente al cliente.`);
    }

    lines.push(`📄 Copia guardada en: ${localPath}`);

    return lines.join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "project_not_found") {
      return `Error: El proyecto ${projectId} no existe o no pertenece a este tenant.`;
    }
    return `Error al crear cotización: ${msg}`;
  }
}
