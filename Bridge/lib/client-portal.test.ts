/**
 * IMPL-20260508-21
 * Respaldo: context/SPECs/SPEC_ARCH-20260508-21_cliente_pwa_resultados_y_leads_v1.md
 * IMPL-20260612-04
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-04_fecha_creacion_cliente_panel_detalle.md
 */
import { describe, expect, it } from "vitest";

import {
  deriveBriefStages,
  deriveChannelStatus,
  deriveNextClientAction,
  formatClientCreatedAt,
  leadStatusToClientLabel
} from "./client-portal";

// ─── deriveBriefStages ────────────────────────────────────────────────────────

describe("deriveBriefStages", () => {
  it("sin brief: stage 1 activa en_revision, 2 y 3 pendientes", () => {
    const stages = deriveBriefStages(null, false);
    expect(stages[0].status).toBe("en_revision");
    expect(stages[0].active).toBe(true);
    expect(stages[1].status).toBe("pendiente");
    expect(stages[2].status).toBe("pendiente");
  });

  it("brief stage_1_discovery: stage 1 en_revision activa", () => {
    const stages = deriveBriefStages("stage_1_discovery", false);
    expect(stages[0].status).toBe("en_revision");
    expect(stages[0].active).toBe(true);
    expect(stages[1].status).toBe("pendiente");
  });

  it("brief stage_2_precision: stage 1 completado, stage 2 activa", () => {
    const stages = deriveBriefStages("stage_2_precision", false);
    expect(stages[0].status).toBe("completado");
    expect(stages[1].status).toBe("en_revision");
    expect(stages[1].active).toBe(true);
    expect(stages[2].status).toBe("pendiente");
  });

  it("brief stage_3_commercial_fit: stages 1 y 2 completadas, stage 3 activa", () => {
    const stages = deriveBriefStages("stage_3_commercial_fit", false);
    expect(stages[0].status).toBe("completado");
    expect(stages[1].status).toBe("completado");
    expect(stages[2].status).toBe("en_revision");
    expect(stages[2].active).toBe(true);
  });

  it("brief approved_locked: las 3 etapas completadas", () => {
    const stages = deriveBriefStages("approved_locked", false);
    expect(stages.every((s) => s.status === "completado")).toBe(true);
    expect(stages.every((s) => !s.active)).toBe(true);
  });

  it("brief returned_for_rework: stage 1 completada, stage 2 pendiente_aclaracion activa", () => {
    const stages = deriveBriefStages("returned_for_rework", true);
    expect(stages[0].status).toBe("completado");
    expect(stages[1].status).toBe("pendiente_aclaracion");
    expect(stages[1].active).toBe(true);
  });

  it("las 3 etapas tienen el label correcto en español simple", () => {
    const stages = deriveBriefStages("approved_locked", false);
    expect(stages[0].label).toBe("Entendimos tu necesidad");
    expect(stages[1].label).toBe("Definimos los detalles");
    expect(stages[2].label).toBe("Validamos la solución recomendada");
  });
});

// ─── deriveNextClientAction ───────────────────────────────────────────────────

describe("deriveNextClientAction", () => {
  it("brief devuelto → acción clarify_brief con requiresAction true", () => {
    const action = deriveNextClientAction({
      briefStatus: "returned_for_rework",
      hasQuotationPendingApproval: false,
      hasAssetsForReview: false
    });
    expect(action.type).toBe("clarify_brief");
    expect(action.requiresAction).toBe(true);
  });

  it("cotización enviada → acción approve_quotation", () => {
    const action = deriveNextClientAction({
      briefStatus: "approved_locked",
      hasQuotationPendingApproval: true,
      hasAssetsForReview: false
    });
    expect(action.type).toBe("approve_quotation");
    expect(action.requiresAction).toBe(true);
  });

  it("activos para revisión → acción review_assets", () => {
    const action = deriveNextClientAction({
      briefStatus: "approved_locked",
      hasQuotationPendingApproval: false,
      hasAssetsForReview: true
    });
    expect(action.type).toBe("review_assets");
    expect(action.requiresAction).toBe(true);
  });

  it("sin pendientes → acción none sin requerir acción", () => {
    const action = deriveNextClientAction({
      briefStatus: "approved_locked",
      hasQuotationPendingApproval: false,
      hasAssetsForReview: false
    });
    expect(action.type).toBe("none");
    expect(action.requiresAction).toBe(false);
  });

  it("clarify_brief tiene prioridad sobre cotización enviada", () => {
    const action = deriveNextClientAction({
      briefStatus: "returned_for_rework",
      hasQuotationPendingApproval: true,
      hasAssetsForReview: false
    });
    expect(action.type).toBe("clarify_brief");
  });
});

