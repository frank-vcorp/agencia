/**
 * IMPL-20260612-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-01_operador_dashboard_acciones_crud_comentarios_agente_v1.md
 *
 * V2 del dashboard del operador — Cabina de Control.
 * Layout 3 zonas responsive:
 *  - Zona Izq (280px): Radar priorizado con acción primaria 1-clic.
 *  - Zona Central (flex-1): Detalle del proyecto seleccionado con tabs.
 *  - Zona Der (320px): Propuestas del agente + comentarios + acciones disparables.
 *
 * Implementa el patron client/server del proyecto: el Server Component
 * (page-v2) carga datos y delega el render interactivo a este componente.
 */
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";

import {
  type OperatorCabin,
  type OperatorProjectDetail,
  type PortfolioItem,
  type PrimaryAction,
  type RiskLevel,
  computePrimaryAction
} from "@/lib/operator-radar";
import {
  type AgentProposal,
  type AgentProposalType,
  type AgentActionType,
  type CommentEntityType,
  type OperatorComment,
  AGENT_PROPOSAL_TYPE_LABELS,
  AGENT_ACTION_TYPE_LABELS
} from "@/lib/operator-comments";

type TabKey = "briefs" | "cotizaciones" | "activos" | "crm" | "contexto-agentes";

const TAB_LABELS: Record<TabKey, string> = {
  briefs: "Brief",
  cotizaciones: "Cotizacion",
  activos: "Activos",
  crm: "CRM",
  "contexto-agentes": "Contexto Agentes"
};

const VALID_TABS: TabKey[] = [
  "briefs",
  "cotizaciones",
  "activos",
  "crm",
  "contexto-agentes"
];

// ─── Helpers de presentacion ──────────────────────────────────────────────────

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

const VARIANT_BTN: Record<PrimaryAction["variant"], string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800",
  warning: "bg-amber-500 text-white hover:bg-amber-600",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  neutral: "bg-[color:var(--accent-soft)] text-[color:var(--accent-deep)] hover:bg-[color:var(--accent-deep)] hover:text-white"
};

const ASSET_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  in_progress: "En produccion",
  in_review: "En revision",
  approved: "Aprobado",
  delivered: "Entregado",
  archived: "Archivado"
};

const QUOTATION_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  approved: "Aprobada",
  invoiced: "Facturada",
  paid: "Pagada"
};

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Mexico_City"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatIdleLabel(hours: number): string {
  if (hours >= 999) return "Sin actividad registrada";
  if (hours < 1) return "Activo ahora";
  if (hours < 24) return `${hours}h sin movimiento`;
  const days = Math.floor(hours / 24);
  const remainder = hours % 24;
  return remainder > 0 ? `${days}d ${remainder}h sin movimiento` : `${days}d sin movimiento`;
}

/**
 * Deriva la accion primaria para una tarjeta del portfolio, usando la informacion
 * del detalle del proyecto cuando esta disponible. Funcion local memoizable.
 * IMPL-20260612-01
 */
function deriveSignalsForItem(
  item: PortfolioItem,
  detail: OperatorProjectDetail | null
): Parameters<typeof computePrimaryAction>[1] {
  if (detail && detail.project.id === item.projectId) {
    const quotation = detail.quotations[0] ?? null;
    const asset = detail.assets[0] ?? null;
    const crmLead = detail.leads[0] ?? null;
    return {
      brief: detail.brief ? { status: detail.brief.status } : null,
      quotation: quotation ? { status: quotation.status } : null,
      asset: asset ? { status: asset.status } : null,
      crm: {
        isNew: crmLead?.status === "nuevo",
        hasOpenLead: crmLead != null && crmLead.status !== "cerrado_ganado" && crmLead.status !== "cerrado_perdido"
      }
    };
  }
  return {
    brief: null,
    quotation: null,
    asset: null,
    crm: { isNew: false, hasOpenLead: false }
  };
}

// ─── Componente: OperatorRadarActionable (Zona Izq) ───────────────────────────

