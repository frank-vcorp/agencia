/**
 * IMPL-20260506-30
 * IMPL-20260506-31
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-31_handoffs_remotos_endurecidos_por_entidad_v1.md
 */
import { describe, expect, it } from "vitest";

import {
  buildAssetHandoff,
  buildBriefHandoff,
  buildLeadHandoff,
  buildQuotationHandoff,
  buildBriefExternalContract,
  buildLeadExternalContract,
  buildQuotationExternalContract,
  buildAssetExternalContract,
  buildExternalContracts,
  buildTenantRemoteContext,
  buildTenantOperativeSummary,
  deriveAssetSummary,
  deriveBriefSummary,
  deriveLeadSummary,
  deriveQuotationSummary,
  resolveEntityNextAction,
  selectRepresentativeLead,
  type AgentContextSnapshot,
  type AgentRemoteHandoffs,
  type BriefAgentSummary,
  type QuotationAgentSummary,
  type TenantRemoteContext,
  type TenantOperativeSummary
} from "./agent-context";
import { type AssetsDashboardSummary, type BriefDashboardSummary, type NextAction, type QuotationDashboardSummary } from "./dashboard";
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

// ─── IMPL-20260506-31: handoffs remotos por entidad ──────────────────────────

const SNAPSHOT_AT = "2026-05-06T12:00:00.000Z";
const TENANT_SLUG = "vectoria";

const nextActionBriefs: NextAction = {
  label: "Consolidar el brief",
  href: "/briefs",
  reason: "El brief está en borrador."
};

const nextActionCotizaciones: NextAction = {
  label: "Enviar cotización",
  href: "/cotizaciones",
  reason: "La cotización sigue en borrador."
};

const nextActionActivos: NextAction = {
  label: "Revisar foco operativo",
  href: "/activos",
  reason: "5 activos en el proyecto."
};

// ─── resolveEntityNextAction ──────────────────────────────────────────────────

describe("agent-context — resolveEntityNextAction", () => {
  it("devuelve la nextAction cuando el href coincide exactamente", () => {
    const result = resolveEntityNextAction(nextActionBriefs, "/briefs");
    expect(result).toBe(nextActionBriefs);
  });

  it("devuelve null cuando el href no coincide", () => {
    const result = resolveEntityNextAction(nextActionBriefs, "/cotizaciones");
    expect(result).toBeNull();
  });

  it("devuelve null para /activos cuando la nextAction apunta a /briefs", () => {
    const result = resolveEntityNextAction(nextActionBriefs, "/activos");
    expect(result).toBeNull();
  });
});

// ─── buildBriefHandoff ────────────────────────────────────────────────────────

describe("agent-context — buildBriefHandoff", () => {
  const briefSummary = deriveBriefSummary(briefConsolidado);

  it("construye el handoff con todos los campos obligatorios", () => {
    const handoff = buildBriefHandoff(briefSummary, SNAPSHOT_AT, TENANT_SLUG, nextActionBriefs);

    expect(handoff.entityType).toBe("brief");
    expect(handoff.source).toBe("briefing/getBriefWorkspace");
    expect(handoff.snapshotAt).toBe(SNAPSHOT_AT);
    expect(handoff.tenantSlug).toBe(TENANT_SLUG);
    expect(handoff.payload).toBe(briefSummary);
    expect(handoff.nextAction).toBe(nextActionBriefs);
  });

  it("acepta nextAction null cuando no aplica", () => {
    const handoff = buildBriefHandoff(briefSummary, SNAPSHOT_AT, null, null);

    expect(handoff.nextAction).toBeNull();
    expect(handoff.tenantSlug).toBeNull();
  });
});

// ─── buildLeadHandoff ─────────────────────────────────────────────────────────

describe("agent-context — buildLeadHandoff", () => {
  const leadSummary = deriveLeadSummary(makeLead("en_seguimiento", { name: "Tech SA" }));

  it("construye el handoff con entityType lead", () => {
    const handoff = buildLeadHandoff(leadSummary, SNAPSHOT_AT, TENANT_SLUG);

    expect(handoff.entityType).toBe("lead");
    expect(handoff.source).toBe("crm/getLeadsForDefaultTenant");
    expect(handoff.snapshotAt).toBe(SNAPSHOT_AT);
    expect(handoff.tenantSlug).toBe(TENANT_SLUG);
    expect(handoff.payload).toBe(leadSummary);
  });

  it("nextAction es siempre null para lead", () => {
    const handoff = buildLeadHandoff(leadSummary, SNAPSHOT_AT, TENANT_SLUG);
    expect(handoff.nextAction).toBeNull();
  });
});

