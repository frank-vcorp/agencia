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
  getBriefItinerarySufficiency,
  getCurrentVisibleStageQuestion,
  getCriticalMissingFields,
  hasBackgroundStageSufficientInfo,
  hasMeaningfulNarrativeAnswer,
  hasMeaningfulSummaryValue,
  isNarrativeQuestionAskedInMessage,
  mapVikaBriefDataToStructuredSummary,
  mergeStructuredBriefSummary,
  nextStage,
  selectPreferredProject,
  statusFromStage,
  VIKA_BRIEF_FIELDS,
  VIKA_CLOSURE_CORE_KEYS,
  VIKA_NARRATIVE_QUESTION,
  VIKA_REQUIRED_FRONTS
} from "./briefing";
import {
  BRIEF_COMPLETO_TAG_REGEX,
  buildBriefChatSystemPrompt,
  extractJsonObject,
  generateBriefChatReply,
  generateBriefClosure,
  isAcceptableAssistantVisibleReply,
  isBriefSufficientForClosure,
  LOCK_SUCCESS_TAG_REGEX,
  sanitizeAssistantReply,
  shouldForceClosure
} from "./briefing-assistant-ai";
import { VIKA_NARRATIVE_QUESTION } from "./briefing";

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
  it("incluye el System Prompt Maestro de Vika con sus reglas de oro e itinerario de suficiencia (5 frentes)", () => {
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
    // IMPL-20260615-40: el itinerario declara "14 PREGUNTAS TOTALES -
    // 1 APERTURA + 13 FRENTES" (sin condicional en el conteo) y la fase
    // de narrativa es UNA SOLA pregunta fija.
    expect(prompt).toContain("ITINERARIO DE LA CONVERSACIÓN (14 PREGUNTAS TOTALES - 1 APERTURA + 13 FRENTES)");
    expect(prompt).toContain("NUCLEO (5 frentes, cierre requiere que esten suficientemente cubiertos)");
    expect(prompt).toContain("FRENTES COMPLEMENTARIOS (8 frentes, DEBEN preguntarse para permitir el cierre)");
    // Lista explicita de los 13 frentes obligatorios (IMPL-20260615-24)
    expect(prompt).toContain("Los 13 frentes obligatorios son:");
    expect(prompt).toContain("1. giro_y_producto_heroe");
    expect(prompt).toContain("2. audience (diferenciador)");
    expect(prompt).toContain("3. presupuesto");
    expect(prompt).toContain("4. cta_deseado");
    expect(prompt).toContain("5. historia_y_contexto");
    expect(prompt).toContain("6. persona_perfil");
    expect(prompt).toContain("7. administracion_negocio");
    expect(prompt).toContain("8. madurez");
    expect(prompt).toContain("9. local_fisico");
    expect(prompt).toContain("10. logo");
    expect(prompt).toContain("11. objeciones");
    expect(prompt).toContain("12. publicidad_previa");
    expect(prompt).toContain("13. planes_futuro");
    // Regla de cierre: emitir JSON con las claves que tengan valor significativo
    expect(prompt).toContain("las claves que tengan valor significativo");
    expect(prompt).toContain("omite las vacias");
    // El viejo "CHECKLIST DE EXTRACCIÓN (13 PUNTOS OBLIGATORIOS)" ya NO debe existir.
    expect(prompt).not.toContain("CHECKLIST DE EXTRACCIÓN (13 PUNTOS OBLIGATORIOS)");
    // IMPL-20260615-40: la fase narrativa es UNA SOLA pregunta fija.
    // La regla de "2 preguntas obligatorias" ya NO debe existir.
    expect(prompt).toContain("FASE DE NARRATIVA - 1 PREGUNTA FIJA OBLIGATORIA");
    expect(prompt).toContain(VIKA_NARRATIVE_QUESTION);
    expect(prompt).not.toContain("FASE DE NARRATIVA - 2 PREGUNTAS OBLIGATORIAS");
    // La segunda pregunta ("¿Cómo te animaste?") ya NO debe existir en el prompt.
    expect(prompt).not.toContain("¿Cómo te animaste a poner el negocio?");
    // IMPL-20260615-40: la regla de cierre ahora es MAS explicita sobre la narrativa.
    expect(prompt).toContain("PREGUNTA NARRATIVA ES EL ULTIMO FRENTE OBLIGATORIO");
    expect(prompt).toContain("DESPUES de que respondan a esa pregunta, en tu SIGUIENTE turno DEBES cerrar");
    expect(prompt).toContain("EL SIGUIENTE TURNO ES DE CIERRE");
    // Apertura canonica
    expect(prompt).toContain("¿De qué es tu negocio y qué es lo que más se vende?");
    // Historial
    expect(prompt).toContain("HISTORIAL RECIENTE");
    expect(prompt).toContain("Cliente: Tengo una pizzería");
    // No hay menciones a etapas (discovery/precision/commercial_fit) en el prompt de chat
    expect(prompt).not.toContain("Etapa actual:");
    expect(prompt).not.toContain("Frentes pendientes");
    // IMPL-20260615-40: los tags [FRONT_ASKED]/[FRONT_COMPLETED] ya NO
    // estan en el prompt (la deteccion ahora es por persistencia en summary
    // y por la pregunta narrativa fija).
    expect(prompt).not.toContain("MARCADO EXPLICITO DE FRENTES");
    expect(prompt).not.toContain("[FRONT_ASKED: nombre_frente]");
    expect(prompt).not.toContain("[FRONT_COMPLETED: nombre_frente]");
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
    // IMPL-20260615-27: gemini-flash-lite-latest puede cortar por MAX_TOKENS
    // y aun asi producir una respuesta visible valida. MAX_TOKENS esta en
    // RELIABLE_VISIBLE_FINISH_REASONS, asi que NO se rechaza.
    expect(
      isAcceptableAssistantVisibleReply(
        "Perfecto, ya entiendo el contexto y puedo ayudarte con el siguiente paso.",
        "MAX_TOKENS"
      )
    ).toBe(true);

    // SAFETYNET, RECITATION y otros finishReason no listados si se rechazan.
    expect(
      isAcceptableAssistantVisibleReply(
        "Respuesta cortada de forma no confiable.",
        "SAFETY"
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

  it("usa fallback deterministico para cierre cuando GEMINI_API_KEY no existe y emite tag + JSON solo con claves con valor", async () => {
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

/**
 * IMPL-20260615-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260615-01_cierre_brief_por_itinerario_y_suficiencia_v1.md
 *
 * Tests del nucleo de suficiencia (5 frentes) y de la nueva logica de
 * cierre deterministico por itinerario + suficiencia. Reemplazan al
 * requisito de los 13 puntos del checklist (ARCH-20260612-01).
 */
describe("briefing - nucleo de suficiencia (IMPL-20260615-01)", () => {
  it("expone 5 frentes en VIKA_CLOSURE_CORE_KEYS con etiquetas en espanol natural", () => {
    expect(VIKA_CLOSURE_CORE_KEYS).toHaveLength(5);
    const labels = VIKA_CLOSURE_CORE_KEYS.map((entry) => entry.label);
    expect(labels).toEqual([
      "que vendes y que sale mas",
      "a quien le hablas o por que te compran a ti",
      "con cuanto cuentas al mes para invertir",
      "que accion quieres que haga el cliente",
      "el origen o la historia de tu negocio"
    ]);
    const keys = VIKA_CLOSURE_CORE_KEYS.map((entry) => entry.summaryKey);
    expect(keys).toEqual([
      "giroYProductoHeroe",
      "audience",
      "presupuesto",
      "cta",
      "historiaYContexto"
    ]);
    // El frente narrativo tiene narrativePair redundante hacia historiaNegocio
    const narrativa = VIKA_CLOSURE_CORE_KEYS.find((entry) => entry.summaryKey === "historiaYContexto");
    expect(narrativa?.narrativePair).toBe("historiaNegocio");
  });

  it("getBriefItinerarySufficiency retorna sufficient=true con los 5 frentes cubiertos", () => {
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Pizzeria - especial de carnes frias",
      audience: "Duenos de negocio que valoran tradicion",
      presupuesto: "$3,000 MXN mensuales",
      cta: "Pedir por WhatsApp",
      historiaYContexto: "Receta heredada de la abuela"
    });

    const result = getBriefItinerarySufficiency(summary);

    expect(result.sufficient).toBe(true);
    expect(result.completedCore).toBe(5);
    expect(result.totalCore).toBe(5);
    expect(result.missingCore).toEqual([]);
  });

  it("getBriefItinerarySufficiency retorna faltantes cuando solo hay 3 de 5 frentes", () => {
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Pizzeria",
      presupuesto: "$3,000 MXN",
      cta: "Pedir por WhatsApp"
    });

    const result = getBriefItinerarySufficiency(summary);

    expect(result.sufficient).toBe(false);
    expect(result.completedCore).toBe(3);
    expect(result.totalCore).toBe(5);
    expect(result.missingCore).toEqual([
      "a quien le hablas o por que te compran a ti",
      "el origen o la historia de tu negocio"
    ]);
  });

  it("getBriefItinerarySufficiency acepta historiaYContexto O historiaNegocio como cumplido (redundancia narrativa)", () => {
    const soloHistoriaNegocio = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Pizzeria",
      audience: "Duenos de negocio",
      presupuesto: "$3,000 MXN",
      cta: "WhatsApp",
      historiaNegocio: "Herencia familiar de tres generaciones"
    });

    const resultSoloHistoria = getBriefItinerarySufficiency(soloHistoriaNegocio);
    expect(resultSoloHistoria.sufficient).toBe(true);
    expect(resultSoloHistoria.missingCore).toEqual([]);

    const soloHistoriaYContexto = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Pizzeria",
      audience: "Duenos de negocio",
      presupuesto: "$3,000 MXN",
      cta: "WhatsApp",
      historiaYContexto: "Tradicion familiar de la abuela"
    });

    const resultSoloContexto = getBriefItinerarySufficiency(soloHistoriaYContexto);
    expect(resultSoloContexto.sufficient).toBe(true);
  });

  it("getBriefItinerarySufficiency rechaza valores vacios o genericos como 'si' / 'hola'", () => {
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "si",
      audience: "hola",
      presupuesto: "$3,000 MXN",
      cta: "WhatsApp",
      historiaYContexto: "Receta de la abuela con tradicion de tres generaciones"
    });

    const result = getBriefItinerarySufficiency(summary);

    // giro_y_producto_heroe y audience tienen valor no significativo
    expect(result.sufficient).toBe(false);
    expect(result.completedCore).toBe(3);
    expect(result.missingCore).toEqual([
      "que vendes y que sale mas",
      "a quien le hablas o por que te compran a ti"
    ]);
  });

  it("isBriefSufficientForClosure es true solo con los 5 frentes del nucleo cubiertos", () => {
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Pizzeria",
      audience: "Duenos de negocio",
      presupuesto: "$3,000 MXN",
      cta: "WhatsApp",
      historiaYContexto: "Receta de la abuela"
    });

    expect(isBriefSufficientForClosure(summary)).toBe(true);
  });

  it("isBriefSufficientForClosure es false con resumen undefined o null", () => {
    expect(isBriefSufficientForClosure(undefined)).toBe(false);
    expect(isBriefSufficientForClosure(null)).toBe(false);
  });

  it("isBriefSufficientForClosure es false si solo 4 de 5 frentes estan cubiertos", () => {
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Pizzeria",
      audience: "Duenos de negocio",
      presupuesto: "$3,000 MXN",
      cta: "WhatsApp"
      // historiaYContexto e historiaNegocio ausentes
    });

    expect(isBriefSufficientForClosure(summary)).toBe(false);
  });

  it("shouldForceClosure retorna true cuando los 13 frentes obligatorios estan preguntados Y la narrativa fue respondida (IMPL-20260615-40)", () => {
    // IMPL-20260615-29: la funcion se simplifico. Ahora SOLO verifica que
    // areAllRequiredFrontsAsked() cubra los 13 frentes. El argumento
    // lastAssistantMessage ya no es determinante (Vika decide via
    // [SYS_ACTION: LOCK_SUCCESS] cuando emitir el cierre).
    // IMPL-20260615-40: ademas requiere que narrativeAnswer tenga valor
    // significativo y que la pregunta narrativa haya sido hecha.
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Pizzeria",
      audience: "Duenos de negocio",
      presupuesto: "$3,000 MXN",
      cta: "WhatsApp",
      historiaYContexto: "Receta de la abuela",
      frontsAsked: [
        "giro_y_producto_heroe",
        "audience",
        "presupuesto",
        "cta_deseado",
        "historia_y_contexto",
        "persona_perfil",
        "administracion_negocio",
        "madurez",
        "local_fisico",
        "logo",
        "objeciones",
        "publicidad_previa",
        "planes_futuro"
      ],
      narrativeQuestionAsked: VIKA_NARRATIVE_QUESTION,
      narrativeAnswer: "Atender a los clientes y mantener la calidad constante"
    });

    expect(shouldForceClosure(summary, VIKA_NARRATIVE_QUESTION)).toBe(true);
    // El argumento lastAssistantMessage ya no bloquea el cierre si la
    // narrativa esta persistida (IMPL-20260615-29, refinado en IMPL-20260615-40).
    expect(shouldForceClosure(summary, "Perfecto, gracias por la informacion.")).toBe(true);
  });

  it("shouldForceClosure retorna false si NO se han preguntado los 13 frentes (IMPL-20260615-29)", () => {
    // Solo 8 frentes preguntados -> faltan 5 -> debe ser false.
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Pizzeria",
      audience: "Duenos de negocio",
      presupuesto: "$3,000 MXN",
      cta: "WhatsApp",
      historiaYContexto: "Receta de la abuela",
      frontsAsked: [
        "giro_y_producto_heroe",
        "audience",
        "presupuesto",
        "cta_deseado",
        "historia_y_contexto",
        "administracion_negocio",
        "objeciones",
        "planes_futuro"
      ],
      narrativeQuestionAsked: VIKA_NARRATIVE_QUESTION,
      narrativeAnswer: "Atender a los clientes y mantener la calidad constante"
    });

    expect(shouldForceClosure(summary, VIKA_NARRATIVE_QUESTION)).toBe(false);
  });

  it("shouldForceClosure retorna false si frontsAsked esta vacio aunque el resumen tenga datos", () => {
    // IMPL-20260615-29: frontsAsked vacio -> false aunque el nucleo este
    // completo. La red de seguridad depende de los tags explicitos.
    // IMPL-20260615-40: ademas la narrativa debe estar contestada.
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Pizzeria",
      audience: "Duenos de negocio",
      presupuesto: "$3,000 MXN",
      cta: "WhatsApp",
      historiaYContexto: "Receta de la abuela",
      narrativeQuestionAsked: VIKA_NARRATIVE_QUESTION,
      narrativeAnswer: "Atender a los clientes y mantener la calidad constante"
    });

    expect(shouldForceClosure(summary, VIKA_NARRATIVE_QUESTION)).toBe(false);
  });

  it("shouldForceClosure retorna false con resumen null/undefined", () => {
    expect(shouldForceClosure(null, VIKA_NARRATIVE_QUESTION)).toBe(false);
    expect(shouldForceClosure(undefined, VIKA_NARRATIVE_QUESTION)).toBe(false);
  });

  it("shouldForceClosure retorna false si narrativeAnswer es null aunque los 13 frentes esten preguntados (IMPL-20260615-40)", () => {
    // IMPL-20260615-40: la narrativa es el ULTIMO frente obligatorio. Sin
    // respuesta significativa del cliente, NO cerramos aunque el resumen
    // este completo en los 13 frentes.
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Pizzeria",
      audience: "Duenos de negocio",
      presupuesto: "$3,000 MXN",
      cta: "WhatsApp",
      historiaYContexto: "Receta de la abuela",
      frontsAsked: [...VIKA_REQUIRED_FRONTS],
      narrativeQuestionAsked: VIKA_NARRATIVE_QUESTION,
      narrativeAnswer: null
    });

    expect(shouldForceClosure(summary, VIKA_NARRATIVE_QUESTION)).toBe(false);
  });

  it("shouldForceClosure retorna false si narrativeAnswer es vacio o generico (IMPL-20260615-40)", () => {
    const summaryWithEmpty = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Pizzeria",
      audience: "Duenos de negocio",
      presupuesto: "$3,000 MXN",
      cta: "WhatsApp",
      historiaYContexto: "Receta de la abuela",
      frontsAsked: [...VIKA_REQUIRED_FRONTS],
      narrativeQuestionAsked: VIKA_NARRATIVE_QUESTION,
      narrativeAnswer: ""
    });

    const summaryWithGeneric = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Pizzeria",
      audience: "Duenos de negocio",
      presupuesto: "$3,000 MXN",
      cta: "WhatsApp",
      historiaYContexto: "Receta de la abuela",
      frontsAsked: [...VIKA_REQUIRED_FRONTS],
      narrativeQuestionAsked: VIKA_NARRATIVE_QUESTION,
      narrativeAnswer: "si"
    });

    expect(shouldForceClosure(summaryWithEmpty, VIKA_NARRATIVE_QUESTION)).toBe(false);
    expect(shouldForceClosure(summaryWithGeneric, VIKA_NARRATIVE_QUESTION)).toBe(false);
  });

  it("shouldForceClosure retorna false si la pregunta narrativa NO fue hecha (IMPL-20260615-40)", () => {
    // Vika tiene los 13 frentes preguntados y la respuesta del cliente,
    // pero nunca hizo la pregunta narrativa -> NO cerramos.
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Pizzeria",
      audience: "Duenos de negocio",
      presupuesto: "$3,000 MXN",
      cta: "WhatsApp",
      historiaYContexto: "Receta de la abuela",
      frontsAsked: [...VIKA_REQUIRED_FRONTS],
      narrativeQuestionAsked: null,
      narrativeAnswer: "Atender a los clientes y mantener la calidad constante"
    });

    expect(shouldForceClosure(summary, "otro mensaje sin narrativa")).toBe(false);
  });

  it("generateBriefClosure omite claves sin valor significativo en el JSON de cierre", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Pizzeria - carnes frias",
      presupuesto: "$3,000 MXN"
      // audience, cta, historiaYContexto intencionalmente vacios
    });

    const result = await generateBriefClosure({
      summary,
      messages: [{ authorRole: "client", messageText: "Vendo pizzas" }]
    });

    expect(result.json).not.toBeNull();
    expect(result.json?.giro_y_producto_heroe).toBe("Pizzeria - carnes frias");
    expect(result.json?.presupuesto).toBe("$3,000 MXN");
    // Las claves vacias NO deben aparecer
    expect(result.json).not.toHaveProperty("cta_deseado");
    expect(result.json).not.toHaveProperty("persona_perfil");
    expect(result.json).not.toHaveProperty("historia_y_contexto");
    // El conteo de claves debe ser exactamente 2
    expect(Object.keys(result.json ?? {})).toHaveLength(2);

    vi.unstubAllEnvs();
  });
});
