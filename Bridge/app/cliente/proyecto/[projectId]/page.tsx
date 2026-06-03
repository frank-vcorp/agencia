/**
 * IMPL-20260603-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260603-01_estabilizacion_runtime_chat_brief_cliente_v1.md
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-07_portal_cliente_por_proyecto_brief_first_v1.md
 */
import { ClientBriefChatView } from "@/components/client-brief-chat";
import { getOrCreateBriefForProject } from "@/lib/briefing";

type ClientProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ClientProjectPage({ params }: ClientProjectPageProps) {
  const { projectId } = await params;

  const brief = await getOrCreateBriefForProject(projectId);

  return <ClientBriefChatView brief={brief} projectId={projectId} />;
}