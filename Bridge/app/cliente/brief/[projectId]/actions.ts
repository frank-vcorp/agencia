"use server";

/**
 * IMPL-20260602-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260602-01_brief_cliente_conversacion_primero_y_procesado_unico_al_cierre_v1.md
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-07_chat_brief_adaptativo_y_etapas_background_v1.md
 */
import { revalidatePath } from "next/cache";

import {
  advanceBriefStage,
  appendBriefMessage,
  appendClientBriefMessage,
  getBriefByProjectId,
  submitBriefForOperatorReview,
  updateBriefSummary
} from "@/lib/briefing";
import {
  generateBriefChatReply,
  generateBriefClosureArtifacts
} from "@/lib/briefing-assistant-ai";

/**
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
  const currentVersion = brief?.currentVersion;

  if (currentVersion?.id === versionId) {
    const aiReply = await generateBriefChatReply({
      stage: currentVersion.stage,
      messages: currentVersion.messages.map((message) => ({
        authorRole: message.authorRole,
        messageText: message.messageText
      })),
      clientMessage: normalizedText
    });

    await appendBriefMessage({
      briefId,
      versionId,
      authorRole: "assistant",
      actorLabel: "Bridge briefing",
      messageText: aiReply.visibleReply,
      stage: currentVersion.stage
    });
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
    const closureArtifacts = await generateBriefClosureArtifacts({
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
        ...closureArtifacts.finalSummaryPatch,
        operatorReviewNote: JSON.stringify(closureArtifacts.finalJson)
      }
    );
  }

  await submitBriefForOperatorReview({ briefId, versionId });
  revalidatePath(`/cliente/brief/${projectId}`);
  revalidatePath(`/cliente/proyecto/${projectId}`);
}
