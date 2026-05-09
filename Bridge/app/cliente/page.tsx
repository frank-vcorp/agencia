/**
 * IMPL-20260505-01 | IMPL-20260508-21
 * Respaldo: context/00_ARQUITECTURA.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260508-21_cliente_pwa_resultados_y_leads_v1.md
 */
import { ClientPortalView } from "@/components/client-portal";
import { getClientPortal } from "@/lib/client-portal";

export default async function ClientePage() {
  const portal = await getClientPortal();
  return <ClientPortalView portal={portal} />;
}
