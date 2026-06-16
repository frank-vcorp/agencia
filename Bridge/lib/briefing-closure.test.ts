/**
 * IMPL-20260615-33
 * Tests automatizados del flujo de cierre del chat de Vika con tags explicitos.
 *
 * Cubre end-to-end la nueva logica de cierre (IMPL-20260615-24 .. IMPL-20260615-32):
 *  - Deteccion de frentes preguntados via tags [FRONT_ASKED: x] y [FRONT_COMPLETED: x]
 *  - Regla deterministica shouldForceClosure: cierra cuando los 13 frentes estan preguntados
 *  - Sincronizacion de frontsAsked en el resumen antes de evaluar el cierre
 *  - El sanitizer extrae los tags antes de validar la respuesta visible
 *  - normalizeSummary preserva el array frontsAsked (no lo descarta)
 *  - isAcceptableAssistantVisibleReply acepta finishReason MAX_TOKENS
 */
import { describe, expect, it } from "vitest";

import {
  areAllRequiredFrontsAsked,
  detectFrontsAskedFromHistory,
  emptyStructuredBriefSummary,
  hasMeaningfulNarrativeAnswer,
  isNarrativeQuestionAskedInMessage,
  mergeStructuredBriefSummary,
  normalizeSummary,
  VIKA_NARRATIVE_QUESTION,
  VIKA_REQUIRED_FRONTS
} from "./briefing";
import {
  BRIEF_COMPLETO_TAG_REGEX,
  buildBriefChatSystemPrompt,
  FRONT_ASKED_TAG_REGEX,
  FRONT_COMPLETED_TAG_REGEX,
  isAcceptableAssistantVisibleReply,
  LOCK_SUCCESS_TAG_REGEX,
  sanitizeAssistantReply,
  shouldForceClosure
} from "./briefing-assistant-ai";

// Conversacion simulada de un cliente (tacos) con todos los 13 frentes cubiertos
// y la pregunta narrativa final respondida. Cada vez que Vika pregunta emite
// [FRONT_ASKED: x]; despues de que el cliente responde, emite [FRONT_COMPLETED: x]
// y pasa al siguiente frente.
function buildTaqueriaConversationWithTags(): Array<{ authorRole: "client" | "assistant"; messageText: string }> {
  return [
    {
      authorRole: "assistant",
      messageText: "¡Hola! Para armar tu estrategia, cuéntame: ¿De qué es tu negocio y qué es lo que más se vende?\n[FRONT_ASKED: giro_y_producto_heroe]"
    },
    { authorRole: "client", messageText: "vendemos tacos de carne asada" },
    {
      authorRole: "assistant",
      messageText: "[FRONT_COMPLETED: giro_y_producto_heroe]\n¿Quiénes son las personas que más te compran?\n[FRONT_ASKED: audience]"
    },
    { authorRole: "client", messageText: "trabajadores y gente de mi colonia" },
    {
      authorRole: "assistant",
      messageText: "[FRONT_COMPLETED: audience]\n¿Tienes pensado invertir algo al mes para que más gente conozca tus tacos?\n[FRONT_ASKED: presupuesto]"
    },
    { authorRole: "client", messageText: "$1,000 pesos" },
    {
      authorRole: "assistant",
      messageText: "[FRONT_COMPLETED: presupuesto]\n¿Qué te gustaría que hiciera la gente que vea tu publicidad?\n[FRONT_ASKED: cta_deseado]"
    },
    { authorRole: "client", messageText: "que vayan al puesto" },
    {
      authorRole: "assistant",
      messageText: "[FRONT_COMPLETED: cta_deseado]\n¿Cómo te animaste a poner el negocio de los tacos?\n[FRONT_ASKED: historia_y_contexto]"
    },
    { authorRole: "client", messageText: "me gusta hacer carne asada y decidi ponerlo" },
    {
      authorRole: "assistant",
      messageText: "[FRONT_COMPLETED: historia_y_contexto]\n¿Cómo te describirías como el dueño de este negocio?\n[FRONT_ASKED: persona_perfil]"
    },
    { authorRole: "client", messageText: "soy muy activo me gusta estar cocinando" },
    {
      authorRole: "assistant",
      messageText: "[FRONT_COMPLETED: persona_perfil]\n¿Trabajas solo o tienes gente que te ayuda?\n[FRONT_ASKED: administracion_negocio]"
    },
    { authorRole: "client", messageText: "tengo gente que me ayuda" },
    {
      authorRole: "assistant",
      messageText: "[FRONT_COMPLETED: administracion_negocio]\n¿Usas algún programa o sistema, o lo llevas en una libreta?\n[FRONT_ASKED: administracion_negocio]"
    },
    { authorRole: "client", messageText: "tenemos un sistema en excel" },
    {
      authorRole: "assistant",
      messageText: "[FRONT_COMPLETED: administracion_negocio]\n¿Cuánto tiempo llevan tus tacos funcionando?\n[FRONT_ASKED: madurez]"
    },
    { authorRole: "client", messageText: "llevo un año" },
    {
      authorRole: "assistant",
      messageText: "[FRONT_COMPLETED: madurez]\n¿Tu negocio tiene logo?\n[FRONT_ASKED: logo]"
    },
    { authorRole: "client", messageText: "sí, tenemos logo" },
    {
      authorRole: "assistant",
      messageText: "[FRONT_COMPLETED: logo]\n¿Dónde está ubicado tu negocio?\n[FRONT_ASKED: local_fisico]"
    },
    { authorRole: "client", messageText: "en lapradera" },
    {
      authorRole: "assistant",
      messageText: "[FRONT_COMPLETED: local_fisico]\n¿Hay algo que la gente dude antes de comprar?\n[FRONT_ASKED: objeciones]"
    },
    { authorRole: "client", messageText: "que no sea carne congelada" },
    {
      authorRole: "assistant",
      messageText: "[FRONT_COMPLETED: objeciones]\n¿Alguna vez has intentado hacer publicidad?\n[FRONT_ASKED: publicidad_previa]"
    },
    { authorRole: "client", messageText: "imprimi unas hojitas" },
    {
      authorRole: "assistant",
      messageText: "[FRONT_COMPLETED: publicidad_previa]\n¿Tienes algún plan para tus tacos en 6-12 meses?\n[FRONT_ASKED: planes_futuro]"
    },
    { authorRole: "client", messageText: "quiero abrir un restaurante mas grande" },
    {
      authorRole: "assistant",
      messageText: "[FRONT_COMPLETED: planes_futuro]\nPara terminar, ¿qué ha sido lo más difícil de tener tu negocio de tacos?\n[FRONT_ASKED: historia_y_contexto]"
    },
    { authorRole: "client", messageText: "atender a los clientes y mantener la calidad" }
  ];
}

