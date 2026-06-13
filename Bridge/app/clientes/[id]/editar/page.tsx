/**
 * IMPL-ARCH-20260612-05
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-05_gestion_clientes_crud_detalle_entidades_relacionadas.md
 * Página para editar un cliente existente (solo operador). Carga el detalle
 * con `getClientById` y pre-rellena el formulario.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ClientForm } from "@/components/client-form";
import { getTenantIdentityContext } from "@/lib/identity";
import { getClientById } from "@/lib/clients";

export default async function EditarClientePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [identity, client] = await Promise.all([
    getTenantIdentityContext(),
    getClientById(id)
  ]);
  const isOperator = Boolean(identity?.operatorMembership);

  if (!isOperator) {
    redirect(`/cliente/${id}`);
  }

  if (!client) {
    notFound();
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
            Editar cliente
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
            {client.name}
          </h1>
        </div>
        <Link
          href={`/cliente/${client.id}`}
          className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-[color:var(--line)] transition hover:bg-slate-50"
        >
          Volver al detalle
        </Link>
      </div>

      <div className="panel rounded-[28px] px-6 py-6 ring-1 ring-[color:var(--line)]">
        <ClientForm
          mode="edit"
          clientId={client.id}
          initial={{
            name: client.name,
            legalName: client.legalName,
            status: client.status,
            primaryContactName: client.primaryContactName,
            primaryContactEmail: client.primaryContactEmail,
            primaryContactWhatsapp: client.primaryContactWhatsapp,
            primaryContactChannel: client.primaryContactChannel,
            notes: client.notes
          }}
        />
      </div>
    </section>
  );
}
