/**
 * IMPL-20260526-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-06_unificacion_resolucion_tenant_dominio_bridge_v1.md
 *
 * Punto canonico para resolver tenant por slug en dominio Bridge.
 */
import { isSupabaseConfigured, supabaseEnv } from "./supabase";

type TenantRow = {
  id: string;
};

function getServerApiKey() {
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

/**
 * IMPL-20260526-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-06_unificacion_resolucion_tenant_dominio_bridge_v1.md
 */
export async function resolveTenantIdBySlug(
  slug = supabaseEnv.defaultTenant
): Promise<string | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const params = new URLSearchParams({
    select: "id",
    slug: `eq.${slug}`,
    limit: "1"
  });
  const rows = await postgrest<TenantRow[]>(`tenants?${params.toString()}`, {
    method: "GET"
  });

  return rows[0]?.id ?? null;
}
