"use server";

/**
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
  advanceBriefStageInBackground,
  advanceBriefStage,
  appendBriefMessage,
  appendClientBriefMessage,
  getBriefByProjectId,
  hasBackgroundStageSufficientInfo,
  inferBriefSummaryPatchFromClientMessage,
  submitBriefForOperatorReview,
  updateBriefSummary
} from "@/lib/briefing";
import {
  generateBriefChatReply,
  generateBriefClosure
} from "@/lib/briefing-assistant-ai";

/**
 * IMPL-20260603-03
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260603-03_memoria_conversacional_incremental_y_control_antirepeticion_brief_v1.md
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-01_brief_cliente_doble_capa_conversacional_v1.md
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
  let currentVersion = brief?.currentVersion;

  if (currentVersion?.id === versionId) {
    const summaryPatch = inferBriefSummaryPatchFromClientMessage(
      currentVersion.stage,
      currentVersion.structuredSummary,
      normalizedText
    );
    const hasSummaryPatch = Object.keys(summaryPatch).length > 0;

    if (hasSummaryPatch) {
      currentVersion = await updateBriefSummary({ briefId, versionId }, summaryPatch);
    }

    if (
      currentVersion.stage !== "commercial_fit" &&
      hasBackgroundStageSufficientInfo(currentVersion.stage, currentVersion.structuredSummary)
    ) {
      await advanceBriefStageInBackground({ briefId, versionId });

      const refreshedBrief = await getBriefByProjectId(projectId);

      if (refreshedBrief?.currentVersion?.id === versionId) {
        currentVersion = refreshedBrief.currentVersion;
      }
    }

    const aiReply = await generateBriefChatReply({
      stage: currentVersion.stage,
      messages: currentVersion.messages.map((message) => ({
        authorRole: message.authorRole,
        messageText: message.messageText
      })),
      clientMessage: normalizedText,
      summary: currentVersion.structuredSummary
    });

    if (!aiReply.degraded) {
      await appendBriefMessage({
        briefId,
        versionId,
        authorRole: "assistant",
        actorLabel: "Bridge briefing",
        messageText: aiReply.visibleReply,
        stage: currentVersion.stage
      });
    }
  }

  revalidatePath(`/cliente/brief/${projectId}`);
  revalidatePath(`/cliente/proyecto/${projectId}`);
}

export async function advanceStageAction(
  projectId: string,
  briefId: string,
  versionId: string
): Promise<void> {
  await advanceBriefStage({ briefId, versionId });
  revalidatePath(`/cliente/brief/${projectId}`);
  revalidatePath(`/cliente/proyecto/${projectId}`);
}

export async function submitBriefAction(
  projectId: string,
  briefId: string,
  versionId: string
): Promise<void> {
  const brief = await getBriefByProjectId(projectId);
  const currentVersion = brief?.currentVersion;

  if (currentVersion?.id === versionId) {
    const closure = await generateBriefClosure({
      stage: currentVersion.stage,
      summary: currentVersion.structuredSummary,
      messages: currentVersion.messages.map((message) => ({
        authorRole: message.authorRole,
        messageText: message.messageText
      }))
    });

    await updateBriefSummary(
      { briefId, versionId },
      {
        clientFacingSummary: closure.clientSummary
      },
      { finalSummaryTextOverride: closure.agentRawBrief }
    );
  }

  await submitBriefForOperatorReview({ briefId, versionId });
  revalidatePath(`/cliente/brief/${projectId}`);
  revalidatePath(`/cliente/proyecto/${projectId}`);
}