describe("flujo de cierre del chat de Vika con tags explicitos (IMPL-20260615-33)", () => {
  it("VIKA_REQUIRED_FRONTS contiene exactamente los 13 frentes obligatorios", () => {
    expect(VIKA_REQUIRED_FRONTS).toHaveLength(13);
    // Lista canonica de frentes que Vika debe preguntar antes de cerrar
    expect(VIKA_REQUIRED_FRONTS).toEqual([
      "giro_y_producto_heroe",
      "persona_perfil",
      "administracion_negocio",
      "madurez",
      "local_fisico",
      "logo",
      "audience",
      "objeciones",
      "publicidad_previa",
      "presupuesto",
      "cta_deseado",
      "planes_futuro",
      "historia_y_contexto"
    ]);
  });

  it("detectFrontsAskedFromHistory extrae los 13 frentes de los tags [FRONT_ASKED] y [FRONT_COMPLETED]", () => {
    const conversation = buildTaqueriaConversationWithTags();
    const assistantMessages = conversation
      .filter((m) => m.authorRole === "assistant")
      .map((m) => ({ messageText: m.messageText }));

    const detected = detectFrontsAskedFromHistory(assistantMessages);

    expect(detected).toHaveLength(13);
    expect(new Set(detected)).toEqual(new Set(VIKA_REQUIRED_FRONTS));
  });

  it("detectFrontsAskedFromHistory ignora tags con frente invalido (no estan en la lista)", () => {
    const messages = [
      { messageText: "Pregunta de prueba [FRONT_ASKED: giro_y_producto_heroe]" },
      { messageText: "Otro tag [FRONT_ASKED: frente_inventado]" },
      { messageText: "[FRONT_COMPLETED: audienc] (typo, sin guion bajo final)" }
    ];

    const detected = detectFrontsAskedFromHistory(messages);

    // Solo el frente valido se acepta
    expect(detected).toEqual(["giro_y_producto_heroe"]);
  });

  it("detectFrontsAskedFromHistory deduplica frentes preguntados en multiples turnos", () => {
    const messages = [
      { messageText: "[FRONT_ASKED: giro_y_producto_heroe]" },
      { messageText: "[FRONT_ASKED: giro_y_producto_heroe]" },
      { messageText: "[FRONT_COMPLETED: giro_y_producto_heroe]" }
    ];

    const detected = detectFrontsAskedFromHistory(messages);

    expect(detected).toEqual(["giro_y_producto_heroe"]);
  });

  it("areAllRequiredFrontsAsked retorna true cuando frontsAsked incluye los 13 frentes", () => {
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      frontsAsked: [...VIKA_REQUIRED_FRONTS]
    });

    expect(areAllRequiredFrontsAsked(summary)).toBe(true);
  });

  it("areAllRequiredFrontsAsked retorna false si falta UN solo frente obligatorio", () => {
    const frentesIncompletos = VIKA_REQUIRED_FRONTS.filter((f) => f !== "planes_futuro");
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      frontsAsked: frentesIncompletos
    });

    expect(areAllRequiredFrontsAsked(summary)).toBe(false);
  });

  it("shouldForceClosure retorna true con conversacion completa de 13 frentes + narrativa respondida (IMPL-20260615-40)", () => {
    const conversation = buildTaqueriaConversationWithTags();
    const assistantMessages = conversation
      .filter((m) => m.authorRole === "assistant")
      .map((m) => ({ messageText: m.messageText }));

    const detected = detectFrontsAskedFromHistory(assistantMessages);
    // IMPL-20260615-40: la narrativa es el ULTIMO frente obligatorio.
    // El cliente respondio "atender a los clientes y mantener la calidad"
    // y la pregunta narrativa fija esta en el ultimo mensaje del asistente.
    const lastClientMessage = conversation
      .filter((m) => m.authorRole === "client")
      .at(-1)!.messageText;

    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      frontsAsked: detected,
      narrativeQuestionAsked: VIKA_NARRATIVE_QUESTION,
      narrativeAnswer: lastClientMessage
    });

    // El ultimo mensaje del asistente es la pregunta narrativa
    const lastAssistantMessage = conversation
      .filter((m) => m.authorRole === "assistant")
      .at(-1)!.messageText;

    expect(areAllRequiredFrontsAsked(summary)).toBe(true);
    expect(hasMeaningfulNarrativeAnswer(summary.narrativeAnswer)).toBe(true);
    expect(shouldForceClosure(summary, lastAssistantMessage)).toBe(true);
  });

  it("shouldForceClosure retorna false con conversacion completa de 13 frentes pero narrativeAnswer=null (IMPL-20260615-40)", () => {
    const conversation = buildTaqueriaConversationWithTags();
    const assistantMessages = conversation
      .filter((m) => m.authorRole === "assistant")
      .map((m) => ({ messageText: m.messageText }));

    const detected = detectFrontsAskedFromHistory(assistantMessages);
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      frontsAsked: detected,
      narrativeQuestionAsked: VIKA_NARRATIVE_QUESTION
      // narrativeAnswer omitido -> null por default
    });

    const lastAssistantMessage = conversation
      .filter((m) => m.authorRole === "assistant")
      .at(-1)!.messageText;

    expect(areAllRequiredFrontsAsked(summary)).toBe(true);
    expect(shouldForceClosure(summary, lastAssistantMessage)).toBe(false);
  });

  it("shouldForceClosure retorna false si la conversacion va por la mitad (8 frentes)", () => {
    const conversation = buildTaqueriaConversationWithTags().slice(0, 18);
    const assistantMessages = conversation
      .filter((m) => m.authorRole === "assistant")
      .map((m) => ({ messageText: m.messageText }));

    const detected = detectFrontsAskedFromHistory(assistantMessages);
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      frontsAsked: detected
    });

    expect(detected.length).toBeLessThan(13);
    expect(areAllRequiredFrontsAsked(summary)).toBe(false);
    expect(shouldForceClosure(summary, null)).toBe(false);
  });

  it("shouldForceClosure retorna false con summary null/undefined (red de seguridad)", () => {
    expect(shouldForceClosure(null, null)).toBe(false);
    expect(shouldForceClosure(undefined, "")).toBe(false);
  });
});

