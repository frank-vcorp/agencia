/**
 * IMPL-20260612-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-01_operador_dashboard_acciones_crud_comentarios_agente_v1.md
 *
 * Tests unitarios para funciones puras del modulo operator-cabin.
 * Cubre: computePrimaryAction, groupProposalsByProject, filterCommentsByContext.
 */
import { describe, expect, it } from "vitest";

import {
  type PortfolioItem,
  computePrimaryAction,
  groupProposalsByProject,
  filterCommentsByContext
} from "./operator-radar";
import type {
  AgentProposal,
  OperatorComment
} from "./operator-comments";

// ─── Helpers para tests ──────────────────────────────────────────────────────

function makePortfolioItem(overrides: Partial<PortfolioItem> = {}): PortfolioItem {
  return {
    clientId: "client-1",
    clientName: "Cliente Demo",
    projectId: "project-1",
    projectName: "Proyecto Demo",
    projectStatus: "active",
    priorityScore: 10,
    priorityReason: "Razon demo",
    primaryAlert: "Alerta demo",
    suggestedAction: "Accion demo",
    suggestedModule: "briefs",
    lastMovementAt: "2026-06-10T00:00:00.000Z",
    idleHours: 12,
    riskLevel: "medium",
    sourceRefs: [],
    ...overrides
  };
}

function makeProposal(overrides: Partial<AgentProposal> = {}): AgentProposal {
  return {
    id: "prop-1",
    type: "create_asset",
    payload: {},
    status: "pending",
    receivedAt: "2026-06-12T00:00:00.000Z",
    agentId: "agent-1",
    projectId: "project-A",
    summary: "Resumen demo",
    ...overrides
  };
}

function makeComment(overrides: Partial<OperatorComment> = {}): OperatorComment {
  return {
    id: "comment-1",
    entityType: "project",
    entityId: "project-1",
    visibility: "internal",
    author: { type: "operator", userId: "u1", name: "Sofia" },
    body: "Cuerpo demo",
    mentions: [],
    createdAt: "2026-06-12T10:00:00.000Z",
    updatedAt: "2026-06-12T10:00:00.000Z",
    ...overrides
  };
}

// ─── computePrimaryAction ─────────────────────────────────────────────────────

describe("computePrimaryAction", () => {
  it("sin brief → 'Crear brief' variante primary", () => {
    const item = makePortfolioItem();
    const action = computePrimaryAction(item, {
      brief: null,
      quotation: null,
      asset: null,
      crm: { isNew: false, hasOpenLead: false }
    });
    expect(action.label).toBe("Crear brief");
    expect(action.variant).toBe("primary");
    expect(action.href).toContain("tab=briefs");
  });

  it("brief en draft → 'Editar Brief' variante primary", () => {
    const item = makePortfolioItem();
    const action = computePrimaryAction(item, {
      brief: { status: "draft" },
      quotation: null,
      asset: null,
      crm: { isNew: false, hasOpenLead: false }
    });
    expect(action.label).toBe("Editar Brief");
    expect(action.variant).toBe("primary");
    expect(action.href).toContain("tab=briefs");
  });

  it("brief consolidado sin cotizacion → 'Crear cotizacion'", () => {
    const item = makePortfolioItem();
    const action = computePrimaryAction(item, {
      brief: { status: "approved_locked" },
      quotation: null,
      asset: null,
      crm: { isNew: false, hasOpenLead: false }
    });
    expect(action.label).toBe("Crear cotización");
    expect(action.href).toContain("tab=cotizaciones");
  });

  it("cotizacion en draft → 'Editar Cotización' variante primary", () => {
    const item = makePortfolioItem();
    const action = computePrimaryAction(item, {
      brief: { status: "approved_locked" },
      quotation: { status: "draft" },
      asset: null,
      crm: { isNew: false, hasOpenLead: false }
    });
    expect(action.label).toBe("Editar Cotización");
    expect(action.variant).toBe("primary");
    expect(action.href).toContain("tab=cotizaciones");
  });

  it("cotizacion sent → 'Ver Respuesta Cliente' variante warning", () => {
    const item = makePortfolioItem();
    const action = computePrimaryAction(item, {
      brief: { status: "approved_locked" },
      quotation: { status: "sent" },
      asset: null,
      crm: { isNew: false, hasOpenLead: false }
    });
    expect(action.label).toBe("Ver Respuesta Cliente");
    expect(action.variant).toBe("warning");
    expect(action.href).toContain("tab=cotizaciones");
  });

  it("asset in_review → 'Aprobar/Devolver' variante warning", () => {
    const item = makePortfolioItem();
    const action = computePrimaryAction(item, {
      brief: { status: "approved_locked" },
      quotation: { status: "approved" },
      asset: { status: "in_review" },
      crm: { isNew: false, hasOpenLead: false }
    });
    expect(action.label).toBe("Aprobar/Devolver");
    expect(action.variant).toBe("warning");
    expect(action.href).toContain("tab=activos");
  });

  it("asset approved → 'Validar Final' variante success", () => {
    const item = makePortfolioItem();
    const action = computePrimaryAction(item, {
      brief: { status: "approved_locked" },
      quotation: { status: "approved" },
      asset: { status: "approved" },
      crm: { isNew: false, hasOpenLead: false }
    });
    expect(action.label).toBe("Validar Final");
    expect(action.variant).toBe("success");
    expect(action.href).toContain("tab=activos");
  });

  it("asset approved_designer → 'Validar Final' (alias)", () => {
    const item = makePortfolioItem();
    const action = computePrimaryAction(item, {
      brief: { status: "approved_locked" },
      quotation: { status: "approved" },
      asset: { status: "approved_designer" },
      crm: { isNew: false, hasOpenLead: false }
    });
    expect(action.label).toBe("Validar Final");
  });

  it("crm: nuevo lead → 'Contactar Lead'", () => {
    const item = makePortfolioItem();
    const action = computePrimaryAction(item, {
      brief: { status: "approved_locked" },
      quotation: { status: "approved" },
      asset: { status: "delivered" },
      crm: { isNew: true, hasOpenLead: true }
    });
    expect(action.label).toBe("Contactar Lead");
    expect(action.variant).toBe("primary");
    expect(action.href).toContain("tab=crm");
  });

  it("sin reglas aplicables → 'Revisar avance' neutral", () => {
    const item = makePortfolioItem();
    const action = computePrimaryAction(item, {
      brief: { status: "approved_locked" },
      quotation: { status: "paid" },
      asset: { status: "delivered" },
      crm: { isNew: false, hasOpenLead: false }
    });
    expect(action.label).toBe("Revisar avance");
    expect(action.variant).toBe("neutral");
    expect(action.href).toContain(`project=${item.projectId}`);
  });

  it("precedencia: brief draft tiene prioridad sobre cotizacion inexistente", () => {
    const item = makePortfolioItem();
    const action = computePrimaryAction(item, {
      brief: { status: "draft" },
      quotation: { status: "draft" },
      asset: { status: "in_review" },
      crm: { isNew: true, hasOpenLead: true }
    });
    expect(action.label).toBe("Editar Brief");
  });

  it("href incluye el projectId del item", () => {
    const item = makePortfolioItem({ projectId: "abc-123" });
    const action = computePrimaryAction(item, {
      brief: null,
      quotation: null,
      asset: null,
      crm: { isNew: false, hasOpenLead: false }
    });
    expect(action.href).toContain("project=abc-123");
  });
});

