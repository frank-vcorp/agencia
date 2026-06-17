/**
 * IMPL-ARCH-20260528-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-05_directorio_clientes_operador_v1.md
 * IMPL-ARCH-20260612-05
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-05_gestion_clientes_crud_detalle_entidades_relacionadas.md
 *   CRUD de clientes + vista de detalle con entidades relacionadas.
 */
import {
  getClientById as getClientByIdAssets,
  getClientsByTenant,
  getProjectsByTenant,
  getTenantIdBySlug,
  type BrandKit
} from "./assets";
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
  recentProjectId: string | null;
  createdAt: string | null;
};

/**
 * Detalle extendido de un cliente para la vista `/cliente/[id]`.
 * Reutiliza los campos de ClientSummary y agrega tenantSlug para navegación.
 * IMPL-ARCH-20260612-05
 *
 * IMPL-20260613-01: agrega `brandKit` para que la vista pueda mostrar el logo
 * actual sin un fetch extra. Puede ser null si el cliente aún no tiene
 * Brand Kit configurado.
 */
export type ClientDetail = ClientSummary & {
  tenantSlug: string;
  brandKit: BrandKit | null;
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

export const CLIENT_STATUSES: ClientStatus[] = ["active", "prospect", "inactive"];

function toClientStatus(status: string | null | undefined): ClientStatus {
  if (status === "active" || status === "prospect" || status === "inactive") {
    return status;
  }
  return "active";
}

// ─── Helpers internos de PostgREST ────────────────────────────────────────────

function getServerApiKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseEnv.anonKey;
}