function RadarProjectCardActionable({
  item,
  detail,
  isSelected,
  pendingProposals,
  onSelect,
  onAction
}: {
  item: PortfolioItem;
  detail: OperatorProjectDetail | null;
  isSelected: boolean;
  pendingProposals: number;
  onSelect: (projectId: string) => void;
  onAction: (action: PrimaryAction) => void;
}) {
  const signals = deriveSignalsForItem(item, detail);
  const action = computePrimaryAction(item, signals);
  const riskClass = RISK_COLORS[item.riskLevel];

  return (
    <article
      className={`panel rounded-[20px] px-4 py-4 ring-1 transition ${
        isSelected
          ? "ring-[color:rgba(200,93,39,0.45)] bg-[color:var(--accent-soft)]"
          : "ring-[color:var(--line)]"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(item.projectId)}
        className="block w-full text-left"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
              {item.clientName}
            </p>
            <h3 className="mt-0.5 truncate font-[family-name:var(--font-heading)] text-sm font-bold leading-tight tracking-tight">
              {item.projectName}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {pendingProposals > 0 && (
              <span
                className="inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold text-violet-800 ring-1 ring-violet-200"
                title={`${pendingProposals} propuesta(s) de agente pendientes`}
              >
                🤖 {pendingProposals}
              </span>
            )}
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] ring-1 ${riskClass}`}
            >
              {RISK_LABELS[item.riskLevel]}
            </span>
            <span className="font-[family-name:var(--font-heading)] text-base font-bold tabular-nums">
              {item.priorityScore}
            </span>
          </div>
        </div>

        <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[color:var(--muted)]">
          {item.primaryAlert}
        </p>
        <p className="mt-1 text-[10px] text-[color:var(--muted)]">
          {formatIdleLabel(item.idleHours)}
        </p>
      </button>

      <button
        type="button"
        onClick={() => onAction(action)}
        className={`mt-3 inline-flex w-full items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${VARIANT_BTN[action.variant]}`}
        title={action.reason}
      >
        {action.label} →
      </button>
    </article>
  );
}

