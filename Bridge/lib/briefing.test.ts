/**
 * IMPL-20260603-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260603-01_estabilizacion_runtime_chat_brief_cliente_v1.md
 * IMPL-20260602-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260602-01_brief_cliente_conversacion_primero_y_procesado_unico_al_cierre_v1.md
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
  generateBriefClosureArtifacts,
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
  it("incluye reglas de chat natural, agenda interna y historial en el prompt de conversacion", () => {
    const prompt = buildBriefChatSystemPrompt("discovery", [
      { authorRole: "client", messageText: "Quiero mover una mentoria premium" }
    ]);

    expect(prompt).toContain("Responde solo con texto plano visible para el cliente.");
    expect(prompt).toContain("Etapa actual: discovery");
    expect(prompt).toContain("Agenda interna prioritaria: objetivo del proyecto, oferta principal, motivo del pedido, contexto del negocio");
    expect(prompt).toContain("Historial reciente:");
    expect(prompt).toContain("Cliente: Quiero mover una mentoria premium");
    expect(prompt).toContain("No devuelvas JSON");
    expect(prompt).not.toContain("summaryPatch");
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

  it("rechaza una respuesta visible si termina con un cierre colgante", () => {
    expect(isAcceptableAssistantVisibleReply("Entendido,", "STOP")).toBe(false);
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
      messages: [],
      clientMessage: "Necesito ayuda para definir mi oferta"
    });

    expect(result.visibleReply).toContain("Se interrumpio este turno");

    vi.unstubAllEnvs();
  });

  it("retorna una respuesta natural con una sola llamada visible por turno", async () => {
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
      messages: [
        { authorRole: "client", messageText: "Queremos mover cambio de aceite y mantenimiento preventivo" }
      ],
      clientMessage: "Queremos mover cambio de aceite y mantenimiento preventivo"
    });

    expect(result.visibleReply).toContain("cambio de aceite");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("acepta una respuesta de texto plano del modelo sin depender de JSON estructurado", async () => {
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
      messages: [],
      clientMessage: "Queremos mover cambio de aceite y mantenimiento preventivo"
    });

    expect(result.visibleReply).toContain("cambio de aceite");
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
      messages: [],
      clientMessage: "Quiero captar leads"
    });

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
      messages: [],
      clientMessage: "Quiero lanzar una campana"
    });

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
      messages: [],
      clientMessage: "Necesito una landing para vender"
    });

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
      messages: [],
      clientMessage: "Mi servicio es una mentoria"
    });

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

  it("convierte el procesamiento final en un solo patch estructurado al cierre", async () => {
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
                    projectObjective: "Captar leads calificados",
                    mainOffer: "Mentoria premium",
                    businessContext: "Negocio con ventas organicas sin sistema comercial estable",
                    requestReason: "Necesitan acelerar cierres este trimestre",
                    audience: "Fundadores de pymes",
                    platform: "Landing y WhatsApp",
                    deliverable: "Sistema de captacion con pagina corta",
                    cta: "Agendar llamada",
                    tone: "Claro y confiable",
                    restrictions: "Sin promesas exageradas",
                    references: "Competidores del nicho",
                    urgency: "Lanzar este mes",
                    commercialFitReason: "El caso requiere ordenar oferta, mensaje y conversion.",
                    recommendedProductSlotKey: "slot_lanzamiento",
                    operatorReviewNote: "Revisar pricing antes de enviar propuesta.",
                    proposalReadiness: "medium",
                    missingCriticalData: ["detalle de presupuesto"]
                  })
                }
              ]
            }
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateBriefClosureArtifacts({
      stage: "commercial_fit",
      summary: emptyStructuredBriefSummary(),
      messages: [
        { authorRole: "client", messageText: "Quiero captar leads para una mentoria premium" },
        { authorRole: "assistant", messageText: "Perfecto, cuentame a quien quieres atraer primero." }
      ]
    });

    expect(result.finalJson.mainOffer).toBe("Mentoria premium");
    expect(result.finalSummaryPatch.mainOffer).toBe("Mentoria premium");
    expect(result.finalSummaryPatch.gaps).toContain("detalle de presupuesto");
    expect(result.finalSummaryPatch.operatorReviewNote).toContain("Readiness: medium");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("mantiene viable el cierre aunque falle el procesador final, sin tocar la conversacion previa", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", fetchMock);
    const messages = [{ authorRole: "client" as const, messageText: "Necesito una landing para vender" }];

    const result = await generateBriefClosureArtifacts({
      stage: "precision",
      summary: emptyStructuredBriefSummary(),
      messages
    });

    expect(messages).toEqual([{ authorRole: "client", messageText: "Necesito una landing para vender" }]);
    expect(result.finalJson.proposalReadiness).toBe("low");
    expect(result.finalSummaryPatch.operatorReviewNote).toContain("Faltantes detectados al cierre");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});