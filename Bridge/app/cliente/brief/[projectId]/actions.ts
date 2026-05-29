"use server";

/**
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-07_chat_brief_adaptativo_y_etapas_background_v1.md
 */
import { revalidatePath } from "next/cache";

import {
  buildFinalSummaryText,
  advanceBriefStage,
  advanceBriefStageInBackground,
  appendBriefMessage,
  appendClientBriefMessage,
  getBriefByProjectId,
  submitBriefForOperatorReview,
  updateBriefSummary
} from "@/lib/briefing";
import {
  generateBriefChatReply,
  generateBriefFinalJson,
  hasStageSufficientInfo,
  isBriefReadyForProposal
} from "@/lib/briefing-assistant-ai";

/**
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-07_chat_brief_adaptativo_y_etapas_background_v1.md
 */
async function syncBackgroundStages(
  briefId: string,
  versionId: string,
  stageVersion: Awaited<ReturnType<typeof updateBriefSummary>>
) {
  let currentVersion = stageVersion;

  while (hasStageSufficientInfo(currentVersion.stage, currentVersion.structuredSummary)) {
    if (currentVersion.stage === "commercial_fit") {
      return currentVersion;
    }

    currentVersion = await advanceBriefStageInBackground({ briefId, versionId });
  }

  return currentVersion;
}

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

  if (currentVersion) {
    const aiReply = await generateBriefChatReply({
      stage: currentVersion.stage,
      summary: currentVersion.structuredSummary,
      clientMessage: normalizedText
    });
    const nextVersion = Object.keys(aiReply.summaryPatch).length
      ? await updateBriefSummary({ briefId, versionId }, aiReply.summaryPatch)
      : currentVersion;
    const runtimeVersion = await syncBackgroundStages(briefId, versionId, nextVersion);

    await appendBriefMessage({
      briefId,
      versionId,
      authorRole: "assistant",
      actorLabel: "Bridge briefing",
      messageText: aiReply.visibleReply,
      stage: runtimeVersion.stage
    });

    if (
      runtimeVersion.stage === "commercial_fit" &&
      hasStageSufficientInfo(runtimeVersion.stage, runtimeVersion.structuredSummary) &&
      isBriefReadyForProposal(runtimeVersion.structuredSummary)
    ) {
      const finalBriefJson = await generateBriefFinalJson({
        stage: runtimeVersion.stage,
        summary: runtimeVersion.structuredSummary,
        messages: runtimeVersion.messages
      });

      const finalSummaryPatch = {
        operatorReviewNote: JSON.stringify(finalBriefJson)
      };

      await updateBriefSummary({ briefId, versionId }, finalSummaryPatch);
      await submitBriefForOperatorReview({ briefId, versionId });
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
    const finalBriefJson = await generateBriefFinalJson({
      stage: currentVersion.stage,
      summary: currentVersion.structuredSummary,
      messages: currentVersion.messages
    });

    const finalSummaryText = buildFinalSummaryText(currentVersion.structuredSummary);

    await updateBriefSummary(
      { briefId, versionId },
      {
        operatorReviewNote: JSON.stringify(finalBriefJson),
        commercialFitReason:
          currentVersion.structuredSummary.commercialFitReason ||
          `Cierre interno listo para propuesta. ${finalSummaryText}`
      }
    );
  }

  await submitBriefForOperatorReview({ briefId, versionId });
  revalidatePath(`/cliente/brief/${projectId}`);
  revalidatePath(`/cliente/proyecto/${projectId}`);
}
