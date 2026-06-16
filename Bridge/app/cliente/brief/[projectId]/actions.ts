"use server";

/**
 * IMPL-20260615-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260615-01_cierre_brief_por_itinerario_y_suficiencia_v1.md
 *  - Doble red de seguridad: despues de aplicar el patch del resumen y
 *    re-leer la version, re-evaluamos `isBriefSufficientForClosure`. Si la
 *    suficiencia se cumple, **forzamos** la despedida canonica sin
 *    depender del tag que el modelo haya (o no) emitido. Esto elimina el
 *    caso donde Vika "se queda callada" o emite texto sin tag a pesar de
 *    que la conversacion ya esta completa.
 *
 * IMPL-20260611-07
 * Respaldo: fix Bug 3 - Cierre deterministico nunca se activaba.
 *   - Despues de persistir el mensaje del cliente, inferimos un patch
 *     heuristico del resumen estructurado (solo llena campos vacios) y lo
 *     persistimos via `updateBriefSummary`. Esto hace que
 *     `shouldForceClosure()` pueda detectar cuando los 8 puntos del
 *     checklist de Vika estan completos y dispare el cierre deterministico
 *     sin depender exclusivamente de lo que el modelo emita.
 *
 * IMPL-20260611-04
 * Respaldo: fix critico Vika repregunta + textarea pierde foco.
 *   - Pasamos `summary` (structuredSummary) a `generateBriefChatReply` para que
 *     el System Prompt Maestro reciba el bloque "PROGRESO ACTUAL DE LA
 *     CONVERSACION" y la IA no repita preguntas ya respondidas.
 *
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
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-07_chat_brief_adaptativo_y_etapas_background_v1.md
 */
import { revalidatePath } from "next/cache";

import {
  appendBriefMessage,
  appendClientBriefMessage,
  detectFrontsAskedFromHistory,
  getBriefByProjectId,
  inferBriefSummaryPatchFromClientMessage,
  mapVikaBriefDataToStructuredSummary,
  submitBriefForOperatorReview,
  updateBriefSummary
} from "@/lib/briefing";
import {
  BRIEF_COMPLETO_TAG_REGEX,
  LOCK_SUCCESS_TAG_REGEX,
  VIKA_NARRATIVE_QUESTIONS,
  VIKA_CLOSING_HUMAN_TEXT,
  extractJsonObject,
  generateBriefChatReply,
  generateBriefClosure,
  isBriefSufficientForClosure,
  shouldForceClosure
} from "@/lib/briefing-assistant-ai";

/**
 * IMPL-20260611-06
 * Respaldo: cierre deterministico + texto canonico de despedida
 *  - Si `aiReply.forcedClosure === true` o el `visibleReply` contiene el tag
 *    [SYS_ACTION: LOCK_SUCCESS], extraemos el JSON de 9 claves, persistimos
 *    el resumen estructurado y enviamos el brief a revision humana con
 *    `submitBriefForOperatorReview`. Esto evita depender exclusivamente del
 *    modelo para emitir el cierre.
 *
 * IMPL-20260611-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260611-01_alineacion_chat_vika_a_especificacion_tecnica_v1.md
 *
 * Flujo Vika simplificado (sin etapas, sin heuristica incremental):
 *  1. Persistir el mensaje del cliente.
 *  2. Llamar al modelo de IA con el System Prompt Maestro de Vika.
 *  3. Si GEMINI_API_KEY no esta disponible: no persistir respuesta visible, solo log.
 *  4. Si la IA responde, persistir la respuesta del asistente (puede incluir el tag de cierre).
 *  5. IMPL-20260611-06: Si la respuesta incluye el tag de cierre (o fue
 *     generada por el cierre deterministico), mapear el JSON al resumen
 *     estructurado y enviar el brief a revision humana.
 */
