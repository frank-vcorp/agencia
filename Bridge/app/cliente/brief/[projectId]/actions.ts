"use server";

/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-07_portal_cliente_por_proyecto_brief_first_v1.md
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
import { generateBriefAssistantReply } from "@/lib/briefing-assistant-ai";

/**
 * IMPL-20260528-08
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-08_brief_cliente_ia_real_gemini_v1.md
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
    const nextVersion = Object.keys(inferredPatch).length
      ? await updateBriefSummary({ briefId, versionId }, inferredPatch)
      : currentVersion;
    const fallbackMessage = buildAssistantGuidance(nextVersion.stage, nextVersion.structuredSummary);
    const aiReply = await generateBriefAssistantReply({
      stage: nextVersion.stage,
      summary: nextVersion.structuredSummary,
      clientMessage: normalizedText
    });

    await appendBriefMessage({
      briefId,
      versionId,
      authorRole: "assistant",
      actorLabel: "Bridge briefing",
      messageText: aiReply ?? fallbackMessage,
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
