/**
 * IMPL-20260505-01
 * ARCH-20260506-37
 * Respaldo: context/00_ARQUITECTURA.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260504-04_bridge_v1_roles_base_y_flujos.md
 */
import Link from "next/link";

const clientActions = [
  {
    title: "Revisar brief",
    href: "/briefs",
    eyebrow: "Contexto",
    detail: "Ver el brief vigente y confirmar el enfoque del proyecto."
  },
  {
    title: "Ver cotizacion",
    href: "/cotizaciones",
    eyebrow: "Comercial",
    detail: "Entrar directo a la propuesta vigente y sus datos clave."
  },
  {
    title: "Revisar activos",
    href: "/activos",
    eyebrow: "Material",
    detail: "Abrir las piezas activas del proyecto para validar lo entregable."
  }
] as const;

export default function ClientePage() {
  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] px-6 py-6">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
          Portal del cliente
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
          Vista limpia para revisar avance
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[color:var(--muted)]">
          Entra directo a lo vigente del proyecto sin bloques informativos extra.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {clientActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="panel rounded-[26px] px-5 py-5 transition hover:-translate-y-0.5"
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
              {action.eyebrow}
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
              {action.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{action.detail}</p>
          </Link>
        ))}
      </section>

      <section className="panel rounded-[30px] px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Accion sugerida
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
              Empieza por activos
            </h2>
          </div>
          <Link
            href="/activos"
            className="rounded-[18px] bg-[color:var(--accent-deep)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Abrir activos
          </Link>
        </div>
      </section>
    </div>
  );
}