export async function sendClientMessageAction(
  projectId: string,
  briefId: string,
  versionId: string,
  messageText: string
): Promise<void> {
  const normalizedText = messageText.trim();

  if (!normalizedText) {
    return;
  }

  await appendClientBriefMessage({ briefId, versionId }, normalizedText);

  let brief = await getBriefByProjectId(projectId);
  let currentVersion = brief?.currentVersion;

  if (!currentVersion || currentVersion.id !== versionId) {
    revalidatePath(`/cliente/brief/${projectId}`);
    revalidatePath(`/cliente/proyecto/${projectId}`);
    return;
  }

  // IMPL-20260611-07 (Bug 3): inferir y persistir un patch del resumen
  // estructurado a partir del mensaje del cliente. Esto llena los campos
  // del nucleo de Vika conforme el cliente responde, para que
  // `shouldForceClosure` / `isBriefSufficientForClosure` pueda detectar el
  // cierre deterministico cuando los 5 frentes del nucleo esten completos.
  // IMPL-20260615-01: ya no son "8 campos" sino los 5 del nucleo de
  // suficiencia; ver `VIKA_CLOSURE_CORE_KEYS`.
  const summaryPatch = inferBriefSummaryPatchFromClientMessage(
    currentVersion.stage,
    currentVersion.structuredSummary,
    normalizedText
  );

  if (Object.keys(summaryPatch).length > 0) {
    await updateBriefSummary({ briefId, versionId }, summaryPatch);
    brief = await getBriefByProjectId(projectId);
    if (brief?.currentVersion && brief.currentVersion.id === versionId) {
      currentVersion = brief.currentVersion;
    }
  }

  // IMPL-20260615-15: doble red de seguridad ANTES de llamar a Gemini.
  // Usamos la nueva logica de `shouldForceClosure` que combina:
  //  1. Deteccion automatica de frentes preguntados del historial.
  //  2. Match flexible de pregunta narrativa.
  //  3. Tolerancia: cierra con 10+ frentes preguntados.
  // Esto cubre el caso donde la IA "se queda callada" o donde el
  // resumen se lleno por la heuristica pero el modelo aun no respondio.
  const previousAssistantMessage = [...(currentVersion.messages ?? [])]
    .reverse()
    .find((message) => message.authorRole === "assistant")?.messageText ?? null;

  // IMPL-20260615-19: detectar frentes preguntados de TODOS los mensajes
  // (asistente + cliente). Si el cliente menciona "tengo un logo" o "2 años",
  // eso cubre esos frentes aunque Vika no haya preguntado explícitamente.
  const allMessages = (currentVersion.messages ?? [])
    .map((message) => ({ messageText: message.messageText }));
  const detectedFronts = detectFrontsAskedFromHistory(allMessages);
  const existingFrontsAsked = currentVersion.structuredSummary.frontsAsked ?? [];
  const combinedFrontsAsked = Array.from(
    new Set([...existingFrontsAsked, ...detectedFronts])
  );

  const summaryForClosure = {
    ...currentVersion.structuredSummary,
    frontsAsked: combinedFrontsAsked
  };

  const sufficiencyAlreadyMet = shouldForceClosure(
    summaryForClosure as any,
    previousAssistantMessage,
    (currentVersion.messages ?? []).map((m) => ({
      authorRole: m.authorRole,
      messageText: m.messageText
    }))
  );

  // IMPL-20260615-16: persistir frontsAsked detectado para que se mantenga
  // entre turnos y no se pierda la trazabilidad de los frentes preguntados.
  if (combinedFrontsAsked.length > existingFrontsAsked.length) {
    await updateBriefSummary(
      { briefId, versionId },
      { frontsAsked: combinedFrontsAsked } as any
    );
  }

  if (sufficiencyAlreadyMet) {
    // Construimos la despedida canonica + JSON solo con claves con valor.
    const closureJson = extractClosureJsonFromSummary(currentVersion.structuredSummary);
    const visibleReply = buildForcedClosureVisibleReply(closureJson);

    await appendBriefMessage({
      briefId,
      versionId,
      authorRole: "assistant",
      actorLabel: "Bridge briefing",
      messageText: visibleReply,
      stage: currentVersion.stage
    });

    const giro = closureJson.giro_y_producto_heroe;
    const clientSummary = giro
      ? `Tu negocio: ${giro}.\n` +
        `Te distingue: ${closureJson.diferenciador || "por definir"}.\n` +
        `Lo que te frena: ${closureJson.objeciones || "por definir"}.\n` +
        `Presupuesto mensual: ${closureJson.presupuesto || "por definir"}.\n` +
        `Accion que esperas: ${closureJson.cta_deseado || "por definir"}.`
      : "";

    const patch = mapVikaBriefDataToStructuredSummary(closureJson);
    await updateBriefSummary(
      { briefId, versionId },
      { ...patch, clientFacingSummary: clientSummary },
      { finalSummaryTextOverride: visibleReply }
    );

    await submitBriefForOperatorReview({ briefId, versionId });
    revalidatePath(`/cliente/brief/${projectId}`);
    revalidatePath(`/cliente/proyecto/${projectId}`);
    return;
  }

  const aiReply = await generateBriefChatReply({
    messages: currentVersion.messages
      .filter((message) => message.authorRole === "client" || message.authorRole === "assistant")
      .map((message) => ({
        authorRole: message.authorRole,
        messageText: message.messageText
      })),
    clientMessage: normalizedText,
    summary: currentVersion.structuredSummary
  });

  if (aiReply.degraded) {
    // SPEC ARCH-20260611-01: si no hay API key, no persistir respuesta visible,
    // solo registrar el incidente en el log del servidor.
    console.warn(
      `[vika-chat] degraded reply for brief=${briefId} version=${versionId} (GEMINI_API_KEY ausente o modelo no disponible)`
    );
    revalidatePath(`/cliente/brief/${projectId}`);
    revalidatePath(`/cliente/proyecto/${projectId}`);
    return;
  }

  await appendBriefMessage({
    briefId,
    versionId,
    authorRole: "assistant",
    actorLabel: "Bridge briefing",
    messageText: aiReply.visibleReply,
    stage: currentVersion.stage
  });

  // IMPL-20260611-06: detectar cierre (forcedClosure deterministico o tag del modelo)
  // y ejecutar el mismo flujo que `submitBriefAction` para bloquear el brief.
  const isClosure =
    aiReply.forcedClosure === true || LOCK_SUCCESS_TAG_REGEX.test(aiReply.visibleReply);

  if (isClosure) {
    const jsonText = extractJsonObject(aiReply.visibleReply);
    let extractedJson: Record<string, string> | null = null;

    if (jsonText) {
      try {
        const parsed = JSON.parse(jsonText) as Record<string, unknown>;
        extractedJson = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === "string") {
            extractedJson[key] = value.trim();
          }
        }
      } catch {
        extractedJson = null;
      }
    }

    const closureSummaryPatch = extractedJson ? mapVikaBriefDataToStructuredSummary(extractedJson) : {};

    if (extractedJson) {
      const giro = extractedJson.giro_y_producto_heroe;
      const clientSummary = giro
        ? `Tu negocio: ${giro}.\n` +
          `Te distingue: ${extractedJson.diferenciador || "por definir"}.\n` +
          `Lo que te frena: ${extractedJson.objeciones || "por definir"}.\n` +
          `Presupuesto mensual: ${extractedJson.presupuesto || "por definir"}.\n` +
          `Accion que esperas: ${extractedJson.cta_deseado || "por definir"}.`
        : "";

      await updateBriefSummary(
        { briefId, versionId },
        { ...closureSummaryPatch, clientFacingSummary: clientSummary },
        { finalSummaryTextOverride: aiReply.visibleReply }
      );
    }

    await submitBriefForOperatorReview({ briefId, versionId });
  }

  revalidatePath(`/cliente/brief/${projectId}`);
  revalidatePath(`/cliente/proyecto/${projectId}`);
}

