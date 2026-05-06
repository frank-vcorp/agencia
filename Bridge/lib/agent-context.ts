/**
 * IMPL-20260506-30
 * IMPL-20260506-31
 * IMPL-20260506-32
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-30_conocimiento_derivado_agentes_v1.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-31_handoffs_remotos_endurecidos_por_entidad_v1.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-32_contratos_externos_minimos_objetos_vivos_v1.md
 *
 * Capa de conocimiento derivado para agentes y operadores.
 * Este módulo NO reemplaza la fuente primaria. Produce un snapshot
 * resumido y trazable, construido desde los objetos vivos del tenant activo.
 *
 * Separación de capas:
 *   Fuente primaria → AgentSummary → RemoteHandoff → ExternalContract
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

// ─── Tipos de handoff remoto por entidad ─────────────────────────────────────

/**
 * Contrato remoto mínimo por entidad. Compacto, trazable y apto para transporte.
 * Derivado del snapshot; NO reemplaza la fuente primaria.
 *
 * IMPL-20260506-31
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-31_handoffs_remotos_endurecidos_por_entidad_v1.md
 */
export type RemoteHandoff<TEntityType extends string, TPayload extends object> = {
  /** Discriminante de entidad para consumo remoto */
  entityType: TEntityType;
  /** Módulo y función de origen del payload */
  source: string;
  /** ISO 8601 del momento en que se generó este handoff */
  snapshotAt: string;
  /** Slug del tenant activo, o null si no hay configuración */
  tenantSlug: string | null;
  /** Payload compacto y trazable de la entidad */
  payload: TPayload;
  /** Siguiente acción recomendada para esta entidad; null si no aplica */
  nextAction: { label: string; reason: string; href: string } | null;
};

export type BriefRemoteHandoff = RemoteHandoff<"brief", BriefAgentSummary>;
export type LeadRemoteHandoff = RemoteHandoff<"lead", LeadAgentSummary>;
export type QuotationRemoteHandoff = RemoteHandoff<"quotation", QuotationAgentSummary>;
export type AssetRemoteHandoff = RemoteHandoff<"asset", AssetAgentSummary>;

/** Colección de handoffs remotos por entidad. null cuando la entidad no existe en el tenant. */
export type AgentRemoteHandoffs = {
  brief: BriefRemoteHandoff | null;
  lead: LeadRemoteHandoff | null;
  quotation: QuotationRemoteHandoff | null;
  asset: AssetRemoteHandoff | null;
};

// ─── Tipos de contratos externos mínimos ──────────────────────────────────────

/**
 * Contrato externo mínimo. Derivado del handoff remoto; no de la fuente primaria.
 * Pequeño, estable, versionado y trazable. Apto para consumo remoto controlado.
 *
 * IMPL-20260506-32
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-32_contratos_externos_minimos_objetos_vivos_v1.md
 */
export type ExternalContract<TEntityType extends string, TMinimalPayload extends object> = {
  /** Discriminante de entidad */
  entityType: TEntityType;
  /** Versión del contrato externo — solo cambia en breaking changes */
  contractVersion: "1.0";
  /** Slug del tenant activo, o null si no hay configuración */
  tenantSlug: string | null;
  /** ISO 8601 del momento en que se generó el contrato (heredado del handoff) */
  generatedAt: string;
  /** Referencia trazable al handoff de origen: "<entityType>@<snapshotAt>" */
  handoffRef: string;
  /** Módulo y función de origen del dato (heredado del handoff) */
  source: string;
  /** Payload mínimo y estable para consumo externo */
  payload: TMinimalPayload;
};

/** Payload mínimo del brief para contrato externo */
export type BriefExternalPayload = {
  id: string;
  statusLabel: string;
  isConsolidated: boolean;
  updatedAt: string;
};

/** Payload mínimo del lead para contrato externo */
export type LeadExternalPayload = {
  id: string;
  statusLabel: string;
  isActive: boolean;
  updatedAt: string;
};

/** Payload mínimo de la cotización para contrato externo */
export type QuotationExternalPayload = {
  id: string;
  statusLabel: string;
  isActive: boolean;
  totalEstimado: string | null;
};

/** Payload mínimo de activos para contrato externo */
export type AssetExternalPayload = {
  total: number;
  delivered: number;
  hasDelivered: boolean;
};

export type BriefExternalContract = ExternalContract<"brief", BriefExternalPayload>;
export type LeadExternalContract = ExternalContract<"lead", LeadExternalPayload>;
export type QuotationExternalContract = ExternalContract<"quotation", QuotationExternalPayload>;
export type AssetExternalContract = ExternalContract<"asset", AssetExternalPayload>;

