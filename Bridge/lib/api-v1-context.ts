/**
 * IMPL-20260526-04
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-07_normalizacion_contexto_auth_tenant_rutas_crud_id_v1.md
 *
 * Contexto compartido para rutas API v1 con auth de agente y tenant resuelto.
 */
import { NextRequest, NextResponse } from "next/server";

import { getTenantSlug, verifyAgentToken } from "@/lib/agent-auth";
import { resolveTenantIdBySlug } from "@/lib/tenant";

export type ApiV1RequestContext = {
  tenantId: string;
};

/**
 * IMPL-20260526-04
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-07_normalizacion_contexto_auth_tenant_rutas_crud_id_v1.md
 */
export async function resolveApiV1RequestContext(
  req: NextRequest
): Promise<{ context: ApiV1RequestContext | null; error: NextResponse | null }> {
  const authError = verifyAgentToken(req);
  if (authError) {
    return { context: null, error: authError };
  }

  const slug = getTenantSlug(req);
  const tenantId = await resolveTenantIdBySlug(slug);
  if (!tenantId) {
    return {
      context: null,
      error: NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 })
    };
  }

  return { context: { tenantId }, error: null };
}