describe("IMPL-20260615-28: sanitizer extrae tags antes de validar", () => {
  it("sanitizeAssistantReply elimina los tags [FRONT_ASKED: x] y [FRONT_COMPLETED: x]", () => {
    const reply =
      "¡Hola! Cuéntame de tu negocio.\n[FRONT_ASKED: giro_y_producto_heroe]";

    const sanitized = sanitizeAssistantReply(reply);

    expect(sanitized).not.toContain("[FRONT_ASKED:");
    expect(sanitized).not.toContain("[FRONT_COMPLETED:");
    expect(sanitized).toContain("Hola");
    expect(sanitized).toContain("negocio");
  });

  it("sanitizeAssistantReply no rechaza el reply solo por contener tags visibles", () => {
    const reply =
      "¡Qué gran historia! Mi equipo ya tiene toda esta información.\n[SYS_ACTION: LOCK_SUCCESS]\n[BRIEF_COMPLETO]";

    const sanitized = sanitizeAssistantReply(reply);

    // El sanitizer extrae tags y la salida visible debe contener la despedida
    expect(sanitized.length).toBeGreaterThan(0);
    expect(sanitized).toContain("gran historia");
  });
});

describe("IMPL-20260615-27: finishReason MAX_TOKENS es aceptable para Gemini Flash Lite", () => {
  it("MAX_TOKENS se considera un finishReason confiable", () => {
    const reply = "Perfecto, ya entiendo el contexto. Cuéntame de tu negocio.";
    expect(isAcceptableAssistantVisibleReply(reply, "MAX_TOKENS")).toBe(true);
  });

  it("finishReason SAFETY (u otros no listados) se rechaza", () => {
    const reply = "Una respuesta que se filtro por seguridad.";
    expect(isAcceptableAssistantVisibleReply(reply, "SAFETY")).toBe(false);
  });

  it("finishReason STOP sigue siendo aceptable", () => {
    const reply = "Una respuesta normal del modelo.";
    expect(isAcceptableAssistantVisibleReply(reply, "STOP")).toBe(true);
  });
});

