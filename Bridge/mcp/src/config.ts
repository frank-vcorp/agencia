/**
 * IMPL-20260510-08 | IMPL-20260510-10
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-08_mcp_server_bridge_para_agentes_vscode.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-10_extension_mcp_cotizaciones_y_copias_locales.md
 *
 * Lee variables de entorno requeridas para el MCP server de Bridge.
 */

export type BridgeConfig = {
  bridgeUrl: string;
  bridgeMcpSecret: string;
  bridgeTenantSlug: string;
  workspaceRoot: string;
};

export function loadConfig(): BridgeConfig {
  const bridgeUrl = process.env.BRIDGE_URL;
  const bridgeMcpSecret = process.env.BRIDGE_MCP_SECRET;
  const bridgeTenantSlug = process.env.BRIDGE_TENANT_SLUG ?? "vectoria";
  const workspaceRoot = process.env.BRIDGE_WORKSPACE_ROOT ?? process.cwd();

  if (!bridgeUrl) {
    throw new Error("BRIDGE_URL no esta configurado");
  }
  if (!bridgeMcpSecret || bridgeMcpSecret.length < 32) {
    throw new Error("BRIDGE_MCP_SECRET no esta configurado o tiene menos de 32 caracteres");
  }

  return { bridgeUrl, bridgeMcpSecret, bridgeTenantSlug, workspaceRoot };
}
