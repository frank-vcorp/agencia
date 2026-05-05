/**
 * IMPL-20260505-02
 * Respaldo: context/MODELO_DATOS_MULTITENANT_V1.md, context/SPECs/SPEC_ARCH-20260504-04_bridge_v1_roles_base_y_flujos.md
 */
import { isSupabaseConfigured, supabaseEnv } from "./supabase";

export type TenantRuntimeConfig = {
  dashboardHeadline: string;
  dashboardSummary: string;
  primaryContactChannel: string | null;
  activeModules: string[];
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
      }
    | Array<{
        dashboard_headline: string;
        dashboard_summary: string;
        primary_contact_channel: string | null;
        active_modules: string[] | null;
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
          activeModules: runtimeSettings.active_modules ?? []
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
    "slug,name,status,tenant_runtime_settings(dashboard_headline,dashboard_summary,primary_contact_channel,active_modules)"
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