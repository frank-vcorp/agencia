#!/usr/bin/env node
/**
 * IMPL-20260510-08 | IMPL-20260510-10 | IMPL-20260510-14
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-08_mcp_server_bridge_para_agentes_vscode.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-10_extension_mcp_cotizaciones_y_copias_locales.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-14_mcp_crear_cliente_proyecto_activo.md
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
 *
 * Entry point del MCP server de Bridge.
 * Expone herramientas MCP para operaciones operativas sobre assets,
 * briefs, cotizaciones, clientes y proyectos.
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
import {
  createClientToolDefinition,
  handleCreateClient
} from "./tools/create-client.js";
import {
  createProjectToolDefinition,
  handleCreateProject
} from "./tools/create-project.js";
import {
  createAssetToolDefinition,
  handleCreateAsset
} from "./tools/create-asset.js";
import {
  downloadAssetFilesToolDefinition,
  handleDownloadAssetFiles
} from "./tools/download-asset-files.js";
import {
  deleteProjectToolDefinition,
  handleDeleteProject
} from "./tools/delete-project.js";
import {
  deleteAssetToolDefinition,
  handleDeleteAsset
} from "./tools/delete-asset.js";
import {
  deleteQuotationToolDefinition,
  handleDeleteQuotation
} from "./tools/delete-quotation.js";
import {
  deleteBriefToolDefinition,
  handleDeleteBrief
} from "./tools/delete-brief.js";
import {
  deleteClientToolDefinition,
  handleDeleteClient
} from "./tools/delete-client.js";
import {
  deleteLeadToolDefinition,
  handleDeleteLead
} from "./tools/delete-lead.js";
import {
  listTrashToolDefinition,
  handleListTrash
} from "./tools/list-trash.js";
import {
  restoreEntityToolDefinition,
  handleRestoreEntity
} from "./tools/restore-entity.js";
import {
  listProjectsToolDefinition,
  handleListProjects
} from "./tools/list-projects.js";
import {
  getProjectToolDefinition,
  handleGetProject
} from "./tools/get-project.js";
import {
  updateProjectToolDefinition,
  handleUpdateProject
} from "./tools/update-project.js";
import {
  listClientsToolDefinition,
  handleListClients
} from "./tools/list-clients.js";
import {
  getClientToolDefinition,
  handleGetClient
} from "./tools/get-client.js";
import {
  updateClientToolDefinition,
  handleUpdateClient
} from "./tools/update-client.js";
import {
  listBriefsToolDefinition,
  handleListBriefs
} from "./tools/list-briefs.js";
import {
  updateBriefToolDefinition,
  handleUpdateBrief
} from "./tools/update-brief.js";
import {
  listQuotationsToolDefinition,
  handleListQuotations
} from "./tools/list-quotations.js";
import {
  getQuotationToolDefinition,
  handleGetQuotation
} from "./tools/get-quotation.js";
import {
  updateQuotationStatusToolDefinition,
  handleUpdateQuotationStatus
} from "./tools/update-quotation-status.js";
import {
  updateAssetToolDefinition,
  handleUpdateAsset
} from "./tools/update-asset.js";
import {
  getBrandKitToolDefinition,
  handleGetBrandKit
} from "./tools/get-brand-kit.js";
import {
  updateBrandKitToolDefinition,
  handleUpdateBrandKit
} from "./tools/update-brand-kit.js";

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
      writeQuotationToolDefinition,
      createClientToolDefinition,
      createProjectToolDefinition,
      createAssetToolDefinition,
      downloadAssetFilesToolDefinition,
      listProjectsToolDefinition,
      getProjectToolDefinition,
      updateProjectToolDefinition,
      listClientsToolDefinition,
      getClientToolDefinition,
      updateClientToolDefinition,
      listBriefsToolDefinition,
      updateBriefToolDefinition,
      listQuotationsToolDefinition,
      getQuotationToolDefinition,
      updateQuotationStatusToolDefinition,
      updateAssetToolDefinition,
      getBrandKitToolDefinition,
      updateBrandKitToolDefinition,
      deleteProjectToolDefinition,
      deleteAssetToolDefinition,
      deleteQuotationToolDefinition,
      deleteBriefToolDefinition,
      deleteClientToolDefinition,
      deleteLeadToolDefinition,
      listTrashToolDefinition,
      restoreEntityToolDefinition
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

      case "bridge_create_client":
        text = await handleCreateClient(client, args ?? {});
        break;

      case "bridge_create_project":
        text = await handleCreateProject(client, args ?? {});
        break;

      case "bridge_create_asset":
        text = await handleCreateAsset(client, args ?? {});
        break;

      case "bridge_download_asset_files":
        text = await handleDownloadAssetFiles(client, args ?? {}, config.workspaceRoot);
        break;

      case "bridge_list_projects":
        text = await handleListProjects(client);
        break;

      case "bridge_get_project":
        text = await handleGetProject(client, args ?? {});
        break;

      case "bridge_update_project":
        text = await handleUpdateProject(client, args ?? {});
        break;

      case "bridge_list_clients":
        text = await handleListClients(client);
        break;

      case "bridge_get_client":
        text = await handleGetClient(client, args ?? {});
        break;

      case "bridge_update_client":
        text = await handleUpdateClient(client, args ?? {});
        break;

      case "bridge_list_briefs":
        text = await handleListBriefs(client);
        break;

      case "bridge_update_brief":
        text = await handleUpdateBrief(client, args ?? {});
        break;

      case "bridge_list_quotations":
        text = await handleListQuotations(client);
        break;

      case "bridge_get_quotation":
        text = await handleGetQuotation(client, args ?? {});
        break;

      case "bridge_update_quotation_status":
        text = await handleUpdateQuotationStatus(client, args ?? {});
        break;

      case "bridge_update_asset":
        text = await handleUpdateAsset(client, args ?? {});
        break;

      case "bridge_get_brand_kit":
        text = await handleGetBrandKit(client, args ?? {});
        break;

      case "bridge_update_brand_kit":
        text = await handleUpdateBrandKit(client, args ?? {});
        break;

      case "bridge_delete_project":
        text = await handleDeleteProject(client, args ?? {});
        break;

      case "bridge_delete_asset":
        text = await handleDeleteAsset(client, args ?? {});
        break;

      case "bridge_delete_quotation":
        text = await handleDeleteQuotation(client, args ?? {});
        break;

      case "bridge_delete_brief":
        text = await handleDeleteBrief(client, args ?? {});
        break;

      case "bridge_delete_client":
        text = await handleDeleteClient(client, args ?? {});
        break;

      case "bridge_delete_lead":
        text = await handleDeleteLead(client, args ?? {});
        break;

      case "bridge_list_trash":
        text = await handleListTrash(client);
        break;

      case "bridge_restore_entity":
        text = await handleRestoreEntity(client, args ?? {});
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