/**
 * IMPL-20260615-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260615-01_cierre_brief_por_itinerario_y_suficiencia_v1.md
 *
 * Helper local para construir el JSON de cierre a partir del resumen
 * estructurado, emitiendo SOLO las claves con valor significativo (mismo
 * principio que `deterministicClosureJson` en `briefing-assistant-ai.ts`
 * pero expuesto a `actions.ts` para la doble red de seguridad).
 */
function extractClosureJsonFromSummary(summary: import("@/lib/briefing").StructuredBriefSummary): Record<string, string> {
  const candidatePairs: Array<[string, string]> = [
    ["giro_y_producto_heroe", summary.giroYProductoHeroe || summary.mainOffer || summary.projectObjective || ""],
    ["persona_perfil", summary.personaPerfil || ""],
    ["historia_negocio", summary.historiaNegocio || ""],
    ["administracion_negocio", summary.administracionNegocio || ""],
    ["madurez", summary.madurez || ""],
    ["local_fisico", summary.localFisico || ""],
    ["logo", summary.logo || ""],
    ["diferenciador", summary.audience || ""],
    ["objeciones", summary.restrictions || ""],
    ["publicidad_previa", summary.publicidadPrevia || ""],
    ["presupuesto", summary.presupuesto || ""],
    ["cta_deseado", summary.cta || ""],
    ["planes_futuro", summary.planesFuturo || ""],
    ["historia_y_contexto", summary.historiaYContexto || ""]
  ];

  const json: Record<string, string> = {};
  for (const [key, value] of candidatePairs) {
    const trimmed = value.trim();
    if (trimmed) {
      json[key] = trimmed;
    }
  }
  return json;
}

/**
 * IMPL-20260615-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260615-01_cierre_brief_por_itinerario_y_suficiencia_v1.md
 *
 * Compone el mensaje visible de cierre (despedida canonica + tags + JSON
 * parcial) que el server action persiste como respuesta del asistente
 * cuando la doble red de seguridad detecta suficiencia.
 */
function buildForcedClosureVisibleReply(closureJson: Record<string, string>): string {
  return [
    VIKA_CLOSING_HUMAN_TEXT,
    "[SYS_ACTION: LOCK_SUCCESS]",
    "[BRIEF_COMPLETO]",
    JSON.stringify(closureJson, null, 2)
  ].join("\n");
}

