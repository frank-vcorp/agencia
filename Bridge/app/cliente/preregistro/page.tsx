/**
 * IMPL-20260613-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260610-05_preregistro_cliente_vendedor.md
 *
 * Página server component de pre-registro para vendedores.
 * Renderiza el formulario (client component) que usa la server action
 * `submitPreregistroAction` definida en `./actions.ts`.
 */
import { PreregistroForm } from "./preregistro-form";

export default function PreregistroPage() {
  return (
    <section className="panel rounded-[28px] px-6 py-8 max-w-2xl mx-auto">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Pre-registro de cliente
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-[color:var(--foreground)]">
        Captura rápida de prospecto
      </h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Captura los datos del prospecto; el sistema creará el cliente y un
        proyecto en estado de borrador y te entregará un link de WhatsApp para
        que el cliente complete su brief.
      </p>

      <div className="mt-6">
        <PreregistroForm />
      </div>
    </section>
  );
}
