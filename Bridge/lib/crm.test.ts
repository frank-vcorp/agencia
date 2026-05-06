/**
 * IMPL-20260505-26
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-26_crm_ligero_operativo_y_seguimiento_minimo_v1.md
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