// ─── buildQuotationHandoff ────────────────────────────────────────────────────

describe("agent-context — buildQuotationHandoff", () => {
  const quotationSummary = deriveQuotationSummary(cotizacionEnviada);

  it("construye el handoff con entityType quotation", () => {
    const handoff = buildQuotationHandoff(quotationSummary, SNAPSHOT_AT, TENANT_SLUG, nextActionCotizaciones);

    expect(handoff.entityType).toBe("quotation");
    expect(handoff.source).toBe("quotations/getQuotationWorkspace");
    expect(handoff.snapshotAt).toBe(SNAPSHOT_AT);
    expect(handoff.payload).toBe(quotationSummary);
    expect(handoff.nextAction).toBe(nextActionCotizaciones);
  });

  it("acepta nextAction null cuando no aplica", () => {
    const handoff = buildQuotationHandoff(quotationSummary, SNAPSHOT_AT, null, null);
    expect(handoff.nextAction).toBeNull();
  });
});

// ─── buildAssetHandoff ────────────────────────────────────────────────────────

describe("agent-context — buildAssetHandoff", () => {
  const assetSummary = deriveAssetSummary(activosConDatos);

  it("construye el handoff con entityType asset", () => {
    const handoff = buildAssetHandoff(assetSummary, SNAPSHOT_AT, TENANT_SLUG, nextActionActivos);

    expect(handoff.entityType).toBe("asset");
    expect(handoff.source).toBe("assets/getAssetsForDefaultTenant");
    expect(handoff.snapshotAt).toBe(SNAPSHOT_AT);
    expect(handoff.payload).toBe(assetSummary);
    expect(handoff.nextAction).toBe(nextActionActivos);
  });

  it("acepta nextAction null cuando no aplica", () => {
    const handoff = buildAssetHandoff(assetSummary, SNAPSHOT_AT, TENANT_SLUG, null);
    expect(handoff.nextAction).toBeNull();
  });
});

// ─── AgentRemoteHandoffs — integridad de campos ───────────────────────────────

describe("agent-context — integridad de handoffs por entidad", () => {
  it("cada handoff conserva trazabilidad snapshotAt y tenantSlug", () => {
    const briefs = buildBriefHandoff(deriveBriefSummary(briefConsolidado), SNAPSHOT_AT, TENANT_SLUG, null);
    const lead = buildLeadHandoff(deriveLeadSummary(makeLead("nuevo")), SNAPSHOT_AT, TENANT_SLUG);
    const quot = buildQuotationHandoff(deriveQuotationSummary(cotizacionEnviada), SNAPSHOT_AT, TENANT_SLUG, null);
    const asset = buildAssetHandoff(deriveAssetSummary(activosConDatos), SNAPSHOT_AT, TENANT_SLUG, null);

    for (const handoff of [briefs, lead, quot, asset]) {
      expect(handoff.snapshotAt).toBe(SNAPSHOT_AT);
      expect(handoff.tenantSlug).toBe(TENANT_SLUG);
      expect(handoff.entityType).toBeTruthy();
      expect(handoff.source).toBeTruthy();
    }
  });

  it("resolveEntityNextAction distribuye la nextAction solo a la entidad correspondiente", () => {
    const nextAction = nextActionBriefs; // apunta a /briefs
    expect(resolveEntityNextAction(nextAction, "/briefs")).not.toBeNull();
    expect(resolveEntityNextAction(nextAction, "/cotizaciones")).toBeNull();
    expect(resolveEntityNextAction(nextAction, "/activos")).toBeNull();
  });
});

// ─── IMPL-20260506-32: contratos externos mínimos ────────────────────────────

