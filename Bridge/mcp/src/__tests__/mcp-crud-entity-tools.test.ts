/**
 * IMPL-20260526-06
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-09_cobertura_regresion_mcp_crud_entidad_v1.md
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BridgeClient } from "../bridge-client.js";
import { handleGetClient } from "../tools/get-client.js";
import { handleGetProject } from "../tools/get-project.js";
import { handleGetQuotation } from "../tools/get-quotation.js";
import { handleUpdateClient } from "../tools/update-client.js";
import { handleUpdateProject } from "../tools/update-project.js";
import { handleUpdateQuotationStatus } from "../tools/update-quotation-status.js";

const CONFIG = {
  bridgeUrl: "http://localhost:3000",
  bridgeMcpSecret: "a".repeat(32),
  bridgeTenantSlug: "vectoria",
  workspaceRoot: "/workspace"
};

function makeResponse(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" }
    })
  );
}

describe("mcp-crud-entity-tools", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("valida clientId requerido en bridge_get_client", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleGetClient(client, {});
    expect(result).toContain("clientId es requerido");
  });

  it("valida projectId requerido en bridge_get_project", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleGetProject(client, null);
    expect(result).toContain("projectId es requerido");
  });

  it("valida quotationId requerido en bridge_get_quotation", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleGetQuotation(client, 123);
    expect(result).toContain("quotationId es requerido");
  });

  it("valida clientId requerido en bridge_update_client", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleUpdateClient(client, { name: "ACME" });
    expect(result).toContain("clientId es requerido");
  });

  it("valida projectId requerido en bridge_update_project", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleUpdateProject(client, { status: "active" });
    expect(result).toContain("projectId es requerido");
  });

  it("valida quotationId requerido en bridge_update_quotation_status", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleUpdateQuotationStatus(client, { status: "sent" });
    expect(result).toContain("quotationId es requerido");
  });

  it("valida no_valid_fields en bridge_update_client", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleUpdateClient(client, { clientId: "client-1" });
    expect(result).toContain("no se enviaron campos válidos");
  });

  it("valida no_valid_fields en bridge_update_project", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleUpdateProject(client, { projectId: "project-1" });
    expect(result).toContain("no se enviaron campos válidos");
  });

  it("valida no_valid_fields en bridge_update_quotation_status", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleUpdateQuotationStatus(client, { quotationId: "q-1" });
    expect(result).toContain("no se enviaron campos válidos");
  });

  it("retorna detalle formateado en bridge_get_client", async () => {
    fetchMock.mockReturnValueOnce(
      makeResponse({
        ok: true,
        client: {
          id: "client-1",
          name: "ACME",
          status: "active",
          legal_name: null,
          primary_contact_name: "Jane",
          primary_contact_email: "jane@acme.com",
          primary_contact_whatsapp: "+5215512345678",
          primary_contact_channel: "whatsapp",
          notes: null
        }
      })
    );

    const client = new BridgeClient(CONFIG);
    const result = await handleGetClient(client, { clientId: "client-1" });

    expect(result).toContain("Cliente: ACME");
    expect(result).toContain("jane@acme.com");
    expect(result).toContain("+5215512345678");
  });

  it("actualiza project y envia payload esperado", async () => {
    fetchMock.mockReturnValueOnce(
      makeResponse({
        ok: true,
        project: {
          id: "project-1",
          name: "Lanzamiento",
          project_type: "campaign",
          status: "active",
          objective: "Generar leads",
          start_date: "2026-05-01",
          end_date: "2026-06-01",
          client_id: "client-1",
          created_at: "2026-05-01T00:00:00.000Z"
        }
      })
    );

    const client = new BridgeClient(CONFIG);
    const result = await handleUpdateProject(client, {
      projectId: "project-1",
      status: "active",
      objective: "Generar leads"
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse((init.body ?? "{}") as string) as Record<string, unknown>;

    expect(url).toContain("/api/v1/projects/project-1");
    expect(init.method).toBe("PATCH");
    expect(body.status).toBe("active");
    expect(body.objective).toBe("Generar leads");
    expect(result).toContain("Proyecto actualizado");
  });

  it("propaga error de not_found en bridge_get_quotation", async () => {
    fetchMock.mockReturnValueOnce(makeResponse({ ok: false, error: "quotation_not_found" }, 404));

    const client = new BridgeClient(CONFIG);
    const result = await handleGetQuotation(client, { quotationId: "q-404" });

    expect(result).toContain("Error al consultar cotización");
    expect(result).toContain("quotation_not_found");
  });
});
