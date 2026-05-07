/**
 * IMPL-20260506-39
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-39_radar_priorizado_operador_por_proyecto.md
 */
import { describe, expect, it } from "vitest";

import { computeIdleHours, scoreProjectSignals, type ProjectSignals } from "./operator-radar";

const NOW = "2026-05-06T12:00:00.000Z";

function baseSignals(overrides: Partial<ProjectSignals> = {}): ProjectSignals {
  return {
    project: { id: "proj-1", name: "Proyecto Demo", status: "active", clientId: "client-1" },
    clientName: "Cliente Demo",
    brief: { status: "approved_locked", updatedAt: NOW },
    quotation: { status: "approved", updatedAt: NOW },
    latestActivityAt: NOW,
    nowIso: NOW,
    ...overrides
  };
}

describe("operator-radar (funciones puras)", () => {
  describe("computeIdleHours", () => {
    it("retorna 0 cuando la actividad es ahora mismo", () => {
      expect(computeIdleHours(NOW, NOW)).toBe(0);
    });

    it("retorna 999 cuando no hay actividad registrada", () => {
      expect(computeIdleHours(null, NOW)).toBe(999);
    });

    it("calcula horas correctamente para 2 dias de inactividad", () => {
      const twoDaysAgo = new Date(new Date(NOW).getTime() - 48 * 60 * 60 * 1000).toISOString();
      expect(computeIdleHours(twoDaysAgo, NOW)).toBe(48);
    });
  });

  describe("scoreProjectSignals", () => {
    it("proyecto sin alertas obtiene score bajo y riesgo low", () => {
      const result = scoreProjectSignals(baseSignals());
      expect(result.priorityScore).toBe(0);
      expect(result.riskLevel).toBe("low");
      expect(result.sourceRefs).toHaveLength(0);
    });

    it("proyecto sin brief suma 25 puntos y sugiere modulo briefs", () => {
      const result = scoreProjectSignals(baseSignals({ brief: null }));
      expect(result.priorityScore).toBeGreaterThanOrEqual(25);
      expect(result.sourceRefs).toContain("rule:brief_absent");
      expect(result.suggestedModule).toBe("briefs");
    });

    it("brief no consolidado suma 20 puntos", () => {
      const result = scoreProjectSignals(
        baseSignals({ brief: { status: "stage_1_discovery", updatedAt: NOW } })
      );
      expect(result.sourceRefs).toContain("rule:brief_not_locked");
      expect(result.priorityScore).toBeGreaterThanOrEqual(20);
    });

    it("sin cotizacion suma 15 puntos y sugiere modulo cotizaciones si el brief esta consolidado", () => {
      const result = scoreProjectSignals(baseSignals({ quotation: null }));
      expect(result.sourceRefs).toContain("rule:no_quotation");
      expect(result.suggestedModule).toBe("cotizaciones");
    });

    it("cotizacion en borrador suma 10 puntos", () => {
      const result = scoreProjectSignals(
        baseSignals({ quotation: { status: "draft", updatedAt: NOW } })
      );
      expect(result.sourceRefs).toContain("rule:quotation_draft");
    });

    it("inactividad de mas de 48h suma 20 puntos", () => {
      const old = new Date(new Date(NOW).getTime() - 50 * 60 * 60 * 1000).toISOString();
      const result = scoreProjectSignals(baseSignals({ latestActivityAt: old }));
      expect(result.sourceRefs).toContain("rule:idle_48h");
      expect(result.idleHours).toBeGreaterThanOrEqual(50);
    });

    it("inactividad entre 24h y 48h suma 10 puntos", () => {
      const old = new Date(new Date(NOW).getTime() - 30 * 60 * 60 * 1000).toISOString();
      const result = scoreProjectSignals(baseSignals({ latestActivityAt: old }));
      expect(result.sourceRefs).toContain("rule:idle_24h");
      expect(result.sourceRefs).not.toContain("rule:idle_48h");
    });

    it("proyecto critico combina multiples reglas y alcanza riesgo critical", () => {
      const old = new Date(new Date(NOW).getTime() - 72 * 60 * 60 * 1000).toISOString();
      const result = scoreProjectSignals(
        baseSignals({ brief: null, quotation: null, latestActivityAt: old })
      );
      // brief_absent(25) + no_quotation(15) + idle_48h(20) = 60
      expect(result.priorityScore).toBeGreaterThanOrEqual(55);
      expect(result.riskLevel).toBe("critical");
    });

    it("la alerta principal refleja la regla de mayor peso aplicada", () => {
      const result = scoreProjectSignals(baseSignals({ brief: null }));
      expect(result.primaryAlert).toContain("no tiene brief vinculado");
    });

    it("sin actividad registrada reporta idleHours de 999", () => {
      const result = scoreProjectSignals(baseSignals({ latestActivityAt: null }));
      expect(result.idleHours).toBe(999);
    });
  });
});
