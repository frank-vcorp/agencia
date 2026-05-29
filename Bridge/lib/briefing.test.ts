/**
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-02_brief_cliente_chat_natural_y_json_final_v1.md
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
import {
  buildBriefChatSystemPrompt,
  buildDeterministicBriefFinalJson,
  generateBriefChatReply,
  generateBriefFinalJson,
  hasStageSufficientInfo,
  sanitizeAssistantReply
} from "./briefing-assistant-ai";

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
  it("incluye reglas de chat natural y etapa actual en el prompt de conversacion", () => {
    const prompt = buildBriefChatSystemPrompt("discovery", emptyStructuredBriefSummary());

    expect(prompt).toContain("Responde solo con texto plano visible para el cliente.");
    expect(prompt).toContain("Etapa actual: discovery");
    expect(prompt).toContain("Aun falta: objetivo del proyecto, oferta principal, motivo del pedido, contexto del negocio");
    expect(prompt).toContain("No devuelvas JSON");
  });

  it("postprocesa salida visible para limitar desborde y limpiar lineas vacias repetidas", () => {
    const noisyReply = `FOCO: discovery\n\n\n${"dato ".repeat(160)}`;

    const sanitized = sanitizeAssistantReply(noisyReply);

    expect(sanitized).toBe("");
  });

  it("postprocesa salida visible natural sin exceder el limite de palabras", () => {
    const noisyReply = `Perfecto. ${"dato ".repeat(160)}`;

    const sanitized = sanitizeAssistantReply(noisyReply);

    expect(sanitized.endsWith("...")).toBe(true);
    expect(sanitized.split(/\s+/).length).toBeLessThanOrEqual(121);
  });

  it("devuelve fallback de chat natural cuando GEMINI_API_KEY no esta configurada", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const result = await generateBriefChatReply({
      stage: "discovery",
      summary: emptyStructuredBriefSummary(),
      clientMessage: "Necesito ayuda para definir mi oferta"
    });

    expect(result.visibleReply.length).toBeGreaterThan(0);
    expect(typeof result.stageHasSufficientInfo).toBe("boolean");
    vi.unstubAllEnvs();
  });

  it("retorna una respuesta natural cuando Gemini responde texto valido", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "Perfecto, ya tengo una base clara. Para afinarlo, cuentame cual es tu objetivo principal y a quien quieres atraer."
                }
              ]
            }
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateBriefChatReply({
      stage: "discovery",
      summary: emptyStructuredBriefSummary(),
      clientMessage: "Quiero captar leads en Instagram"
    });

    expect(result.visibleReply).toContain("Perfecto, ya tengo una base clara");
    expect(result.stageHasSufficientInfo).toBe(false);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("cae a fallback cuando Gemini filtra etiquetas tecnicas", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "FOCO: discovery"
                }
              ]
            }
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateBriefChatReply({
      stage: "discovery",
      summary: emptyStructuredBriefSummary(),
      clientMessage: "Quiero captar leads"
    });

    expect(result.visibleReply.length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("cae a fallback cuando Gemini falla", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateBriefChatReply({
      stage: "precision",
      summary: emptyStructuredBriefSummary(),
      clientMessage: "Mi servicio es una mentoria"
    });

    expect(result.visibleReply.length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("detecta suficiencia de etapa discovery cuando los campos prioritarios existen", () => {
    const summary = {
      ...emptyStructuredBriefSummary(),
      projectObjective: "Captar 30 leads",
      mainOffer: "Programa de consultoria",
      requestReason: "Necesito pipeline estable",
      businessContext: "Negocio local en crecimiento"
    };

    expect(hasStageSufficientInfo("discovery", summary)).toBe(true);
  });

  it("genera JSON final deterministico con readiness y faltantes", () => {
    const summary = {
      ...emptyStructuredBriefSummary(),
      projectObjective: "Captar leads",
      mainOffer: "Mentoria",
      audience: "Pymes",
      platform: "Instagram",
      deliverable: "Landing",
      cta: "Agendar llamada",
      commercialFitReason: "Hay encaje con oferta de lanzamiento",
      recommendedProductSlotKey: "slot_lanzamiento"
    };

    const finalJson = buildDeterministicBriefFinalJson(summary);

    expect(finalJson.proposalReadiness).toBe("high");
    expect(finalJson.missingCriticalData).toEqual([]);
    expect(finalJson.recommendedProductSlotKey).toBe("slot_lanzamiento");
  });

  it("usa fallback deterministico para JSON final cuando GEMINI_API_KEY no existe", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const summary = {
      ...emptyStructuredBriefSummary(),
      projectObjective: "Captar leads"
    };

    const result = await generateBriefFinalJson({
      stage: "discovery",
      summary,
      messages: [{ authorRole: "client", messageText: "Quiero vender mas" }]
    });

    expect(result.projectObjective).toBe("Captar leads");
    expect(result.proposalReadiness).toBe("low");
    vi.unstubAllEnvs();
  });
});