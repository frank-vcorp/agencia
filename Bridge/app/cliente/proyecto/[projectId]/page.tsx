/**
 * IMPL-20260612-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-03_cliente_portal_briefing_file_upload_estados_v1.md
 *
 * Portal del cliente por proyecto V2.
 * Re-exporta la version V2 que incluye header persistente con progreso,
 * chat con file upload, documentos y leads en una sola vista.
 *
 * IMPL-20260603-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260603-01_estabilizacion_runtime_chat_brief_cliente_v1.md
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-07_portal_cliente_por_proyecto_brief_first_v1.md
 */
import ClientProjectPageV2 from "./page-v2";

type ClientProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ClientProjectPage(props: ClientProjectPageProps) {
  return <ClientProjectPageV2 {...props} />;
}