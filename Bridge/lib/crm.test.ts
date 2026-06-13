/**
 * IMPL-20260505-26
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-26_crm_ligero_operativo_y_seguimiento_minimo_v1.md
 * IMPL-20260505-27
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-27_vinculacion_explicita_lead_client_project_v1.md
 * IMPL-20260613-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-29_hardening_validacion_cruzada_crm_v1.md (extensión: updateLead)
 */
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import {
  LEAD_SOURCE_CHANNELS,
  LEAD_STATUSES,
  buildCrmMetrics,
  leadSourceChannelLabel,
  leadSourceChannelLabels,
  leadStatusLabel,
  leadStatusLabels,
  nextLeadStatuses,
  resolveLeadLinksFromData,
  type CreateLeadInput,
  type CrmClient,
  type CrmLinkOptions,
  type CrmProject,
  type Lead,
  type LeadStatus
} from "./crm";

// ─── Constantes ───────────────────────────────────────────────────────────────

describe("crm — constantes de dominio", () => {
  it("tiene 5 estados de lead", () => {
    expect(LEAD_STATUSES.length).toBe(5);
  });

  it("tiene 7 canales de origen", () => {
    expect(LEAD_SOURCE_CHANNELS.length).toBe(7);
  });

  it("cada estado tiene etiqueta definida", () => {
    LEAD_STATUSES.forEach((s) => {
      expect(leadStatusLabels[s]).toBeTruthy();
    });
  });

  it("cada canal tiene etiqueta definida", () => {
    LEAD_SOURCE_CHANNELS.forEach((c) => {
      expect(leadSourceChannelLabels[c]).toBeTruthy();
    });
  });
});

// ─── Etiquetas ────────────────────────────────────────────────────────────────

describe("crm — etiquetas de estado", () => {
  const casos: Array<[LeadStatus, string]> = [
    ["nuevo", "Nuevo"],
    ["en_seguimiento", "En seguimiento"],
    ["propuesta_enviada", "Propuesta enviada"],
    ["cerrado_ganado", "Cerrado ganado"],
    ["cerrado_perdido", "Cerrado perdido"]
  ];

  it.each(casos)("mapea estado '%s' a '%s'", (status, expected) => {
    expect(leadStatusLabel(status)).toBe(expected);
  });

  it("mapea canal 'instagram' a 'Instagram'", () => {
    expect(leadSourceChannelLabel("instagram")).toBe("Instagram");
  });

  it("mapea canal 'whatsapp' a 'WhatsApp'", () => {
    expect(leadSourceChannelLabel("whatsapp")).toBe("WhatsApp");
  });
});

// ─── Máquina de estados ───────────────────────────────────────────────────────

describe("crm — nextLeadStatuses", () => {
  it("desde 'nuevo' devuelve al menos 3 estados siguientes", () => {
    const next = nextLeadStatuses("nuevo");
    expect(next.length).toBeGreaterThanOrEqual(3);
    expect(next).not.toContain("nuevo");
  });

  it("desde 'cerrado_ganado' no hay siguientes", () => {
    expect(nextLeadStatuses("cerrado_ganado")).toHaveLength(0);
  });

  it("desde 'cerrado_perdido' no hay siguientes", () => {
    expect(nextLeadStatuses("cerrado_perdido")).toHaveLength(0);
  });

  it("siempre incluye 'cerrado_ganado' y 'cerrado_perdido' si no está cerrado", () => {
    const activeStatuses: LeadStatus[] = ["nuevo", "en_seguimiento", "propuesta_enviada"];
    activeStatuses.forEach((s) => {
      const next = nextLeadStatuses(s);
      expect(next).toContain("cerrado_ganado");
      expect(next).toContain("cerrado_perdido");
    });
  });
});

// ─── buildCrmMetrics ──────────────────────────────────────────────────────────

function makeLead(status: LeadStatus): Lead {
  return {
    id: "lead-1",
    tenantId: "tenant-1",
    clientId: null,
    projectId: null,
    name: "Test Lead",
    sourceChannel: "directo",
    requestedService: "Campana",
    status,
    nextFollowUpAt: null,
    createdAt: "2026-05-05T10:00:00Z",
    updatedAt: "2026-05-05T10:00:00Z"
  };
}

