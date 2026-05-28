/**
 * IMPL-ARCH-20260528-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-05_directorio_clientes_operador_v1.md
 */
import { ClientListView } from "@/components/client-list";
import { getClientDirectory } from "@/lib/clients";

export default async function ClientesPage() {
  const directory = await getClientDirectory();
  const portalBaseUrl = process.env.BRIDGE_PORTAL_URL ?? "https://vectoria-zeta.vercel.app";
  return <ClientListView directory={directory} portalBaseUrl={portalBaseUrl} />;
}
