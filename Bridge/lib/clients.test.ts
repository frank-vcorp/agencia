/**
 * IMPL-ARCH-20260612-05
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-05_gestion_clientes_crud_detalle_entidades_relacionadas.md
 * Tests unitarios para las funciones CRUD de clientes y para el filtro por
 * clientId en las funciones de listado.
 */
import { describe, expect, it, beforeEach, afterEach, vi, type MockInstance } from "vitest";

import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUSES,
  createClient,
  deleteClient,
  getClientById,
  updateClient
} from "./clients";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const CLIENT_ID = "00000000-0000-0000-0000-0000000000a1";

function makeJsonResponse<T>(data: T, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" }
    })
  );
}

function makeEmptyResponse(status = 200) {
  return Promise.resolve(new Response("[]", { status, headers: { "Content-Type": "application/json" } }));
}

describe("clients — constantes de dominio", () => {
  it("expone 3 estados de cliente", () => {
    expect(CLIENT_STATUSES).toEqual(["active", "prospect", "inactive"]);
  });

  it("etiqueta los 3 estados", () => {
    expect(CLIENT_STATUS_LABELS.active).toBe("Activo");
    expect(CLIENT_STATUS_LABELS.prospect).toBe("Prospecto");
    expect(CLIENT_STATUS_LABELS.inactive).toBe("Inactivo");
  });
});

describe("getClientById", () => {
  let fetchMock: MockInstance;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, "fetch");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fake.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fake-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("retorna null si Supabase no esta configurado", async () => {
    vi.unstubAllEnvs();
    expect(await getClientById(CLIENT_ID)).toBeNull();
  });

  it("retorna null si no hay tenant configurado", async () => {
    fetchMock.mockReturnValue(makeJsonResponse([])); // tenants query vacia
    const result = await getClientById(CLIENT_ID);
    expect(result).toBeNull();
  });

  it("retorna el detalle del cliente cuando existe", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }])) // tenant
      .mockReturnValueOnce(
        makeJsonResponse([
          {
            id: CLIENT_ID,
            name: "Acme",
            legal_name: "Acme S.A.",
            status: "active",
            primary_contact_name: "Ana",
            primary_contact_email: "ana@acme.com",
            primary_contact_whatsapp: "+525512345678",
            primary_contact_channel: "WhatsApp",
            notes: "VIP",
            brand_kit: null
          }
        ])
      );

    const result = await getClientById(CLIENT_ID);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(CLIENT_ID);
    expect(result?.name).toBe("Acme");
    expect(result?.status).toBe("active");
    expect(result?.legalName).toBe("Acme S.A.");
    expect(result?.primaryContactEmail).toBe("ana@acme.com");
    expect(result?.tenantSlug).toBe("vectoria");
    expect(result?.recentProjectId).toBeNull();
  });

  it("normaliza status desconocido a 'active'", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(
        makeJsonResponse([
          {
            id: CLIENT_ID,
            name: "Acme",
            legal_name: null,
            status: "desconocido",
            primary_contact_name: null,
            primary_contact_email: null,
            primary_contact_whatsapp: null,
            primary_contact_channel: null,
            notes: null,
            brand_kit: null
          }
        ])
      );

    const result = await getClientById(CLIENT_ID);
    expect(result?.status).toBe("active");
  });

  it("retorna null cuando el cliente no existe", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(makeJsonResponse([]));
    expect(await getClientById(CLIENT_ID)).toBeNull();
  });
});

describe("createClient", () => {
  let fetchMock: MockInstance;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, "fetch");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fake.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fake-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("lanza client_name_invalid si el nombre esta vacio", async () => {
    await expect(createClient({ name: "   " })).rejects.toThrow("client_name_invalid");
  });

  it("lanza tenant_not_found si no hay tenant", async () => {
    fetchMock.mockReturnValue(makeJsonResponse([]));
    await expect(createClient({ name: "Acme" })).rejects.toThrow("tenant_not_found");
  });

  it("crea el cliente y devuelve id y nombre", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(makeJsonResponse([{ id: CLIENT_ID, name: "Acme" }]));

    const result = await createClient({ name: "Acme" });
    expect(result.id).toBe(CLIENT_ID);
    expect(result.name).toBe("Acme");
  });

  it("envia payload con campos normalizados (whatsapp saneado, email trim)", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(makeJsonResponse([{ id: CLIENT_ID, name: "Acme" }]));

    await createClient({
      name: "Acme",
      legalName: "Acme S.A.",
      status: "prospect",
      primaryContactName: "Ana",
      primaryContactEmail: "  ana@acme.com  ",
      primaryContactWhatsapp: "+52 (55) 1234-5678",
      primaryContactChannel: "WhatsApp",
      notes: "Test"
    });

    const insertCall = fetchMock.mock.calls[1];
    const body = JSON.parse(insertCall[1]?.body as string);
    expect(body).toMatchObject({
      tenant_id: TENANT_ID,
      name: "Acme",
      legal_name: "Acme S.A.",
      status: "prospect",
      primary_contact_name: "Ana",
      primary_contact_email: "ana@acme.com",
      primary_contact_whatsapp: "+525512345678",
      primary_contact_channel: "WhatsApp",
      notes: "Test"
    });
  });

  it("lanza clients:create_failed si la respuesta no incluye el id", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(makeJsonResponse([]));
    await expect(createClient({ name: "Acme" })).rejects.toThrow("clients:create_failed");
  });
});