describe("crm — buildCrmMetrics", () => {
  it("sin leads devuelve 'Sin leads'", () => {
    const m = buildCrmMetrics([]);
    expect(m.label).toBe("Sin leads");
    expect(m.totalLeads).toBe(0);
    expect(m.activeLeads).toBe(0);
  });

  it("1 lead nuevo -> '1 activo'", () => {
    const m = buildCrmMetrics([makeLead("nuevo")]);
    expect(m.label).toBe("1 activo");
    expect(m.activeLeads).toBe(1);
  });

  it("3 leads activos -> '3 activos'", () => {
    const leads = [makeLead("nuevo"), makeLead("en_seguimiento"), makeLead("propuesta_enviada")];
    const m = buildCrmMetrics(leads);
    expect(m.label).toBe("3 activos");
    expect(m.activeLeads).toBe(3);
  });

  it("solo leads cerrados muestra conteo de cerrados", () => {
    const leads = [makeLead("cerrado_ganado"), makeLead("cerrado_perdido")];
    const m = buildCrmMetrics(leads);
    expect(m.label).toBe("2 cerrados");
    expect(m.activeLeads).toBe(0);
  });
});

// ─── Slice 27: vinculación explícita lead -> client/project ───────────────────

describe("crm — CreateLeadInput acepta clientId y projectId opcionales", () => {
  it("input mínimo sin vínculos es válido como tipo", () => {
    const input: CreateLeadInput = {
      name: "Test Lead",
      sourceChannel: "directo",
      requestedService: ""
    };
    expect(input.clientId).toBeUndefined();
    expect(input.projectId).toBeUndefined();
  });

  it("input con clientId y projectId nulos es válido", () => {
    const input: CreateLeadInput = {
      name: "Lead con nulos",
      sourceChannel: "instagram",
      requestedService: "Campaña",
      clientId: null,
      projectId: null
    };
    expect(input.clientId).toBeNull();
    expect(input.projectId).toBeNull();
  });

  it("input con clientId y projectId como strings es válido", () => {
    const input: CreateLeadInput = {
      name: "Lead vinculado",
      sourceChannel: "referido",
      requestedService: "Lanzamiento",
      clientId: "client-uuid-1",
      projectId: "project-uuid-1"
    };
    expect(input.clientId).toBe("client-uuid-1");
    expect(input.projectId).toBe("project-uuid-1");
  });
});

describe("crm — CrmLinkOptions estructura", () => {
  it("CrmClient tiene los campos requeridos", () => {
    const client: CrmClient = { id: "c-1", name: "Acme Corp", status: "active" };
    expect(client.id).toBeTruthy();
    expect(client.name).toBeTruthy();
    expect(client.status).toBeTruthy();
  });

  it("CrmProject tiene los campos requeridos incluyendo clientId", () => {
    const project: CrmProject = {
      id: "p-1",
      clientId: "c-1",
      name: "Campaña Lanzamiento",
      status: "active"
    };
    expect(project.clientId).toBe("c-1");
  });

  it("CrmLinkOptions vacío es válido y predecible", () => {
    const opts: CrmLinkOptions = { clients: [], projects: [] };
    expect(opts.clients).toHaveLength(0);
    expect(opts.projects).toHaveLength(0);
  });

  it("CrmLinkOptions con datos mantiene integridad referencial manual", () => {
    const clients: CrmClient[] = [{ id: "c-1", name: "Vectoria", status: "active" }];
    const projects: CrmProject[] = [{ id: "p-1", clientId: "c-1", name: "Lanzamiento 2026", status: "active" }];
    const opts: CrmLinkOptions = { clients, projects };

    const projectClient = opts.clients.find((c) => c.id === opts.projects[0].clientId);
    expect(projectClient?.name).toBe("Vectoria");
  });
});

// ─── Slice 29: resolveLeadLinksFromData — validación cruzada server-side ──────

