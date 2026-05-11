/**
 * IMPL-20260510-08
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-08_mcp_server_bridge_para_agentes_vscode.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { verifyAgentToken, getTenantSlug } from "./agent-auth";

describe("verifyAgentToken", () => {
  beforeEach(() => {
    vi.stubEnv("BRIDGE_MCP_SECRET", "a".repeat(32));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("retorna null cuando el token es correcto", () => {
    const req = new NextRequest("http://localhost/api/v1/assets", {
      headers: { Authorization: `Bearer ${"a".repeat(32)}` }
    });
    expect(verifyAgentToken(req)).toBeNull();
  });

  it("retorna 401 cuando no hay header Authorization", () => {
    const req = new NextRequest("http://localhost/api/v1/assets");
    const res = verifyAgentToken(req);
    expect(res?.status).toBe(401);
  });

  it("retorna 401 cuando el token es incorrecto", () => {
    const req = new NextRequest("http://localhost/api/v1/assets", {
      headers: { Authorization: "Bearer wrong-token" }
    });
    const res = verifyAgentToken(req);
    expect(res?.status).toBe(401);
  });

  it("retorna 500 si BRIDGE_MCP_SECRET no esta configurado", () => {
    vi.stubEnv("BRIDGE_MCP_SECRET", "");
    const req = new NextRequest("http://localhost/api/v1/assets", {
      headers: { Authorization: "Bearer anything" }
    });
    const res = verifyAgentToken(req);
    expect(res?.status).toBe(500);
  });

  it("retorna 500 si BRIDGE_MCP_SECRET tiene menos de 32 caracteres", () => {
    vi.stubEnv("BRIDGE_MCP_SECRET", "short");
    const req = new NextRequest("http://localhost/api/v1/assets", {
      headers: { Authorization: "Bearer short" }
    });
    const res = verifyAgentToken(req);
    expect(res?.status).toBe(500);
  });
});

describe("getTenantSlug", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa el header X-Bridge-Tenant si esta presente", () => {
    const req = new NextRequest("http://localhost/api/v1/assets", {
      headers: { "X-Bridge-Tenant": "mi-agencia" }
    });
    expect(getTenantSlug(req)).toBe("mi-agencia");
  });

  it("usa NEXT_PUBLIC_DEFAULT_TENANT como fallback", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_TENANT", "fallback-tenant");
    const req = new NextRequest("http://localhost/api/v1/assets");
    expect(getTenantSlug(req)).toBe("fallback-tenant");
  });

  it("usa vectoria si no hay header ni env", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_TENANT", "");
    const req = new NextRequest("http://localhost/api/v1/assets");
    // NEXT_PUBLIC_DEFAULT_TENANT vacío → fallback "vectoria"
    expect(getTenantSlug(req)).toBe("vectoria");
  });
});
