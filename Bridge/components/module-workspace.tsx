/**
 * IMPL-20260505-01
 * Respaldo: context/00_ARQUITECTURA.md, context/CATALOGO_ACTIVOS_V1.md, context/MATRIZ_COMBINACIONES_ACTIVOS_P0.md
 */
import { moduleDetails, modulePages, rolePages, type ModuleKey } from "@/lib/bridge-data";

export function ModuleWorkspace({ moduleKey }: { moduleKey: ModuleKey }) {
  const module = modulePages.find((item) => item.key === moduleKey);
  const detail = moduleDetails[moduleKey];

  if (!module) {
    return null;
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="panel rounded-[30px] px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Modulo P0</p>
              <h2 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">{module.label}</h2>
              <p className="mt-2 max-w-3xl text-base leading-7 text-[color:var(--muted)]">{module.description}</p>
            </div>
            <div className="rounded-[24px] bg-[color:var(--accent-soft)] px-4 py-4 text-[color:var(--accent-deep)] ring-1 ring-[color:rgba(200,93,39,0.18)]">
              <div className="text-[11px] uppercase tracking-[0.22em]">Indicador base</div>
              <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold">{module.metric}</div>
              <p className="mt-2 max-w-xs text-sm leading-6">{detail.status}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {detail.metrics.map((metric) => (
              <div key={metric.label} className="panel-strong rounded-[24px] px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">{metric.label}</div>
                <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">{metric.value}</div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{metric.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <aside className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Roles consumidores</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Quien usa este modulo en la V1</h3>
          <div className="mt-5 space-y-3">
            {rolePages
              .filter((role) => detail.roles.includes(role.key))
              .map((role) => (
                <div key={role.href} className="rounded-[22px] bg-white/72 px-4 py-3 ring-1 ring-[color:var(--line)]">
                  <div className="font-medium">{role.label}</div>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{role.description}</p>
                </div>
              ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Flujo inicial</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Placeholder operativo creible</h3>
          <div className="mt-5 space-y-3">
            {detail.flow.map((step) => (
              <div key={step.title} className="rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">{step.stage}</div>
                <div className="mt-2 font-medium">{step.title}</div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{step.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Checklist de integracion futura</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Preparado para contratos y datos reales</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {detail.readiness.map((item) => (
              <div key={item.title} className="panel-strong rounded-[24px] px-4 py-4">
                <div className="font-medium">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{item.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
