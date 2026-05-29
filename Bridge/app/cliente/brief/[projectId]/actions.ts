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
  submitBriefForOperatorReview
} from "@/lib/briefing";

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
    await appendBriefMessage({
      briefId,
      versionId,
      authorRole: "assistant",
      actorLabel: "Bridge briefing",
      messageText: buildAssistantGuidance(currentVersion.stage, currentVersion.structuredSummary),
      stage: currentVersion.stage
    });
  }

  revalidatePath(`/cliente/proyecto/${projectId}`);
}

export async function advanceStageAction(
  projectId: string,
  briefId: string,
  versionId: string
): Promise<void> {
  await advanceBriefStage({ briefId, versionId });
  revalidatePath(`/cliente/proyecto/${projectId}`);
}

export async function submitBriefAction(
  projectId: string,
  briefId: string,
  versionId: string
): Promise<void> {
  await submitBriefForOperatorReview({ briefId, versionId });
  revalidatePath(`/cliente/proyecto/${projectId}`);
}
