/**
 * IMPL-20260505-25
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-25_cabina_operador_accionable_resumenes_reales_v1.md
 */
import { describe, expect, it } from "vitest";

import { briefStatusLabel, resolveNextAction, type AssetsDashboardSummary, type BriefDashboardSummary, type QuotationDashboardSummary } from "./dashboard";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const briefConsolidado: BriefDashboardSummary = {
  id: "brief-1",
  status: "approved_locked",
  statusLabel: "Consolidado",
  isConsolidated: true,
  projectObjective: "Lanzar campana de captacion",
  updatedAt: "2026-05-05T10:00:00Z"
};

const briefDraft: BriefDashboardSummary = {
  id: "brief-2",
  status: "stage_1_discovery",
  statusLabel: "Descubrimiento",
  isConsolidated: false,
  projectObjective: "",
  updatedAt: "2026-05-05T09:00:00Z"
};

const cotizacionDraft: QuotationDashboardSummary = {
  id: "quot-1",
  status: "draft",
  statusLabel: "Borrador",
  title: "Propuesta inicial",
  totalEstimado: null,
  isActive: false
};

const cotizacionEnviada: QuotationDashboardSummary = {
  id: "quot-2",
  status: "sent",
  statusLabel: "Enviada",
  title: "Propuesta v2",
  totalEstimado: "$5,000 MXN",
  isActive: true
};

const activosConDatos: AssetsDashboardSummary = {
  total: 4,
  byStatus: { draft: 1, in_progress: 2, in_review: 1 },
  hasDelivered: false,
  hasInProgress: true
};

// ─── Tests de resolveNextAction ───────────────────────────────────────────────

describe("dashboard — resolveNextAction", () => {
  it("sin brief -> dirige a /briefs con razon de ausencia", () => {
    const result = resolveNextAction(null, null, null);

    expect(result.href).toBe("/briefs");
    expect(result.label).toBe("Crear el primer brief");
    expect(result.reason).toContain("No hay ningún brief");
  });

  it("brief en draft (no consolidado) -> dirige a /briefs con estado del brief", () => {
    const result = resolveNextAction(briefDraft, null, null);

    expect(result.href).toBe("/briefs");
    expect(result.label).toBe("Consolidar el brief");
    expect(result.reason).toContain("Descubrimiento");
  });

  it("brief consolidado sin cotizacion -> dirige a /cotizaciones", () => {
    const result = resolveNextAction(briefConsolidado, null, null);

    expect(result.href).toBe("/cotizaciones");
    expect(result.label).toBe("Crear cotización");
    expect(result.reason).toContain("no hay cotización registrada");
  });

  it("brief consolidado, cotizacion en draft -> dirige a /cotizaciones para enviar", () => {
    const result = resolveNextAction(briefConsolidado, cotizacionDraft, null);

    expect(result.href).toBe("/cotizaciones");
    expect(result.label).toBe("Enviar cotización al cliente");
    expect(result.reason).toContain("borrador");
  });

  it("brief consolidado, cotizacion enviada, sin activos -> dirige a /activos", () => {
    const result = resolveNextAction(briefConsolidado, cotizacionEnviada, null);

    expect(result.href).toBe("/activos");
    expect(result.label).toBe("Registrar activos del proyecto");
    expect(result.reason).toContain("no hay activos registrados");
  });

  it("brief consolidado, cotizacion enviada, activos vacio -> dirige a /activos", () => {
    const activosVacios: AssetsDashboardSummary = {
      total: 0,
      byStatus: {},
      hasDelivered: false,
      hasInProgress: false
    };

    const result = resolveNextAction(briefConsolidado, cotizacionEnviada, activosVacios);

    expect(result.href).toBe("/activos");
    expect(result.label).toBe("Registrar activos del proyecto");
  });

  it("los tres objetos existen -> foco operativo con conteo real de activos", () => {
    const result = resolveNextAction(briefConsolidado, cotizacionEnviada, activosConDatos);

    expect(result.href).toBe("/activos");
    expect(result.label).toBe("Revisar foco operativo");
    expect(result.reason).toContain("4 activos");
    expect(result.reason).toContain("2 en progreso");
    expect(result.reason).toContain("1 en revision");
  });

  it("1 activo usa singular correctamente", () => {
    const unActivo: AssetsDashboardSummary = {
      total: 1,
      byStatus: { draft: 1 },
      hasDelivered: false,
      hasInProgress: false
    };

    const result = resolveNextAction(briefConsolidado, cotizacionEnviada, unActivo);

    expect(result.reason).toContain("1 activo en el proyecto");
    expect(result.reason).not.toContain("1 activos");
  });
});

// ─── Tests de briefStatusLabel ────────────────────────────────────────────────

describe("dashboard — briefStatusLabel", () => {
  it("mapea todos los estados conocidos a etiqueta en espanol", () => {
    expect(briefStatusLabel("approved_locked")).toBe("Consolidado");
    expect(briefStatusLabel("stage_1_discovery")).toBe("Descubrimiento");
    expect(briefStatusLabel("pending_operator_review")).toBe("Pendiente de revision");
    expect(briefStatusLabel("returned_for_rework")).toBe("Devuelto para rework");
  });

  it("devuelve el status raw si no tiene mapeo", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(briefStatusLabel("unknown_status" as any)).toBe("unknown_status");
  });
});
