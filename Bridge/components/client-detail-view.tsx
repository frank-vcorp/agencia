"use client";

/**
 * IMPL-ARCH-20260612-05
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-05_gestion_clientes_crud_detalle_entidades_relacionadas.md
 * Vista de detalle del cliente con:
 *  - Header: nombre, estado, contacto, fecha de creación, acciones (Editar /
 *    Eliminar solo operador).
 *  - Tabs: Briefs, Cotizaciones, Activos, CRM (leads), Resultados.
 *  - Cada tab lista las entidades relacionadas filtradas por clientId y permite
 *    crear nueva entidad (solo operador) enviando clientId por query o form.
 *  - Modal de confirmación para eliminar el cliente.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteClientAction } from "@/app/clientes/actions";
import { BrandKitLogoUploader } from "@/components/brand-kit-logo-uploader";
import { formatClientCreatedAt } from "@/lib/client-portal";
import {
  CLIENT_STATUS_LABELS,
  type ClientStatus,
  type ClientDetail
} from "@/lib/clients";
import {
  leadSourceChannelLabel,
  leadStatusLabel,
  type Lead,
  type LeadSourceChannel,
  type LeadStatus
} from "@/lib/crm";
import { assetStatusLabel, type AssetWorkspace } from "@/lib/assets";
import {
  quotationStatusLabel,
  type Quotation
} from "@/lib/quotations";

/**
 * Tipo mínimo de Brief para la pestaña. Evita acoplar el view con
 * `BriefRecord` (más completo) y nos permite aceptar tanto el tipo rico
 * como la fila cruda de Supabase.
 */
type BriefSummary = {
  id: string;
  status: string;
  sourceChannel: string;
  currentVersionNumber: number;
};

const STATUS_BADGE_CLASS: Record<ClientStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  prospect: "bg-amber-50 text-amber-700 ring-amber-200",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200"
};

type TabKey = "briefs" | "cotizaciones" | "activos" | "crm" | "resultados";

const TAB_LABELS: Record<TabKey, string> = {
  briefs: "Briefs",
  cotizaciones: "Cotizaciones",
  activos: "Activos",
  crm: "CRM",
  resultados: "Resultados"
};

const TABS: TabKey[] = ["briefs", "cotizaciones", "activos", "crm", "resultados"];

// ─── Modal de eliminación ───────────────────────────────────────────────────

