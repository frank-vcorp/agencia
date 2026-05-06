/**
 * IMPL-20260506-30
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-30_conocimiento_derivado_agentes_v1.md
 */
import { describe, expect, it } from "vitest";

import {
  deriveAssetSummary,
  deriveBriefSummary,
  deriveLeadSummary,
  deriveQuotationSummary,
  selectRepresentativeLead,
  type AgentContextSnapshot,
  type BriefAgentSummary,
  type QuotationAgentSummary
} from "./agent-context";
import { type AssetsDashboardSummary, type BriefDashboardSummary, type QuotationDashboardSummary } from "./dashboard";
import { type Lead } from "./crm";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeLead(status: Lead["status"], overrides?: Partial<Lead>): Lead {
  return {
    id: `lead-${status}`,
    tenantId: "tenant-1",
    clientId: null,
    projectId: null,
    name: "Acme Corp",
    sourceChannel: "instagram",
    requestedService: "Campaña de captación",
    status,
    nextFollowUpAt: null,
    createdAt: "2026-05-01T10:00:00Z",
    updatedAt: "2026-05-05T10:00:00Z",
    ...overrides
  };
}

const briefConsolidado: BriefDashboardSummary = {
  id: "brief-1",
  status: "approved_locked",
  statusLabel: "Consolidado",
  isConsolidated: true,
  projectObjective: "Lanzar campaña de captación",
  updatedAt: "2026-05-05T10:00:00Z"
};

const briefDraft: BriefDashboardSummary = {
  id: "brief-2",
  status: "stage_1_discovery",
  statusLabel: "Descubrimiento",
  isConsolidated: false,
  projectObjective: "",
  updatedAt: "2026-05-04T09:00:00Z"
};

const cotizacionEnviada: QuotationDashboardSummary = {
  id: "quot-1",
  status: "sent",
  statusLabel: "Enviada",
  title: "Propuesta v1",
  totalEstimado: "$8,000 MXN",
  isActive: true
};

const activosConDatos: AssetsDashboardSummary = {
  total: 5,
  byStatus: { draft: 1, in_progress: 2, in_review: 1, delivered: 1 },
  hasDelivered: true,
  hasInProgress: true
};

// ─── selectRepresentativeLead ─────────────────────────────────────────────────

describe("agent-context — selectRepresentativeLead", () => {
  it("devuelve null para array vacío", () => {
    expect(selectRepresentativeLead([])).toBeNull();
  });

  it("prefiere un lead activo sobre uno cerrado", () => {
    const leads = [makeLead("cerrado_ganado"), makeLead("nuevo")];
    const result = selectRepresentativeLead(leads);
    expect(result?.status).toBe("nuevo");
  });

  it("devuelve el primero si no hay leads activos", () => {
    const leads = [makeLead("cerrado_perdido"), makeLead("cerrado_ganado")];
    const result = selectRepresentativeLead(leads);
    expect(result?.status).toBe("cerrado_perdido");
  });

  it("devuelve el único lead activo cuando solo hay uno", () => {
    const leads = [makeLead("en_seguimiento")];
    expect(selectRepresentativeLead(leads)?.status).toBe("en_seguimiento");
  });

  it("todos los estados activos son seleccionables", () => {
    const activos: Lead["status"][] = ["nuevo", "en_seguimiento", "propuesta_enviada"];
    for (const status of activos) {
      const lead = makeLead(status);
      expect(selectRepresentativeLead([lead])?.status).toBe(status);
    }
  });
});

// ─── deriveLeadSummary ────────────────────────────────────────────────────────