describe("crm — resolveLeadLinksFromData", () => {
  const clients: CrmClient[] = [
    { id: "c-1", name: "Acme Corp", status: "active" },
    { id: "c-2", name: "Vectoria", status: "active" }
  ];
  const projects: CrmProject[] = [
    { id: "p-1", clientId: "c-1", name: "Lanzamiento 2026", status: "active" },
    { id: "p-2", clientId: "c-2", name: "Campaña Evergreen", status: "active" }
  ];

  it("sin vínculos devuelve ok con ambos null", () => {
    const r = resolveLeadLinksFromData(clients, projects, null, null);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.clientId).toBeNull();
      expect(r.projectId).toBeNull();
    }
  });

  it("sin vínculos (undefined) devuelve ok con ambos null", () => {
    const r = resolveLeadLinksFromData(clients, projects, undefined, undefined);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.clientId).toBeNull();
      expect(r.projectId).toBeNull();
    }
  });

  it("clientId válido sin projectId devuelve ok", () => {
    const r = resolveLeadLinksFromData(clients, projects, "c-1", null);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.clientId).toBe("c-1");
      expect(r.projectId).toBeNull();
    }
  });

  it("clientId inexistente devuelve error", () => {
    const r = resolveLeadLinksFromData(clients, projects, "c-999", null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/cliente/i);
  });

  it("solo projectId válido resuelve clientId automáticamente", () => {
    const r = resolveLeadLinksFromData(clients, projects, null, "p-1");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.clientId).toBe("c-1");
      expect(r.projectId).toBe("p-1");
    }
  });

  it("projectId inexistente devuelve error", () => {
    const r = resolveLeadLinksFromData(clients, projects, null, "p-999");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/proyecto/i);
  });

  it("clientId y projectId consistentes devuelven ok", () => {
    const r = resolveLeadLinksFromData(clients, projects, "c-1", "p-1");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.clientId).toBe("c-1");
      expect(r.projectId).toBe("p-1");
    }
  });

  it("clientId y projectId inconsistentes devuelven error", () => {
    // p-2 pertenece a c-2, no a c-1
    const r = resolveLeadLinksFromData(clients, projects, "c-1", "p-2");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no pertenece/i);
  });

  it("clientId inexistente con projectId válido devuelve error", () => {
    const r = resolveLeadLinksFromData(clients, projects, "c-999", "p-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/cliente/i);
  });

  it("strings vacíos se tratan como ausencia de vínculo", () => {
    const r = resolveLeadLinksFromData(clients, projects, "", "");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.clientId).toBeNull();
      expect(r.projectId).toBeNull();
    }
  });
});

// ─── Slice 29 (extensión): updateLead con validación cruzada ──────────────────

/**
 * Helper para construir una Response JSON al estilo de Supabase PostgREST.
 */
function makeJsonResponse<T>(data: T, status = 200): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" }
    })
  );
}

const TENANT_ID = "00000000-0000-0000-0000-0000000000t1";
const CLIENT_A_ID = "00000000-0000-0000-0000-0000000000c1";
const CLIENT_B_ID = "00000000-0000-0000-0000-0000000000c2";
const PROJECT_IN_A = "00000000-0000-0000-0000-0000000000p1";
const PROJECT_IN_B = "00000000-0000-0000-0000-0000000000p2";
const LEAD_ID = "00000000-0000-0000-0000-0000000000l1";

function makeLeadRow(overrides: Record<string, unknown> = {}) {
  return {
    id: LEAD_ID,
    tenant_id: TENANT_ID,
    client_id: null,
    project_id: null,
    name: "Lead original",
    source_channel: "directo",
    requested_service: "Servicio original",
    status: "nuevo",
    next_follow_up_at: null,
    created_at: "2026-06-13T10:00:00Z",
    updated_at: "2026-06-13T10:00:00Z",
    ...overrides
  };
}

