/**
 * IMPL-20260615-25
 * Test automatizado con tags explicitos de Vika.
 * Simula toda la conversacion con los tags [FRONT_ASKED] y [FRONT_COMPLETED]
 * que Vika deberia emitir, y verifica que el chat cierre correctamente.
 */

import {
  areAllRequiredFrontsAsked,
  detectFrontsAskedFromHistory,
  emptyStructuredBriefSummary
} from "../lib/briefing";
import { shouldForceClosure } from "../lib/briefing-assistant-ai";

async function testAutomaticClosureWithTags() {
  console.log("=== TEST AUTOMATICO CON TAGS EXPLICITOS (IMPL-20260615-24) ===\n");

  // Conversacion simulada con tags [FRONT_ASKED] y [FRONT_COMPLETED]
  // Formato: Vika hace pregunta -> emite [FRONT_ASKED: X]
  //          Cliente responde -> Vika siguiente turno emite [FRONT_COMPLETED: X] y nueva pregunta
  const conversationTurns: Array<{ role: "client" | "assistant"; text: string }> = [
    // 1. Apertura: giro_y_producto_heroe
    {
      role: "assistant",
      text: "¡Hola! Para armar tu estrategia, cuéntame: ¿De qué es tu negocio y qué es lo que más se vende?\n[FRONT_ASKED: giro_y_producto_heroe]"
    },
    { role: "client", text: "vendemos tacos" },
    {
      role: "assistant",
      text: "[FRONT_COMPLETED: giro_y_producto_heroe]\nEntendido. ¿Qué tipo de tacos son? ¿Hay alguno que sea el favorito de la gente?\n[FRONT_ASKED: giro_y_producto_heroe]"
    },
    { role: "client", text: "solo vendemos tacos de carne asada nadie mas vende por aqui" },
    {
      role: "assistant",
      text: "[FRONT_COMPLETED: giro_y_producto_heroe]\nExcelente. ¿Quiénes son las personas que más te compran?\n[FRONT_ASKED: audience]"
    },
    { role: "client", text: "son trabajadores y gente de mi colonia" },
    {
      role: "assistant",
      text: "[FRONT_COMPLETED: audience]\n¿Y qué crees que hace que la gente te elija a ti? ¿Qué te hace único?\n[FRONT_ASKED: audience]"
    },
    { role: "client", text: "somos los unicos con carne asada" },
    {
      role: "assistant",
      text: "[FRONT_COMPLETED: audience]\n¿Dónde está ubicado tu negocio?\n[FRONT_ASKED: local_fisico]"
    },
    { role: "client", text: "en lapradera" },
    {
      role: "assistant",
      text: "[FRONT_COMPLETED: local_fisico]\n¿Tienes pensado invertir algo al mes para que más gente conozca tus tacos?\n[FRONT_ASKED: presupuesto]"
    },
    { role: "client", text: "si 1000" },
    {
      role: "assistant",
      text: "[FRONT_COMPLETED: presupuesto]\n¿Qué te gustaría que hiciera la gente que vea tu publicidad?\n[FRONT_ASKED: cta_deseado]"
    },
    { role: "client", text: "qeu vayan alpuesto" },
    {
      role: "assistant",
      text: "[FRONT_COMPLETED: cta_deseado]\n¿Cómo te animaste a poner el negocio de los tacos?\n[FRONT_ASKED: historia_y_contexto]"
    },
    { role: "client", text: "pues me gusta hacer carne asada y decidi ponerlo" },
    {
      role: "assistant",
      text: "[FRONT_COMPLETED: historia_y_contexto]\n¿Cómo te describirías como el dueño de este negocio?\n[FRONT_ASKED: persona_perfil]"
    },
    { role: "client", text: "soy muy activo me gusta estar cocinando" },
    {
      role: "assistant",
      text: "[FRONT_COMPLETED: persona_perfil]\n¿Cómo te organizas en el día a día? ¿Trabajas solo o tienes gente que te ayuda?\n[FRONT_ASKED: administracion_negocio]"
    },
    { role: "client", text: "tengo gente que me ayuda" },
    {
      role: "assistant",
      text: "[FRONT_COMPLETED: administracion_negocio]\n¿Usas algún programa o sistema, o lo llevas en una libreta?\n[FRONT_ASKED: administracion_negocio]"
    },
    { role: "client", text: "tenemos un pequeño sistema en excel" },
    {
      role: "assistant",
      text: "[FRONT_COMPLETED: administracion_negocio]\n¿Cuánto tiempo llevan tus tacos funcionando?\n[FRONT_ASKED: madurez]"
    },
    { role: "client", text: "tengo un año" },
    {
      role: "assistant",
      text: "[FRONT_COMPLETED: madurez]\n¿Tu negocio tiene un logo?\n[FRONT_ASKED: logo]"
    },
    { role: "client", text: "si tenemos logo y una imagen" },
    {
      role: "assistant",
      text: "[FRONT_COMPLETED: logo]\n¿Hay algo que la gente dude o le preocupe antes de decidirse a comprar tus tacos?\n[FRONT_ASKED: objeciones]"
    },
    { role: "client", text: "que no sea carne congelada" },
    {
      role: "assistant",
      text: "[FRONT_COMPLETED: objeciones]\n¿Alguna vez has intentado hacer publicidad?\n[FRONT_ASKED: publicidad_previa]"
    },
    { role: "client", text: "imprimi unas hojitas" },
    {
      role: "assistant",
      text: "[FRONT_COMPLETED: publicidad_previa]\n¿Tienes algún plan o sueño para tus tacos en los próximos 6 meses o un año?\n[FRONT_ASKED: planes_futuro]"
    },
    { role: "client", text: "quiero abrir un restaurante mas grande" },
    // Pregunta narrativa final
    {
      role: "assistant",
      text: "[FRONT_COMPLETED: planes_futuro]\nPara terminar, ¿qué ha sido lo más difícil de tener tu negocio de tacos?\n[FRONT_ASKED: historia_y_contexto]"
    },
    { role: "client", text: "atender a los clientes y mantener la calidad" }
  ];

  const messages = conversationTurns.map((turn) => ({
    authorRole: turn.role,
    messageText: turn.text
  }));

  // 1. Detectar frentes preguntados (ahora via tags)
  const assistantMessages = messages.filter((m) => m.authorRole === "assistant");
  const detectedFronts = detectFrontsAskedFromHistory(assistantMessages);

  console.log("=== FRENTES DETECTADOS VIA TAGS ===");
  console.log("Total:", detectedFronts.length, "/ 13");
  console.log("Frentes:", detectedFronts.sort());
  console.log();

  // 2. Verificar que los 13 esten
  const summary = {
    ...emptyStructuredBriefSummary(),
    frontsAsked: detectedFronts
  };

  const allAsked = areAllRequiredFrontsAsked(summary);
  console.log("¿Los 13 frentes obligatorios estan marcados?", allAsked);

  if (!allAsked) {
    const required = [
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
    ];
    const missing = required.filter((f) => !detectedFronts.includes(f));
    console.log("Faltantes:", missing);
  }
  console.log();

  // 3. Verificar si el cierre debe dispararse
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.authorRole === "assistant")?.messageText ?? null;

  const shouldClose = shouldForceClosure(
    summary as any,
    lastAssistantMessage,
    messages.map((m) => ({ authorRole: m.authorRole, messageText: m.messageText }))
  );

  console.log("¿Se debe disparar el cierre?", shouldClose);
  console.log();

  // 4. Verificar narrativa
  const hasNarrativeInLast = lastAssistantMessage?.includes("ha sido lo mas dificil") ||
    lastAssistantMessage?.includes("animaste a poner");
  console.log("¿Ultimo mensaje del asistente es narrativa?", hasNarrativeInLast);
  console.log();

  // 5. Resultado final
  if (allAsked && shouldClose) {
    console.log("TEST PASADO: El chat cerrara correctamente con la nueva logica de tags.");
    return true;
  } else {
    console.log("TEST FALLIDO.");
    return false;
  }
}

testAutomaticClosureWithTags()
  .then((passed) => {
    process.exit(passed ? 0 : 1);
  })
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });
