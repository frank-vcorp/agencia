/**
 * IMPL-20260508-21 | IMPL-20260509-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260508-21_cliente_pwa_resultados_y_leads_v1.md
 * IMPL-20260509-01: Ajuste responsive — grid 2 columnas en lg+ debajo del bloque héroe.
 */
"use client";

import {
  type ChannelResult,
  type ClientLeadSummary,
  type ClientPortal,
  type ProjectStageItem,
  type ReviewItem
} from "@/lib/client-portal";

// ─── Helpers de presentación ──────────────────────────────────────────────────

const STAGE_STATUS_COLORS: Record<string, string> = {
  completado: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  en_revision: "bg-amber-50 text-amber-700 ring-amber-200",
  pendiente_aclaracion: "bg-red-50 text-red-700 ring-red-200",
  pendiente: "bg-stone-100 text-stone-400 ring-stone-200"
};

const STAGE_STATUS_LABELS: Record<string, string> = {
  completado: "Completado",
  en_revision: "En revisión",
  pendiente_aclaracion: "Pendiente de aclaración",
  pendiente: "Pendiente"
};

const CHANNEL_STATUS_COLORS: Record<string, string> = {
  activo: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactivo: "bg-stone-100 text-stone-500 ring-stone-200",
  sin_datos: "bg-stone-100 text-stone-400 ring-stone-200"
};

const CHANNEL_STATUS_LABELS: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  sin_datos: "Sin datos"
};

const CHANNEL_ICONS: Record<string, string> = {
  facebook: "F",
  google_ads: "G",
  whatsapp: "W"
};

const REVIEW_DECISION_LABELS: Record<string, string> = {
  approve: "Aprobar",
  reject: "Rechazar",
  request_changes: "Pedir ajustes"
};

const REVIEW_DECISION_STYLES: Record<string, string> = {
  approve:
    "rounded-[14px] bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700",
  reject:
    "rounded-[14px] border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50",
  request_changes:
    "rounded-[14px] border border-[color:var(--line-strong)] px-4 py-2 text-xs font-semibold text-[color:var(--muted)] transition hover:bg-stone-50"
};

// ─── Bloque: Qué sigue ────────────────────────────────────────────────────────

function QueSigueBlock({ portal }: { portal: ClientPortal }) {
  const action = portal.nextClientAction;
  return (
    <section className="panel rounded-[30px] px-6 py-6">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Qué sigue
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight sm:text-3xl">
        {action.label}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--muted)]">{action.detail}</p>
      {action.requiresAction && (
        <div className="mt-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--accent)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--accent)]" />
            Requiere tu atención
          </span>
        </div>
      )}
    </section>
  );
}

// ─── Bloque: Estado del proyecto ──────────────────────────────────────────────

function StageIndicator({ stage }: { stage: ProjectStageItem }) {
  return (
    <li className={`flex items-start gap-3 rounded-[18px] p-4 ${stage.active ? "bg-[color:var(--panel-strong)] ring-1 ring-[color:var(--line-strong)]" : ""}`}>
      <div
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          stage.status === "completado"
            ? "bg-emerald-600 text-white"
            : stage.status === "en_revision"
              ? "bg-amber-500 text-white"
              : stage.status === "pendiente_aclaracion"
                ? "bg-red-500 text-white"
                : "bg-stone-200 text-stone-400"
        }`}
      >
        {stage.status === "completado" ? "✓" : stage.status === "pendiente" ? "○" : "·"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-5">{stage.label}</p>
        <span
          className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ring-1 ${STAGE_STATUS_COLORS[stage.status]}`}
        >
          {STAGE_STATUS_LABELS[stage.status]}
        </span>
      </div>
    </li>
  );
}

function EstadoDelProyectoBlock({ portal }: { portal: ClientPortal }) {
  const { projectStatusSummary } = portal;
  return (
    <section className="panel rounded-[30px] px-6 py-6">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Estado del proyecto
      </p>
      {projectStatusSummary.projectName && (
        <h2 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
          {projectStatusSummary.projectName}
        </h2>
      )}
      {projectStatusSummary.clientName && (
        <p className="mt-1 text-sm text-[color:var(--muted)]">{projectStatusSummary.clientName}</p>
      )}
      <ul className="mt-5 space-y-2">
        {projectStatusSummary.stages.map((stage) => (
          <StageIndicator key={stage.key} stage={stage} />
        ))}
      </ul>
      {projectStatusSummary.briefContextNote && (
        <p className="mt-4 border-t border-[color:var(--line)] pt-4 text-xs text-[color:var(--muted)]">
          {projectStatusSummary.briefContextNote}
        </p>
      )}
    </section>
  );
}

// ─── Bloque: Revisiones ───────────────────────────────────────────────────────

