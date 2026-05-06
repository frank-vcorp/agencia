/**
 * IMPL-20260506-30
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-30_conocimiento_derivado_agentes_v1.md
 *
 * Capa de conocimiento derivado para agentes y operadores.
 * Este módulo NO reemplaza la fuente primaria. Produce un snapshot
 * resumido y trazable, construido desde los objetos vivos del tenant activo.
 */

import {
  buildCrmMetrics,
  getLeadsForDefaultTenant,
  leadSourceChannelLabel,
  leadStatusLabel,
  type Lead,
  type LeadStatus
} from "./crm";
import {
  briefStatusLabel,
  getOperativeSummary,
  resolveNextAction,
  type AssetsDashboardSummary,
  type BriefDashboardSummary,
  type NextAction,
  type QuotationDashboardSummary
} from "./dashboard";

// ─── Tipos del snapshot derivado ─────────────────────────────────────────────

/** Resumen derivado de un lead activo. Apunta a su fuente en /crm. */
export type LeadAgentSummary = {
  /** Entidad fuente: módulo CRM, función getLeadsForDefaultTenant() */
  source: "crm/getLeadsForDefaultTenant";
  id: string;
  name: string;
  status: LeadStatus;
  statusLabel: string;
  sourceChannelLabel: string;
  requestedService: string;
  /** ISO 8601 de la última actualización del lead en la fuente primaria */
  updatedAt: string;
  /** Próximo seguimiento agendado, o null si no hay */
  nextFollowUpAt: string | null;
  isActive: boolean;
};

/** Resumen derivado de brief. Apunta a su fuente en /briefs. */
export type BriefAgentSummary = {
  /** Entidad fuente: módulo briefing, función getBriefWorkspace() */
  source: "briefing/getBriefWorkspace";
  id: string;
  statusLabel: string;
  isConsolidated: boolean;
  projectObjective: string;
  updatedAt: string;
};

/** Resumen derivado de cotización. Apunta a su fuente en /cotizaciones. */
export type QuotationAgentSummary = {
  /** Entidad fuente: módulo quotations, función getQuotationWorkspace() */
  source: "quotations/getQuotationWorkspace";
  id: string;
  statusLabel: string;
  title: string | null;
  totalEstimado: string | null;
  isActive: boolean;
};

/** Resumen derivado de activos. Apunta a su fuente en /activos. */
export type AssetAgentSummary = {
  /** Entidad fuente: módulo assets, función getAssetsForDefaultTenant() */
  source: "assets/getAssetsForDefaultTenant";
  total: number;
  inProgress: number;
  inReview: number;
  delivered: number;
  hasDelivered: boolean;
};

/** Métricas CRM derivadas del array de leads. */
export type CrmAgentSummary = {
  source: "crm/buildCrmMetrics";
  totalLeads: number;
  activeLeads: number;
  label: string;
};

/**
 * Snapshot derivado completo para agentes y operadores.
 * Contiene resúmenes trazables de las cuatro entidades operativas principales.
 */
export type AgentContextSnapshot = {
  /** ISO 8601 del momento en que se generó este snapshot */
  snapshotAt: string;
  /** Nombre del tenant activo, o null si no hay configuración */
  tenantSlug: string | null;
  /** Resumen del lead más reciente/activo, o null si no hay leads */
  lead: LeadAgentSummary | null;
  /** Resumen del brief activo, o null si no hay brief */
  brief: BriefAgentSummary | null;
  /** Resumen de la cotización activa, o null si no hay cotización */
  quotation: QuotationAgentSummary | null;
  /** Resumen de activos del proyecto, o null si no hay activos */
  assets: AssetAgentSummary | null;
  /** Métricas CRM derivadas */
  crm: CrmAgentSummary;
  /** Siguiente acción recomendada para el operador */
  nextAction: NextAction;
};

// ─── Funciones puras de derivación (testeables) ───────────────────────────────

