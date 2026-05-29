"use server";

/**
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-01_brief_cliente_doble_capa_conversacional_v1.md
 */
import { revalidatePath } from "next/cache";

import {
  advanceBriefStage,
  appendBriefMessage,
  appendClientBriefMessage,
  buildAssistantGuidance,
  getBriefByProjectId,
  inferBriefSummaryPatchFromClientMessage,
  submitBriefForOperatorReview,
  updateBriefSummary
} from "@/lib/briefing";
import { generateBriefAssistantTurn } from "@/lib/briefing-assistant-ai";

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
    const aiTurn = await generateBriefAssistantTurn({
      stage: currentVersion.stage,
      summary: summaryForAssistant,
      clientMessage: normalizedText
    });
    const combinedPatch = {
      ...inferredPatch,
      ...(aiTurn?.summaryPatch ?? {})
    };
    const nextVersion = Object.keys(combinedPatch).length
      ? await updateBriefSummary({ briefId, versionId }, combinedPatch)
      : currentVersion;

    await appendBriefMessage({
      briefId,
      versionId,
      authorRole: "assistant",
      actorLabel: "Bridge briefing",
      messageText: aiTurn?.visibleReply ?? fallbackMessage,
      stage: nextVersion.stage
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
  await submitBriefForOperatorReview({ briefId, versionId });
  revalidatePath(`/cliente/brief/${projectId}`);
  revalidatePath(`/cliente/proyecto/${projectId}`);
}
