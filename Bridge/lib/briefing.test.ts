/**
 * IMPL-20260528-08
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-08_brief_cliente_ia_real_gemini_v1.md
 */
import { describe, expect, it, vi } from "vitest";

import {
  buildAssistantGuidance,
  buildFinalSummaryText,
  emptyStructuredBriefSummary,
  getCriticalMissingFields,
  mergeStructuredBriefSummary,
  nextStage,
  selectPreferredProject,
  statusFromStage
} from "./briefing";
import { generateBriefAssistantReply } from "./briefing-assistant-ai";

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

  it("prioriza el project activo como contenedor operativo por encima de otros estados", () => {
    const selected = selectPreferredProject([
      { id: "project-paused", status: "paused" as const },
      { id: "project-active", status: "active" as const },
      { id: "project-draft", status: "draft" as const }
    ]);

    expect(selected?.id).toBe("project-active");
  });
});

describe("briefing-assistant-ai", () => {
  it("devuelve null cuando GEMINI_API_KEY no esta configurada", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const result = await generateBriefAssistantReply({
      stage: "discovery",
      summary: emptyStructuredBriefSummary(),
      clientMessage: "Necesito ayuda para definir mi oferta"
    });

    expect(result).toBeNull();
    vi.unstubAllEnvs();
  });

  it("devuelve texto cuando Gemini responde contenido valido", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "Perfecto, avancemos con objetivo y audiencia." }]
            }
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateBriefAssistantReply({
      stage: "discovery",
      summary: emptyStructuredBriefSummary(),
      clientMessage: "Quiero captar leads en Instagram"
    });

    expect(result).toBe("Perfecto, avancemos con objetivo y audiencia.");
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("devuelve null cuando Gemini falla", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateBriefAssistantReply({
      stage: "precision",
      summary: emptyStructuredBriefSummary(),
      clientMessage: "Mi servicio es una mentoria"
    });

    expect(result).toBeNull();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});