describe("updateClient", () => {
  let fetchMock: MockInstance;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, "fetch");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fake.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fake-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("retorna null si no hay tenant", async () => {
    fetchMock.mockReturnValue(makeJsonResponse([]));
    expect(await updateClient(CLIENT_ID, { name: "Nuevo" })).toBeNull();
  });

  it("envia patch con snake_case y solo campos definidos", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(makeJsonResponse([{ id: CLIENT_ID }]));

    const result = await updateClient(CLIENT_ID, {
      name: "Acme 2",
      status: "inactive",
      primaryContactEmail: " nuevo@acme.com "
    });
    expect(result).toBe(CLIENT_ID);

    const patchCall = fetchMock.mock.calls[1];
    const body = JSON.parse(patchCall[1]?.body as string);
    expect(body).toEqual({
      name: "Acme 2",
      status: "inactive",
      primary_contact_email: "nuevo@acme.com"
    });
  });

  it("no envia PATCH si el patch esta vacio (verifica existencia)", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(
        makeJsonResponse([
          {
            id: CLIENT_ID,
            name: "Acme",
            legal_name: null,
            status: "active",
            primary_contact_name: null,
            primary_contact_email: null,
            primary_contact_whatsapp: null,
            primary_contact_channel: null,
            notes: null,
            brand_kit: null
          }
        ])
      );

    const result = await updateClient(CLIENT_ID, {});
    expect(result).toBe(CLIENT_ID);
    // Solo 2 fetch calls: tenant + lookup (sin PATCH)
    expect(fetchMock.mock.calls.length).toBe(2);
  });

  it("sanea el whatsapp y respeta null explicito", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(makeJsonResponse([{ id: CLIENT_ID }]));

    await updateClient(CLIENT_ID, {
      primaryContactWhatsapp: "+52 (55) 1234-5678",
      primaryContactChannel: null
    });

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.primary_contact_whatsapp).toBe("+525512345678");
    expect(body.primary_contact_channel).toBeNull();
  });

  it("retorna null si Supabase no encontro el cliente", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(makeJsonResponse([]));
    expect(await updateClient(CLIENT_ID, { name: "Nuevo" })).toBeNull();
  });
});

describe("deleteClient", () => {
  let fetchMock: MockInstance;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, "fetch");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fake.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fake-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("retorna false si no hay cliente o tenant", async () => {
    expect(await deleteClient("")).toBe(false);
    fetchMock.mockReturnValue(makeJsonResponse([]));
    expect(await deleteClient(CLIENT_ID)).toBe(false);
  });

  it("envia PATCH con deleted_at ISO", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(makeJsonResponse([{ id: CLIENT_ID }]));

    const ok = await deleteClient(CLIENT_ID);
    expect(ok).toBe(true);

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body).toHaveProperty("deleted_at");
    expect(new Date(body.deleted_at).toString()).not.toBe("Invalid Date");
  });

  it("retorna false si Supabase no reporta fila afectada", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(makeJsonResponse([]));
    expect(await deleteClient(CLIENT_ID)).toBe(false);
  });
});

// ─── Filtro clientId en listados ─────────────────────────────────────────────

import { getQuotationsByTenant, getQuotationsByClient } from "./quotations";
import { getLeadsByTenant } from "./crm";
import { getAssetsByTenant, getBriefsByTenant } from "./assets";

describe("listados — filtro por clientId", () => {
  let fetchMock: MockInstance;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, "fetch");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fake.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fake-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("getQuotationsByTenant omite client_id cuando no se pasa", async () => {
    fetchMock.mockReturnValueOnce(makeJsonResponse([]));
    await getQuotationsByTenant(TENANT_ID);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).not.toContain("client_id=");
  });

  it("getQuotationsByTenant agrega client_id=eq.<id> cuando se pasa", async () => {
    fetchMock.mockReturnValueOnce(makeJsonResponse([]));
    await getQuotationsByTenant(TENANT_ID, CLIENT_ID);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain(`client_id=eq.${CLIENT_ID}`);
  });

  it("getQuotationsByClient es alias de getQuotationsByTenant con clientId", async () => {
    fetchMock.mockReturnValueOnce(makeJsonResponse([]));
    await getQuotationsByClient(TENANT_ID, CLIENT_ID);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain(`client_id=eq.${CLIENT_ID}`);
    expect(url).toContain(`tenant_id=eq.${TENANT_ID}`);
  });

  it("getLeadsByTenant agrega client_id cuando se pasa", async () => {
    fetchMock.mockReturnValueOnce(makeJsonResponse([]));
    await getLeadsByTenant(TENANT_ID, CLIENT_ID);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain(`client_id=eq.${CLIENT_ID}`);
  });

  it("getLeadsByTenant omite client_id cuando no se pasa", async () => {
    fetchMock.mockReturnValueOnce(makeJsonResponse([]));
    await getLeadsByTenant(TENANT_ID);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).not.toContain("client_id=");
  });

  it("getAssetsByTenant agrega client_id cuando se pasa", async () => {
    fetchMock.mockReturnValueOnce(makeJsonResponse([]));
    await getAssetsByTenant(TENANT_ID, CLIENT_ID);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain(`client_id=eq.${CLIENT_ID}`);
  });

  it("getAssetsByTenant omite client_id cuando no se pasa", async () => {
    fetchMock.mockReturnValueOnce(makeJsonResponse([]));
    await getAssetsByTenant(TENANT_ID);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).not.toContain("client_id=");
  });

  it("getBriefsByTenant agrega client_id cuando se pasa", async () => {
    fetchMock.mockReturnValueOnce(makeJsonResponse([]));
    await getBriefsByTenant(TENANT_ID, CLIENT_ID);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain(`client_id=eq.${CLIENT_ID}`);
  });

  it("getBriefsByTenant omite client_id cuando no se pasa", async () => {
    fetchMock.mockReturnValueOnce(makeJsonResponse([]));
    await getBriefsByTenant(TENANT_ID);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).not.toContain("client_id=");
  });
});
