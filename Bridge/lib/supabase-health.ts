/**
 * ARCH-20260505-15
 * Respaldo: context/00_ARQUITECTURA.md, context/AGENTES_Y_CONOCIMIENTO_V1.md
 */
import { supabaseEnv, isSupabaseConfigured } from "@/lib/supabase";

export type SupabaseHealth = {
  connected: boolean;
  label: string;
  detail: string;
};

export async function getSupabaseHealth(): Promise<SupabaseHealth> {
  if (!isSupabaseConfigured) {
    return {
      connected: false,
      label: "Supabase pendiente",
      detail: "Faltan variables publicas para conectar Bridge al proyecto remoto."
    };
  }

  try {
    const response = await fetch(`${supabaseEnv.url}/auth/v1/settings`, {
      method: "GET",
      headers: {
        apikey: supabaseEnv.anonKey,
        Authorization: `Bearer ${supabaseEnv.anonKey}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return {
        connected: false,
        label: "Supabase sin respuesta",
        detail: `El proyecto ${supabaseEnv.projectRef || "sin-ref"} respondio con estado ${response.status}.`
      };
    }

    return {
      connected: true,
      label: "Supabase conectado",
      detail: `Proyecto ${supabaseEnv.projectRef || "sin-ref"} listo para enlazar datos del tenant ${supabaseEnv.defaultTenant}.`
    };
  } catch {
    return {
      connected: false,
      label: "Supabase no alcanzable",
      detail: `Bridge no pudo verificar el proyecto ${supabaseEnv.projectRef || "sin-ref"} desde el entorno actual.`
    };
  }
}