/** Selecciona el lead más relevante del array: primero activo, si no el más reciente. */
export function selectRepresentativeLead(leads: Lead[]): Lead | null {
  if (leads.length === 0) return null;
  const activeStatuses: LeadStatus[] = ["nuevo", "en_seguimiento", "propuesta_enviada"];
  const active = leads.find((l) => activeStatuses.includes(l.status));
  return active ?? leads[0];
}

/** Deriva un LeadAgentSummary desde un Lead. Función pura. */
export function deriveLeadSummary(lead: Lead): LeadAgentSummary {
  const activeStatuses: LeadStatus[] = ["nuevo", "en_seguimiento", "propuesta_enviada"];
  return {
    source: "crm/getLeadsForDefaultTenant",
    id: lead.id,
    name: lead.name,
    status: lead.status,
    statusLabel: leadStatusLabel(lead.status),
    sourceChannelLabel: leadSourceChannelLabel(lead.sourceChannel),
    requestedService: lead.requestedService,
    updatedAt: lead.updatedAt,
    nextFollowUpAt: lead.nextFollowUpAt,
    isActive: activeStatuses.includes(lead.status)
  };
}

/** Deriva un BriefAgentSummary desde el resumen de dashboard. Función pura. */
export function deriveBriefSummary(brief: BriefDashboardSummary): BriefAgentSummary {
  return {
    source: "briefing/getBriefWorkspace",
    id: brief.id,
    statusLabel: briefStatusLabel(brief.status),
    isConsolidated: brief.isConsolidated,
    projectObjective: brief.projectObjective,
    updatedAt: brief.updatedAt
  };
}

/** Deriva un QuotationAgentSummary desde el resumen de dashboard. Función pura. */
export function deriveQuotationSummary(quotation: QuotationDashboardSummary): QuotationAgentSummary {
  return {
    source: "quotations/getQuotationWorkspace",
    id: quotation.id,
    statusLabel: quotation.statusLabel,
    title: quotation.title,
    totalEstimado: quotation.totalEstimado,
    isActive: quotation.isActive
  };
}

/** Deriva un AssetAgentSummary desde el resumen de dashboard. Función pura. */
export function deriveAssetSummary(assets: AssetsDashboardSummary): AssetAgentSummary {
  return {
    source: "assets/getAssetsForDefaultTenant",
    total: assets.total,
    inProgress: assets.byStatus["in_progress"] ?? 0,
    inReview: assets.byStatus["in_review"] ?? 0,
    delivered: assets.byStatus["delivered"] ?? 0,
    hasDelivered: assets.hasDelivered
  };
}

// ─── Función principal server-side ────────────────────────────────────────────

/**
 * Genera un snapshot derivado y trazable del estado operativo del tenant activo.
 * Construido desde getOperativeSummary() + getLeadsForDefaultTenant().
 *
 * Este snapshot es un derivado: no reemplaza la fuente primaria.
 * Cada bloque contiene la referencia a su módulo y función de origen.
 */
export async function getAgentContextSnapshot(): Promise<AgentContextSnapshot> {
  const [summary, leads] = await Promise.all([getOperativeSummary(), getLeadsForDefaultTenant()]);

  const representativeLead = selectRepresentativeLead(leads);
  const crmMetrics = buildCrmMetrics(leads);

  const lead = representativeLead ? deriveLeadSummary(representativeLead) : null;
  const brief = summary.brief ? deriveBriefSummary(summary.brief) : null;
  const quotation = summary.quotation ? deriveQuotationSummary(summary.quotation) : null;
  const assets = summary.assets ? deriveAssetSummary(summary.assets) : null;

  const nextAction = resolveNextAction(summary.brief, summary.quotation, summary.assets);

  return {
    snapshotAt: new Date().toISOString(),
    tenantSlug: summary.tenant?.slug ?? null,
    lead,
    brief,
    quotation,
    assets,
    crm: {
      source: "crm/buildCrmMetrics",
      totalLeads: crmMetrics.totalLeads,
      activeLeads: crmMetrics.activeLeads,
      label: crmMetrics.label
    },
    nextAction
  };
}