describe("crm — updateLead (Supabase no configurado)", () => {
  it("retorna null sin intentar fetch cuando Supabase no está configurado", async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const { updateLead } = await import("./crm");
    const result = await updateLead(LEAD_ID, { name: "Nuevo nombre" });

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("crm — updateLead (con Supabase configurado)", () => {
  let fetchMock: MockInstance;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fake.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fake-anon-key");
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_TENANT", "vectoria");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key");
    fetchMock = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("actualiza name, sourceChannel y requestedService sin tocar vínculos", async () => {
    const { updateLead } = await import("./crm");

    const existing = makeLeadRow({ client_id: CLIENT_A_ID, project_id: PROJECT_IN_A });
    const updated = makeLeadRow({
      name: "Lead renombrado",
      source_channel: "instagram",
      requested_service: "Lanzamiento Q3",
      client_id: CLIENT_A_ID,
      project_id: PROJECT_IN_A,
      updated_at: "2026-06-13T11:00:00Z"
    });

    fetchMock
      .mockReturnValueOnce(makeJsonResponse([existing])) // GET lead actual
      .mockReturnValueOnce(makeJsonResponse([updated])); // PATCH response

    const result = await updateLead(LEAD_ID, {
      name: "  Lead renombrado  ",
      sourceChannel: "instagram",
      requestedService: "Lanzamiento Q3"
    });

    expect(result).not.toBeNull();
    expect(result?.name).toBe("Lead renombrado");
    expect(result?.sourceChannel).toBe("instagram");
    expect(result?.requestedService).toBe("Lanzamiento Q3");
    expect(result?.clientId).toBe(CLIENT_A_ID);
    expect(result?.projectId).toBe(PROJECT_IN_A);

    // Sólo 2 llamadas: GET lead actual + PATCH (sin fetch de clients/projects).
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Verificar que el PATCH NO incluye client_id ni project_id.
    const patchCall = fetchMock.mock.calls[1];
    expect(patchCall[0]).toContain(`/rest/v1/leads?id=eq.${LEAD_ID}`);
    const init = patchCall[1] as RequestInit;
    expect(init.method).toBe("PATCH");
    const body = JSON.parse(init.body as string);
    expect(body.name).toBe("Lead renombrado");
    expect(body.source_channel).toBe("instagram");
    expect(body.requested_service).toBe("Lanzamiento Q3");
    expect(body.updated_at).toBeTruthy();
    expect(body).not.toHaveProperty("client_id");
    expect(body).not.toHaveProperty("project_id");
  });

  it("actualiza clientId y projectId con validación cruzada correcta", async () => {
    const { updateLead } = await import("./crm");

    const existing = makeLeadRow({ client_id: null, project_id: null });
    const updated = makeLeadRow({
      client_id: CLIENT_B_ID,
      project_id: PROJECT_IN_B,
      updated_at: "2026-06-13T11:00:00Z"
    });

    fetchMock
      .mockReturnValueOnce(makeJsonResponse([existing])) // GET lead actual
      .mockReturnValueOnce(makeJsonResponse([{ id: CLIENT_A_ID, name: "Acme", status: "active" }, { id: CLIENT_B_ID, name: "Vectoria", status: "active" }])) // GET clients
      .mockReturnValueOnce(makeJsonResponse([{ id: PROJECT_IN_A, client_id: CLIENT_A_ID, name: "P-A", status: "active" }, { id: PROJECT_IN_B, client_id: CLIENT_B_ID, name: "P-B", status: "active" }])) // GET projects
      .mockReturnValueOnce(makeJsonResponse([updated])); // PATCH response

    const result = await updateLead(LEAD_ID, {
      clientId: CLIENT_B_ID,
      projectId: PROJECT_IN_B
    });

    expect(result).not.toBeNull();
    expect(result?.clientId).toBe(CLIENT_B_ID);
    expect(result?.projectId).toBe(PROJECT_IN_B);

    expect(fetchMock).toHaveBeenCalledTimes(4);

    // Verificar payload del PATCH incluye client_id y project_id.
    const patchCall = fetchMock.mock.calls[3];
    const init = patchCall[1] as RequestInit;
    expect(init.method).toBe("PATCH");
    const body = JSON.parse(init.body as string);
    expect(body.client_id).toBe(CLIENT_B_ID);
    expect(body.project_id).toBe(PROJECT_IN_B);
    expect(body.updated_at).toBeTruthy();
  });

  it("lanza error al intentar asignar un projectId que no pertenece al clientId indicado", async () => {
    const { updateLead } = await import("./crm");

    const existing = makeLeadRow({ client_id: null, project_id: null });

    fetchMock
      .mockReturnValueOnce(makeJsonResponse([existing]))
      .mockReturnValueOnce(makeJsonResponse([{ id: CLIENT_A_ID, name: "Acme", status: "active" }, { id: CLIENT_B_ID, name: "Vectoria", status: "active" }]))
      .mockReturnValueOnce(makeJsonResponse([{ id: PROJECT_IN_A, client_id: CLIENT_A_ID, name: "P-A", status: "active" }, { id: PROJECT_IN_B, client_id: CLIENT_B_ID, name: "P-B", status: "active" }]));

    // PROJECT_IN_B pertenece a CLIENT_B, no a CLIENT_A.
    await expect(
      updateLead(LEAD_ID, { clientId: CLIENT_A_ID, projectId: PROJECT_IN_B })
    ).rejects.toThrow(/no pertenece/i);

    // No debe haberse ejecutado el PATCH.
    const calls = fetchMock.mock.calls;
    const patchCall = calls.find((c) => (c[1] as RequestInit)?.method === "PATCH");
    expect(patchCall).toBeUndefined();
  });

  it("lanza error al intentar asignar un clientId inexistente", async () => {
    const { updateLead } = await import("./crm");

    const existing = makeLeadRow({ client_id: null, project_id: null });

    fetchMock
      .mockReturnValueOnce(makeJsonResponse([existing]))
      .mockReturnValueOnce(makeJsonResponse([{ id: CLIENT_A_ID, name: "Acme", status: "active" }])) // sin CLIENT_B_ID
      .mockReturnValueOnce(makeJsonResponse([{ id: PROJECT_IN_B, client_id: CLIENT_B_ID, name: "P-B", status: "active" }]));

    await expect(
      updateLead(LEAD_ID, { clientId: "00000000-0000-0000-0000-deadbeef0000" })
    ).rejects.toThrow(/cliente/i);

    const calls = fetchMock.mock.calls;
    const patchCall = calls.find((c) => (c[1] as RequestInit)?.method === "PATCH");
    expect(patchCall).toBeUndefined();
  });

  it("conserva el clientId actual cuando input.clientId llega como null (no perder vínculos)", async () => {
    const { updateLead } = await import("./crm");

    const existing = makeLeadRow({ client_id: CLIENT_A_ID, project_id: PROJECT_IN_A });
    const updated = makeLeadRow({
      name: "Renombrado",
      client_id: CLIENT_A_ID,
      project_id: PROJECT_IN_A,
      updated_at: "2026-06-13T11:00:00Z"
    });

    // touchesClientId=true → se revalida la combinación efectiva
    // (CLIENT_A_ID, PROJECT_IN_A) que sigue siendo válida.
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([existing])) // GET lead actual
      .mockReturnValueOnce(makeJsonResponse([{ id: CLIENT_A_ID, name: "Acme", status: "active" }])) // GET clients
      .mockReturnValueOnce(makeJsonResponse([{ id: PROJECT_IN_A, client_id: CLIENT_A_ID, name: "P-A", status: "active" }])) // GET projects
      .mockReturnValueOnce(makeJsonResponse([updated])); // PATCH response

    const result = await updateLead(LEAD_ID, { clientId: null, name: "Renombrado" });

    expect(result).not.toBeNull();
    expect(result?.name).toBe("Renombrado");
    expect(result?.clientId).toBe(CLIENT_A_ID);
    expect(result?.projectId).toBe(PROJECT_IN_A);

    // El PATCH debe incluir client_id=CLIENT_A_ID (el actual, no null)
    // porque touchesClientId es true.
    const patchCall = fetchMock.mock.calls[3];
    const body = JSON.parse((patchCall[1] as RequestInit).body as string);
    expect(body.client_id).toBe(CLIENT_A_ID);
    expect(body.project_id).toBe(PROJECT_IN_A);
  });

  it("devuelve null cuando el lead no existe", async () => {
    const { updateLead } = await import("./crm");

    fetchMock.mockReturnValueOnce(makeJsonResponse([])); // GET lead actual → vacío

    const result = await updateLead("00000000-0000-0000-0000-000000000fff", {
      name: "X"
    });

    expect(result).toBeNull();
    // Sólo se hizo la consulta inicial; no se intentó PATCH.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("no aplica restricción de unicidad sobre el nombre (el schema no la define)", async () => {
    // La tabla `leads` no tiene UNIQUE(name, tenant_id) en la migración actual
    // (ver context/SPECs/SPEC_ARCH-20260505-26). updateLead por tanto NO rechaza
    // updates de nombre por colisión con otros leads. Este test documenta la
    // decisión para que un cambio futuro al schema sea consciente de ella.
    const { updateLead } = await import("./crm");

    const existing = makeLeadRow();
    const updated = makeLeadRow({ name: "Nombre duplicado", updated_at: "2026-06-13T11:00:00Z" });

    fetchMock
      .mockReturnValueOnce(makeJsonResponse([existing]))
      .mockReturnValueOnce(makeJsonResponse([updated]));

    const result = await updateLead(LEAD_ID, { name: "Nombre duplicado" });
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Nombre duplicado");
  });
});