function OperatorRadarActionable({
  cabin,
  proposalsByProject,
  onSelect,
  onAction
}: {
  cabin: OperatorCabin;
  proposalsByProject: Record<string, AgentProposal[]>;
  onSelect: (projectId: string) => void;
  onAction: (action: PrimaryAction) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cabin.radar.portfolioItems;
    return cabin.radar.portfolioItems.filter(
      (it) =>
        it.clientName.toLowerCase().includes(q) ||
        it.projectName.toLowerCase().includes(q)
    );
  }, [cabin.radar.portfolioItems, search]);

  if (cabin.radar.isEmpty) {
    return (
      <div className="panel rounded-[20px] px-4 py-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
          Radar
        </p>
        <p className="mt-2 text-sm font-medium">Sin proyectos activos</p>
        <p className="mt-1 text-[11px] leading-5 text-[color:var(--muted)]">
          Crea un cliente y un proyecto para verlos priorizados aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="panel rounded-[20px] px-3 py-3 ring-1 ring-[color:var(--line)]">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
          Radar priorizado
        </p>
        <p className="mt-0.5 text-sm font-semibold">
          {cabin.radar.portfolioItems.length} proyecto
          {cabin.radar.portfolioItems.length !== 1 ? "s" : ""}
        </p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente/proyecto…"
          className="mt-2 w-full rounded-lg border border-[color:var(--line)] bg-white/80 px-2.5 py-1.5 text-[12px] outline-none focus:border-[color:var(--line-strong)]"
        />
      </div>

      <div className="flex max-h-[calc(100vh-12rem)] flex-col gap-2 overflow-y-auto pr-1">
        {filtered.map((item) => (
          <RadarProjectCardActionable
            key={item.projectId}
            item={item}
            detail={cabin.selectedProjectDetail}
            isSelected={item.projectId === cabin.selectedProjectId}
            pendingProposals={(proposalsByProject[item.projectId] ?? []).filter(
              (p) => p.status === "pending"
            ).length}
            onSelect={onSelect}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Componente: OperatorProjectDetail (Zona Central) ─────────────────────────

function StatusBadge({ status, labels }: { status: string; labels: Record<string, string> }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-700 ring-1 ring-[color:var(--line)]">
      {labels[status] ?? status}
    </span>
  );
}

function TabButton({
  tabKey,
  label,
  active,
  onClick
}: {
  tabKey: TabKey;
  label: string;
  active: boolean;
  onClick: (k: TabKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(tabKey)}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
        active
          ? "bg-slate-900 text-white"
          : "bg-white/80 text-[color:var(--muted)] ring-1 ring-[color:var(--line)] hover:bg-white"
      }`}
    >
      {label}
    </button>
  );
}

function BriefTab({ detail }: { detail: OperatorProjectDetail }) {
  const brief = detail.brief;
  return (
    <div className="space-y-3">
      <div className="panel rounded-[20px] px-4 py-4 ring-1 ring-[color:var(--line)]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
            Brief
          </p>
          {brief && (
            <StatusBadge
              status={brief.status}
              labels={{
                draft: "Borrador",
                stage_1_discovery: "Descubrimiento",
                stage_2_precision: "Precision",
                stage_3_commercial_fit: "Encaje comercial",
                pending_operator_review: "Pendiente revision",
                operator_review_in_progress: "En revision",
                approved_locked: "Consolidado",
                returned_for_rework: "Devuelto",
                superseded: "Reemplazado"
              }}
            />
          )}
        </div>
        <h3 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
          {brief ? `Brief v${brief.currentVersionNumber ?? 1}` : "Sin brief"}
        </h3>
        {brief ? (
          <p className="mt-1 text-[11px] text-[color:var(--muted)]">
            Actualizado {formatTimestamp(brief.updatedAt)}
          </p>
        ) : (
          <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
            El proyecto no tiene un brief vinculado. Crea uno para estructurar
            el alcance comercial.
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/briefs"
            className="inline-flex items-center rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)] transition hover:bg-[color:var(--accent-deep)] hover:text-white"
          >
            {brief ? "Editar Brief" : "Crear Brief"}
          </Link>
          {brief && (
            <button
              type="button"
              className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)] ring-1 ring-[color:var(--line)] transition hover:bg-white"
              disabled
              title="En produccion: consolidar disparara un snapshot para el agente"
            >
              Consolidar
            </button>
          )}
          {brief && (
            <Link
              href={`/cliente/proyecto/${detail.project.id}`}
              className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)] ring-1 ring-[color:var(--line)] transition hover:bg-white"
            >
              Ver chat cliente →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function QuotationTab({ detail }: { detail: OperatorProjectDetail }) {
  if (detail.quotations.length === 0) {
    return (
      <div className="panel rounded-[20px] px-4 py-6 ring-1 ring-[color:var(--line)]">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
          Cotizacion
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">
          Sin cotizacion
        </h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          No hay cotizaciones asociadas al proyecto. Crea la primera version.
        </p>
        <Link
          href="/cotizaciones"
          className="mt-3 inline-flex items-center rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)] transition hover:bg-[color:var(--accent-deep)] hover:text-white"
        >
          Crear cotizacion →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {detail.quotations.map((q) => (
        <div
          key={q.id}
          className="panel rounded-[20px] px-4 py-4 ring-1 ring-[color:var(--line)]"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
              Cotizacion
            </p>
            <StatusBadge status={q.status} labels={QUOTATION_STATUS_LABELS} />
          </div>
          <h3 className="mt-1 truncate font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">
            {q.id.slice(0, 8)}
          </h3>
          <p className="mt-1 text-[11px] text-[color:var(--muted)]">
            Actualizada {formatTimestamp(q.updatedAt)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/cotizaciones"
              className="inline-flex items-center rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)] transition hover:bg-[color:var(--accent-deep)] hover:text-white"
            >
              Abrir en Cotizaciones →
            </Link>
            {q.status === "draft" && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 ring-1 ring-amber-200">
                Pendiente envio
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function AssetsTab({ detail }: { detail: OperatorProjectDetail }) {
  if (detail.assets.length === 0) {
    return (
      <div className="panel rounded-[20px] px-4 py-6 ring-1 ring-[color:var(--line)]">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
          Activos
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">
          Sin activos
        </h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          No hay piezas registradas. Solicita un activo desde el catalogo P0.
        </p>
        <Link
          href="/activos"
          className="mt-3 inline-flex items-center rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)] transition hover:bg-[color:var(--accent-deep)] hover:text-white"
        >
          Ir a Activos →
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {detail.assets.map((a) => (
        <div
          key={a.id}
          className="panel rounded-[20px] px-4 py-3 ring-1 ring-[color:var(--line)]"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
                {a.applicationCode} · {a.pieceTypeCode}
              </p>
              <h3 className="mt-0.5 truncate text-sm font-semibold">{a.title}</h3>
            </div>
            <StatusBadge status={a.status} labels={ASSET_STATUS_LABELS} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-[color:var(--muted)]">
            <span className="rounded-full bg-white/80 px-2 py-0.5 ring-1 ring-[color:var(--line)]">
              {a.placementCode}
            </span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 ring-1 ring-[color:var(--line)]">
              {a.formatCode}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={`/activos/${a.id}`}
              className="inline-flex items-center rounded-full bg-[color:var(--accent-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)] transition hover:bg-[color:var(--accent-deep)] hover:text-white"
            >
              Ver detalle →
            </Link>
            {a.status === "in_review" && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 ring-1 ring-amber-200">
                Aprobar / Devolver
              </span>
            )}
            {a.status === "approved" && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 ring-1 ring-emerald-200">
                Validar final
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CrmTab({ detail }: { detail: OperatorProjectDetail }) {
  if (detail.leads.length === 0) {
    return (
      <div className="panel rounded-[20px] px-4 py-6 ring-1 ring-[color:var(--line)]">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
          CRM
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">
          Sin leads asociados
        </h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          No hay leads vinculados a este proyecto.
        </p>
        <Link
          href="/crm"
          className="mt-3 inline-flex items-center rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)] transition hover:bg-[color:var(--accent-deep)] hover:text-white"
        >
          Ir a CRM →
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {detail.leads.map((l) => (
        <div
          key={l.id}
          className="panel rounded-[20px] px-4 py-3 ring-1 ring-[color:var(--line)]"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
                {l.sourceChannel}
              </p>
              <h3 className="mt-0.5 truncate text-sm font-semibold">{l.name}</h3>
              <p className="mt-0.5 text-[11px] text-[color:var(--muted)]">
                {l.requestedService || "Sin servicio especificado"}
              </p>
            </div>
            <StatusBadge
              status={l.status}
              labels={{
                nuevo: "Nuevo",
                en_seguimiento: "En seguimiento",
                propuesta_enviada: "Propuesta enviada",
                cerrado_ganado: "Ganado",
                cerrado_perdido: "Perdido"
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ContextoAgentesTab({
  detail,
  proposals
}: {
  detail: OperatorProjectDetail;
  proposals: AgentProposal[];
}) {
  return (
    <div className="space-y-3">
      <div className="panel rounded-[20px] px-4 py-4 ring-1 ring-[color:var(--line)]">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
          Snapshot operativo
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">
          Contexto para agentes
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Brief
            </p>
            <p className="mt-0.5 font-semibold">
              {detail.brief ? detail.brief.status : "—"}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Cotizaciones
            </p>
            <p className="mt-0.5 font-semibold">{detail.quotations.length}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Activos
            </p>
            <p className="mt-0.5 font-semibold">{detail.assets.length}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Leads
            </p>
            <p className="mt-0.5 font-semibold">{detail.leads.length}</p>
          </div>
        </div>
      </div>

      <div className="panel rounded-[20px] px-4 py-4 ring-1 ring-[color:var(--line)]">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
          Propuestas del agente para este proyecto ({proposals.length})
        </p>
        {proposals.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Sin propuestas pendientes.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {proposals.slice(0, 5).map((p) => (
              <li
                key={p.id}
                className="rounded-[14px] bg-white/70 px-3 py-2 ring-1 ring-[color:var(--line)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)]">
                    {AGENT_PROPOSAL_TYPE_LABELS[p.type] ?? p.type}
                  </span>
                  <span className="text-[9px] text-[color:var(--muted)]">
                    {formatTimestamp(p.receivedAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] leading-5">{p.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function OperatorProjectDetail({
  detail,
  proposals
}: {
  detail: OperatorProjectDetail;
  proposals: AgentProposal[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const initialTab = ((): TabKey => {
    const t = params.get("tab");
    return VALID_TABS.includes(t as TabKey) ? (t as TabKey) : "briefs";
  })();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const handleTab = useCallback(
    (k: TabKey) => {
      setActiveTab(k);
      const sp = new URLSearchParams(Array.from(params.entries()));
      sp.set("tab", k);
      router.replace(`/operador?${sp.toString()}`, { scroll: false });
    },
    [params, router]
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="panel rounded-[22px] px-4 py-3 ring-1 ring-[color:var(--line)]">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
          {detail.client.name}
        </p>
        <h2 className="mt-0.5 font-[family-name:var(--font-heading)] text-2xl font-bold leading-tight tracking-tight">
          {detail.project.name}
        </h2>
        <p className="mt-1 text-[11px] text-[color:var(--muted)]">
          Status: {detail.project.status} · actualizado{" "}
          {formatTimestamp(detail.project.updatedAt)}
        </p>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {VALID_TABS.map((t) => (
          <TabButton
            key={t}
            tabKey={t}
            label={TAB_LABELS[t]}
            active={activeTab === t}
            onClick={handleTab}
          />
        ))}
      </div>

      <div className="min-w-0 flex-1">
        {activeTab === "briefs" && <BriefTab detail={detail} />}
        {activeTab === "cotizaciones" && <QuotationTab detail={detail} />}
        {activeTab === "activos" && <AssetsTab detail={detail} />}
        {activeTab === "crm" && <CrmTab detail={detail} />}
        {activeTab === "contexto-agentes" && (
          <ContextoAgentesTab detail={detail} proposals={proposals} />
        )}
      </div>
    </div>
  );
}

// ─── Componente: OperatorActionRail (Zona Der) ────────────────────────────────

function RailSection({
  title,
  icon,
  count,
  children
}: {
  title: string;
  icon: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="panel rounded-[20px] px-3 py-3 ring-1 ring-[color:var(--line)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
          {icon} {title}
        </p>
        {typeof count === "number" && (
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold ring-1 ring-[color:var(--line)]">
            {count}
          </span>
        )}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function ProposalsList({
  proposals,
  onAction
}: {
  proposals: AgentProposal[];
  onAction: (type: AgentActionType, projectId: string) => void;
}) {
  if (proposals.length === 0) {
    return (
      <p className="text-[12px] text-[color:var(--muted)]">
        Sin propuestas pendientes del agente.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {proposals.slice(0, 5).map((p) => (
        <li
          key={p.id}
          className="rounded-[14px] bg-white/70 px-3 py-2 ring-1 ring-[color:var(--line)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)]">
              {AGENT_PROPOSAL_TYPE_LABELS[p.type] ?? p.type}
            </span>
            <span className="text-[9px] text-[color:var(--muted)]">
              {formatTimestamp(p.receivedAt)}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] leading-5">{p.summary}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Link
              href={`/operador?project=${p.projectId}&tab=contexto-agentes`}
              className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-slate-800"
            >
              Revisar
            </Link>
            <button
              type="button"
              onClick={() => onAction("sync_context", p.projectId)}
              className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold ring-1 ring-[color:var(--line)] hover:bg-white"
            >
              Sincronizar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CommentsThread({
  comments,
  onPost
}: {
  comments: OperatorComment[];
  onPost: (body: string, visibility: "internal" | "client") => void;
}) {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"internal" | "client">("internal");

  return (
    <div className="flex flex-col gap-2">
      {comments.length === 0 ? (
        <p className="text-[12px] text-[color:var(--muted)]">
          Sin comentarios para este proyecto.
        </p>
      ) : (
        <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
          {comments.slice(0, 6).map((c) => (
            <li
              key={c.id}
              className="rounded-[14px] bg-white/70 px-2.5 py-1.5 ring-1 ring-[color:var(--line)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-[color:var(--accent-deep)]">
                  {c.author.name} · {c.visibility}
                </span>
                <span className="text-[9px] text-[color:var(--muted)]">
                  {formatTimestamp(c.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] leading-5">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-[color:var(--line)] pt-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Escribe un comentario contextual…"
          className="w-full resize-none rounded-lg border border-[color:var(--line)] bg-white/80 px-2 py-1.5 text-[12px] outline-none focus:border-[color:var(--line-strong)]"
        />
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <select
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as "internal" | "client")
            }
            className="rounded-md border border-[color:var(--line)] bg-white/80 px-1.5 py-0.5 text-[10px]"
          >
            <option value="internal">Interno</option>
            <option value="client">Visible cliente</option>
          </select>
          <button
            type="button"
            disabled={!body.trim()}
            onClick={() => {
              if (!body.trim()) return;
              onPost(body.trim(), visibility);
              setBody("");
            }}
            className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Publicar
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionButtons({
  projectId,
  onAction
}: {
  projectId: string;
  onAction: (type: AgentActionType, projectId: string) => void;
}) {
  const actions: { type: AgentActionType; label: string }[] = [
    { type: "sync_context", label: "Sincronizar contexto" },
    { type: "regenerate_snapshot", label: "Regenerar snapshot" },
    { type: "draft_brief", label: "Prellenar brief" },
    { type: "draft_quotation", label: "Prellenar cotizacion" },
    { type: "create_asset", label: "Crear activo" }
  ];
  return (
    <div className="flex flex-col gap-1.5">
      {actions.map((a) => (
        <button
          key={a.type}
          type="button"
          onClick={() => onAction(a.type, projectId)}
          className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)] transition hover:bg-[color:var(--accent-deep)] hover:text-white"
        >
          ⚡ {a.label}
        </button>
      ))}
      <p className="mt-1 text-[10px] text-[color:var(--muted)]">
        {AGENT_ACTION_TYPE_LABELS.sync_context} ·{" "}
        {AGENT_ACTION_TYPE_LABELS.regenerate_snapshot}
      </p>
    </div>
  );
}

function OperatorActionRail({
  detail,
  proposals,
  comments,
  onDispatchAction,
  onPostComment
}: {
  detail: OperatorProjectDetail | null;
  proposals: AgentProposal[];
  comments: OperatorComment[];
  onDispatchAction: (type: AgentActionType, projectId: string) => void;
  onPostComment: (body: string, visibility: "internal" | "client") => void;
}) {
  const projectProposals = useMemo(
    () =>
      detail
        ? proposals.filter((p) => p.projectId === detail.project.id)
        : [],
    [proposals, detail]
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <RailSection
        title="Propuestas del agente"
        icon="🤖"
        count={projectProposals.filter((p) => p.status === "pending").length}
      >
        <ProposalsList proposals={projectProposals} onAction={onDispatchAction} />
      </RailSection>

      <RailSection
        title="Comentarios"
        icon="💬"
        count={comments.length}
      >
        <CommentsThread comments={comments} onPost={onPostComment} />
      </RailSection>

      <RailSection title="Acciones disparables" icon="⚡">
        {detail ? (
          <ActionButtons
            projectId={detail.project.id}
            onAction={onDispatchAction}
          />
        ) : (
          <p className="text-[12px] text-[color:var(--muted)]">
            Selecciona un proyecto del radar para disparar acciones al agente.
          </p>
        )}
      </RailSection>
    </div>
  );
}

// ─── Vista principal: OperatorCabinViewV2 ──────────────────────────────────────

export function OperatorCabinViewV2({
  cabin,
  initialTab: _initialTab
}: {
  cabin: OperatorCabin;
  initialTab: string | null;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [radarOpenMobile, setRadarOpenMobile] = useState(false);
  const [railOpenMobile, setRailOpenMobile] = useState(false);

  const proposalsByProject = useMemo(
    () => groupProposalsByProjectLocal(cabin.agentProposals),
    [cabin.agentProposals]
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSelectProject = useCallback(
    (projectId: string) => {
      const sp = new URLSearchParams();
      sp.set("project", projectId);
      startTransition(() => {
        router.replace(`/operador?${sp.toString()}`, { scroll: false });
      });
      setRadarOpenMobile(false);
    },
    [router]
  );

  const handlePrimaryAction = useCallback(
    (action: PrimaryAction) => {
      showToast(`Acción: ${action.label}`);
      startTransition(() => {
        router.push(action.href, { scroll: false });
      });
    },
    [router, showToast]
  );

  const handleDispatchAction = useCallback(
    async (type: AgentActionType, projectId: string) => {
      showToast(`Disparando ${AGENT_ACTION_TYPE_LABELS[type]}...`);
      try {
        await fetch("/api/agent/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: type, projectId, payload: {} })
        });
        showToast(`${AGENT_ACTION_TYPE_LABELS[type]} enviado`);
      } catch {
        showToast("Error al disparar accion");
      }
    },
    [showToast]
  );

  const handlePostComment = useCallback(
    (body: string, visibility: "internal" | "client") => {
      if (!cabin.selectedProjectId) {
        showToast("Selecciona un proyecto primero");
        return;
      }
      showToast(
        visibility === "client"
          ? "Comentario publicado (visible cliente)"
          : "Comentario interno publicado"
      );
      // En produccion: POST /api/operator/comments
    },
    [cabin.selectedProjectId, showToast]
  );

  const projectProposalsForRail = useMemo(
    () =>
      cabin.selectedProjectDetail
        ? cabin.agentProposals.filter(
            (p) => p.projectId === cabin.selectedProjectDetail!.project.id
          )
        : [],
    [cabin.agentProposals, cabin.selectedProjectDetail]
  );

  return (
    <div className="relative space-y-3">
      {/* Header */}
      <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
            Operador · {cabin.tenantSlug}
          </p>
          <h1 className="mt-0.5 font-[family-name:var(--font-heading)] text-2xl font-bold leading-tight tracking-tight">
            Cabina de Control
          </h1>
          <p className="mt-0.5 text-[11px] text-[color:var(--muted)]">
            {cabin.radar.portfolioItems.length} proyecto
            {cabin.radar.portfolioItems.length !== 1 ? "s" : ""} ·{" "}
            {cabin.agentProposals.filter((p) => p.status === "pending").length}{" "}
            propuesta
            {cabin.agentProposals.filter((p) => p.status === "pending").length !==
            1
              ? "s"
              : ""}{" "}
            pendiente
            {cabin.agentProposals.filter((p) => p.status === "pending").length !==
            1
              ? "s"
              : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setRadarOpenMobile((v) => !v)}
            className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ring-[color:var(--line)]"
          >
            {radarOpenMobile ? "Ocultar radar" : "Radar"}
          </button>
          <button
            type="button"
            onClick={() => setRailOpenMobile((v) => !v)}
            className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ring-[color:var(--line)]"
          >
            {railOpenMobile ? "Ocultar rail" : "Agente"}
          </button>
        </div>
      </div>

      {/* Mobile drawers */}
      {(radarOpenMobile || railOpenMobile) && (
        <div className="grid gap-3 lg:hidden">
          {radarOpenMobile && (
            <div className="panel rounded-[20px] p-3 ring-1 ring-[color:var(--line)]">
              <OperatorRadarActionable
                cabin={cabin}
                proposalsByProject={proposalsByProject}
                onSelect={handleSelectProject}
                onAction={handlePrimaryAction}
              />
            </div>
          )}
          {railOpenMobile && (
            <div className="panel rounded-[20px] p-3 ring-1 ring-[color:var(--line)]">
              <OperatorActionRail
                detail={cabin.selectedProjectDetail}
                proposals={cabin.agentProposals}
                comments={cabin.contextualComments}
                onDispatchAction={handleDispatchAction}
                onPostComment={handlePostComment}
              />
            </div>
          )}
        </div>
      )}

      {/* Layout 3 zonas (desktop/tablet) */}
      <div className="grid gap-3 md:grid-cols-[240px_1fr] xl:grid-cols-[280px_1fr_320px]">
        <aside className="hidden lg:block">
          <OperatorRadarActionable
            cabin={cabin}
            proposalsByProject={proposalsByProject}
            onSelect={handleSelectProject}
            onAction={handlePrimaryAction}
          />
        </aside>

        <main className="min-w-0">
          {cabin.selectedProjectDetail ? (
            <OperatorProjectDetail
              detail={cabin.selectedProjectDetail}
              proposals={projectProposalsForRail}
            />
          ) : (
            <div className="panel rounded-[22px] px-4 py-10 text-center">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                Detalle
              </p>
              <h3 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                Selecciona un proyecto del radar
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-[color:var(--muted)]">
                Elige cualquier tarjeta del panel izquierdo para abrir su
                detalle accionable (brief, cotizacion, activos, CRM y contexto
                de agentes).
              </p>
              {cabin.radar.isEmpty && (
                <p className="mt-2 text-[11px] text-[color:var(--muted)]">
                  Aun no hay proyectos registrados.
                </p>
              )}
            </div>
          )}
        </main>

        <aside className="hidden xl:block">
          <OperatorActionRail
            detail={cabin.selectedProjectDetail}
            proposals={cabin.agentProposals}
            comments={cabin.contextualComments}
            onDispatchAction={handleDispatchAction}
            onPostComment={handlePostComment}
          />
        </aside>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-4 right-4 z-50 rounded-xl bg-stone-900 px-4 py-2 text-sm text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      {pending && (
        <div className="pointer-events-none fixed left-4 top-4 z-40 rounded-full bg-white/90 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)] ring-1 ring-[color:var(--line)]">
          sincronizando…
        </div>
      )}
    </div>
  );
}

// ─── Helper local: agrupar propuestas (envoltorio de la funcion pura) ─────────

function groupProposalsByProjectLocal(proposals: AgentProposal[]) {
  return groupProposalsByProjectImpl(proposals);
}

// Import al final del archivo para evitar ciclos, pero la implementacion
// reutiliza la funcion pura `groupProposalsByProject` exportada desde
// `lib/operator-radar.ts`.
import { groupProposalsByProject as groupProposalsByProjectImpl } from "@/lib/operator-radar";
