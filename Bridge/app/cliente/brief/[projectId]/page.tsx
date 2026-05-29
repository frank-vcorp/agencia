/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-07_portal_cliente_por_proyecto_brief_first_v1.md
 */
import { redirect } from "next/navigation";

type ClientBriefPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ClientBriefPage({ params }: ClientBriefPageProps) {
  const { projectId } = await params;
  redirect(`/cliente/proyecto/${projectId}`);
}
