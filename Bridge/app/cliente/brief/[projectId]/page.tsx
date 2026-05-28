/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-04_brief_chat_portal_cliente_v1.md
 */
import { ClientBriefChatView } from "@/components/client-brief-chat";
import { createBriefForProject, getBriefByProjectId } from "@/lib/briefing";

type ClientBriefPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ClientBriefPage({ params }: ClientBriefPageProps) {
  const { projectId } = await params;

  const brief = (await getBriefByProjectId(projectId)) ?? (await createBriefForProject(projectId));

  return <ClientBriefChatView brief={brief} projectId={projectId} />;
}
