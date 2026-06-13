/**
 * IMPL-ARCH-20260612-05
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-05_gestion_clientes_crud_detalle_entidades_relacionadas.md
 * Página para crear un nuevo cliente (solo operador). Si el visitante no es
 * operador, no se muestra el formulario y se invita a volver al directorio.
 */
import { redirect } from "next/navigation";

import { ClientForm } from "@/components/client-form";
import { getTenantIdentityContext } from "@/lib/identity";

export default async function NuevoClientePage() {
  const identity = await getTenantIdentityContext();
  const isOperator = Boolean(identity?.operatorMembership);

  if (!isOperator) {
    redirect("/clientes");
  }

  return (
    <section className="panel rounded-[28px] px-6 py-6 ring-1 ring-[color:var(--line)]">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Nuevo cliente
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
        Crear cliente
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-[color:var(--muted)]">
        Captura la información básica de contacto. Tras guardar serás llevado al
        detalle del cliente donde podrás crear briefs, cotizaciones, activos y
        leads vinculados.
      </p>

      <div className="mt-6">
        <ClientForm mode="create" />
      </div>
    </section>
  );
}
