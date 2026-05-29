/**
 * IMPL-20260505-01 | IMPL-20260508-21
 * Respaldo: context/00_ARQUITECTURA.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260508-21_cliente_pwa_resultados_y_leads_v1.md
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-07_portal_cliente_por_proyecto_brief_first_v1.md
 */
import { redirect } from "next/navigation";

import { getClientPortal } from "@/lib/client-portal";

export default async function ClientePage() {
  const portal = await getClientPortal();

  if (portal.activeProjectId) {
    redirect(`/cliente/proyecto/${portal.activeProjectId}`);
  }

  return (
    <section className="panel rounded-[28px] px-6 py-8">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Portal del cliente
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-[color:var(--foreground)]">
        Aún no tienes un proyecto asignado
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">
        Cuando el equipo cree tu proyecto, esta entrada te llevará directo a tu brief conversacional.
      </p>
    </section>
  );
}