function ReviewItemCard({ item }: { item: ReviewItem }) {
  return (
    <div className="rounded-[22px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
            {item.type === "quotation" ? "Propuesta" : "Material"}
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-heading)] text-base font-bold leading-tight">
            {item.title}
          </h3>
          <p className="mt-1.5 text-xs leading-5 text-[color:var(--muted)]">{item.description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.availableDecisions.map((decision) => (
          <button
            key={decision}
            type="button"
            className={REVIEW_DECISION_STYLES[decision]}
            aria-label={`${REVIEW_DECISION_LABELS[decision]}: ${item.title}`}
          >
            {REVIEW_DECISION_LABELS[decision]}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-[color:var(--muted)]">
        Contacta a tu ejecutivo para confirmar tu decisión.
      </p>
    </div>
  );
}

function RevisionesBlock({ portal }: { portal: ClientPortal }) {
  const { reviewItems } = portal;
  return (
    <section className="panel rounded-[30px] px-6 py-6">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Revisiones pendientes
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
        {reviewItems.length > 0
          ? `${reviewItems.length} elemento${reviewItems.length !== 1 ? "s" : ""} esperando tu decisión`
          : "Sin revisiones pendientes"}
      </h2>
      {reviewItems.length === 0 ? (
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          No hay nada que revisar por tu parte en este momento.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {reviewItems.map((item) => (
            <ReviewItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Bloque: Resultados por canal ─────────────────────────────────────────────

function ChannelCard({ channel }: { channel: ChannelResult }) {
  return (
    <div className="flex items-start gap-4 rounded-[22px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[color:var(--accent-soft)] text-base font-bold text-[color:var(--accent)]">
        {CHANNEL_ICONS[channel.channel]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-[family-name:var(--font-heading)] text-sm font-bold">{channel.label}</p>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1 ${CHANNEL_STATUS_COLORS[channel.status]}`}
          >
            {CHANNEL_STATUS_LABELS[channel.status]}
          </span>
        </div>
        {channel.contactCount > 0 && (
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            {channel.contactCount} contacto{channel.contactCount !== 1 ? "s" : ""} registrado{channel.contactCount !== 1 ? "s" : ""}
          </p>
        )}
        {channel.recentNote && (
          <p className="mt-1 text-xs text-[color:var(--muted)]">{channel.recentNote}</p>
        )}
        {channel.status === "sin_datos" && (
          <p className="mt-1 text-xs text-[color:var(--muted)]">Aún no hay datos disponibles para este canal.</p>
        )}
      </div>
    </div>
  );
}

function ResultadosPorCanalBlock({ portal }: { portal: ClientPortal }) {
  const { channels } = portal.channelResultsSummary;
  return (
    <section className="panel rounded-[30px] px-6 py-6">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Resultados por canal
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
        Tus canales activos
      </h2>
      <p className="mt-1.5 text-sm text-[color:var(--muted)]">
        Lectura resumida por canal. Los números reflejan contactos registrados, no atribución avanzada.
      </p>
      <div className="mt-5 space-y-3">
        {channels.map((ch) => (
          <ChannelCard key={ch.channel} channel={ch} />
        ))}
      </div>
    </section>
  );
}

// ─── Bloque: Leads y seguimiento ──────────────────────────────────────────────

function LeadRow({ lead }: { lead: ClientLeadSummary }) {
  return (
    <li className="flex flex-col gap-1 border-b border-[color:var(--line)] py-3.5 last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
      <div className="flex min-w-[80px] shrink-0 items-start">
        <span className="rounded-full bg-[color:var(--accent-soft)] px-2.5 py-1 text-[10px] font-semibold text-[color:var(--accent)]">
          {lead.canal}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-5">{lead.nombreCompleto}</p>
        <p className="mt-0.5 text-xs text-[color:var(--muted)]">{lead.asunto}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {lead.etiquetas.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[color:var(--line)] px-2 py-0.5 text-[10px] text-[color:var(--muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <p className="shrink-0 text-[11px] text-[color:var(--muted)] sm:text-right">{lead.fechaHora}</p>
    </li>
  );
}

function LeadsYSeguimientoBlock({ portal }: { portal: ClientPortal }) {
  const { leads, totalVisible } = portal.crmLeadSummary;
  return (
    <section className="panel rounded-[30px] px-6 py-6">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Leads y seguimiento
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
        {totalVisible > 0
          ? `${totalVisible} contacto${totalVisible !== 1 ? "s" : ""} registrado${totalVisible !== 1 ? "s" : ""}`
          : "Sin contactos registrados aún"}
      </h2>
      {totalVisible === 0 ? (
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Cuando lleguen contactos a través de tus canales, aparecerán aquí.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[color:var(--line)]">
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Vista principal ──────────────────────────────────────────────────────────

export function ClientPortalView({ portal }: { portal: ClientPortal }) {
  return (
    <div className="space-y-5 pb-10">
      {/* Bloque héroe — ancho completo en todos los breakpoints */}
      <QueSigueBlock portal={portal} />
      {/* Grid 2 columnas en desktop; columna única en mobile/tablet */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <EstadoDelProyectoBlock portal={portal} />
          <RevisionesBlock portal={portal} />
        </div>
        <div className="space-y-5">
          <ResultadosPorCanalBlock portal={portal} />
          <LeadsYSeguimientoBlock portal={portal} />
        </div>
      </div>
    </div>
  );
}
