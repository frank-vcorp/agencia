/**
 * IMPL-20260505-01
 * Respaldo: context/00_ARQUITECTURA.md, PROYECTO.md
 */
export const supabaseEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  projectRef: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF ?? "",
  defaultTenant: process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? "vectoria"
};

export const isSupabaseConfigured = Boolean(supabaseEnv.url && supabaseEnv.anonKey);

export const isSupabaseProjectLinked = Boolean(supabaseEnv.url && supabaseEnv.projectRef);