describe("agent-context — buildBriefExternalContract", () => {
  const briefSummary = deriveBriefSummary(briefConsolidado);
  const handoff = buildBriefHandoff(briefSummary, SNAPSHOT_AT, TENANT_SLUG, null);

  it("construye el contrato con todos los campos obligatorios", () => {
    const contract = buildBriefExternalContract(handoff);

    expect(contract.entityType).toBe("brief");
    expect(contract.contractVersion).toBe("1.0");
    expect(contract.tenantSlug).toBe(TENANT_SLUG);
    expect(contract.generatedAt).toBe(SNAPSHOT_AT);
    expect(contract.handoffRef).toBe(`brief@${SNAPSHOT_AT}`);
    expect(contract.source).toBe("briefing/getBriefWorkspace");
  });

  it("el payload contiene solo los campos mínimos del brief", () => {
    const contract = buildBriefExternalContract(handoff);

    expect(contract.payload.id).toBe("brief-1");
    expect(contract.payload.statusLabel).toBe("Consolidado");
    expect(contract.payload.isConsolidated).toBe(true);
    expect(contract.payload.updatedAt).toBe("2026-05-05T10:00:00Z");
  });

  it("acepta tenantSlug null", () => {
    const handoffSinTenant = buildBriefHandoff(briefSummary, SNAPSHOT_AT, null, null);
    const contract = buildBriefExternalContract(handoffSinTenant);

    expect(contract.tenantSlug).toBeNull();
  });
});

describe("agent-context — buildLeadExternalContract", () => {
  const leadSummary = deriveLeadSummary(makeLead("en_seguimiento", { name: "Tech SA" }));
  const handoff = buildLeadHandoff(leadSummary, SNAPSHOT_AT, TENANT_SLUG);

  it("construye el contrato con todos los campos obligatorios", () => {
    const contract = buildLeadExternalContract(handoff);

    expect(contract.entityType).toBe("lead");
    expect(contract.contractVersion).toBe("1.0");
    expect(contract.tenantSlug).toBe(TENANT_SLUG);
    expect(contract.generatedAt).toBe(SNAPSHOT_AT);
    expect(contract.handoffRef).toBe(`lead@${SNAPSHOT_AT}`);
    expect(contract.source).toBe("crm/getLeadsForDefaultTenant");
  });

  it("el payload contiene solo los campos mínimos del lead", () => {
    const contract = buildLeadExternalContract(handoff);

    expect(contract.payload.id).toBe("lead-en_seguimiento");
    expect(contract.payload.statusLabel).toBe("En seguimiento");
    expect(contract.payload.isActive).toBe(true);
    expect(contract.payload.updatedAt).toBe("2026-05-05T10:00:00Z");
  });

  it("isActive false para lead cerrado", () => {
    const leadCerrado = deriveLeadSummary(makeLead("cerrado_perdido"));
    const handoffCerrado = buildLeadHandoff(leadCerrado, SNAPSHOT_AT, TENANT_SLUG);
    const contract = buildLeadExternalContract(handoffCerrado);

    expect(contract.payload.isActive).toBe(false);
  });
});

describe("agent-context — buildQuotationExternalContract", () => {
  const quotationSummary = deriveQuotationSummary(cotizacionEnviada);
  const handoff = buildQuotationHandoff(quotationSummary, SNAPSHOT_AT, TENANT_SLUG, null);

  it("construye el contrato con todos los campos obligatorios", () => {
    const contract = buildQuotationExternalContract(handoff);

    expect(contract.entityType).toBe("quotation");
    expect(contract.contractVersion).toBe("1.0");
    expect(contract.tenantSlug).toBe(TENANT_SLUG);
    expect(contract.generatedAt).toBe(SNAPSHOT_AT);
    expect(contract.handoffRef).toBe(`quotation@${SNAPSHOT_AT}`);
    expect(contract.source).toBe("quotations/getQuotationWorkspace");
  });

  it("el payload contiene solo los campos mínimos de la cotización", () => {
    const contract = buildQuotationExternalContract(handoff);

    expect(contract.payload.id).toBe("quot-1");
    expect(contract.payload.statusLabel).toBe("Enviada");
    expect(contract.payload.isActive).toBe(true);
    expect(contract.payload.totalEstimado).toBe("$8,000 MXN");
  });

  it("conserva totalEstimado null cuando no aplica", () => {
    const quotSinTotal = deriveQuotationSummary({ ...cotizacionEnviada, totalEstimado: null });
    const handoffSinTotal = buildQuotationHandoff(quotSinTotal, SNAPSHOT_AT, TENANT_SLUG, null);
    const contract = buildQuotationExternalContract(handoffSinTotal);

    expect(contract.payload.totalEstimado).toBeNull();
  });
});