async function postgrest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${supabaseEnv.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: getServerApiKey(),
      Authorization: `Bearer ${getServerApiKey()}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`supabase_postgrest_error:${response.status}`);
  }

  if (response.status === 204) {
    return [] as T;
  }

  return (await response.json()) as T;
}

function sanitizeWhatsappLocal(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const prefix = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "");
  return `${prefix}${digits}` || null;
}

// ─── Lectura ──────────────────────────────────────────────────────────────────

export async function getClientDirectory(tenantSlug?: string): Promise<ClientDirectory> {
  const slug = tenantSlug ?? supabaseEnv.defaultTenant;

  if (!isSupabaseConfigured) {
    return { tenantSlug: slug, clients: [], isEmpty: true };
  }

  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return { tenantSlug: slug, clients: [], isEmpty: true };
  }

  const [rows, projectRows] = await Promise.all([
    getClientsByTenant(tenantId),
    getProjectsByTenant(tenantId)
  ]);

  // Primer proyecto por cliente (ya vienen ordenados desc por created_at)
  const recentProjectByClient = new Map<string, string>();
  for (const proj of projectRows) {
    if (!recentProjectByClient.has(proj.client_id)) {
      recentProjectByClient.set(proj.client_id, proj.id);
    }
  }

  const clients: ClientSummary[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    legalName: row.legal_name,
    status: toClientStatus(row.status),
    primaryContactName: row.primary_contact_name,
    primaryContactEmail: row.primary_contact_email,
    primaryContactWhatsapp: row.primary_contact_whatsapp,
    primaryContactChannel: row.primary_contact_channel,
    notes: row.notes,
    recentProjectId: recentProjectByClient.get(row.id) ?? null,
    createdAt: row.created_at ?? null
  }));

  return { tenantSlug: slug, clients, isEmpty: clients.length === 0 };
}

/**
 * IMPL-ARCH-20260612-05
 * Resuelve un cliente por id dentro del tenant por defecto. Retorna null si no
 * existe o si Supabase no está configurado. Reutiliza la versión tipada de
 * `lib/assets.ts` (que ya selecciona `brand_kit` por consistencia con el MCP).
 */
export async function getClientById(clientId: string): Promise<ClientDetail | null> {
  if (!isSupabaseConfigured || !clientId) return null;

  const tenantId = await getTenantIdBySlug(supabaseEnv.defaultTenant);
  if (!tenantId) return null;

  const row = await getClientByIdAssets(tenantId, clientId);
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    legalName: row.legal_name,
    status: toClientStatus(row.status),
    primaryContactName: row.primary_contact_name,
    primaryContactEmail: row.primary_contact_email,
    primaryContactWhatsapp: row.primary_contact_whatsapp,
    primaryContactChannel: row.primary_contact_channel,
    notes: row.notes,
    recentProjectId: null,
    createdAt: null,
    tenantSlug: supabaseEnv.defaultTenant,
    brandKit: row.brand_kit ?? null
  };
}

// ─── Escritura ────────────────────────────────────────────────────────────────

export type CreateClientInput = {
  name: string;
  legalName?: string | null;
  status?: ClientStatus;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactWhatsapp?: string | null;
  primaryContactChannel?: string | null;
  notes?: string | null;
};

/**
 * Crea un cliente en el tenant por defecto. Devuelve el id del cliente creado.
 * Lanza `client_name_invalid` si el nombre está vacío.
 * Lanza `supabase_postgrest_error:<status>` si la inserción falla.
 * IMPL-ARCH-20260612-05
 */
export async function createClient(data: CreateClientInput): Promise<{ id: string; name: string }> {
  const name = data.name?.trim();
  if (!name) {
    throw new Error("client_name_invalid");
  }

  if (!isSupabaseConfigured) {
    throw new Error("supabase_no_configured");
  }

  const tenantId = await getTenantIdBySlug(supabaseEnv.defaultTenant);
  if (!tenantId) {
    throw new Error("tenant_not_found");
  }

  const params = new URLSearchParams({ select: "id,name" });
  const rows = await postgrest<Array<{ id: string; name: string }>>(
    `clients?${params.toString()}`,
    {
      method: "POST",
      body: JSON.stringify({
        tenant_id: tenantId,
        name,
        legal_name: data.legalName ?? null,
        status: data.status ?? "active",
        primary_contact_name: data.primaryContactName ?? null,
        primary_contact_email: data.primaryContactEmail?.trim() || null,
        primary_contact_whatsapp: sanitizeWhatsappLocal(data.primaryContactWhatsapp),
        primary_contact_channel: data.primaryContactChannel ?? null,
        notes: data.notes ?? null
      })
    }
  );

  const row = rows[0];
  if (!row) {
    throw new Error("clients:create_failed");
  }
  return row;
}

export type UpdateClientInput = Partial<{
  name: string;
  legalName: string | null;
  status: ClientStatus;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactWhatsapp: string | null;
  primaryContactChannel: string | null;
  notes: string | null;
}>;

/**
 * Actualiza un cliente por id. Devuelve el id actualizado, o `null` si el cliente
 * no existe en el tenant. Solo se envian los campos definidos en el patch.
 * IMPL-ARCH-20260612-05
 */
export async function updateClient(
  clientId: string,
  patch: UpdateClientInput
): Promise<string | null> {
  if (!isSupabaseConfigured || !clientId) return null;

  const tenantId = await getTenantIdBySlug(supabaseEnv.defaultTenant);
  if (!tenantId) return null;

  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.legalName !== undefined) body.legal_name = patch.legalName;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.primaryContactName !== undefined) body.primary_contact_name = patch.primaryContactName;
  if (patch.primaryContactEmail !== undefined) {
    body.primary_contact_email = patch.primaryContactEmail?.trim() || null;
  }
  if (patch.primaryContactWhatsapp !== undefined) {
    body.primary_contact_whatsapp = sanitizeWhatsappLocal(patch.primaryContactWhatsapp);
  }
  if (patch.primaryContactChannel !== undefined) body.primary_contact_channel = patch.primaryContactChannel;
  if (patch.notes !== undefined) body.notes = patch.notes;

  if (Object.keys(body).length === 0) {
    // Sin cambios → no hace falta ir a Supabase, pero confirmamos existencia.
    const existing = await getClientByIdAssets(tenantId, clientId);
    return existing?.id ?? null;
  }

  const params = new URLSearchParams({
    tenant_id: `eq.${tenantId}`,
    id: `eq.${clientId}`,
    select: "id"
  });

  const rows = await postgrest<Array<{ id: string }>>(
    `clients?${params.toString()}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );

  return rows[0]?.id ?? null;
}

/**
 * Eliminación operativa del cliente. Marca `deleted_at` (papelera) para mantener
 * la consistencia con el resto de entidades (client/lead/brief) y no romper RLS
 * ni relaciones existentes. Devuelve `true` si la operación surtió efecto.
 *
 * NOTA: Se diferencia de `softDeleteClient` en `entity-delete.ts` en que esta
 * función es la capa de datos de alto nivel usada por la UI; la otra es la
 * usada por el MCP con preview/execute + confirmación textual.
 * IMPL-ARCH-20260612-05
 */
export async function deleteClient(clientId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !clientId) return false;

  const tenantId = await getTenantIdBySlug(supabaseEnv.defaultTenant);
  if (!tenantId) return false;

  const params = new URLSearchParams({
    tenant_id: `eq.${tenantId}`,
    id: `eq.${clientId}`,
    select: "id"
  });

  const rows = await postgrest<Array<{ id: string }>>(
    `clients?${params.toString()}`,
    {
      method: "PATCH",
      body: JSON.stringify({ deleted_at: new Date().toISOString() })
    }
  );

  return rows.length > 0;
}
