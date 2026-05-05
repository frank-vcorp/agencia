/**
 * IMPL-20260505-02
 * Respaldo: context/00_ARQUITECTURA.md, context/DIRECCION_VISUAL_V1.md
 */
import Link from "next/link";

import { modulePages, p0Combinations, rolePages, strategicSignals } from "@/lib/bridge-data";
import { getSupabaseHealth } from "@/lib/supabase-health";
import { getTenantSnapshot } from "@/lib/tenant-runtime";

export async function OverviewDashboard() {
  const supabaseHealth = await getSupabaseHealth();
  const tenantSnapshot = await getTenantSnapshot();
  const tenantConfig = tenantSnapshot?.config;
  const dashboardTitle = tenantConfig?.dashboardHeadline ?? "Una sola superficie para coordinar el piloto real";
  const dashboardSummary = tenantConfig?.dashboardSummary ?? "Bridge coordina el piloto mientras termina de poblar tenancy, configuracion y objetos operativos reales.";

  const visibleSignals = strategicSignals.map((signal) =>
    signal.label === "Preparacion de datos"
      ? {
          ...signal,
          value: supabaseHealth.label,
          detail: supabaseHealth.detail
        }
      : signal
  );

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="panel rounded-[30px] px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Dashboard principal</p>
              <h2 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">{dashboardTitle}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">{dashboardSummary}</p>
            </div>
            <Link
              href="/operador"
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Entrar a la cabina operativa
            </Link>
          </div>

          {tenantSnapshot ? (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <article className="rounded-[22px] bg-white/72 px-4 py-4 ring-1 ring-[color:var(--line)]">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">Tenant real</div>
                <div className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">{tenantSnapshot.name}</div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">Slug {tenantSnapshot.slug} con estado {tenantSnapshot.status}.</p>
              </article>
              <article className="rounded-[22px] bg-white/72 px-4 py-4 ring-1 ring-[color:var(--line)]">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">Canal primario</div>
                <div className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
                  {tenantConfig?.primaryContactChannel ?? "Pendiente"}
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">Configuracion inicial obtenida desde Supabase cuando existe un registro sembrado.</p>
              </article>
              <article className="rounded-[22px] bg-white/72 px-4 py-4 ring-1 ring-[color:var(--line)]">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">Modulos activos</div>
                <div className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
                  {tenantConfig?.activeModules.length ?? 0}
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {(tenantConfig?.activeModules ?? []).join(" · ") || "Se mostraran aqui cuando la configuracion remota este disponible."}
                </p>
              </article>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {visibleSignals.map((signal) => (
              <article key={signal.label} className="panel-strong rounded-[24px] px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">{signal.label}</div>
                <div
                  className={`mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight ${
                    signal.label === "Preparacion de datos" && supabaseHealth.connected
                      ? "text-[color:var(--accent-deep)]"
                      : ""
                  }`}
                >
                  {signal.value}
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{signal.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Corte P0</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Objetos listos para demostrar valor</h3>
          <div className="mt-5 space-y-3">
            {modulePages.map((module) => (
              <Link key={module.href} href={module.href} className="block rounded-[22px] bg-white/70 px-4 py-3 ring-1 ring-[color:var(--line)] transition hover:bg-white">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{module.label}</span>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">{module.metric}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{module.description}</p>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="panel rounded-[30px] px-6 py-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Superficies por rol</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Cada actor ve el mismo sistema con distinta prioridad</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {rolePages.map((role) => (
              <Link key={role.href} href={role.href} className="panel-strong rounded-[24px] px-4 py-4 transition hover:-translate-y-0.5">
                <div className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">{role.shortLabel}</div>
                <div className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold">{role.label}</div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{role.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Contrato de activos P0</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Combinaciones iniciales visibles desde el dashboard</h3>
          <div className="mt-5 overflow-hidden rounded-[24px] border border-[color:var(--line)] bg-white/78">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[color:var(--background-soft)] text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Aplicativo</th>
                  <th className="px-4 py-3 font-medium">Pieza</th>
                  <th className="px-4 py-3 font-medium">Formato</th>
                </tr>
              </thead>
              <tbody>
                {p0Combinations.slice(0, 6).map((combination) => (
                  <tr key={combination.id} className="border-t border-[color:var(--line)]">
                    <td className="px-4 py-3 font-medium text-slate-900">{combination.id}</td>
                    <td className="px-4 py-3 text-[color:var(--muted)]">{combination.app}</td>
                    <td className="px-4 py-3 text-[color:var(--muted)]">{combination.piece}</td>
                    <td className="px-4 py-3 text-[color:var(--muted)]">{combination.format}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