describe("agent-context — buildAssetExternalContract", () => {
  const assetSummary = deriveAssetSummary(activosConDatos);
  const handoff = buildAssetHandoff(assetSummary, SNAPSHOT_AT, TENANT_SLUG, null);

  it("construye el contrato con todos los campos obligatorios", () => {
    const contract = buildAssetExternalContract(handoff);

    expect(contract.entityType).toBe("asset");
    expect(contract.contractVersion).toBe("1.0");
    expect(contract.tenantSlug).toBe(TENANT_SLUG);
    expect(contract.generatedAt).toBe(SNAPSHOT_AT);
    expect(contract.handoffRef).toBe(`asset@${SNAPSHOT_AT}`);
    expect(contract.source).toBe("assets/getAssetsForDefaultTenant");
  });

  it("el payload contiene solo los campos mínimos de activos", () => {
    const contract = buildAssetExternalContract(handoff);

    expect(contract.payload.total).toBe(5);
    expect(contract.payload.delivered).toBe(1);
    expect(contract.payload.hasDelivered).toBe(true);
  });

  it("no expone inProgress ni inReview en el payload externo", () => {
    const contract = buildAssetExternalContract(handoff);
    // El contrato externo es más pequeño que el handoff
    expect(Object.keys(contract.payload)).toEqual(["total", "delivered", "hasDelivered"]);
  });
});

describe("agent-context — buildExternalContracts (colección)", () => {
  const briefSummary = deriveBriefSummary(briefConsolidado);
  const leadSummary = deriveLeadSummary(makeLead("nuevo"));
  const quotSummary = deriveQuotationSummary(cotizacionEnviada);
  const assetSummary = deriveAssetSummary(activosConDatos);

  const handoffs: AgentRemoteHandoffs = {
    brief: buildBriefHandoff(briefSummary, SNAPSHOT_AT, TENANT_SLUG, null),
    lead: buildLeadHandoff(leadSummary, SNAPSHOT_AT, TENANT_SLUG),
    quotation: buildQuotationHandoff(quotSummary, SNAPSHOT_AT, TENANT_SLUG, null),
    asset: buildAssetHandoff(assetSummary, SNAPSHOT_AT, TENANT_SLUG, null)
  };

  it("deriva todos los contratos cuando los handoffs están presentes", () => {
    const contracts = buildExternalContracts(handoffs);

    expect(contracts.brief?.entityType).toBe("brief");
    expect(contracts.lead?.entityType).toBe("lead");
    expect(contracts.quotation?.entityType).toBe("quotation");
    expect(contracts.asset?.entityType).toBe("asset");
  });

  it("retorna null para entidades ausentes en el handoffs", () => {
    const handoffsParciales: AgentRemoteHandoffs = {
      brief: null,
      lead: handoffs.lead,
      quotation: null,
      asset: null
    };
    const contracts = buildExternalContracts(handoffsParciales);

    expect(contracts.brief).toBeNull();
    expect(contracts.lead).not.toBeNull();
    expect(contracts.quotation).toBeNull();
    expect(contracts.asset).toBeNull();
  });

  it("todos los contratos comparten el mismo generatedAt del snapshot", () => {
    const contracts = buildExternalContracts(handoffs);

    expect(contracts.brief?.generatedAt).toBe(SNAPSHOT_AT);
    expect(contracts.lead?.generatedAt).toBe(SNAPSHOT_AT);
    expect(contracts.quotation?.generatedAt).toBe(SNAPSHOT_AT);
    expect(contracts.asset?.generatedAt).toBe(SNAPSHOT_AT);
  });

  it("handoffRef es trazable al entityType y snapshotAt de origen", () => {
    const contracts = buildExternalContracts(handoffs);

    expect(contracts.brief?.handoffRef).toBe(`brief@${SNAPSHOT_AT}`);
    expect(contracts.lead?.handoffRef).toBe(`lead@${SNAPSHOT_AT}`);
    expect(contracts.quotation?.handoffRef).toBe(`quotation@${SNAPSHOT_AT}`);
    expect(contracts.asset?.handoffRef).toBe(`asset@${SNAPSHOT_AT}`);
  });
});

// ─── IMPL-20260506-34: buildTenantRemoteContext ───────────────────────────────

