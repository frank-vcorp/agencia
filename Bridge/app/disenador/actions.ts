/**
 * IMPL-20260506-52
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-52_disenador_sesiones_reales_y_cierre_jornada.md
 *
 * Server actions para el workspace del disenador.
 * Persisten sesiones en work_sessions y sincronizan el estado del activo.
 * Todas las escrituras usan service_role. No requiere auth de usuario final en V1.
 */
"use server";

import { revalidatePath } from "next/cache";

import { supabaseEnv } from "@/lib/supabase";

// ─── Helpers internos ─────────────────────────────────────────────────────────

function getServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseEnv.anonKey;
}

function baseHeaders() {
  const key = getServiceKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
}

async function pgPost(
  table: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; id?: string }> {
  const res = await fetch(`${supabaseEnv.url}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...baseHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(body)
  });
  if (!res.ok) return { ok: false };
  const data = (await res.json()) as Array<{ id: string }>;
  return { ok: true, id: data[0]?.id };
}

async function pgPatch(
  table: string,
  filter: string,
  body: Record<string, unknown>
): Promise<boolean> {
  const res = await fetch(`${supabaseEnv.url}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: { ...baseHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(body)
  });
  return res.ok;
}

/** Resuelve el tenant_id desde el slug por defecto. */
async function resolveDefaultTenantId(): Promise<string | null> {
  const slug = supabaseEnv.defaultTenant;
  const params = new URLSearchParams({ select: "id", slug: `eq.${slug}`, limit: "1" });
  const res = await fetch(`${supabaseEnv.url}/rest/v1/tenants?${params.toString()}`, {
    method: "GET",
    headers: baseHeaders(),
    cache: "no-store"
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}

// ─── Resultado comun de acciones ──────────────────────────────────────────────

export type SessionActionResult = {
  success: boolean;
  sessionId?: string;
  error?: string;
};

// ─── Acciones reales del workspace ────────────────────────────────────────────

/**
 * Inicia una sesion de trabajo para un activo.
 * Si el activo estaba en 'draft', lo avanza a 'in_progress'.
 * IMPL-20260506-52
 */
export async function startWorkSession(assetId: string): Promise<SessionActionResult> {
  const tenantId = await resolveDefaultTenantId();
  if (!tenantId) return { success: false, error: "Tenant no encontrado" };

  const result = await pgPost("work_sessions", {
    tenant_id: tenantId,
    asset_id: assetId,
    status: "active"
  });

  if (!result.ok) return { success: false, error: "No se pudo crear la sesion" };

  // Avanzar asset a in_progress si estaba en draft
  await pgPatch(
    "assets",
    new URLSearchParams({ id: `eq.${assetId}`, status: "eq.draft" }).toString(),
    { status: "in_progress", updated_at: new Date().toISOString() }
  );

  revalidatePath("/disenador");
  revalidatePath(`/activos/${assetId}`);
  return { success: true, sessionId: result.id };
}

/**
 * Bloquea la sesion activa con un motivo opcional.
 * No cambia el estado del activo (sigue en_progreso — la sesion es quien reporta el bloqueo).
 * IMPL-20260506-52
 */
export async function blockWorkSession(
  sessionId: string,
  reason: string
): Promise<SessionActionResult> {
  const ok = await pgPatch(
    "work_sessions",
    new URLSearchParams({ id: `eq.${sessionId}`, status: "eq.active" }).toString(),
    {
      status: "blocked",
      blocked_reason: reason || null,
      updated_at: new Date().toISOString()
    }
  );

  if (!ok) return { success: false, error: "No se pudo bloquear la sesion" };
  revalidatePath("/disenador");
  return { success: true, sessionId };
}

/**
 * Retoma una sesion bloqueada: cierra la sesion bloqueada y abre una nueva activa.
 * IMPL-20260506-52
 */
export async function resumeWorkSession(
  blockedSessionId: string,
  assetId: string
): Promise<SessionActionResult> {
  const tenantId = await resolveDefaultTenantId();
  if (!tenantId) return { success: false, error: "Tenant no encontrado" };

  const now = new Date().toISOString();

  // Cerrar sesion bloqueada
  await pgPatch(
    "work_sessions",
    new URLSearchParams({ id: `eq.${blockedSessionId}` }).toString(),
    { status: "completed", ended_at: now, updated_at: now }
  );

  // Abrir nueva sesion activa
  const result = await pgPost("work_sessions", {
    tenant_id: tenantId,
    asset_id: assetId,
    status: "active"
  });

  if (!result.ok) return { success: false, error: "No se pudo crear sesion de retomada" };
  revalidatePath("/disenador");
  revalidatePath(`/activos/${assetId}`);
  return { success: true, sessionId: result.id };
}

/**
 * Termina la sesion activa sin cambiar el estado del activo.
 * El activo sigue en 'in_progress' — solo se cierra el registro de tiempo.
 * IMPL-20260506-52
 */
export async function endWorkSession(sessionId: string): Promise<SessionActionResult> {
  const now = new Date().toISOString();
  const ok = await pgPatch(
    "work_sessions",
    new URLSearchParams({ id: `eq.${sessionId}` }).toString(),
    { status: "completed", ended_at: now, updated_at: now }
  );

  if (!ok) return { success: false, error: "No se pudo cerrar la sesion" };
  revalidatePath("/disenador");
  return { success: true, sessionId };
}

/**
 * Marca el activo como 'in_review' y cierra la sesion activa si existe.
 * Equivale al boton "Listo para revision" del workspace.
 * IMPL-20260506-52
 */
export async function markAssetReadyForReview(
  assetId: string,
  sessionId?: string
): Promise<SessionActionResult> {
  const now = new Date().toISOString();

  if (sessionId) {
    await pgPatch(
      "work_sessions",
      new URLSearchParams({ id: `eq.${sessionId}` }).toString(),
      { status: "completed", ended_at: now, updated_at: now }
    );
  }

  const ok = await pgPatch(
    "assets",
    new URLSearchParams({ id: `eq.${assetId}` }).toString(),
    { status: "in_review", updated_at: now }
  );

  if (!ok) return { success: false, error: "No se pudo actualizar el estado del activo" };
  revalidatePath("/disenador");
  revalidatePath(`/activos/${assetId}`);
  revalidatePath("/activos");
  return { success: true };
}
