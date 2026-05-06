/**
 * IMPL-20260506-30
 * IMPL-20260506-31
 * IMPL-20260506-32
 * IMPL-20260506-34
 * IMPL-20260506-36
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-31_handoffs_remotos_endurecidos_por_entidad_v1.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-32_contratos_externos_minimos_objetos_vivos_v1.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-34_consumo_remoto_tenancy_reforzado_v1.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-35_estadisticas_resumidas_datos_reales_v1.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-36_endurecimiento_contratos_externos_v1.md
 *
 * Superficie humana del snapshot derivado para agentes y operadores.
 * Muestra el estado operativo resumido y trazable del tenant activo.
 * NOTA: este es un derivado. La fuente primaria vive en /briefs, /cotizaciones, /activos y /crm.
 */
import { buildTenantRemoteContext, buildTenantOperativeSummary, getAgentContextSnapshot, type AgentExternalContracts, type TenantRemoteContext, type TenantOperativeSummary } from "@/lib/agent-context";

export const dynamic = "force-dynamic";

// ─── Componentes de presentación ─────────────────────────────────────────────

function SectionHeader({ title, source }: { title: string; source: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">{title}</h2>
      <p className="text-xs text-zinc-500 font-mono mt-0.5">fuente: {source}</p>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between items-baseline gap-4 py-1 border-b border-zinc-800/50 last:border-0">
      <span className="text-xs text-zinc-500 shrink-0">{label}</span>
      <span className="text-sm text-zinc-200 text-right">{value ?? "—"}</span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-zinc-600 italic">{label}</p>;
}

type AnyHandoff = {
  entityType: string;
  source: string;
  snapshotAt: string;
  tenantSlug: string | null;
  nextAction: { label: string; reason: string; href: string } | null;
};

function HandoffBlock({ handoff }: { handoff: AnyHandoff | null }) {
  if (!handoff) return null;
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-semibold text-indigo-400 uppercase tracking-wider">
          {handoff.entityType}
        </span>
        <span className="text-xs text-zinc-600 font-mono">{handoff.snapshotAt}</span>
      </div>
      <p className="text-xs text-zinc-500 mb-1">fuente: {handoff.source}</p>
      <p className="text-xs text-zinc-600">tenant: {handoff.tenantSlug ?? "—"}</p>
      {handoff.nextAction && (
        <div className="rounded-md bg-zinc-800/60 px-3 py-2 mt-3">
          <p className="text-xs font-medium text-amber-400">{handoff.nextAction.label}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{handoff.nextAction.reason}</p>
          <a
            href={handoff.nextAction.href}
            className="inline-block mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
          >
            Ir a {handoff.nextAction.href}
          </a>
        </div>
      )}
    </Card>
  );
}

type AnyExternalContract = {
  entityType: string;
  contractVersion: string;
  tenantSlug: string | null;
  generatedAt: string;
  handoffRef: string;
  source: string;
  payload: Record<string, unknown>;
};

