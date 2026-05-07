/**
 * IMPL-20260506-39
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-39_radar_priorizado_operador_por_proyecto.md
 */
import Link from "next/link";

import type { OperatorRadar, PortfolioItem, RiskLevel } from "@/lib/operator-radar";

// ─── Helpers de presentacion ─────────────────────────────────────────────────

const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
  critical: "Critico"
};

const RISK_COLORS: Record<RiskLevel, string> = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  high: "bg-orange-50 text-orange-700 ring-orange-200",
  critical: "bg-red-50 text-red-700 ring-red-200"
};

const SCORE_BAR_COLOR: Record<RiskLevel, string> = {
  low: "bg-emerald-400",
  medium: "bg-amber-400",
  high: "bg-orange-500",
  critical: "bg-red-500"
};

const MODULE_LABELS: Record<string, string> = {
  briefs: "Briefs",
  cotizaciones: "Cotizaciones",
  activos: "Activos",
  crm: "CRM"
};

function formatIdleLabel(hours: number): string {
  if (hours >= 999) return "Sin actividad registrada";
  if (hours < 1) return "Activo ahora";
  if (hours < 24) return `${hours}h sin movimiento`;
  const days = Math.floor(hours / 24);
  const remainder = hours % 24;
  return remainder > 0 ? `${days}d ${remainder}h sin movimiento` : `${days}d sin movimiento`;
}

function formatGeneratedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Mexico_City"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── Tarjeta individual de proyecto ──────────────────────────────────────────

function RadarProjectCard({ item }: { item: PortfolioItem }) {
  const riskClass = RISK_COLORS[item.riskLevel];
  const barColor = SCORE_BAR_COLOR[item.riskLevel];
  const moduleLabel = MODULE_LABELS[item.suggestedModule] ?? item.suggestedModule;
  const moduleHref = `/${item.suggestedModule}`;

  // Ancho de la barra de score: score maximo esperado ~80, barra capped a 100%
  const barWidthPct = Math.min(100, Math.round((item.priorityScore / 80) * 100));

  return (
    <article className="panel rounded-[28px] px-5 py-5 ring-1 ring-[color:var(--line)]">
      {/* Encabezado: cliente / proyecto + risk badge + score */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
            {item.clientName}
          </p>
          <h3 className="mt-0.5 font-[family-name:var(--font-heading)] text-lg font-bold leading-tight tracking-tight">
            {item.projectName}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ring-1 ${riskClass}`}
          >
            {RISK_LABELS[item.riskLevel]}
          </span>
          <span className="font-[family-name:var(--font-heading)] text-2xl font-bold tabular-nums">
            {item.priorityScore}
          </span>
        </div>
      </div>

      {/* Barra de score */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${barWidthPct}%` }}
        />
      </div>

      {/* Alerta principal */}
      <div className="mt-4 rounded-[16px] bg-slate-900 px-4 py-3 text-white">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Alerta principal</p>
        <p className="mt-1 text-sm font-medium leading-6">{item.primaryAlert}</p>
      </div>

      {/* Razon + accion */}
      <div className="mt-3 space-y-1.5">
        <p className="text-sm leading-6 text-[color:var(--muted)]">{item.priorityReason}</p>
        <p className="text-sm font-medium">→ {item.suggestedAction}</p>
      </div>

      {/* Footer: idle + modulo sugerido + accesos rapidos */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] text-[color:var(--muted)]">{formatIdleLabel(item.idleHours)}</span>
        <div className="flex flex-wrap gap-2">
          <Link
            href={moduleHref}
            className="inline-flex items-center rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-deep)] transition hover:bg-[color:var(--accent-deep)] hover:text-white"
          >
            → {moduleLabel}
          </Link>
          {/* Accesos rapidos a los demas modulos */}
          {(["briefs", "cotizaciones", "activos", "crm"] as const)
            .filter((m) => m !== item.suggestedModule)
            .map((m) => (
              <Link
                key={m}
                href={`/${m}`}
                className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)] ring-1 ring-[color:var(--line)] transition hover:text-[color:var(--accent-deep)]"
              >
                {MODULE_LABELS[m]}
              </Link>
            ))}
        </div>
      </div>
    </article>
  );
}

// ─── Estado vacio ─────────────────────────────────────────────────────────────

function RadarEmpty() {
  return (
    <div className="panel rounded-[28px] px-6 py-10 text-center">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Sin proyectos</p>
      <h3 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
        El radar no encontro proyectos activos
      </h3>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[color:var(--muted)]">
        No hay proyectos registrados en el tenant o Supabase no esta configurado. Crea al menos un
        cliente y un proyecto para ver el radar priorizado.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/crm"
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Ir a CRM
        </Link>
        <Link
          href="/briefs"
          className="inline-flex items-center rounded-full bg-[color:var(--accent-soft)] px-4 py-2 text-sm font-medium text-[color:var(--accent-deep)] transition hover:bg-[color:var(--accent-deep)] hover:text-white"
        >
          Ir a Briefs
        </Link>
      </div>
    </div>
  );
}

// ─── Componente principal del radar ──────────────────────────────────────────

export function OperatorRadarView({ radar }: { radar: OperatorRadar }) {
  return (
    <div className="space-y-5">
      {/* Header del radar */}
      <section className="panel rounded-[30px] px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-deep)]">
              Operador
            </div>
            <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
              Radar priorizado por proyecto
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-7 text-[color:var(--muted)]">
              Proyectos ordenados por conveniencia operativa. Cada fila explica por que sube en
              prioridad, que esta bloqueando y donde actuar primero.
            </p>
          </div>
          <div className="rounded-[24px] bg-slate-900 px-4 py-4 text-white">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/60">Generado</div>
            <div className="mt-2 font-[family-name:var(--font-heading)] text-lg font-bold">
              {formatGeneratedAt(radar.generatedAt)}
            </div>
            <p className="mt-1 text-sm text-white/60">
              {radar.portfolioItems.length} proyecto{radar.portfolioItems.length !== 1 ? "s" : ""} evaluado
              {radar.portfolioItems.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </section>

      {/* Lista priorizada o estado vacio */}
      {radar.isEmpty ? (
        <RadarEmpty />
      ) : (
        <section className="space-y-4">
          {radar.portfolioItems.map((item) => (
            <RadarProjectCard key={item.projectId} item={item} />
          ))}
        </section>
      )}
    </div>
  );
}
