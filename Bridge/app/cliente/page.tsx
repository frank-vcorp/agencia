/**
 * IMPL-20260505-01 | IMPL-20260508-21
 * Respaldo: context/00_ARQUITECTURA.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260508-21_cliente_pwa_resultados_y_leads_v1.md
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-04_brief_chat_portal_cliente_v1.md
 */
import Link from "next/link";

import { ClientPortalView } from "@/components/client-portal";
import { getBriefWorkspace } from "@/lib/briefing";
import { getClientPortal } from "@/lib/client-portal";

export default async function ClientePage() {
  const portal = await getClientPortal();
  const brief = await getBriefWorkspace();
  const projectId = brief?.projectId;
  const ctaLabel = brief?.status === "approved_locked" ? "Ver brief" : "Completar brief";

  return (
    <div className="space-y-4 pb-8">
      {projectId && (
        <section className="panel rounded-[28px] px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
            Brief del proyecto
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm text-[color:var(--muted)]">
              Continúa tu briefing conversacional desde donde quedaste.
            </p>
            <Link
              href={`/cliente/brief/${projectId}`}
              className="rounded-[14px] bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            >
              {ctaLabel}
            </Link>
          </div>
        </section>
      )}
      <ClientPortalView portal={portal} />
    </div>
  );
}