describe("agent-context — deriveLeadSummary", () => {
  it("mapea correctamente los campos del lead", () => {
    const lead = makeLead("en_seguimiento", { name: "Tech SA", requestedService: "Diseño web" });
    const summary = deriveLeadSummary(lead);

    expect(summary.source).toBe("crm/getLeadsForDefaultTenant");
    expect(summary.id).toBe("lead-en_seguimiento");
    expect(summary.name).toBe("Tech SA");
    expect(summary.status).toBe("en_seguimiento");
    expect(summary.statusLabel).toBe("En seguimiento");
    expect(summary.sourceChannelLabel).toBe("Instagram");
    expect(summary.requestedService).toBe("Diseño web");
    expect(summary.isActive).toBe(true);
  });

  it("marca como inactivo un lead cerrado", () => {
    const lead = makeLead("cerrado_ganado");
    const summary = deriveLeadSummary(lead);

    expect(summary.isActive).toBe(false);
    expect(summary.statusLabel).toBe("Cerrado ganado");
  });

  it("conserva nextFollowUpAt cuando está definido", () => {
    const lead = makeLead("nuevo", { nextFollowUpAt: "2026-05-10T09:00:00Z" });
    const summary = deriveLeadSummary(lead);

    expect(summary.nextFollowUpAt).toBe("2026-05-10T09:00:00Z");
  });
});

// ─── deriveBriefSummary ────────────────────────────────────────────────────────

describe("agent-context — deriveBriefSummary", () => {
  it("deriva correctamente un brief consolidado", () => {
    const summary = deriveBriefSummary(briefConsolidado);

    expect(summary.source).toBe("briefing/getBriefWorkspace");
    expect(summary.id).toBe("brief-1");
    expect(summary.isConsolidated).toBe(true);
    expect(summary.statusLabel).toBe("Consolidado");
    expect(summary.projectObjective).toBe("Lanzar campaña de captación");
  });

  it("deriva correctamente un brief en draft", () => {
    const summary = deriveBriefSummary(briefDraft);

    expect(summary.isConsolidated).toBe(false);
    expect(summary.statusLabel).toBe("Descubrimiento");
  });
});

// ─── deriveQuotationSummary ───────────────────────────────────────────────────

describe("agent-context — deriveQuotationSummary", () => {
  it("deriva correctamente una cotización enviada", () => {
    const summary = deriveQuotationSummary(cotizacionEnviada);

    expect(summary.source).toBe("quotations/getQuotationWorkspace");
    expect(summary.id).toBe("quot-1");
    expect(summary.statusLabel).toBe("Enviada");
    expect(summary.title).toBe("Propuesta v1");
    expect(summary.totalEstimado).toBe("$8,000 MXN");
    expect(summary.isActive).toBe(true);
  });
});

// ─── deriveAssetSummary ───────────────────────────────────────────────────────

describe("agent-context — deriveAssetSummary", () => {
  it("deriva correctamente los activos con datos", () => {
    const summary = deriveAssetSummary(activosConDatos);

    expect(summary.source).toBe("assets/getAssetsForDefaultTenant");
    expect(summary.total).toBe(5);
    expect(summary.inProgress).toBe(2);
    expect(summary.inReview).toBe(1);
    expect(summary.delivered).toBe(1);
    expect(summary.hasDelivered).toBe(true);
  });

  it("retorna ceros cuando no hay activos en un estado específico", () => {
    const sinActivos: AssetsDashboardSummary = {
      total: 2,
      byStatus: { draft: 2 },
      hasDelivered: false,
      hasInProgress: false
    };
    const summary = deriveAssetSummary(sinActivos);

    expect(summary.inProgress).toBe(0);
    expect(summary.inReview).toBe(0);
    expect(summary.delivered).toBe(0);
  });
});

// ─── Tipos — coherencia de source literal ─────────────────────────────────────

describe("agent-context — coherencia de campos source", () => {
  it("BriefAgentSummary.source es el literal correcto", () => {
    const s: BriefAgentSummary = deriveBriefSummary(briefConsolidado);
    expect(s.source).toBe("briefing/getBriefWorkspace");
  });

  it("QuotationAgentSummary.source es el literal correcto", () => {
    const s: QuotationAgentSummary = deriveQuotationSummary(cotizacionEnviada);
    expect(s.source).toBe("quotations/getQuotationWorkspace");
  });
});