/**
 * Fixture de AgentContextSnapshot completo para tests de buildTenantRemoteContext.
 * Construido desde los builders existentes para mantener coherencia de datos.
 */
function makeFullSnapshot(overrides?: { tenantSlug?: string | null }): AgentContextSnapshot {
  const briefSummary = deriveBriefSummary(briefConsolidado);
  const leadSummary = deriveLeadSummary(makeLead("en_seguimiento", { name: "Tech SA" }));
  const quotationSummary = deriveQuotationSummary(cotizacionEnviada);
  const assetSummary = deriveAssetSummary(activosConDatos);
  const slug = overrides?.tenantSlug !== undefined ? overrides.tenantSlug : TENANT_SLUG;

  const handoffsFixture: AgentRemoteHandoffs = {
    brief: buildBriefHandoff(briefSummary, SNAPSHOT_AT, slug, null),
    lead: buildLeadHandoff(leadSummary, SNAPSHOT_AT, slug),
    quotation: buildQuotationHandoff(quotationSummary, SNAPSHOT_AT, slug, null),
    asset: buildAssetHandoff(assetSummary, SNAPSHOT_AT, slug, null),
  };

  return {
    snapshotAt: SNAPSHOT_AT,
    tenantSlug: slug,
    lead: leadSummary,
    brief: briefSummary,
    quotation: quotationSummary,
    assets: assetSummary,
    crm: { source: "crm/buildCrmMetrics", totalLeads: 1, activeLeads: 1, label: "1 lead activo" },
    nextAction: nextActionBriefs,
    handoffs: handoffsFixture,
    externalContracts: buildExternalContracts(handoffsFixture),
  };
}

describe("agent-context — buildTenantRemoteContext", () => {
  it("propaga tenantSlug del snapshot como eje primario", () => {
    const ctx = buildTenantRemoteContext(makeFullSnapshot());
    expect(ctx.tenantSlug).toBe(TENANT_SLUG);
  });

  it("propaga generatedAt desde snapshotAt", () => {
    const ctx = buildTenantRemoteContext(makeFullSnapshot());
    expect(ctx.generatedAt).toBe(SNAPSHOT_AT);
  });

  it("lista las cuatro entidades disponibles cuando el snapshot es completo", () => {
    const ctx = buildTenantRemoteContext(makeFullSnapshot());
    expect(ctx.availableEntities).toEqual(["brief", "lead", "quotation", "asset"]);
  });

  it("traceMap tiene una entrada por entidad activa", () => {
    const ctx = buildTenantRemoteContext(makeFullSnapshot());
    expect(ctx.traceMap).toHaveLength(4);
  });

  it("cada entrada del traceMap incluye tenant, entity, handoffRef, source y contractVersion", () => {
    const ctx = buildTenantRemoteContext(makeFullSnapshot());
    for (const entry of ctx.traceMap) {
      expect(entry.tenant).toBe(TENANT_SLUG);
      expect(entry.entity).toBeTruthy();
      expect(entry.handoffRef).toMatch(/^(brief|lead|quotation|asset)@/);
      expect(entry.source).toBeTruthy();
      expect(entry.contractVersion).toBe("1.0");
    }
  });

  it("el handoffRef de cada entrada coincide con el entityType y snapshotAt", () => {
    const ctx = buildTenantRemoteContext(makeFullSnapshot());
    const refMap = Object.fromEntries(ctx.traceMap.map((e) => [e.entity, e.handoffRef]));

    expect(refMap["brief"]).toBe(`brief@${SNAPSHOT_AT}`);
    expect(refMap["lead"]).toBe(`lead@${SNAPSHOT_AT}`);
    expect(refMap["quotation"]).toBe(`quotation@${SNAPSHOT_AT}`);
    expect(refMap["asset"]).toBe(`asset@${SNAPSHOT_AT}`);
  });

  it("availableEntities está vacía cuando todos los contratos son null", () => {
    const snapshot = makeFullSnapshot();
    snapshot.externalContracts = { brief: null, lead: null, quotation: null, asset: null };
    const ctx = buildTenantRemoteContext(snapshot);

    expect(ctx.availableEntities).toEqual([]);
    expect(ctx.traceMap).toHaveLength(0);
  });

  it("solo lista entidades con contrato presente (snapshot parcial)", () => {
    const snapshot = makeFullSnapshot();
    snapshot.externalContracts = {
      ...snapshot.externalContracts,
      quotation: null,
      asset: null,
    };
    const ctx = buildTenantRemoteContext(snapshot);

    expect(ctx.availableEntities).toEqual(["brief", "lead"]);
    expect(ctx.traceMap).toHaveLength(2);
  });

  it("acepta tenantSlug null y lo propaga en tenantSlug y traceMap", () => {
    const ctx = buildTenantRemoteContext(makeFullSnapshot({ tenantSlug: null }));

    expect(ctx.tenantSlug).toBeNull();
    for (const entry of ctx.traceMap) {
      expect(entry.tenant).toBeNull();
    }
  });
});

