/**
 * IMPL-20260505-02 | IMPL-20260513-05
 * Respaldo: context/MODELO_DATOS_MULTITENANT_V1.md, context/SPECs/SPEC_ARCH-20260504-04_bridge_v1_roles_base_y_flujos.md
 * IMPL-20260513-05: context/SPECs/SPEC_ARCH-20260513-05_configuracion_sendgrid_segura_v1.md
 */
import { isSupabaseConfigured, supabaseEnv } from "./supabase";

export type TenantRuntimeConfig = {
  dashboardHeadline: string;
  dashboardSummary: string;
  primaryContactChannel: string | null;
  activeModules: string[];
  sendgridFromEmail: string | null;
  sendgridAgencyName: string | null;
  sendgridReplyToEmail: string | null;
};

/** Parámetros no secretos de SendGrid editables desde UI */
export type SendgridRuntimeConfig = {
  sendgridFromEmail: string | null;
  sendgridAgencyName: string | null;
  sendgridReplyToEmail: string | null;
};

export type TenantSnapshot = {
  slug: string;
  name: string;
  status: string;
  config: TenantRuntimeConfig | null;
};

type TenantRuntimeApiRow = {
  slug: string;
  name: string;
  status: string;
  tenant_runtime_settings?:
    | {
        dashboard_headline: string;
        dashboard_summary: string;
        primary_contact_channel: string | null;
        active_modules: string[] | null;
        sendgrid_from_email: string | null;
        sendgrid_agency_name: string | null;
        sendgrid_reply_to_email: string | null;
      }
    | Array<{
        dashboard_headline: string;
        dashboard_summary: string;
        primary_contact_channel: string | null;
        active_modules: string[] | null;
        sendgrid_from_email: string | null;
        sendgrid_agency_name: string | null;
        sendgrid_reply_to_email: string | null;
      }>
    | null;
};

function getServerApiKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseEnv.anonKey;
}

export function normalizeTenantSnapshot(row: TenantRuntimeApiRow): TenantSnapshot {
  const runtimeSettings = Array.isArray(row.tenant_runtime_settings)
    ? row.tenant_runtime_settings[0] ?? null
    : row.tenant_runtime_settings ?? null;

  return {
    slug: row.slug,
    name: row.name,
    status: row.status,
    config: runtimeSettings
      ? {
          dashboardHeadline: runtimeSettings.dashboard_headline,
          dashboardSummary: runtimeSettings.dashboard_summary,
          primaryContactChannel: runtimeSettings.primary_contact_channel,
          activeModules: runtimeSettings.active_modules ?? [],
          sendgridFromEmail: runtimeSettings.sendgrid_from_email ?? null,
          sendgridAgencyName: runtimeSettings.sendgrid_agency_name ?? null,
          sendgridReplyToEmail: runtimeSettings.sendgrid_reply_to_email ?? null
        }
      : null
  };
}

export async function getTenantSnapshot(slug = supabaseEnv.defaultTenant): Promise<TenantSnapshot | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const requestUrl = new URL(`${supabaseEnv.url}/rest/v1/tenants`);
  requestUrl.searchParams.set(
    "select",
    "slug,name,status,tenant_runtime_settings(dashboard_headline,dashboard_summary,primary_contact_channel,active_modules,sendgrid_from_email,sendgrid_agency_name,sendgrid_reply_to_email)"
  );
  requestUrl.searchParams.set("slug", `eq.${slug}`);
  requestUrl.searchParams.set("limit", "1");

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        apikey: getServerApiKey(),
        Authorization: `Bearer ${getServerApiKey()}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as TenantRuntimeApiRow[];
    const row = payload[0];

    return row ? normalizeTenantSnapshot(row) : null;
  } catch {
    return null;
  }
}

/**
 * Lee solo los parámetros no secretos de SendGrid para un tenant.
 * Retorna null si Supabase no está configurado o el tenant no existe.
 */
export async function getTenantSendgridConfig(
  slug = supabaseEnv.defaultTenant
): Promise<SendgridRuntimeConfig | null> {
  const snapshot = await getTenantSnapshot(slug);
  if (!snapshot?.config) return null;
  return {
    sendgridFromEmail: snapshot.config.sendgridFromEmail,
    sendgridAgencyName: snapshot.config.sendgridAgencyName,
    sendgridReplyToEmail: snapshot.config.sendgridReplyToEmail
  };
}

/**
 * Actualiza los parámetros no secretos de SendGrid en tenant_runtime_settings.
 * Requiere service role key. No persiste SENDGRID_API_KEY — ese secreto
 * vive fuera de Bridge.
 */
export async function updateTenantSendgridConfig(
  slug: string,
  config: Partial<SendgridRuntimeConfig>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: "supabase_not_configured" };
  }

  // Primero obtenemos el tenant_id a partir del slug
  const tenantUrl = new URL(`${supabaseEnv.url}/rest/v1/tenants`);
  tenantUrl.searchParams.set("select", "id");
  tenantUrl.searchParams.set("slug", `eq.${slug}`);
  tenantUrl.searchParams.set("limit", "1");

  let tenantId: string;
  try {
    const res = await fetch(tenantUrl, {
      headers: {
        apikey: getServerApiKey(),
        Authorization: `Bearer ${getServerApiKey()}`
      },
      cache: "no-store"
    });
    if (!res.ok) return { success: false, error: "tenant_fetch_failed" };
    const rows = (await res.json()) as Array<{ id: string }>;
    if (!rows[0]?.id) return { success: false, error: "tenant_not_found" };
    tenantId = rows[0].id;
  } catch {
    return { success: false, error: "tenant_fetch_exception" };
  }

  // Construimos el payload solo con los campos que vienen en config
  const patch: Record<string, string | null> = {};
  if ("sendgridFromEmail" in config) patch["sendgrid_from_email"] = config.sendgridFromEmail ?? null;
  if ("sendgridAgencyName" in config) patch["sendgrid_agency_name"] = config.sendgridAgencyName ?? null;
  if ("sendgridReplyToEmail" in config) patch["sendgrid_reply_to_email"] = config.sendgridReplyToEmail ?? null;

  if (Object.keys(patch).length === 0) {
    return { success: true };
  }

  const patchUrl = new URL(`${supabaseEnv.url}/rest/v1/tenant_runtime_settings`);
  patchUrl.searchParams.set("tenant_id", `eq.${tenantId}`);

  try {
    const res = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        apikey: getServerApiKey(),
        Authorization: `Bearer ${getServerApiKey()}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(patch),
      cache: "no-store"
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { success: false, error: detail || "patch_failed" };
    }
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { success: false, error: msg };
  }
}