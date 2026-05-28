/**
 * IMPL-ARCH-20260528-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-05_directorio_clientes_operador_v1.md
 */
import { getClientsByTenant, getTenantIdBySlug } from "./assets";
import { isSupabaseConfigured, supabaseEnv } from "./supabase";

export type ClientStatus = "active" | "prospect" | "inactive";

export type ClientSummary = {
  id: string;
  name: string;
  legalName: string | null;
  status: ClientStatus;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactWhatsapp: string | null;
  primaryContactChannel: string | null;
  notes: string | null;
};

export type ClientDirectory = {
  tenantSlug: string;
  clients: ClientSummary[];
  isEmpty: boolean;
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Activo",
  prospect: "Prospecto",
  inactive: "Inactivo"
};

function toClientStatus(status: string | null | undefined): ClientStatus {
  if (status === "active" || status === "prospect" || status === "inactive") {
    return status;
  }
  return "active";
}

export async function getClientDirectory(tenantSlug?: string): Promise<ClientDirectory> {
  const slug = tenantSlug ?? supabaseEnv.defaultTenant;

  if (!isSupabaseConfigured) {
    return { tenantSlug: slug, clients: [], isEmpty: true };
  }

  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return { tenantSlug: slug, clients: [], isEmpty: true };
  }

  const rows = await getClientsByTenant(tenantId);
  const clients: ClientSummary[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    legalName: row.legal_name,
    status: toClientStatus(row.status),
    primaryContactName: row.primary_contact_name,
    primaryContactEmail: row.primary_contact_email,
    primaryContactWhatsapp: row.primary_contact_whatsapp,
    primaryContactChannel: row.primary_contact_channel,
    notes: row.notes
  }));

  return { tenantSlug: slug, clients, isEmpty: clients.length === 0 };
}
