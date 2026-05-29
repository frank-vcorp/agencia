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
  inferBriefSummaryPatchFromClientMessage,
  mergeStructuredBriefSummary,
  nextStage,
  selectPreferredProject,
  statusFromStage
} from "./briefing";
import {
  buildBriefChatFallbackReply,
  buildBriefChatSystemPrompt,
  buildDeterministicBriefFinalJson,
  generateBriefChatReply,
  generateBriefFinalJson,
  hasStageSufficientInfo,
  isClarificationRequestForCurrentQuestion,
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
    expect(buildAssistantGuidance("commercial_fit", summary)).toContain("ruta comercial clara");
  });

  it("suaviza la guia visible en discovery y precision sin perder foco comercial", () => {
    expect(buildAssistantGuidance("discovery", emptyStructuredBriefSummary())).toContain(
      "que te gustaria ver pasar si esto sale bien"
    );
    expect(buildAssistantGuidance("precision", {
      ...emptyStructuredBriefSummary(),
      audience: "Duenas de negocio",
      platform: "Instagram",
      deliverable: "Landing",
      cta: "Agendar llamada"
    })).toContain("base util");
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

  it("permite inferir datos de precision desde discovery para sostener avance automatico", () => {
    const patch = inferBriefSummaryPatchFromClientMessage(
      "discovery",
      emptyStructuredBriefSummary(),
      "Quiero vender mi mentoria a duenos de negocio por Instagram con una landing para agendar"
    );

    expect(patch.mainOffer?.toLowerCase()).toContain("mentoria");
    expect(patch.audience?.toLowerCase()).toContain("duenos de negocio");
    expect(patch.platform).toBe("Instagram");
    expect(patch.deliverable).toBe("landing page");
    expect(patch.cta).toBe("agendar");
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

  it("genera fallback natural cuando el cliente solo saluda", () => {
    const reply = buildBriefChatFallbackReply("discovery", emptyStructuredBriefSummary(), "Hola");

    expect(reply).toContain("que quieres mover con este proyecto");
    expect(reply).toContain("que te gustaria ver pasar si esto sale bien");
  });

  it("genera fallback natural cuando el cliente hace una pregunta meta", () => {
    const reply = buildBriefChatFallbackReply("discovery", emptyStructuredBriefSummary(), "que vamos a hacer?");

    expect(reply).toContain("propuesta salga alineada");
    expect(reply).toContain("valio la pena");
  });

  it("detecta una repregunta de aclaracion sobre el faltante actual", () => {
    expect(
      isClarificationRequestForCurrentQuestion("discovery", emptyStructuredBriefSummary(), "Que oferta principal?")
    ).toBe(true);
  });

  it("aclara en lenguaje natural cuando el cliente pregunta por el faltante actual", () => {
    const reply = buildBriefChatFallbackReply("discovery", emptyStructuredBriefSummary(), "Que oferta principal?");

    expect(reply.toLowerCase()).toContain("lo que quieres vender o impulsar primero");
    expect(reply.toLowerCase()).not.toContain("oferta principal");
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
            finishReason: "STOP",
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
            finishReason: "STOP",
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
    expect(result.visibleReply.toLowerCase()).not.toContain("oferta principal");
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("cae a fallback cuando Gemini devuelve una frase truncada", async () => {
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
                  text: "Entendido. Para entender mejor"
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

    expect(result.visibleReply).toBe(buildBriefChatFallbackReply("discovery", emptyStructuredBriefSummary(), "Quiero lanzar una campana"));
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("cae a fallback cuando Gemini corta la salida por maximo de tokens", async () => {
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
                  text: "Perfecto, ya entiendo el contexto y te voy a ayudar con"
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

    expect(result.visibleReply).toBe(
      buildBriefChatFallbackReply("precision", emptyStructuredBriefSummary(), "Necesito una landing para vender")
    );
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