describe("IMPL-20260615-32: normalizeSummary preserva el array frontsAsked", () => {
  it("normalizeSummary NO descarta el array frontsAsked al reconstruir el resumen", () => {
    // Antes de IMPL-20260615-32, normalizeSummary descartaba silenciosamente
    // el array frontsAsked porque solo normalizaba strings. Esto rompia
    // el tracking de frentes preguntados al persistir el resumen.
    const patch = {
      giroYProductoHeroe: "Tacos de carne asada",
      frontsAsked: ["giro_y_producto_heroe", "audience", "presupuesto"]
    };

    const normalized = normalizeSummary(patch);

    expect(normalized.frontsAsked).toEqual([
      "giro_y_producto_heroe",
      "audience",
      "presupuesto"
    ]);
    expect(normalized.giroYProductoHeroe).toBe("Tacos de carne asada");
  });

  it("mergeStructuredBriefSummary conserva frontsAsked (caso real de uso)", () => {
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Tacos",
      frontsAsked: ["giro_y_producto_heroe", "audience"]
    });

    expect(summary.frontsAsked).toEqual(["giro_y_producto_heroe", "audience"]);
    expect(areAllRequiredFrontsAsked({ ...summary, frontsAsked: [...VIKA_REQUIRED_FRONTS] })).toBe(true);
  });

  it("normalizeSummary con input null retorna el resumen vacio con frontsAsked=[]", () => {
    const normalized = normalizeSummary(null);
    expect(normalized.frontsAsked).toEqual([]);
  });
});

describe("IMPL-20260615-31: System Prompt declara explicitamente la regla de cierre", () => {
  it("el prompt contiene la regla de cierre obligatoria al final del itinerario", () => {
    const prompt = buildBriefChatSystemPrompt(
      [{ authorRole: "client", messageText: "Tengo una taquería" }],
      "Tengo una taquería"
    );

    expect(prompt).toContain("REGLA DE CIERRE OBLIGATORIO");
    expect(prompt).toContain("los 13 frentes");
    expect(prompt).toContain("Despídete con EXACTAMENTE este texto");
    // La despedida canonica exacta debe aparecer en el prompt
    expect(prompt).toContain("¡Qué gran historia!");
    expect(prompt).toContain("te contactaremos por WhatsApp con los pasos a seguir");
    // Los tags de cierre deben aparecer en el prompt
    expect(prompt).toContain("[SYS_ACTION: LOCK_SUCCESS]");
    expect(prompt).toContain("[BRIEF_COMPLETO]");
  });

  it("el prompt NO contiene la seccion de marcado explicito de frentes (IMPL-20260615-40)", () => {
    // IMPL-20260615-40: la instruccion de emitir [FRONT_ASKED] y
    // [FRONT_COMPLETED] se elimino del prompt porque la deteccion ahora
    // es por persistencia en summary + la pregunta narrativa fija.
    // Los regex se conservan para retrocompatibilidad (mensajes antiguos
    // pueden contenerlos todavia).
    const prompt = buildBriefChatSystemPrompt(
      [{ authorRole: "client", messageText: "Vendo tacos" }],
      "Vendo tacos"
    );

    expect(prompt).not.toContain("MARCADO EXPLICITO DE FRENTES");
    expect(prompt).not.toContain("[FRONT_ASKED: nombre_frente]");
    expect(prompt).not.toContain("[FRONT_COMPLETED: nombre_frente]");
    // La frase critica nueva: la narrativa es el ULTIMO frente obligatorio
    expect(prompt).toContain("PREGUNTA NARRATIVA ES EL ULTIMO FRENTE OBLIGATORIO");
  });
});

