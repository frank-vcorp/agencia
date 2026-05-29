"use server";

/**
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-02_brief_cliente_chat_natural_y_json_final_v1.md
 */
import { revalidatePath } from "next/cache";

import {
  buildFinalSummaryText,
  advanceBriefStage,
  appendBriefMessage,
  appendClientBriefMessage,
  buildAssistantGuidance,
  getBriefByProjectId,
  inferBriefSummaryPatchFromClientMessage,
  submitBriefForOperatorReview,
  updateBriefSummary
} from "@/lib/briefing";
import {
  generateBriefChatReply,
  generateBriefFinalJson,
  isBriefReadyForProposal
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

  if (currentVersion) {
    const inferredPatch = inferBriefSummaryPatchFromClientMessage(
      currentVersion.stage,
      currentVersion.structuredSummary,
      normalizedText
    );
    const summaryForAssistant = {
      ...currentVersion.structuredSummary,
      ...inferredPatch
    };
    const fallbackMessage = buildAssistantGuidance(currentVersion.stage, summaryForAssistant);
    const aiReply = await generateBriefChatReply({
      stage: currentVersion.stage,
      summary: summaryForAssistant,
      clientMessage: normalizedText
    });
    const nextVersion = Object.keys(inferredPatch).length
      ? await updateBriefSummary({ briefId, versionId }, inferredPatch)
      : currentVersion;

    await appendBriefMessage({
      briefId,
      versionId,
      authorRole: "assistant",
      actorLabel: "Bridge briefing",
      messageText: aiReply.visibleReply || fallbackMessage,
      stage: nextVersion.stage
    });

    if (nextVersion.stage === "commercial_fit" && aiReply.stageHasSufficientInfo && isBriefReadyForProposal(nextVersion.structuredSummary)) {
      const finalBriefJson = await generateBriefFinalJson({
        stage: nextVersion.stage,
        summary: nextVersion.structuredSummary,
        messages: nextVersion.messages
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