function ExternalContractBlock({ contract }: { contract: AnyExternalContract }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
          {contract.entityType}
        </span>
        <span className="text-xs text-zinc-600 font-mono">v{contract.contractVersion}</span>
      </div>
      <p className="text-xs text-zinc-500 mb-1">fuente: {contract.source}</p>
      <p className="text-xs text-zinc-600 mb-1">tenant: {contract.tenantSlug ?? "—"}</p>
      <p className="text-xs text-zinc-600 mb-3 font-mono">ref: {contract.handoffRef}</p>
      <div className="rounded-md bg-zinc-800/40 px-3 py-2 space-y-1">
        {Object.entries(contract.payload).map(([key, val]) => (
          <div key={key} className="flex justify-between items-baseline gap-4">
            <span className="text-xs text-zinc-500 font-mono shrink-0">{key}</span>
            <span className="text-xs text-zinc-300 text-right">
              {val === null ? "—" : String(val)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ExternalContractsSection({ contracts }: { contracts: AgentExternalContracts }) {  const items = (
    [contracts.brief, contracts.lead, contracts.quotation, contracts.asset] as (AnyExternalContract | null)[]
  ).filter((c): c is AnyExternalContract => c !== null);
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">
          Contratos externos mínimos
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Capa estable derivada de los handoffs remotos. Solo lectura. No reemplaza la fuente
          primaria ni el handoff. Versión <span className="font-mono">1.0</span>.
        </p>
      </div>
      {items.length === 0 ? (
        <EmptyState label="No hay contratos externos disponibles." />
      ) : (
        <div className="grid gap-4">
          {items.map((c) => (
            <ExternalContractBlock key={c.entityType} contract={c} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── IMPL-20260506-36: estadísticas resumidas derivadas ──────────────────────

/**
 * Sección compacta de estadísticas resumidas derivadas del snapshot.
 * Lectura rápida del estado operativo real del tenant. No es la fuente primaria.
 * Derivada de buildTenantOperativeSummary(); sin queries adicionales.
 */
function TenantOperativeSummarySection({ summary }: { summary: TenantOperativeSummary }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">
          Estadísticas resumidas
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Lectura compacta derivada del snapshot. Sin queries adicionales. Complementaria — no
          reemplaza la fuente primaria.{" "}
          <span className="font-mono text-zinc-600">
            fuente: {summary.source}
          </span>
        </p>
      </div>
      <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/40 divide-y divide-zinc-800/60">
        {/* CRM */}
        <div className="px-5 py-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">CRM</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <Row label="Leads totales" value={String(summary.totalLeads)} />
            <Row label="Leads activos" value={String(summary.activeLeads)} />
          </div>
        </div>
        {/* Brief */}
        <div className="px-5 py-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Brief</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <Row label="Estado" value={summary.briefStatus} />
            <Row
              label="Consolidado"
              value={
                summary.briefIsConsolidated === null
                  ? null
                  : summary.briefIsConsolidated
                  ? "Sí"
                  : "No"
              }
            />
          </div>
        </div>
        {/* Cotización */}
        <div className="px-5 py-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Cotización</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <Row label="Estado" value={summary.quotationStatus} />
            <Row label="Total estimado" value={summary.quotationTotal} />
          </div>
        </div>
        {/* Activos */}
        <div className="px-5 py-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Activos</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <Row label="Total" value={String(summary.totalAssets)} />
            <Row label="Entregados" value={String(summary.deliveredAssets)} />
          </div>
        </div>
        {/* Siguiente acción + entidades */}
        <div className="px-5 py-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Señal operativa</p>
          <Row label="Siguiente acción" value={summary.nextActionLabel} />
          <Row
            label="Entidades activas"
            value={summary.activeEntities.length > 0 ? summary.activeEntities.join(", ") : "—"}
          />
        </div>
      </div>
    </div>
  );
}

// ─── IMPL-20260506-34: consumo remoto con tenancy reforzado ──────────────────

/**
 * Sección que expone el contexto de consumo remoto organizado por tenant.
 * Derivado de buildTenantRemoteContext(); sin queries adicionales.
 * Tenant como eje primario; traceMap muestra la cadena completa de derivación.
 */
function TenantRemoteContextSection({ ctx }: { ctx: TenantRemoteContext }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">
          Consumo remoto — contexto por tenant
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Capa reusable derivada del snapshot con tenant como eje primario. Sin queries
          adicionales. Apta para futuros bridges o endpoints server-side.
        </p>
      </div>
      <Card>
        <div className="space-y-0.5 mb-4">
          <Row label="Tenant activo" value={ctx.tenantSlug ?? "—"} />
          <Row label="Generado" value={ctx.generatedAt} />
          <Row
            label="Entidades disponibles"
            value={ctx.availableEntities.length > 0 ? ctx.availableEntities.join(", ") : "—"}
          />
        </div>
        {ctx.traceMap.length === 0 ? (
          <EmptyState label="No hay entidades disponibles para trazar." />
        ) : (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">
              Mapa de trazabilidad (tenant → entidad → contrato → fuente)
            </p>
            <div className="space-y-3">
              {ctx.traceMap.map((entry) => (
                <div
                  key={entry.entity}
                  className="rounded-md border border-zinc-800 bg-zinc-800/30 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-semibold text-violet-400 uppercase tracking-wider">
                      {entry.entity}
                    </span>
                    <span className="text-xs text-zinc-600 font-mono">v{entry.contractVersion}</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    tenant: <span className="text-zinc-400 font-mono">{entry.tenant ?? "—"}</span>
                  </p>
                  <p className="text-xs text-zinc-600 font-mono mt-0.5">ref: {entry.handoffRef}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">fuente: {entry.source}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function ContextoAgentesPage() {
  const snapshot = await getAgentContextSnapshot();
  const remoteContext = buildTenantRemoteContext(snapshot);
  const operativeSummary = buildTenantOperativeSummary(snapshot);

  const freshness = new Date(snapshot.snapshotAt).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-3xl mx-auto">
      {/* Cabecera */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Contexto para agentes</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Snapshot derivado del estado operativo del tenant{" "}
          <span className="font-mono text-zinc-400">{snapshot.tenantSlug ?? "—"}</span>.{" "}
          Generado: <span className="text-zinc-400">{freshness}</span>.
        </p>
        <p className="text-xs text-zinc-600 mt-1">
          Este es un derivado de lectura. La fuente primaria vive en /briefs, /cotizaciones, /activos y /crm.
        </p>
      </div>

      {/* Estadísticas resumidas derivadas (IMPL-20260506-36) */}
      <TenantOperativeSummarySection summary={operativeSummary} />

      {/* Siguiente acción recomendada */}
      <Card>
        <SectionHeader title="Siguiente acción recomendada" source="dashboard/resolveNextAction" />
        <div className="mt-2 rounded-lg bg-zinc-800/60 px-4 py-3">
          <p className="text-sm font-medium text-zinc-100">{snapshot.nextAction.label}</p>
          <p className="text-xs text-zinc-400 mt-1">{snapshot.nextAction.reason}</p>
          <a
            href={snapshot.nextAction.href}
            className="inline-block mt-3 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
          >
            Ir a {snapshot.nextAction.href}
          </a>
        </div>
      </Card>

      {/* Brief */}
      <Card>
        <SectionHeader title="Brief activo" source={snapshot.brief?.source ?? "briefing/getBriefWorkspace"} />
        {snapshot.brief ? (
          <div className="space-y-0.5">
            <Row label="ID" value={snapshot.brief.id} />
            <Row label="Estado" value={snapshot.brief.statusLabel} />
            <Row label="Consolidado" value={snapshot.brief.isConsolidated ? "Sí" : "No"} />
            <Row label="Objetivo del proyecto" value={snapshot.brief.projectObjective || "Sin definir"} />
            <Row label="Última actualización" value={snapshot.brief.updatedAt} />
          </div>
        ) : (
          <EmptyState label="No hay brief registrado para el proyecto activo." />
        )}
      </Card>

      {/* Cotización */}
      <Card>
        <SectionHeader
          title="Cotización activa"
          source={snapshot.quotation?.source ?? "quotations/getQuotationWorkspace"}
        />
        {snapshot.quotation ? (
          <div className="space-y-0.5">
            <Row label="ID" value={snapshot.quotation.id} />
            <Row label="Estado" value={snapshot.quotation.statusLabel} />
            <Row label="Título" value={snapshot.quotation.title} />
            <Row label="Total estimado" value={snapshot.quotation.totalEstimado} />
            <Row label="Activa (enviada/aprobada)" value={snapshot.quotation.isActive ? "Sí" : "No"} />
          </div>
        ) : (
          <EmptyState label="No hay cotización registrada." />
        )}
      </Card>

      {/* Activos */}
      <Card>
        <SectionHeader title="Activos del proyecto" source={snapshot.assets?.source ?? "assets/getAssetsForDefaultTenant"} />
        {snapshot.assets ? (
          <div className="space-y-0.5">
            <Row label="Total" value={String(snapshot.assets.total)} />
            <Row label="En progreso" value={String(snapshot.assets.inProgress)} />
            <Row label="En revisión" value={String(snapshot.assets.inReview)} />
            <Row label="Entregados" value={String(snapshot.assets.delivered)} />
            <Row label="Hay entregados" value={snapshot.assets.hasDelivered ? "Sí" : "No"} />
          </div>
        ) : (
          <EmptyState label="No hay activos registrados en el proyecto." />
        )}
      </Card>

      {/* Lead representativo */}
      <Card>
        <SectionHeader
          title="Lead representativo"
          source={snapshot.lead?.source ?? "crm/getLeadsForDefaultTenant"}
        />
        {snapshot.lead ? (
          <div className="space-y-0.5">
            <Row label="ID" value={snapshot.lead.id} />
            <Row label="Nombre" value={snapshot.lead.name} />
            <Row label="Estado" value={snapshot.lead.statusLabel} />
            <Row label="Canal" value={snapshot.lead.sourceChannelLabel} />
            <Row label="Servicio solicitado" value={snapshot.lead.requestedService} />
            <Row label="Activo" value={snapshot.lead.isActive ? "Sí" : "No"} />
            <Row label="Próximo seguimiento" value={snapshot.lead.nextFollowUpAt} />
            <Row label="Última actualización" value={snapshot.lead.updatedAt} />
          </div>
        ) : (
          <EmptyState label="No hay leads registrados en el CRM." />
        )}
      </Card>

      {/* CRM general */}
      <Card>
        <SectionHeader title="CRM — métricas generales" source={snapshot.crm.source} />
        <div className="space-y-0.5">
          <Row label="Total de leads" value={String(snapshot.crm.totalLeads)} />
          <Row label="Leads activos" value={String(snapshot.crm.activeLeads)} />
          <Row label="Resumen" value={snapshot.crm.label} />
        </div>
      </Card>

      {/* Handoffs remotos por entidad */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">
            Handoffs remotos por entidad
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Contratos compactos y trazables listos para transporte remoto. Derivados del snapshot;
            no reemplazan la fuente primaria. Generados en el mismo instante que el snapshot.
          </p>
        </div>
        <div className="grid gap-4">
          <HandoffBlock handoff={snapshot.handoffs.brief} />
          <HandoffBlock handoff={snapshot.handoffs.lead} />
          <HandoffBlock handoff={snapshot.handoffs.quotation} />
          <HandoffBlock handoff={snapshot.handoffs.asset} />
        </div>
      </div>

      {/* Contratos externos mínimos */}
      <ExternalContractsSection contracts={snapshot.externalContracts} />

      {/* Consumo remoto — contexto por tenant (IMPL-20260506-34) */}
      <TenantRemoteContextSection ctx={remoteContext} />
    </div>
  );
}
