/**
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-08_historial_optimista_y_tono_mas_natural_v1.md
 */
import { describe, expect, it, vi } from "vitest";

import {
  buildAssistantGuidance,
  buildFinalSummaryText,
  emptyStructuredBriefSummary,
  getCurrentVisibleStageQuestion,
  getCriticalMissingFields,
  hasBackgroundStageSufficientInfo,
  hasMeaningfulSummaryValue,
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
  isAcceptableAssistantVisibleReply,
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
    expect(buildAssistantGuidance("commercial_fit", summary)).toContain("Ya veo por d\u00f3nde puede ir la propuesta");
  });

  it("suaviza la guia visible en discovery y precision sin perder foco comercial", () => {
    expect(buildAssistantGuidance("discovery", emptyStructuredBriefSummary())).toContain(
      "qu\u00e9 te gustar\u00eda ver pasar si esto sale bien"
    );
    expect(buildAssistantGuidance("precision", {
      ...emptyStructuredBriefSummary(),
      audience: "Duenas de negocio",
      platform: "Instagram",
      deliverable: "Landing",
      cta: "Agendar llamada"
    })).toContain("base \u00fatil");
  });

  it("valida suficiencia en background con contenido significativo y no por texto vacio", () => {
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      projectObjective: "Captar leads calificados para una preventa",
      mainOffer: "Mentoria premium",
      requestReason: "Necesitamos activar ventas este mes",
      businessContext: "Ya vendemos por referidos pero no tenemos sistema comercial continuo"
    });

    expect(hasMeaningfulSummaryValue("projectObjective", "si")).toBe(false);
    expect(hasBackgroundStageSufficientInfo("discovery", summary)).toBe(true);
  });

  it("traduce el faltante mainOffer a una pregunta visible natural", () => {
    const question = getCurrentVisibleStageQuestion("discovery", emptyStructuredBriefSummary());

    expect(question?.key).toBe("mainOffer");
    expect(question?.question).toBe("\u00bfCu\u00e1l es el servicio o producto principal que quieres mover primero?");
    expect(question?.question.toLowerCase()).not.toContain("oferta principal");
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
    expect(prompt).toContain("Usa el resumen estructurado solo como contexto silencioso");
    expect(prompt).toContain("Nunca digas frases como 'mi objetivo es' o 'necesito entender'.");
    expect(prompt).toContain("evita sentirse robotica o demasiado ensayada");
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

  it("rechaza una respuesta visible si Gemini la corta con finishReason no confiable", () => {
    expect(
      isAcceptableAssistantVisibleReply(
        "Perfecto, ya entiendo el contexto y puedo ayudarte con el siguiente paso.",
        "MAX_TOKENS"
      )
    ).toBe(false);
  });

  it("rechaza una respuesta visible si termina en una idea abierta", () => {
    expect(isAcceptableAssistantVisibleReply("Entendido. Para entender mejor", "STOP")).toBe(false);
  });

  it("acepta una respuesta visible completa y natural", () => {
    expect(
      isAcceptableAssistantVisibleReply(
        "Perfecto, ya entendí el contexto. Para avanzar bien, cuéntame cuál es tu objetivo principal con este proyecto.",
        "STOP"
      )
    ).toBe(true);
  });

  it("devuelve una respuesta operativa cuando GEMINI_API_KEY no esta configurada", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const result = await generateBriefChatReply({
      stage: "discovery",
      summary: emptyStructuredBriefSummary(),
      clientMessage: "Necesito ayuda para definir mi oferta"
    });

    expect(result.summaryPatch).toEqual({});
    expect(result.visibleReply).toContain("Se interrumpio este turno");

    vi.unstubAllEnvs();
  });

  it("retorna una respuesta natural y un summaryPatch cuando Gemini responde JSON valido", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  {
                    text: "Entendido, el foco es cambio de aceite y mantenimiento preventivo. ¿Qué los impulsa a mover esta línea justo ahora?"
                  }
                ]
              }
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      summaryPatch: {
                        mainOffer: "Cambio de aceite y mantenimiento preventivo"
                      }
                    })
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
      clientMessage: "Queremos mover cambio de aceite y mantenimiento preventivo"
    });

    expect(result.visibleReply).toContain("cambio de aceite");
    expect(result.summaryPatch.mainOffer).toContain("Cambio de aceite");
    expect(result.stageHasSufficientInfo).toBe(false);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("acepta una respuesta de texto plano del modelo cuando no trae JSON estructurado", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text: "Entendido, el foco es cambio de aceite y mantenimiento preventivo. ¿Qué los impulsa a mover esta línea justo ahora?"
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
      clientMessage: "Queremos mover cambio de aceite y mantenimiento preventivo"
    });

    expect(result.visibleReply).toContain("cambio de aceite");
    expect(result.summaryPatch).toEqual({});
    expect(result.stageHasSufficientInfo).toBe(false);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("devuelve una respuesta operativa cuando Gemini devuelve una respuesta visible tecnica", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    visibleReply: "FOCO: discovery",
                    summaryPatch: {}
                  })
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

    expect(result.summaryPatch).toEqual({});
    expect(result.visibleReply).toContain("Se interrumpio este turno");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("devuelve una respuesta operativa cuando Gemini devuelve una frase truncada", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    visibleReply: "Entendido. Para entender mejor",
                    summaryPatch: {}
                  })
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
      clientMessage: "Quiero lanzar una campana"
    });

    expect(result.summaryPatch).toEqual({});
    expect(result.visibleReply).toContain("Se interrumpio este turno");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("devuelve una respuesta operativa cuando Gemini corta la salida por maximo de tokens", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            finishReason: "MAX_TOKENS",
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    visibleReply: "Perfecto, ya entiendo el contexto y te voy a ayudar con",
                    summaryPatch: {}
                  })
                }
              ]
            }
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateBriefChatReply({
      stage: "precision",
      summary: emptyStructuredBriefSummary(),
      clientMessage: "Necesito una landing para vender"
    });

    expect(result.summaryPatch).toEqual({});
    expect(result.visibleReply).toContain("Se interrumpio este turno");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("devuelve una respuesta operativa cuando Gemini falla", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateBriefChatReply({
      stage: "precision",
      summary: emptyStructuredBriefSummary(),
      clientMessage: "Mi servicio es una mentoria"
    });

    expect(result.summaryPatch).toEqual({});
    expect(result.visibleReply).toContain("Se interrumpio este turno");

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