describe("regex de tags exported (IMPL-20260615-24)", () => {
  it("FRONT_ASKED_TAG_REGEX detecta correctamente el tag", () => {
    const sample = "Pregunta de prueba [FRONT_ASKED: giro_y_producto_heroe]";
    FRONT_ASKED_TAG_REGEX.lastIndex = 0;
    const match = FRONT_ASKED_TAG_REGEX.exec(sample);
    expect(match?.[1]).toBe("giro_y_producto_heroe");
  });

  it("FRONT_COMPLETED_TAG_REGEX detecta correctamente el tag", () => {
    const sample = "[FRONT_COMPLETED: audiencia] Listo, gracias";
    FRONT_COMPLETED_TAG_REGEX.lastIndex = 0;
    const match = FRONT_COMPLETED_TAG_REGEX.exec(sample);
    expect(match?.[1]).toBe("audiencia");
  });

  it("LOCK_SUCCESS_TAG_REGEX y BRIEF_COMPLETO_TAG_REGEX detectan el cierre canonico", () => {
    const sample = "Despedida canonica\n[SYS_ACTION: LOCK_SUCCESS]\n[BRIEF_COMPLETO]";
    expect(LOCK_SUCCESS_TAG_REGEX.test(sample)).toBe(true);
    expect(BRIEF_COMPLETO_TAG_REGEX.test(sample)).toBe(true);
  });
});

