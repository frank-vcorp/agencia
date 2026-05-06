/**
 * IMPL-20260505-26
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-26_crm_ligero_operativo_y_seguimiento_minimo_v1.md
 * IMPL-20260505-27
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-27_vinculacion_explicita_lead_client_project_v1.md
 */
import { describe, expect, it } from "vitest";

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
