/**
 * IMPL-20260505-25
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-25_cabina_operador_accionable_resumenes_reales_v1.md
 */
import { type BriefClientContainer, type BriefProjectContainer, type BriefingStatus, getBriefWorkspace } from "./briefing";
import { type AssetStatus, getAssetsForDefaultTenant } from "./assets";
import { buildCrmMetrics, getLeadsForDefaultTenant } from "./crm";
import { type QuotationStatus, getQuotationWorkspace, quotationStatusLabel } from "./quotations";
import { type TenantSnapshot, getTenantSnapshot } from "./tenant-runtime";

// ─── Tipos del resumen operativo ─────────────────────────────────────────────

export type BriefDashboardSummary = {
  id: string;
  status: BriefingStatus;
  statusLabel: string;
  isConsolidated: boolean;
  projectObjective: string;
  updatedAt: string;
};

export type QuotationDashboardSummary = {
  id: string;
  status: QuotationStatus;
  statusLabel: string;
  title: string | null;
  totalEstimado: string | null;
  isActive: boolean;
};

export type AssetsDashboardSummary = {
  total: number;
  byStatus: Partial<Record<AssetStatus, number>>;
  hasDelivered: boolean;
  hasInProgress: boolean;
};

export type NextAction = {
  label: string;
  href: string;
  reason: string;
};

export type ModuleMetrics = {
  briefs: string;
  cotizaciones: string;
  activos: string;
  crm: string;
};

export type OperativeSummary = {
  tenant: TenantSnapshot | null;
  client: BriefClientContainer | null;
  project: BriefProjectContainer | null;
  brief: BriefDashboardSummary | null;
  quotation: QuotationDashboardSummary | null;
  assets: AssetsDashboardSummary | null;
  nextAction: NextAction;
  moduleMetrics: ModuleMetrics;
};

// ─── Labels de estado del brief ───────────────────────────────────────────────

const briefStatusLabels: Record<BriefingStatus, string> = {
  draft: "Borrador",
  stage_1_discovery: "Descubrimiento",
  stage_2_precision: "Precision",
  stage_3_commercial_fit: "Encaje comercial",
  pending_operator_review: "Pendiente de revision",
  operator_review_in_progress: "En revision operativa",
  approved_locked: "Consolidado",
  returned_for_rework: "Devuelto para rework",
  superseded: "Reemplazado"
};

export function briefStatusLabel(status: BriefingStatus): string {
  return briefStatusLabels[status] ?? status;
}

// ─── Reglas de siguiente acción (puras, testeables) ──────────────────────────

/**
 * Calcula la siguiente accion recomendada a partir del estado de los tres
 * objetos operativos del proyecto activo.
 *
 * Reglas (en orden de prioridad):
 * 1. Sin brief o brief no consolidado → /briefs
 * 2. Brief consolidado pero sin cotizacion o cotizacion en draft → /cotizaciones
 * 3. Cotizacion activa (sent/approved/...) pero sin activos → /activos
 * 4. Los tres objetos existen → foco operativo en /activos
 */
export function resolveNextAction(
  brief: BriefDashboardSummary | null,
  quotation: QuotationDashboardSummary | null,
  assets: AssetsDashboardSummary | null
): NextAction {
  if (!brief) {
    return {
      label: "Crear el primer brief",
      href: "/briefs",
      reason: "No hay ningún brief registrado para el proyecto activo."
    };
  }

  if (!brief.isConsolidated) {
    return {
      label: "Consolidar el brief",
      href: "/briefs",
      reason: `El brief está en estado "${brief.statusLabel}" y todavía no fue aprobado.`
    };
  }

  if (!quotation) {
    return {
      label: "Crear cotización",
      href: "/cotizaciones",
      reason: "El brief está consolidado pero no hay cotización registrada."
    };
  }

  if (quotation.status === "draft") {
    return {
      label: "Enviar cotización al cliente",
      href: "/cotizaciones",
      reason: "La cotización existe pero sigue en borrador y no ha sido enviada."
    };
  }

  if (!assets || assets.total === 0) {
    return {
      label: "Registrar activos del proyecto",
      href: "/activos",
      reason: "La cotización fue enviada o aprobada, pero no hay activos registrados aún."
    };
  }

  const inProgress = assets.byStatus["in_progress"] ?? 0;
  const inReview = assets.byStatus["in_review"] ?? 0;
  const delivered = assets.byStatus["delivered"] ?? 0;

  return {
    label: "Revisar foco operativo",
    href: "/activos",
    reason: `${assets.total} activo${assets.total !== 1 ? "s" : ""} en el proyecto — ${inProgress} en progreso, ${inReview} en revision, ${delivered} entregado${delivered !== 1 ? "s" : ""}.`
  };
}

// ─── Función principal del dashboard ─────────────────────────────────────────

export async function getOperativeSummary(): Promise<OperativeSummary> {
  const [tenantSnapshot, briefWorkspace, quotationWorkspace, assetWorkspaces, leads] = await Promise.all([
    getTenantSnapshot(),
    getBriefWorkspace(),
    getQuotationWorkspace(),
    getAssetsForDefaultTenant(),
    getLeadsForDefaultTenant()
  ]);

  const brief: BriefDashboardSummary | null = briefWorkspace
    ? {
        id: briefWorkspace.id,
        status: briefWorkspace.status,
        statusLabel: briefStatusLabel(briefWorkspace.status),
        isConsolidated: briefWorkspace.status === "approved_locked",
        projectObjective: briefWorkspace.currentVersion?.structuredSummary?.projectObjective ?? "",
        updatedAt: briefWorkspace.updatedAt
      }
    : null;

  const quotation: QuotationDashboardSummary | null = quotationWorkspace
    ? {
        id: quotationWorkspace.quotation.id,
        status: quotationWorkspace.quotation.status,
        statusLabel: quotationStatusLabel(quotationWorkspace.quotation.status),
        title: quotationWorkspace.activeVersion?.title ?? quotationWorkspace.versions[0]?.title ?? null,
        totalEstimado: quotationWorkspace.activeVersion?.commercialSummaryJson?.totalEstimado ?? null,
        isActive: ["sent", "approved", "invoiced", "paid"].includes(quotationWorkspace.quotation.status)
      }
    : null;

  let assets: AssetsDashboardSummary | null = null;

  if (assetWorkspaces.length > 0) {
    const byStatus: Partial<Record<AssetStatus, number>> = {};

    for (const { asset } of assetWorkspaces) {
      byStatus[asset.status] = (byStatus[asset.status] ?? 0) + 1;
    }

    assets = {
      total: assetWorkspaces.length,
      byStatus,
      hasDelivered: (byStatus["delivered"] ?? 0) > 0,
      hasInProgress: (byStatus["in_progress"] ?? 0) > 0
    };
  }

  const container = briefWorkspace?.container;
  const client = container?.client ?? null;
  const project = container?.project ?? null;

  const nextAction = resolveNextAction(brief, quotation, assets);

  const crmMetrics = buildCrmMetrics(leads);

  const moduleMetrics: ModuleMetrics = {
    briefs: brief ? "1 activo" : "Sin brief",
    cotizaciones: quotation ? `1 ${quotation.statusLabel.toLowerCase()}` : "Sin cotización",
    activos: assets ? `${assets.total} activo${assets.total !== 1 ? "s" : ""}` : "Sin activos",
    crm: crmMetrics.label
  };

  return {
    tenant: tenantSnapshot,
    client,
    project,
    brief,
    quotation,
    assets,
    nextAction,
    moduleMetrics
  };
}
