#!/usr/bin/env node
/**
 * IMPL-20260510-08 | IMPL-20260510-10
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-08_mcp_server_bridge_para_agentes_vscode.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-10_extension_mcp_cotizaciones_y_copias_locales.md
 *
 * Entry point del MCP server de Bridge.
 * Expone 5 herramientas vía stdio para agentes VS Code (GitHub Copilot):
 *   - bridge_list_assets
 *   - bridge_get_asset_context
 *   - bridge_write_production_spec
 *   - bridge_get_brief
 *   - bridge_write_quotation
 *
 * Uso: node dist/index.js
 * Configurar en .vscode/mcp.json con BRIDGE_URL, BRIDGE_MCP_SECRET, BRIDGE_TENANT_SLUG, BRIDGE_WORKSPACE_ROOT.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

import { loadConfig } from "./config.js";
import { BridgeClient } from "./bridge-client.js";
import {
  listAssetsToolDefinition,
  handleListAssets
} from "./tools/list-assets.js";
import {
  getAssetContextToolDefinition,
  handleGetAssetContext
} from "./tools/get-asset-context.js";
import {
  writeProductionSpecToolDefinition,
  handleWriteProductionSpec
} from "./tools/write-production-spec.js";
import {
  getBriefToolDefinition,
  handleGetBrief
} from "./tools/get-brief.js";
import {
  writeQuotationToolDefinition,
  handleWriteQuotation
} from "./tools/write-quotation.js";

async function main() {
  const config = loadConfig();
  const client = new BridgeClient(config);

  const server = new Server(
    { name: "bridge-mcp", version: "0.2.0" },
    { capabilities: { tools: {} } }
  );

  // Registrar las herramientas disponibles
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      listAssetsToolDefinition,
      getAssetContextToolDefinition,
      writeProductionSpecToolDefinition,
      getBriefToolDefinition,
      writeQuotationToolDefinition
    ]
  }));

  // Despachar llamadas a herramientas
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    let text: string;

    switch (name) {
      case "bridge_list_assets":
        text = await handleListAssets(client);
        break;

      case "bridge_get_asset_context":
        text = await handleGetAssetContext(client, args ?? {});
        break;

      case "bridge_write_production_spec":
        text = await handleWriteProductionSpec(client, args ?? {}, config.workspaceRoot);
        break;

      case "bridge_get_brief":
        text = await handleGetBrief(client, args ?? {}, config.workspaceRoot);
        break;

      case "bridge_write_quotation":
        text = await handleWriteQuotation(client, args ?? {}, config.workspaceRoot);
        break;

      default:
        text = `Herramienta desconocida: ${name}`;
    }

    return {
      content: [{ type: "text" as const, text }]
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Error fatal del MCP server: ${err}\n`);
  process.exit(1);
});
