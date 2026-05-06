/**
 * IMPL-20260506-30
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-30_conocimiento_derivado_agentes_v1.md
 *
 * Superficie humana del snapshot derivado para agentes y operadores.
 * Muestra el estado operativo resumido y trazable del tenant activo.
 * NOTA: este es un derivado. La fuente primaria vive en /briefs, /cotizaciones, /activos y /crm.
 */
import { getAgentContextSnapshot } from "@/lib/agent-context";

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

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function ContextoAgentesPage() {
  const snapshot = await getAgentContextSnapshot();

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
    </div>
  );
}
