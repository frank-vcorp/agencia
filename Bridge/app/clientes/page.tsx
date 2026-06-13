/**
 * IMPL-ARCH-20260528-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-05_directorio_clientes_operador_v1.md
 * IMPL-ARCH-20260612-05
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-05_gestion_clientes_crud_detalle_entidades_relacionadas.md
 *  - Pasa `isOperator` para mostrar/ocultar acciones de creación, edición y
 *    eliminación. RLS sigue siendo la fuente de verdad; este flag es solo UI.
 */
import { ClientListView } from "@/components/client-list";
import { getClientDirectory } from "@/lib/clients";
import { getTenantIdentityContext } from "@/lib/identity";

export default async function ClientesPage() {
  const [directory, identity] = await Promise.all([
    getClientDirectory(),
    getTenantIdentityContext()
  ]);
  const isOperator = Boolean(identity?.operatorMembership);
  const portalBaseUrl = process.env.BRIDGE_PORTAL_URL ?? "https://vectoria-zeta.vercel.app";
  return (
    <ClientListView
      directory={directory}
      portalBaseUrl={portalBaseUrl}
      isOperator={isOperator}
    />
  );
}
