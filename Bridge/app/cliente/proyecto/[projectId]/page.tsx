/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-07_portal_cliente_por_proyecto_brief_first_v1.md
 */
import { ClientBriefChatView } from "@/components/client-brief-chat";
import { createBriefForProject, getBriefByProjectId } from "@/lib/briefing";

type ClientProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ClientProjectPage({ params }: ClientProjectPageProps) {
  const { projectId } = await params;

  const brief = (await getBriefByProjectId(projectId)) ?? (await createBriefForProject(projectId));

  return <ClientBriefChatView brief={brief} projectId={projectId} />;
}