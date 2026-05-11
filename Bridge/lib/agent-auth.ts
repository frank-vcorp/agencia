/**
 * IMPL-20260510-08
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-08_mcp_server_bridge_para_agentes_vscode.md
 *
 * Middleware de verificación de token compartido para las rutas /api/v1/*.
 * El token se configura en BRIDGE_MCP_SECRET (mínimo 32 caracteres).
 */
import { NextRequest, NextResponse } from "next/server";

/**
 * Verifica el header Authorization: Bearer <BRIDGE_MCP_SECRET>.
 * Retorna un NextResponse de error (401/500) si falla, o null si es válido.
 */
export function verifyAgentToken(req: NextRequest): NextResponse | null {
  const secret = process.env.BRIDGE_MCP_SECRET;

  if (!secret || secret.length < 32) {
    return NextResponse.json(
      { ok: false, error: "server_misconfigured" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const provided = authHeader.slice("Bearer ".length).trim();
  if (provided !== secret) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  return null;
}

/**
 * Obtiene el slug del tenant desde el header X-Bridge-Tenant
 * o desde NEXT_PUBLIC_DEFAULT_TENANT como fallback.
 */
export function getTenantSlug(req: NextRequest): string {
  return (
    req.headers.get("x-bridge-tenant") ||
    process.env.NEXT_PUBLIC_DEFAULT_TENANT ||
    "vectoria"
  );
}
