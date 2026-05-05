/**
 * IMPL-20260505-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-19_agente_briefing_persistido_y_revision_humana.md, context/BRIEFING_ESTRUCTURADO_CLAUDE_V1.md
 */
import { describe, expect, it } from "vitest";

import {
  buildAssistantGuidance,
  buildFinalSummaryText,
  emptyStructuredBriefSummary,
  getCriticalMissingFields,
  mergeStructuredBriefSummary,
  nextStage,
  statusFromStage
} from "./briefing";

describe("briefing", () => {
  it("calcula la secuencia obligatoria de tres etapas", () => {
    expect(nextStage("discovery")).toBe("precision");
    expect(nextStage("precision")).toBe("commercial_fit");
    expect(nextStage("commercial_fit")).toBeNull();
    expect(statusFromStage("commercial_fit")).toBe("stage_3_commercial_fit");
  });

  it("detecta faltantes criticos antes de enviar a revision humana", () => {
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      projectObjective: "Lanzar una campana de captacion",
      mainOffer: "Programa de entrenamiento",
      audience: "Mujeres de 25 a 40",
      platform: "Instagram",
      deliverable: "Landing con anuncios",
      cta: "Agendar diagnostico"
    });

    expect(getCriticalMissingFields(summary)).toEqual(["encaje comercial o nota explicita de revision comercial"]);
  });

  it("compone un resumen final persistible y una guia contextual de etapa", () => {
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      projectObjective: "Generar leads para una preventa",
      mainOffer: "Mentoria premium",
      audience: "Fundadores de pymes",
      platform: "WhatsApp y landing",
      deliverable: "Sistema de mensajes y pagina corta",
      cta: "Solicitar llamada",
      restrictions: "No usar promesas agresivas",
      recommendedProductSlotKey: "slot_lanzamiento_conversacional",
      commercialFitReason: "El caso requiere descubrimiento, oferta y cierre asistido.",
      upsellSignal: "Puede crecer a paquete con activos semanales."
    });

    expect(buildFinalSummaryText(summary)).toContain("Slot comercial sugerido: slot_lanzamiento_conversacional.");
    expect(buildAssistantGuidance("commercial_fit", summary)).toContain("slot_lanzamiento_conversacional");
  });
});