function DeleteClientModal({
  clientId,
  clientName,
  onClose,
  onDeleted
}: {
  clientId: string;
  clientName: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const expected = `ELIMINAR ${clientName.toUpperCase()}`;
  const matches = confirmation.trim() === expected;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!matches || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteClientAction(clientId);
      if (!result.ok) {
        setError(result.error ?? "Error desconocido");
        return;
      }
      onDeleted();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar eliminación de cliente"
    >
      <div className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-xl ring-1 ring-[color:var(--line)]">
        <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
          Eliminar cliente
        </h3>
        <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
          Esta acción moverá al cliente a la papelera. Para confirmar, escribe
          exactamente:
        </p>
        <p className="mt-2 rounded-[12px] bg-slate-100 px-3 py-2 font-mono text-xs text-slate-800 ring-1 ring-[color:var(--line)]">
          {expected}
        </p>
        <form onSubmit={handleSubmit} className="mt-3">
          <input
            autoFocus
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="Escribe la confirmación..."
            className="w-full rounded-[12px] border border-[color:var(--line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
          />
          {error ? (
            <p className="mt-2 text-xs text-red-600">Error: {error}</p>
          ) : null}
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-[color:var(--line)] hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!matches || isPending}
              className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Eliminando..." : "Eliminar cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tablas de contenido ─────────────────────────────────────────────────────

function EmptyState({ label, isOperator, createHref, createLabel }: {
  label: string;
  isOperator: boolean;
  createHref?: string;
  createLabel?: string;
}) {
  return (
    <div className="rounded-[20px] bg-white/70 px-5 py-6 ring-1 ring-[color:var(--line)]">
      <p className="text-sm text-[color:var(--muted)]">{label}</p>
      {isOperator && createHref && createLabel ? (
        <Link
          href={createHref}
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-[color:var(--accent-deep)] px-3 py-1.5 text-xs font-semibold text-white"
        >
          <span aria-hidden>+</span>
          {createLabel}
        </Link>
      ) : null}
    </div>
  );
}

function BriefsTab({ briefs, isOperator, clientId }: { briefs: BriefSummary[]; isOperator: boolean; clientId: string }) {
  if (briefs.length === 0) {
    return (
      <EmptyState
        label="Sin briefs asociados a este cliente."
        isOperator={isOperator}
        createHref={isOperator ? `/briefs?clientId=${clientId}` : undefined}
        createLabel="Nuevo brief"
      />
    );
  }
  return (
    <div className="space-y-3">
      {isOperator ? (
        <div className="flex justify-end">
          <Link
            href={`/briefs?clientId=${clientId}`}
            className="inline-flex items-center gap-1 rounded-full bg-[color:var(--accent-deep)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            <span aria-hidden>+</span> Nuevo brief
          </Link>
        </div>
      ) : null}
      {briefs.map((brief) => (
        <div
          key={brief.id}
          className="rounded-[18px] bg-white/80 px-4 py-3 ring-1 ring-[color:var(--line)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Brief {brief.id.slice(0, 8)}…</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Estado: {brief.status} · v{brief.currentVersionNumber ?? 0} · {brief.sourceChannel}
              </p>
            </div>
            <Link
              href="/briefs"
              className="text-xs font-semibold text-[color:var(--accent-deep)] hover:underline"
            >
              Ver en briefs →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuotationsTab({ quotations, isOperator, clientId }: { quotations: Quotation[]; isOperator: boolean; clientId: string }) {
  if (quotations.length === 0) {
    return (
      <EmptyState
        label="Sin cotizaciones asociadas a este cliente."
        isOperator={isOperator}
        createHref={isOperator ? `/cotizaciones?clientId=${clientId}` : undefined}
        createLabel="Nueva cotización"
      />
    );
  }
  return (
    <div className="space-y-3">
      {isOperator ? (
        <div className="flex justify-end">
          <Link
            href={`/cotizaciones?clientId=${clientId}`}
            className="inline-flex items-center gap-1 rounded-full bg-[color:var(--accent-deep)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            <span aria-hidden>+</span> Nueva cotización
          </Link>
        </div>
      ) : null}
      {quotations.map((q) => (
        <div
          key={q.id}
          className="rounded-[18px] bg-white/80 px-4 py-3 ring-1 ring-[color:var(--line)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Cotización {q.id.slice(0, 8)}…</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Estado: {quotationStatusLabel(q.status)} · {new Date(q.updatedAt).toLocaleDateString("es-MX")}
              </p>
            </div>
            <Link
              href="/cotizaciones"
              className="text-xs font-semibold text-[color:var(--accent-deep)] hover:underline"
            >
              Ver en cotizaciones →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function AssetsTab({ assets, isOperator, clientId }: { assets: AssetWorkspace[]; isOperator: boolean; clientId: string }) {
  if (assets.length === 0) {
    return (
      <EmptyState
        label="Sin activos asociados a este cliente."
        isOperator={isOperator}
        createHref={isOperator ? `/activos?clientId=${clientId}` : undefined}
        createLabel="Nuevo activo"
      />
    );
  }
  return (
    <div className="space-y-3">
      {isOperator ? (
        <div className="flex justify-end">
          <Link
            href={`/activos?clientId=${clientId}`}
            className="inline-flex items-center gap-1 rounded-full bg-[color:var(--accent-deep)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            <span aria-hidden>+</span> Nuevo activo
          </Link>
        </div>
      ) : null}
      {assets.map(({ asset }) => (
        <div
          key={asset.id}
          className="rounded-[18px] bg-white/80 px-4 py-3 ring-1 ring-[color:var(--line)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{asset.title}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                {assetStatusLabel(asset.status)} · {new Date(asset.updatedAt).toLocaleDateString("es-MX")}
              </p>
            </div>
            <Link
              href={`/activos/${asset.id}`}
              className="text-xs font-semibold text-[color:var(--accent-deep)] hover:underline"
            >
              Ver ficha →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function CrmTab({ leads, isOperator, clientId }: { leads: Lead[]; isOperator: boolean; clientId: string }) {
  if (leads.length === 0) {
    return (
      <EmptyState
        label="Sin leads asociados a este cliente."
        isOperator={isOperator}
        createHref={isOperator ? `/crm?clientId=${clientId}` : undefined}
        createLabel="Nuevo lead"
      />
    );
  }
  return (
    <div className="space-y-3">
      {isOperator ? (
        <div className="flex justify-end">
          <Link
            href={`/crm?clientId=${clientId}`}
            className="inline-flex items-center gap-1 rounded-full bg-[color:var(--accent-deep)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            <span aria-hidden>+</span> Nuevo lead
          </Link>
        </div>
      ) : null}
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="rounded-[18px] bg-white/80 px-4 py-3 ring-1 ring-[color:var(--line)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{lead.name}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                {leadStatusLabel(lead.status as LeadStatus)} · {leadSourceChannelLabel(lead.sourceChannel as LeadSourceChannel)} ·{" "}
                {lead.requestedService}
              </p>
            </div>
            <Link
              href="/crm"
              className="text-xs font-semibold text-[color:var(--accent-deep)] hover:underline"
            >
              Ver en CRM →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultadosTab({ clientName }: { clientName: string }) {
  return (
    <div className="rounded-[20px] bg-white/70 px-5 py-6 ring-1 ring-[color:var(--line)]">
      <p className="text-sm text-[color:var(--muted)]">
        Los resultados consolidados por canal (Facebook, Google Ads, WhatsApp)
        están disponibles en la vista de resultados del cliente.
      </p>
      <p className="mt-3 text-xs text-[color:var(--muted)]">
        Próximamente: este tab reutilizará el bloque de resultados del portal
        del cliente filtrado por {clientName}.
      </p>
    </div>
  );
}

// ─── Vista principal ─────────────────────────────────────────────────────────

export function ClientDetailView({
  client,
  isOperator,
  briefs,
  quotations,
  assets,
  leads
}: {
  client: ClientDetail;
  isOperator: boolean;
  briefs: BriefSummary[];
  quotations: Quotation[];
  assets: AssetWorkspace[];
  leads: Lead[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("briefs");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const counts: Record<TabKey, number> = {
    briefs: briefs.length,
    cotizaciones: quotations.length,
    activos: assets.length,
    crm: leads.length,
    resultados: 0
  };

  return (
    <div className="space-y-5">
      <section className="panel rounded-[28px] px-6 py-6 ring-1 ring-[color:var(--line)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Detalle del cliente
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
              {client.name}
            </h1>
            {client.legalName ? (
              <p className="mt-1 text-sm text-[color:var(--muted)]">{client.legalName}</p>
            ) : null}
            <p
              className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]"
              data-testid="client-detail-created-at"
            >
              {client.createdAt
                ? `Creado: ${formatClientCreatedAt(client.createdAt) ?? "Fecha no disponible"}`
                : "Fecha no disponible"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ring-1 ${STATUS_BADGE_CLASS[client.status]}`}
            >
              {CLIENT_STATUS_LABELS[client.status]}
            </span>
            {isOperator ? (
              <>
                <Link
                  href={`/clientes/${client.id}/editar`}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-[color:var(--line)] transition hover:bg-slate-50"
                >
                  Editar
                </Link>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50"
                >
                  Eliminar
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[18px] bg-white/80 px-4 py-3 ring-1 ring-[color:var(--line)]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">Contacto</p>
            <p className="mt-1 text-sm">{client.primaryContactName ?? "—"}</p>
          </div>
          <div className="rounded-[18px] bg-white/80 px-4 py-3 ring-1 ring-[color:var(--line)]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">Email</p>
            <p className="mt-1 text-sm">{client.primaryContactEmail ?? "—"}</p>
          </div>
          <div className="rounded-[18px] bg-white/80 px-4 py-3 ring-1 ring-[color:var(--line)]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">WhatsApp</p>
            <p className="mt-1 text-sm">{client.primaryContactWhatsapp ?? "—"}</p>
          </div>
        </div>

        {client.notes ? (
          <div className="mt-3 rounded-[18px] bg-white/80 px-4 py-3 ring-1 ring-[color:var(--line)]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">Notas</p>
            <p className="mt-1 text-sm leading-6">{client.notes}</p>
          </div>
        ) : null}

        {/* IMPL-20260613-01: Brand Kit del cliente (logo) */}
        <div className="mt-3" data-testid="brand-kit-section">
          <BrandKitLogoUploader
            clientId={client.id}
            isOperator={isOperator}
            brandKit={client.brandKit}
          />
        </div>
      </section>

      <nav className="flex flex-wrap items-center gap-1 rounded-full bg-white/70 p-1 ring-1 ring-[color:var(--line)]">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
              tab === key
                ? "bg-slate-900 text-white"
                : "text-[color:var(--muted)] hover:bg-white"
            }`}
            aria-pressed={tab === key}
          >
            {TAB_LABELS[key]} ({counts[key]})
          </button>
        ))}
      </nav>

      <section className="panel rounded-[24px] px-5 py-5 ring-1 ring-[color:var(--line)]">
        {tab === "briefs" ? (
          <BriefsTab briefs={briefs} isOperator={isOperator} clientId={client.id} />
        ) : null}
        {tab === "cotizaciones" ? (
          <QuotationsTab quotations={quotations} isOperator={isOperator} clientId={client.id} />
        ) : null}
        {tab === "activos" ? (
          <AssetsTab assets={assets} isOperator={isOperator} clientId={client.id} />
        ) : null}
        {tab === "crm" ? (
          <CrmTab leads={leads} isOperator={isOperator} clientId={client.id} />
        ) : null}
        {tab === "resultados" ? <ResultadosTab clientName={client.name} /> : null}
      </section>

      {showDeleteModal ? (
        <DeleteClientModal
          clientId={client.id}
          clientName={client.name}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => {
            setShowDeleteModal(false);
            router.push("/clientes");
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
