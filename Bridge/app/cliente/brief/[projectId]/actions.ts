"use server";

/**
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
  getBriefByProjectId,
  mapVikaBriefDataToStructuredSummary,
  submitBriefForOperatorReview,
  updateBriefSummary
} from "@/lib/briefing";
import {
  BRIEF_COMPLETO_TAG_REGEX,
  LOCK_SUCCESS_TAG_REGEX,
  extractJsonObject,
  generateBriefChatReply,
  generateBriefClosure
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

  const brief = await getBriefByProjectId(projectId);
  const currentVersion = brief?.currentVersion;

  if (!currentVersion || currentVersion.id !== versionId) {
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

    const summaryPatch = extractedJson ? mapVikaBriefDataToStructuredSummary(extractedJson) : {};

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
        { ...summaryPatch, clientFacingSummary: clientSummary },
        { finalSummaryTextOverride: aiReply.visibleReply }
      );
    }

    await submitBriefForOperatorReview({ briefId, versionId });
  }

  revalidatePath(`/cliente/brief/${projectId}`);
  revalidatePath(`/cliente/proyecto/${projectId}`);
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