/** Colección de contratos externos por entidad. null cuando la entidad no existe en el tenant. */
export type AgentExternalContracts = {
  brief: BriefExternalContract | null;
  lead: LeadExternalContract | null;
  quotation: QuotationExternalContract | null;
  asset: AssetExternalContract | null;
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
  /** Handoffs remotos compactos por entidad, listos para transporte */
  handoffs: AgentRemoteHandoffs;
  /** Contratos externos mínimos por entidad, derivados de los handoffs */
  externalContracts: AgentExternalContracts;
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

// ─── Funciones de handoff remoto por entidad (puras, testeables) ──────────────

/**
 * Devuelve la nextAction global si su href apunta a la ruta de la entidad; null si no aplica.
 * Función pura usada para distribuir la acción al handoff correcto.
 */
export function resolveEntityNextAction(
  globalNextAction: NextAction,
  entityHref: string
): NextAction | null {
  return globalNextAction.href === entityHref ? globalNextAction : null;
}

/** Construye el handoff remoto de un brief. Función pura. */
export function buildBriefHandoff(
  brief: BriefAgentSummary,
  snapshotAt: string,
  tenantSlug: string | null,
  nextAction: NextAction | null
): BriefRemoteHandoff {
  return {
    entityType: "brief",
    source: brief.source,
    snapshotAt,
    tenantSlug,
    payload: brief,
    nextAction
  };
}

/** Construye el handoff remoto de un lead. Función pura. nextAction siempre null (no aplica). */
export function buildLeadHandoff(
  lead: LeadAgentSummary,
  snapshotAt: string,
  tenantSlug: string | null
): LeadRemoteHandoff {
  return {
    entityType: "lead",
    source: lead.source,
    snapshotAt,
    tenantSlug,
    payload: lead,
    nextAction: null
  };
}

/** Construye el handoff remoto de una cotización. Función pura. */
export function buildQuotationHandoff(
  quotation: QuotationAgentSummary,
  snapshotAt: string,
  tenantSlug: string | null,
  nextAction: NextAction | null
): QuotationRemoteHandoff {
  return {
    entityType: "quotation",
    source: quotation.source,
    snapshotAt,
    tenantSlug,
    payload: quotation,
    nextAction
  };
}

/** Construye el handoff remoto de activos. Función pura. */
export function buildAssetHandoff(
  asset: AssetAgentSummary,
  snapshotAt: string,
  tenantSlug: string | null,
  nextAction: NextAction | null
): AssetRemoteHandoff {
  return {
    entityType: "asset",
    source: asset.source,
    snapshotAt,
    tenantSlug,
    payload: asset,
    nextAction
  };
}

// ─── Funciones de contrato externo mínimo (puras, testeables) ─────────────────

/** Construye el contrato externo mínimo de un brief desde su handoff remoto. Función pura. */
export function buildBriefExternalContract(handoff: BriefRemoteHandoff): BriefExternalContract {
  return {
    entityType: "brief",
    contractVersion: "1.0",
    tenantSlug: handoff.tenantSlug,
    generatedAt: handoff.snapshotAt,
    handoffRef: `brief@${handoff.snapshotAt}`,
    source: handoff.source,
    payload: {
      id: handoff.payload.id,
      statusLabel: handoff.payload.statusLabel,
      isConsolidated: handoff.payload.isConsolidated,
      updatedAt: handoff.payload.updatedAt
    }
  };
}

/** Construye el contrato externo mínimo de un lead desde su handoff remoto. Función pura. */
export function buildLeadExternalContract(handoff: LeadRemoteHandoff): LeadExternalContract {
  return {
    entityType: "lead",
    contractVersion: "1.0",
    tenantSlug: handoff.tenantSlug,
    generatedAt: handoff.snapshotAt,
    handoffRef: `lead@${handoff.snapshotAt}`,
    source: handoff.source,
    payload: {
      id: handoff.payload.id,
      statusLabel: handoff.payload.statusLabel,
      isActive: handoff.payload.isActive,
      updatedAt: handoff.payload.updatedAt
    }
  };
}

/** Construye el contrato externo mínimo de una cotización desde su handoff remoto. Función pura. */
export function buildQuotationExternalContract(handoff: QuotationRemoteHandoff): QuotationExternalContract {
  return {
    entityType: "quotation",
    contractVersion: "1.0",
    tenantSlug: handoff.tenantSlug,
    generatedAt: handoff.snapshotAt,
    handoffRef: `quotation@${handoff.snapshotAt}`,
    source: handoff.source,
    payload: {
      id: handoff.payload.id,
      statusLabel: handoff.payload.statusLabel,
      isActive: handoff.payload.isActive,
      totalEstimado: handoff.payload.totalEstimado
    }
  };
}

/** Construye el contrato externo mínimo de activos desde su handoff remoto. Función pura. */
export function buildAssetExternalContract(handoff: AssetRemoteHandoff): AssetExternalContract {
  return {
    entityType: "asset",
    contractVersion: "1.0",
    tenantSlug: handoff.tenantSlug,
    generatedAt: handoff.snapshotAt,
    handoffRef: `asset@${handoff.snapshotAt}`,
    source: handoff.source,
    payload: {
      total: handoff.payload.total,
      delivered: handoff.payload.delivered,
      hasDelivered: handoff.payload.hasDelivered
    }
  };
}

/** Deriva la colección de contratos externos desde los handoffs remotos. Función pura. */
export function buildExternalContracts(handoffs: AgentRemoteHandoffs): AgentExternalContracts {
  return {
    brief: handoffs.brief ? buildBriefExternalContract(handoffs.brief) : null,
    lead: handoffs.lead ? buildLeadExternalContract(handoffs.lead) : null,
    quotation: handoffs.quotation ? buildQuotationExternalContract(handoffs.quotation) : null,
    asset: handoffs.asset ? buildAssetExternalContract(handoffs.asset) : null
  };
}

// ─── IMPL-20260506-34: contexto de consumo remoto por tenant ─────────────────

/**
 * Contexto de consumo remoto organizado por tenant como eje primario.
 * Estructura plana, serializable y apta para futuros bridges o endpoints.
 * Derivada del snapshot; no abre nuevas fuentes ni queries adicionales.
 *
 * IMPL-20260506-34
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-34_consumo_remoto_tenancy_reforzado_v1.md
 */
export type TenantRemoteContext = {
  /** Slug del tenant — eje primario de trazabilidad del consumo remoto */
  tenantSlug: string | null;
  /** ISO 8601 heredado del snapshot de origen */
  generatedAt: string;
  /** Entidades con contrato externo disponible en este instante */
  availableEntities: string[];
  /**
   * Traza completa: tenant → entidad → contrato → handoffRef → fuente primaria.
   * Una entrada por entidad activa. Permite auditar la cadena de derivación
   * sin acceder a la fuente primaria.
   */
  traceMap: Array<{
    /** Slug del tenant — repite el eje primario para trazabilidad independiente por entrada */
    tenant: string | null;
    /** Discriminante de entidad */
    entity: string;
    /** Referencia trazable al handoff de origen: "<entityType>@<snapshotAt>" */
    handoffRef: string;
    /** Módulo y función de origen del dato */
    source: string;
    /** Versión del contrato externo */
    contractVersion: string;
  }>;
};

/**
 * Construye el contexto de consumo remoto por tenant desde el snapshot derivado.
 * Función pura; no lanza queries adicionales. Reutilizable server-side o desde endpoints.
 * Deriva exclusivamente de externalContracts — la capa más estable del snapshot.
 *
 * IMPL-20260506-34
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-34_consumo_remoto_tenancy_reforzado_v1.md
 */
export function buildTenantRemoteContext(snapshot: AgentContextSnapshot): TenantRemoteContext {
  const { externalContracts, snapshotAt, tenantSlug } = snapshot;

  const activeContracts = [
    externalContracts.brief,
    externalContracts.lead,
    externalContracts.quotation,
    externalContracts.asset,
  ].filter((c): c is NonNullable<typeof c> => c !== null);

  const traceMap: TenantRemoteContext["traceMap"] = activeContracts.map((c) => ({
    tenant: c.tenantSlug,
    entity: c.entityType,
    handoffRef: c.handoffRef,
    source: c.source,
    contractVersion: c.contractVersion,
  }));

  return {
    tenantSlug,
    generatedAt: snapshotAt,
    availableEntities: activeContracts.map((c) => c.entityType),
    traceMap,
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
  const snapshotAt = new Date().toISOString();
  const tenantSlug = summary.tenant?.slug ?? null;

  const handoffs: AgentRemoteHandoffs = {
    brief: brief
      ? buildBriefHandoff(brief, snapshotAt, tenantSlug, resolveEntityNextAction(nextAction, "/briefs"))
      : null,
    lead: lead ? buildLeadHandoff(lead, snapshotAt, tenantSlug) : null,
    quotation: quotation
      ? buildQuotationHandoff(quotation, snapshotAt, tenantSlug, resolveEntityNextAction(nextAction, "/cotizaciones"))
      : null,
    asset: assets
      ? buildAssetHandoff(assets, snapshotAt, tenantSlug, resolveEntityNextAction(nextAction, "/activos"))
      : null
  };

  const externalContracts = buildExternalContracts(handoffs);

  return {
    snapshotAt,
    tenantSlug,
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
    nextAction,
    handoffs,
    externalContracts
  };
}
