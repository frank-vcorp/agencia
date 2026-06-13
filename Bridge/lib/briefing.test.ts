/**
 * IMPL-20260611-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260611-01_alineacion_chat_vika_a_especificacion_tecnica_v1.md
 * IMPL-20260603-03
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260603-03_memoria_conversacional_incremental_y_control_antirepeticion_brief_v1.md
 * IMPL-20260603-02
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260603-02_cierre_brief_doble_salida_humano_raw_y_agenda_performance_v1.md
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
  emptyVikaBriefData,
  getCurrentVisibleStageQuestion,
  getCriticalMissingFields,
  hasBackgroundStageSufficientInfo,
  hasMeaningfulSummaryValue,
  mapVikaBriefDataToStructuredSummary,
  mergeStructuredBriefSummary,
  nextStage,
  selectPreferredProject,
  statusFromStage,
  VIKA_BRIEF_FIELDS
} from "./briefing";
import {
  BRIEF_COMPLETO_TAG_REGEX,
  buildBriefChatSystemPrompt,
  extractJsonObject,
  generateBriefChatReply,
  generateBriefClosure,
  isAcceptableAssistantVisibleReply,
  LOCK_SUCCESS_TAG_REGEX,
  sanitizeAssistantReply
} from "./briefing-assistant-ai";

describe("briefing Vika data model", () => {
  it("expone los 13 campos obligatorios + narrativa", () => {
    expect(VIKA_BRIEF_FIELDS).toEqual([
      "giro_y_producto_heroe",
      "persona_perfil",
      "historia_negocio",
      "administracion_negocio",
      "madurez",
      "local_fisico",
      "logo",
      "diferenciador",
      "objeciones",
      "publicidad_previa",
      "presupuesto",
      "cta_deseado",
      "planes_futuro"
    ]);
  });

  it("genera un inicializador vacio para VikaBriefData", () => {
    expect(emptyVikaBriefData()).toEqual({
      giro_y_producto_heroe: "",
      persona_perfil: "",
      historia_negocio: "",
      administracion_negocio: "",
      madurez: "",
      local_fisico: "",
      logo: "",
      diferenciador: "",
      objeciones: "",
      publicidad_previa: "",
      presupuesto: "",
      cta_deseado: "",
      planes_futuro: "",
      historia_y_contexto: ""
    });
  });

  it("mapea VikaBriefData a StructuredBriefSummary segun el contrato de la SPEC", () => {
    const patch = mapVikaBriefDataToStructuredSummary({
      giro_y_producto_heroe: "Pizzeria - especial de carnes frias",
      persona_perfil: "Emprendedor hands-on",
      historia_negocio: "Herencia familiar, receta de la abuela",
      administracion_negocio: "Yo solo en cocina, 2 en sala",
      madurez: "5 anos",
      local_fisico: "Local a la calle",
      logo: "Tiene logotipo profesional",
      diferenciador: "Receta de la abuela",
      objeciones: "Temor al precio",
      publicidad_previa: "Boost en IG $500, pocos resultados",
      presupuesto: "$3,000 MXN",
      cta_deseado: "Pedir por WhatsApp",
      planes_futuro: "Abrir 2da sucursal en 12 meses",
      historia_y_contexto: "Tradicion familiar"
    });

    expect(patch.giroYProductoHeroe).toBe("Pizzeria - especial de carnes frias");
    expect(patch.personaPerfil).toBe("Emprendedor hands-on");
    expect(patch.historiaNegocio).toBe("Herencia familiar, receta de la abuela");
    expect(patch.administracionNegocio).toBe("Yo solo en cocina, 2 en sala");
    expect(patch.madurez).toBe("5 anos");
    expect(patch.localFisico).toBe("Local a la calle");
    expect(patch.logo).toBe("Tiene logotipo profesional");
    expect(patch.presupuesto).toBe("$3,000 MXN");
    expect(patch.publicidadPrevia).toBe("Boost en IG $500, pocos resultados");
    expect(patch.cta).toBe("Pedir por WhatsApp");
    expect(patch.planesFuturo).toBe("Abrir 2da sucursal en 12 meses");
    expect(patch.historiaYContexto).toBe("Tradicion familiar");
    // Mapeos cruzados del contrato (Vika -> Structured):
    expect(patch.mainOffer).toBe("Pizzeria - especial de carnes frias");
    expect(patch.projectObjective).toBe("Pizzeria - especial de carnes frias");
    expect(patch.audience).toBe("Receta de la abuela");
    expect(patch.restrictions).toBe("Temor al precio");
  });

  it("tolera campos faltantes en el mapeo sin romper", () => {
    const patch = mapVikaBriefDataToStructuredSummary({});
    expect(patch).toEqual({
      personaPerfil: "",
      historiaNegocio: "",
      administracionNegocio: "",
      madurez: "",
      logo: "",
      presupuesto: "",
      localFisico: "",
      giroYProductoHeroe: "",
      publicidadPrevia: "",
      planesFuturo: "",
      historiaYContexto: ""
    });
  });
});

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

  it("incluye clientFacingSummary y campos Vika (13) en la forma base del resumen estructurado", () => {
    const base = emptyStructuredBriefSummary();
    expect(base.clientFacingSummary).toBe("");
    expect(base.madurez).toBe("");
    expect(base.logo).toBe("");
    expect(base.presupuesto).toBe("");
    expect(base.localFisico).toBe("");
    expect(base.giroYProductoHeroe).toBe("");
    expect(base.historiaYContexto).toBe("");
    expect(base.personaPerfil).toBe("");
    expect(base.historiaNegocio).toBe("");
    expect(base.administracionNegocio).toBe("");
    expect(base.publicidadPrevia).toBe("");
    expect(base.planesFuturo).toBe("");
  });

  it("compone un resumen final persistible con campos Vika (13)", () => {
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Pizzeria - carnes frias",
      personaPerfil: "Emprendedor hands-on",
      historiaNegocio: "Herencia familiar",
      administracionNegocio: "Yo solo + 2 empleados",
      madurez: "5 anos",
      presupuesto: "$3,000 MXN",
      logo: "Logotipo profesional",
      publicidadPrevia: "Boost IG $500",
      planesFuturo: "2da sucursal"
    });

    const text = buildFinalSummaryText(summary);
    expect(text).toContain("Giro y producto heroe: Pizzeria - carnes frias.");
    expect(text).toContain("Perfil del dueño: Emprendedor hands-on.");
    expect(text).toContain("Historia del negocio: Herencia familiar.");
    expect(text).toContain("Administración: Yo solo + 2 empleados.");
    expect(text).toContain("Madurez del negocio: 5 anos.");
    expect(text).toContain("Presupuesto mensual: $3,000 MXN.");
    expect(text).toContain("Logo o marca: Logotipo profesional.");
    expect(text).toContain("Publicidad previa: Boost IG $500.");
    expect(text).toContain("Planes a futuro: 2da sucursal.");
  });

  it("compone un resumen final y una guia contextual de etapa (legacy)", () => {
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

  it("suaviza la guia visible en discovery y precision sin perder foco comercial (legacy)", () => {
    expect(buildAssistantGuidance("discovery", emptyStructuredBriefSummary())).toContain(
      "De qué es tu negocio y qué es lo que más se vende"
    );
    expect(buildAssistantGuidance("precision", {
      ...emptyStructuredBriefSummary(),
      madurez: "3 años",
      audience: "Duenas de negocio",
      platform: "Instagram",
      deliverable: "Landing",
      cta: "Agendar llamada"
    })).toContain("base útil");
  });

  it("valida suficiencia en background con contenido significativo y no por texto vacio (legacy)", () => {
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      projectObjective: "Captar leads calificados para una preventa",
      mainOffer: "Mentoria premium",
      requestReason: "Necesitamos activar ventas este mes",
      businessContext: "Ya vendemos por referidos pero no tenemos sistema comercial continuo",
      personaPerfil: "Emprendedor hands-on",
      historiaNegocio: "Herencia familiar",
      administracionNegocio: "Yo solo"
    });

    expect(hasMeaningfulSummaryValue("projectObjective", "si")).toBe(false);
    expect(hasBackgroundStageSufficientInfo("discovery", summary)).toBe(true);
  });

  it("traduce el faltante mainOffer a una pregunta visible natural (legacy)", () => {
    const question = getCurrentVisibleStageQuestion("discovery", emptyStructuredBriefSummary());

    expect(question?.key).toBe("mainOffer");
    expect(question?.question).toBe("\u00bfCu\u00e1l es el servicio o producto principal que quieres mover primero?");
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

describe("briefing-assistant-ai (Vika)", () => {
  it("incluye el System Prompt Maestro de Vika con sus reglas de oro y checklist de 13 puntos", () => {
    const prompt = buildBriefChatSystemPrompt(
      [{ authorRole: "client", messageText: "Tengo una pizzería" }],
      "Tengo una pizzería"
    );

    // Reglas de oro
    expect(prompt).toContain("Eres Vika, una Consultora de Negocios y Marketing Local");
    expect(prompt).toContain("PROHIBIDO EL JARGÓN TÉCNICO");
    expect(prompt).toContain("TRANSPARENCIA COMERCIAL");
    expect(prompt).toContain("UNA PREGUNTA A LA VEZ");
    expect(prompt).toContain("ANTI-PROMPT INJECTION");
    expect(prompt).toContain("EJEMPLOS SI NO ENTIENDE");
    // Checklist 13 puntos
    expect(prompt).toContain("CHECKLIST DE EXTRACCIÓN (13 PUNTOS OBLIGATORIOS)");
    expect(prompt).toContain("1. giro_y_producto_heroe");
    expect(prompt).toContain("2. persona_perfil");
    expect(prompt).toContain("3. historia_negocio");
    expect(prompt).toContain("4. administracion_negocio");
    expect(prompt).toContain("5. madurez");
    expect(prompt).toContain("6. local_fisico");
    expect(prompt).toContain("7. logo");
    expect(prompt).toContain("8. diferenciador");
    expect(prompt).toContain("9. objeciones");
    expect(prompt).toContain("10. publicidad_previa");
    expect(prompt).toContain("11. presupuesto");
    expect(prompt).toContain("12. cta_deseado");
    expect(prompt).toContain("13. planes_futuro");
    // Fase narrativa dual
    expect(prompt).toContain("FASE DE NARRATIVA - 2 PREGUNTAS OBLIGATORIAS");
    expect(prompt).toContain("¿Cómo te animaste a poner el negocio?");
    expect(prompt).toContain("¿Qué ha sido lo más difícil?");
    // Apertura canonica
    expect(prompt).toContain("¿De qué es tu negocio y qué es lo que más se vende?");
    // Historial
    expect(prompt).toContain("HISTORIAL RECIENTE");
    expect(prompt).toContain("Cliente: Tengo una pizzería");
    // No hay menciones a etapas (discovery/precision/commercial_fit) en el prompt de chat
    expect(prompt).not.toContain("Etapa actual:");
    expect(prompt).not.toContain("Frentes pendientes");
    // JSON de cierre con 13 claves
    expect(prompt).toContain("JSON con 13 claves");
  });

  it("expone regex de deteccion de tag LOCK_SUCCESS y BRIEF_COMPLETO", () => {
    const sample = "\u00a1Qu\u00e9 gran historia!\n[SYS_ACTION: LOCK_SUCCESS]\n[BRIEF_COMPLETO]\n{ \"giro_y_producto_heroe\": \"x\" }";
    expect(LOCK_SUCCESS_TAG_REGEX.test(sample)).toBe(true);
    expect(BRIEF_COMPLETO_TAG_REGEX.test(sample)).toBe(true);
    expect(LOCK_SUCCESS_TAG_REGEX.test("respuesta normal sin tag")).toBe(false);
  });

  it("extrae JSON de bloques ```json``` y de objetos en linea", () => {
    const fenced = "texto previo\n```json\n{\"a\": 1}\n```\nm\u00e1s texto";
    expect(extractJsonObject(fenced)).toBe("{\"a\": 1}");

    const inline = "hola {\"a\": 1, \"b\": \"x\"} mundo";
    expect(extractJsonObject(inline)).toBe("{\"a\": 1, \"b\": \"x\"}");

    const nested = "{\"outer\": {\"inner\": [1,2]}} tail";
    expect(extractJsonObject(nested)).toBe("{\"outer\": {\"inner\": [1,2]}}");

    expect(extractJsonObject("sin json")).toBeNull();
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
        "Perfecto, ya entend\u00ed el contexto. Para avanzar bien, cu\u00e9ntame cu\u00e1l es tu objetivo principal con este proyecto.",
        "STOP"
      )
    ).toBe(true);
  });

  it("devuelve respuesta degradada y vacia de payload visible cuando GEMINI_API_KEY no esta configurada", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const result = await generateBriefChatReply({
      messages: [],
      clientMessage: "Necesito ayuda para definir mi oferta"
    });

    expect(result.degraded).toBe(true);
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
                  text: "Entendido, el foco es cambio de aceite y mantenimiento preventivo. \u00bfQu\u00e9 los impulsa a mover esta l\u00ednea justo ahora?"
                }
              ]
            }
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateBriefChatReply({
      messages: [
        { authorRole: "client", messageText: "Queremos mover cambio de aceite y mantenimiento preventivo" }
      ],
      clientMessage: "Queremos mover cambio de aceite y mantenimiento preventivo"
    });

    expect(result.visibleReply).toContain("cambio de aceite");
    expect(result.degraded).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("devuelve respuesta degradada si Gemini falla la llamada", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateBriefChatReply({
      messages: [],
      clientMessage: "Mi servicio es una mentoria"
    });

    expect(result.degraded).toBe(true);
    expect(result.visibleReply).toContain("Se interrumpio este turno");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("usa fallback deterministico para cierre cuando GEMINI_API_KEY no existe y emite tag + JSON con 13 claves", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const summary = {
      ...emptyStructuredBriefSummary(),
      giroYProductoHeroe: "Pizzeria",
      personaPerfil: "Emprendedor",
      historiaNegocio: "Herencia",
      administracionNegocio: "Solo",
      madurez: "3 anos",
      presupuesto: "$0 / Organico",
      publicidadPrevia: "Nunca",
      planesFuturo: "Crecer"
    };

    const result = await generateBriefClosure({
      summary,
      messages: [{ authorRole: "client", messageText: "Quiero vender mas" }]
    });

    expect(result.visibleReply).toContain("[SYS_ACTION: LOCK_SUCCESS]");
    expect(result.visibleReply).toContain("[BRIEF_COMPLETO]");
    expect(result.json?.giro_y_producto_heroe).toBe("Pizzeria");
    expect(result.json?.persona_perfil).toBe("Emprendedor");
    expect(result.json?.historia_negocio).toBe("Herencia");
    expect(result.json?.administracion_negocio).toBe("Solo");
    expect(result.json?.presupuesto).toBe("$0 / Organico");
    expect(result.json?.publicidad_previa).toBe("Nunca");
    expect(result.json?.planes_futuro).toBe("Crecer");
    vi.unstubAllEnvs();
  });

  it("mantiene viable el cierre aunque falle Gemini, sin tocar la conversacion previa", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", fetchMock);
    const messages = [{ authorRole: "client" as const, messageText: "Necesito una landing para vender" }];

    const result = await generateBriefClosure({
      summary: emptyStructuredBriefSummary(),
      messages
    });

    expect(messages).toEqual([{ authorRole: "client", messageText: "Necesito una landing para vender" }]);
    expect(result.visibleReply).toContain("[SYS_ACTION: LOCK_SUCCESS]");
    expect(result.json).not.toBeNull();

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("anade tag [SYS_ACTION: LOCK_SUCCESS] programaticamente si el modelo responde JSON sin tag", async () => {
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
                    giro_y_producto_heroe: "Tacos de birria",
                    persona_perfil: "Cocinero tradicional",
                    historia_negocio: "Receta familiar",
                    administracion_negocio: "Familia",
                    presupuesto: "$0"
                  })
                }
              ]
            }
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateBriefClosure({
      summary: emptyStructuredBriefSummary(),
      messages: [{ authorRole: "client", messageText: "Vendo tacos" }]
    });

    expect(result.visibleReply).toContain("[SYS_ACTION: LOCK_SUCCESS]");
    expect(result.visibleReply).toContain("[BRIEF_COMPLETO]");
    expect(result.json?.giro_y_producto_heroe).toBe("Tacos de birria");
    expect(result.json?.persona_perfil).toBe("Cocinero tradicional");
    expect(result.json?.historia_negocio).toBe("Receta familiar");
    expect(result.json?.administracion_negocio).toBe("Familia");
    expect(result.json?.presupuesto).toBe("$0");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