/**
 * IMPL-20260611-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260611-01_alineacion_chat_vika_a_especificacion_tecnica_v1.md
 *
 * Cierra el brief:
 *  1. Detecta el tag [SYS_ACTION: LOCK_SUCCESS] en los mensajes del asistente.
 *  2. Extrae el JSON de 8 puntos (+ historia) con `extractJsonObject`.
 *  3. Mapea VikaBriefData -> StructuredBriefSummary y persiste.
 *  4. Envia el brief a `pending_operator_review`.
 *  5. Si el tag no esta presente, genera un cierre deterministico con `generateBriefClosure`
 *     para no bloquear al operador.
 */
export async function submitBriefAction(
  projectId: string,
  briefId: string,
  versionId: string
): Promise<{ closureDetected: boolean }> {
  const brief = await getBriefByProjectId(projectId);
  const currentVersion = brief?.currentVersion;

  if (currentVersion?.id !== versionId) {
    await submitBriefForOperatorReview({ briefId, versionId });
    revalidatePath(`/cliente/brief/${projectId}`);
    revalidatePath(`/cliente/proyecto/${projectId}`);
    return { closureDetected: false };
  }

  // 1. Buscar [SYS_ACTION: LOCK_SUCCESS] en cualquier mensaje del asistente.
  const assistantMessages = currentVersion.messages.filter((message) => message.authorRole === "assistant");
  const lockedMessage = assistantMessages.find((message) => LOCK_SUCCESS_TAG_REGEX.test(message.messageText));

  let closureDetected = false;
  let visibleClosure: string | null = null;
  let extractedJson: Record<string, string> | null = null;

  if (lockedMessage) {
    closureDetected = true;
    const jsonText = extractJsonObject(lockedMessage.messageText);
    if (jsonText) {
      try {
        const parsed = JSON.parse(jsonText) as Record<string, unknown>;
        extractedJson = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === "string") {
            extractedJson[key] = value.trim();
          }
        }
      } catch {
        extractedJson = null;
      }
    }
    visibleClosure = lockedMessage.messageText;
  } else {
    // 2. Fallback: pedirle al modelo (o al fallback deterministico) que cierre.
    const closure = await generateBriefClosure({
      summary: currentVersion.structuredSummary,
      messages: currentVersion.messages.map((message) => ({
        authorRole: message.authorRole,
        messageText: message.messageText
      }))
    });
    visibleClosure = closure.visibleReply;
    extractedJson = closure.json;
  }

  // 3. Mapear Vika JSON -> StructuredBriefSummary y persistir.
  const summaryPatch = extractedJson ? mapVikaBriefDataToStructuredSummary(extractedJson) : {};

  if (extractedJson) {
    const clientSummary = extractedJson.giro_y_producto_heroe
      ? `Tu negocio: ${extractedJson.giro_y_producto_heroe}.\n` +
        `Te distingue: ${extractedJson.diferenciador || "por definir"}.\n` +
        `Lo que te frena: ${extractedJson.objeciones || "por definir"}.\n` +
        `Presupuesto mensual: ${extractedJson.presupuesto || "por definir"}.\n` +
        `Accion que esperas: ${extractedJson.cta_deseado || "por definir"}.`
      : "";

    await updateBriefSummary(
      { briefId, versionId },
      { ...summaryPatch, clientFacingSummary: clientSummary },
      { finalSummaryTextOverride: visibleClosure ?? undefined }
    );
  } else if (visibleClosure) {
    await updateBriefSummary(
      { briefId, versionId },
      {},
      { finalSummaryTextOverride: visibleClosure }
    );
  }

  // 4. Persistir el cierre como mensaje del asistente si lo generamos en fallback
  //    y todavia no fue escrito por el chat.
  if (!lockedMessage && visibleClosure && BRIEF_COMPLETO_TAG_REGEX.test(visibleClosure)) {
    const lastAssistant = assistantMessages.at(-1);
    const alreadyPersisted = lastAssistant?.messageText === visibleClosure;
    if (!alreadyPersisted) {
      await appendBriefMessage({
        briefId,
        versionId,
        authorRole: "assistant",
        actorLabel: "Bridge briefing",
        messageText: visibleClosure,
        stage: currentVersion.stage
      });
    }
  }

  // 5. Enviar a revision humana.
  await submitBriefForOperatorReview({ briefId, versionId });

  revalidatePath(`/cliente/brief/${projectId}`);
  revalidatePath(`/cliente/proyecto/${projectId}`);
  revalidatePath(`/briefs`);

  return { closureDetected };
}
