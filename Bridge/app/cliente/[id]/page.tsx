/**
 * IMPL-ARCH-20260612-05
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-05_gestion_clientes_crud_detalle_entidades_relacionadas.md
 * Vista de detalle del cliente con header y tabs. Carga en paralelo el
 * cliente + entidades relacionadas filtradas por clientId.
 *
 * Ruta: /cliente/[id]
 * - Operador: ve header completo + tabs con conteos + acciones (Editar /
 *   Eliminar) + botones "Nuevo [entidad]" por tab.
 * - Cliente: solo ve su propio cliente (RLS protege); no ve acciones de
 *   creación/edición/eliminación.
 */
import { notFound } from "next/navigation";

import { ClientDetailView } from "@/components/client-detail-view";
import {
  getAssetsByTenant,
  getBriefsByTenant,
  getTenantIdBySlug,
  type AssetWorkspace
} from "@/lib/assets";
import { getQuotationsByTenant, type Quotation } from "@/lib/quotations";
import { getLeadsByTenant, type Lead } from "@/lib/crm";
import { getClientById } from "@/lib/clients";
import { getTenantIdentityContext } from "@/lib/identity";

export default async function ClienteDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [identity, client] = await Promise.all([
    getTenantIdentityContext(),
    getClientById(id)
  ]);
  const isOperator = Boolean(identity?.operatorMembership);

  if (!client) {
    notFound();
  }

  const tenantId = await getTenantIdBySlug(client.tenantSlug).catch(() => null);

  let briefs: Array<{
    id: string;
    status: string;
    sourceChannel: string;
    currentVersionNumber: number;
  }> = [];
  let quotations: Quotation[] = [];
  let assets: AssetWorkspace[] = [];
  let leads: Lead[] = [];

  if (tenantId) {
    // Carga en paralelo de las entidades relacionadas filtradas por clientId.
    const [briefRows, quotationRows, assetRows, leadRows] = await Promise.all([
      getBriefsByTenant(tenantId, id).catch(() => []),
      getQuotationsByTenant(tenantId, id).catch(() => []),
      getAssetsByTenant(tenantId, id).catch(() => []),
      getLeadsByTenant(tenantId, id).catch(() => [])
    ]);

    briefs = briefRows.map((b) => ({
      id: b.id,
      status: b.status,
      sourceChannel: b.source_channel,
      currentVersionNumber: b.current_version_number
    }));
    quotations = quotationRows.map((q) => ({
      id: q.id,
      tenantId: q.tenant_id,
      clientId: q.client_id,
      projectId: q.project_id,
      briefId: q.brief_id,
      status: q.status as Quotation["status"],
      activeVersionId: q.active_version_id,
      createdAt: q.created_at,
      updatedAt: q.updated_at
    }));
    assets = assetRows;
    leads = leadRows;
  }

  return (
    <ClientDetailView
      client={client}
      isOperator={isOperator}
      briefs={briefs}
      quotations={quotations}
      assets={assets}
      leads={leads}
    />
  );
}
