/**
 * IMPL-20260505-01
 * Respaldo: context/00_ARQUITECTURA.md, context/SPECs/SPEC_ARCH-20260504-04_bridge_v1_roles_base_y_flujos.md
 */
import Link from "next/link";

import { modulePages, p0Combinations, roleViews, type RoleKey } from "@/lib/bridge-data";

export function RoleWorkspace({ roleKey }: { roleKey: RoleKey }) {
  const role = roleViews[roleKey];
  const modules = modulePages.filter((module) => role.modules.includes(module.key));

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1.22fr_0.78fr]">
        <article className="panel rounded-[30px] px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-deep)]">
                {role.eyebrow}
              </div>
              <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">{role.title}</h2>
              <p className="mt-2 max-w-3xl text-base leading-7 text-[color:var(--muted)]">{role.summary}</p>
            </div>
            <div className="rounded-[24px] bg-slate-900 px-4 py-4 text-white">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/60">Prioridad de hoy</div>
              <div className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold">{role.priority.title}</div>
              <p className="mt-2 max-w-xs text-sm leading-6 text-white/72">{role.priority.detail}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {role.metrics.map((metric) => (
              <div key={metric.label} className="panel-strong rounded-[24px] px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">{metric.label}</div>
                <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">{metric.value}</div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{metric.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <aside className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Ruta operativa</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Bloques clave para {role.label.toLowerCase()}</h3>
          <div className="mt-5 space-y-3">
            {role.focus.map((item) => (
              <div key={item.title} className="rounded-[22px] bg-white/70 px-4 py-3 ring-1 ring-[color:var(--line)]">
                <div className="font-medium">{item.title}</div>
                <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{item.detail}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <article className="panel rounded-[30px] px-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Cola prioritaria</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Items que este rol resolveria primero</h3>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {role.queue.map((item) => (
              <div key={item.title} className="rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-medium">{item.title}</div>
                  <span className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">
                    {item.state}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{item.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel rounded-[30px] px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Modulos visibles</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">La misma base, priorizada para este actor</h3>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {modules.map((module) => (
              <Link key={module.href} href={module.href} className="panel-strong rounded-[24px] px-4 py-4 transition hover:-translate-y-0.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{module.label}</span>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">{module.metric}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{module.description}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <article className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Contrato visible</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Combinaciones P0 que alimentan la operacion</h3>
          <div className="mt-5 space-y-3">
            {p0Combinations.slice(0, 4).map((combination) => (
              <div key={combination.id} className="rounded-[22px] bg-white/78 px-4 py-4 ring-1 ring-[color:var(--line)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-medium">{combination.id}</div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white">{combination.family}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {combination.app} / {combination.piece} / {combination.placement} / {combination.format}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Aprobaciones esperadas</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Lo que esta superficie dejaria listo para el siguiente actor</h3>
          <div className="mt-5 space-y-3">
            {role.handoffs.map((item) => (
              <div key={item.title} className="rounded-[22px] bg-white/75 px-4 py-4 ring-1 ring-[color:var(--line)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-medium">{item.title}</div>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">{item.target}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{item.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