describe("IMPL-20260615-40: pregunta narrativa fija como ultimo frente de cierre", () => {
  it("VIKA_NARRATIVE_QUESTION es exactamente la pregunta canonica sin variaciones", () => {
    expect(VIKA_NARRATIVE_QUESTION).toBe("¿Qué ha sido lo más difícil?");
  });

  it("emptyStructuredBriefSummary inicializa narrativeQuestionAsked y narrativeAnswer en null", () => {
    const base = emptyStructuredBriefSummary();
    expect(base.narrativeQuestionAsked).toBeNull();
    expect(base.narrativeAnswer).toBeNull();
  });

  it("hasMeaningfulNarrativeAnswer rechaza null, undefined, vacio y genericos", () => {
    expect(hasMeaningfulNarrativeAnswer(null)).toBe(false);
    expect(hasMeaningfulNarrativeAnswer(undefined)).toBe(false);
    expect(hasMeaningfulNarrativeAnswer("")).toBe(false);
    expect(hasMeaningfulNarrativeAnswer("   ")).toBe(false);
    expect(hasMeaningfulNarrativeAnswer("si")).toBe(false);
    expect(hasMeaningfulNarrativeAnswer("no")).toBe(false);
    expect(hasMeaningfulNarrativeAnswer("hola")).toBe(false);
    expect(hasMeaningfulNarrativeAnswer("ok")).toBe(false);
  });

  it("hasMeaningfulNarrativeAnswer acepta respuestas con sustancia (longitud y palabras)", () => {
    expect(hasMeaningfulNarrativeAnswer("atender a los clientes y mantener la calidad")).toBe(true);
    expect(hasMeaningfulNarrativeAnswer("Lidiar con los proveedores que no cumplen con los tiempos")).toBe(true);
    expect(hasMeaningfulNarrativeAnswer("Conseguir clientes nuevos en temporada baja")).toBe(true);
  });

  it("isNarrativeQuestionAskedInMessage detecta la pregunta narrativa canonica", () => {
    expect(isNarrativeQuestionAskedInMessage("¿Qué ha sido lo más difícil?")).toBe(true);
    expect(isNarrativeQuestionAskedInMessage("Para terminar, ¿qué ha sido lo más difícil de tener tu negocio?")).toBe(true);
    expect(isNarrativeQuestionAskedInMessage("entendido.   ¿que ha sido lo MAS dificil?")).toBe(true);
  });

  it("isNarrativeQuestionAskedInMessage rechaza mensajes sin la pregunta", () => {
    expect(isNarrativeQuestionAskedInMessage(null)).toBe(false);
    expect(isNarrativeQuestionAskedInMessage(undefined)).toBe(false);
    expect(isNarrativeQuestionAskedInMessage("")).toBe(false);
    expect(isNarrativeQuestionAskedInMessage("¿Cómo te animaste a poner el negocio?")).toBe(false);
    expect(isNarrativeQuestionAskedInMessage("¿Cuánto tiempo llevas operando?")).toBe(false);
    expect(isNarrativeQuestionAskedInMessage("Cuéntame de tu negocio")).toBe(false);
  });

  it("normalizeSummary preserva narrativeQuestionAsked y narrativeAnswer (incluyendo null)", () => {
    // Caso 1: patch con ambos campos string
    const patch1 = {
      giroYProductoHeroe: "Tacos",
      narrativeQuestionAsked: VIKA_NARRATIVE_QUESTION,
      narrativeAnswer: "atender a los clientes y mantener la calidad"
    };
    const n1 = normalizeSummary(patch1);
    expect(n1.narrativeQuestionAsked).toBe(VIKA_NARRATIVE_QUESTION);
    expect(n1.narrativeAnswer).toBe("atender a los clientes y mantener la calidad");

    // Caso 2: patch con explicit null (debe preservarse, no convertirse a "")
    const patch2 = {
      giroYProductoHeroe: "Tacos",
      narrativeQuestionAsked: null
    };
    const n2 = normalizeSummary(patch2);
    expect(n2.narrativeQuestionAsked).toBeNull();
    expect(n2.narrativeAnswer).toBeNull();

    // Caso 3: input null -> defaults
    const n3 = normalizeSummary(null);
    expect(n3.narrativeQuestionAsked).toBeNull();
    expect(n3.narrativeAnswer).toBeNull();
  });

  it("mergeStructuredBriefSummary conserva los campos de narrativa al persistir", () => {
    const summary = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      giroYProductoHeroe: "Tacos",
      narrativeQuestionAsked: VIKA_NARRATIVE_QUESTION,
      narrativeAnswer: "atender a los clientes y mantener la calidad"
    });

    expect(summary.narrativeQuestionAsked).toBe(VIKA_NARRATIVE_QUESTION);
    expect(summary.narrativeAnswer).toBe("atender a los clientes y mantener la calidad");
    expect(hasMeaningfulNarrativeAnswer(summary.narrativeAnswer)).toBe(true);
  });

  it("shouldForceClosure detecta la pregunta narrativa en el historial aunque no este persistida en summary", () => {
    // Caso real: Vika hizo la pregunta en su ultimo mensaje, el cliente
    // respondio, y `actions.ts` aun no ha persistido narrativeAnswer.
    // En este caso, shouldForceClosure debe seguir retornando false
    // (porque narrativeAnswer es null) pero debe aceptar la pregunta
    // como "ya hecha" si estuviera persistida.
    const conversation = buildTaqueriaConversationWithTags();
    const assistantMessages = conversation
      .filter((m) => m.authorRole === "assistant")
      .map((m) => ({ messageText: m.messageText }));

    const detected = detectFrontsAskedFromHistory(assistantMessages);

    // Sin persistir nada de narrativa
    const summarySinNarrativa = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      frontsAsked: detected
    });
    expect(shouldForceClosure(summarySinNarrativa, conversation.at(-2)?.messageText ?? null)).toBe(false);

    // Persistiendo solo narrativeQuestionAsked (sin respuesta)
    const summarySinRespuesta = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      frontsAsked: detected,
      narrativeQuestionAsked: VIKA_NARRATIVE_QUESTION
    });
    expect(shouldForceClosure(summarySinRespuesta, conversation.at(-2)?.messageText ?? null)).toBe(false);

    // Caso completo: pregunta persistida + respuesta persistida + pregunta en historial
    const summaryCompleto = mergeStructuredBriefSummary(emptyStructuredBriefSummary(), {
      frontsAsked: detected,
      narrativeQuestionAsked: VIKA_NARRATIVE_QUESTION,
      narrativeAnswer: conversation.at(-1)?.messageText ?? null
    });
    expect(shouldForceClosure(summaryCompleto, conversation.at(-2)?.messageText ?? null, conversation)).toBe(true);
  });
});