// ─── deriveChannelStatus ──────────────────────────────────────────────────────

describe("deriveChannelStatus", () => {
  it("sin activos ni leads → sin_datos", () => {
    expect(deriveChannelStatus(0, 0)).toBe("sin_datos");
  });

  it("con activos → activo", () => {
    expect(deriveChannelStatus(3, 0)).toBe("activo");
  });

  it("con leads → activo", () => {
    expect(deriveChannelStatus(0, 5)).toBe("activo");
  });
});

// ─── leadStatusToClientLabel ──────────────────────────────────────────────────

describe("leadStatusToClientLabel", () => {
  it("traduce nuevo correctamente", () => {
    expect(leadStatusToClientLabel("nuevo")).toBe("Nuevo contacto");
  });

  it("traduce cerrado_ganado correctamente", () => {
    expect(leadStatusToClientLabel("cerrado_ganado")).toBe("Ganado");
  });

  it("fallback para status desconocido", () => {
    expect(leadStatusToClientLabel("estado_raro")).toBe("Contacto");
  });
});

// ─── formatClientCreatedAt ────────────────────────────────────────────────────

describe("formatClientCreatedAt", () => {
  it("formatea una fecha ISO al formato corto DD/MMM/YY localizado a es-MX", () => {
    // 12 de junio de 2026 → "12 jun 26" en es-MX
    expect(formatClientCreatedAt("2026-06-12T15:00:00.000Z")).toBe("12 jun 26");
  });

  it("respeta la zona horaria America/Mexico_City (UTC-6 estándar)", () => {
    // 13 de junio 2026 02:30 UTC → 12 de junio 2026 20:30 en CDMX
    expect(formatClientCreatedAt("2026-06-13T02:30:00.000Z")).toBe("12 jun 26");
  });

  it("retorna null cuando el valor es null", () => {
    expect(formatClientCreatedAt(null)).toBeNull();
  });

  it("retorna null cuando el valor es undefined", () => {
    expect(formatClientCreatedAt(undefined)).toBeNull();
  });

  it("retorna null cuando la cadena no es un ISO válido", () => {
    expect(formatClientCreatedAt("no-es-una-fecha")).toBeNull();
  });

  it("retorna null cuando la cadena es vacía", () => {
    expect(formatClientCreatedAt("")).toBeNull();
  });

  it("produce un string de 9 caracteres aprox (DD MMM YY) para fechas válidas", () => {
    const formatted = formatClientCreatedAt("2025-01-01T00:00:00.000Z");
    expect(formatted).not.toBeNull();
    // ej. "31 dic 25" (diciembre 2024 18:00 UTC) o "01 ene 25"
    expect(formatted!.length).toBeGreaterThanOrEqual(8);
    expect(formatted!.length).toBeLessThanOrEqual(10);
  });

  it("mantiene el mes en abreviatura localizada para enero y diciembre", () => {
    // 1 de enero 2026 en CDMX (00:00 UTC del 1) → "31 dic 25"
    expect(formatClientCreatedAt("2026-01-01T00:00:00.000Z")).toBe("31 dic 25");
    // 15 de enero 2026 18:00 UTC → 15 de enero CDMX
    expect(formatClientCreatedAt("2026-01-15T18:00:00.000Z")).toBe("15 ene 26");
  });
});