// ─── groupProposalsByProject ──────────────────────────────────────────────────

describe("groupProposalsByProject", () => {
  it("agrupa propuestas por projectId", () => {
    const proposals: AgentProposal[] = [
      makeProposal({ id: "p1", projectId: "proj-A" }),
      makeProposal({ id: "p2", projectId: "proj-B" }),
      makeProposal({ id: "p3", projectId: "proj-A" })
    ];
    const grouped = groupProposalsByProject(proposals);
    expect(grouped["proj-A"]).toHaveLength(2);
    expect(grouped["proj-B"]).toHaveLength(1);
  });

  it("ordena cada grupo por receivedAt descendente", () => {
    const proposals: AgentProposal[] = [
      makeProposal({
        id: "p1",
        projectId: "proj-A",
        receivedAt: "2026-06-12T10:00:00.000Z"
      }),
      makeProposal({
        id: "p2",
        projectId: "proj-A",
        receivedAt: "2026-06-12T12:00:00.000Z"
      }),
      makeProposal({
        id: "p3",
        projectId: "proj-A",
        receivedAt: "2026-06-12T11:00:00.000Z"
      })
    ];
    const grouped = groupProposalsByProject(proposals);
    expect(grouped["proj-A"].map((p) => p.id)).toEqual(["p2", "p3", "p1"]);
  });

  it("lista vacia retorna diccionario vacio", () => {
    const grouped = groupProposalsByProject([]);
    expect(Object.keys(grouped)).toHaveLength(0);
  });

  it("no muta el array original", () => {
    const proposals: AgentProposal[] = [
      makeProposal({ id: "p1", projectId: "proj-A", receivedAt: "2026-06-12T10:00:00.000Z" }),
      makeProposal({ id: "p2", projectId: "proj-B", receivedAt: "2026-06-12T12:00:00.000Z" })
    ];
    const originalOrder = proposals.map((p) => p.id);
    groupProposalsByProject(proposals);
    expect(proposals.map((p) => p.id)).toEqual(originalOrder);
  });
});

// ─── filterCommentsByContext ──────────────────────────────────────────────────

describe("filterCommentsByContext", () => {
  const comments: OperatorComment[] = [
    makeComment({ id: "c1", entityType: "project", entityId: "p1", createdAt: "2026-06-12T10:00:00.000Z" }),
    makeComment({ id: "c2", entityType: "project", entityId: "p2", createdAt: "2026-06-12T11:00:00.000Z" }),
    makeComment({ id: "c3", entityType: "brief", entityId: "b1", createdAt: "2026-06-12T12:00:00.000Z" }),
    makeComment({ id: "c4", entityType: "project", entityId: "p1", createdAt: "2026-06-12T13:00:00.000Z" })
  ];

  it("filtra por entityType solamente", () => {
    const out = filterCommentsByContext(comments, "project");
    expect(out).toHaveLength(3);
    expect(out.every((c) => c.entityType === "project")).toBe(true);
  });

  it("filtra por entityType + entityId", () => {
    const out = filterCommentsByContext(comments, "project", "p1");
    expect(out).toHaveLength(2);
    expect(out.every((c) => c.entityId === "p1")).toBe(true);
  });

  it("ordena por createdAt ascendente", () => {
    const out = filterCommentsByContext(comments, "project", "p1");
    expect(out.map((c) => c.id)).toEqual(["c1", "c4"]);
  });

  it("tipo sin resultados retorna lista vacia", () => {
    const out = filterCommentsByContext(comments, "quotation");
    expect(out).toHaveLength(0);
  });

  it("entityId sin resultados retorna lista vacia", () => {
    const out = filterCommentsByContext(comments, "project", "no-existe");
    expect(out).toHaveLength(0);
  });

  it("no muta el array original", () => {
    const originalIds = comments.map((c) => c.id);
    filterCommentsByContext(comments, "project");
    expect(comments.map((c) => c.id)).toEqual(originalIds);
  });
});