// ─── IMPL-20260506-36: buildTenantOperativeSummary ───────────────────────────

/**
 * Tests de la capa de estadísticas resumidas derivadas del snapshot.
 * IMPL-20260506-36
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-35_estadisticas_resumidas_datos_reales_v1.md
 */
describe("agent-context — buildTenantOperativeSummary", () => {
  it("tiene source literal correcto", () => {
    const summary = buildTenantOperativeSummary(makeFullSnapshot());
    expect(summary.source).toBe("agent-context/buildTenantOperativeSummary");
  });

  it("propaga snapshotAt y tenantSlug del snapshot", () => {
    const summary = buildTenantOperativeSummary(makeFullSnapshot());
    expect(summary.snapshotAt).toBe(SNAPSHOT_AT);
    expect(summary.tenantSlug).toBe(TENANT_SLUG);
  });

  it("propaga métricas CRM desde crm del snapshot", () => {
    const summary = buildTenantOperativeSummary(makeFullSnapshot());
    expect(summary.totalLeads).toBe(1);
    expect(summary.activeLeads).toBe(1);
  });

  it("propaga estado y consolidación del brief", () => {
    const summary = buildTenantOperativeSummary(makeFullSnapshot());
    expect(summary.briefStatus).toBe("Consolidado");
    expect(summary.briefIsConsolidated).toBe(true);
  });

  it("propaga estado y total de la cotización", () => {
    const summary = buildTenantOperativeSummary(makeFullSnapshot());
    expect(summary.quotationStatus).toBe("Enviada");
    expect(summary.quotationTotal).toBe("$8,000 MXN");
  });

  it("propaga totales de activos", () => {
    const summary = buildTenantOperativeSummary(makeFullSnapshot());
    expect(summary.totalAssets).toBe(5);
    expect(summary.deliveredAssets).toBe(1);
  });

  it("propaga nextAction desde el snapshot", () => {
    const summary = buildTenantOperativeSummary(makeFullSnapshot());
    expect(summary.nextActionLabel).toBe(nextActionBriefs.label);
    expect(summary.nextActionHref).toBe("/briefs");
  });

  it("lista las cuatro entidades activas en snapshot completo", () => {
    const summary = buildTenantOperativeSummary(makeFullSnapshot());
    expect(summary.activeEntities).toEqual(["brief", "lead", "quotation", "assets"]);
  });

  it("retorna null en briefStatus cuando no hay brief", () => {
    const snapshot = makeFullSnapshot();
    snapshot.brief = null;
    const summary = buildTenantOperativeSummary(snapshot);
    expect(summary.briefStatus).toBeNull();
    expect(summary.briefIsConsolidated).toBeNull();
    expect(summary.activeEntities).not.toContain("brief");
  });

  it("retorna ceros en totalAssets cuando no hay activos", () => {
    const snapshot = makeFullSnapshot();
    snapshot.assets = null;
    const summary = buildTenantOperativeSummary(snapshot);
    expect(summary.totalAssets).toBe(0);
    expect(summary.deliveredAssets).toBe(0);
    expect(summary.activeEntities).not.toContain("assets");
  });

  it("acepta tenantSlug null y lo propaga", () => {
    const summary = buildTenantOperativeSummary(makeFullSnapshot({ tenantSlug: null }));
    expect(summary.tenantSlug).toBeNull();
  });

  it("activeEntities vacío cuando snapshot no tiene entidades", () => {
    const snapshot = makeFullSnapshot();
    snapshot.brief = null;
    snapshot.lead = null;
    snapshot.quotation = null;
    snapshot.assets = null;
    const summary = buildTenantOperativeSummary(snapshot);
    expect(summary.activeEntities).toEqual([]);
  });
});

