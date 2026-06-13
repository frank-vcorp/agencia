"use client";

/**
 * IMPL-ARCH-20260528-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-05_directorio_clientes_operador_v1.md
 * IMPL-ARCH-20260612-05
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-05_gestion_clientes_crud_detalle_entidades_relacionadas.md
 *  - Botón "Nuevo cliente" (solo operador).
 *  - Acciones por tarjeta: Ver detalle, Editar, Eliminar (Editar/Eliminar solo operador).
 *  - Modal de confirmación para eliminar con tipeo del nombre (form action con
 *    server action `deleteClientAction`).
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formatClientCreatedAt } from "@/lib/client-portal";
import type { ClientDirectory, ClientStatus } from "@/lib/clients";
import { CLIENT_STATUS_LABELS } from "@/lib/clients";
import { deleteClientAction } from "@/app/clientes/actions";

const STATUS_BADGE_CLASS: Record<ClientStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  prospect: "bg-amber-50 text-amber-700 ring-amber-200",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200"
};

function truncateNotes(value: string): string {
  if (value.length <= 80) return value;
  return `${value.slice(0, 77)}...`;
}

function toWhatsappHandle(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return `+${digits}`;
}

function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-2 rounded-lg bg-[color:var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)] transition hover:opacity-80"
    >
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

// ─── Modal de confirmación para eliminar ───────────────────────────────────────

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

// ─── Vista principal ───────────────────────────────────────────────────────────

export function ClientListView({
  directory,
  portalBaseUrl,
  isOperator
}: {
  directory: ClientDirectory;
  portalBaseUrl: string;
  isOperator: boolean;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deletingClient = deletingId
    ? directory.clients.find((c) => c.id === deletingId) ?? null
    : null;

  if (directory.isEmpty) {
    return (
      <section className="panel rounded-[28px] px-6 py-8 ring-1 ring-[color:var(--line)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
              Directorio de clientes
            </h2>
            <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
              Aún no hay clientes registrados.
            </p>
          </div>
          {isOperator ? (
            <Link
              href="/clientes/nuevo"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent-deep)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <span aria-hidden>+</span>
              Nuevo cliente
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="panel rounded-[30px] px-6 py-6 ring-1 ring-[color:var(--line)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
              Directorio de clientes
            </h2>
            <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
              {directory.clients.length} cliente{directory.clients.length !== 1 ? "s" : ""} en el tenant {directory.tenantSlug}.
            </p>
          </div>
          {isOperator ? (
            <Link
              href="/clientes/nuevo"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent-deep)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
              data-testid="new-client-button"
            >
              <span aria-hidden>+</span>
              Nuevo cliente
            </Link>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        {directory.clients.map((client) => {
          const badgeClass = STATUS_BADGE_CLASS[client.status];
          const whatsappHandle = client.primaryContactWhatsapp
            ? toWhatsappHandle(client.primaryContactWhatsapp)
            : null;
          const briefUrl = client.recentProjectId
            ? `${portalBaseUrl}/cliente/proyecto/${client.recentProjectId}`
            : null;

          return (
            <article
              key={client.id}
              className="panel rounded-[28px] px-5 py-5 ring-1 ring-[color:var(--line)]"
              data-testid="client-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-[family-name:var(--font-heading)] text-base font-bold tracking-tight">
                    <Link
                      href={`/cliente/${client.id}`}
                      className="transition hover:text-[color:var(--accent-deep)]"
                    >
                      {client.name}
                    </Link>
                  </h3>
                  {client.legalName ? (
                    <p className="mt-1 text-xs text-[color:var(--muted)]">({client.legalName})</p>
                  ) : null}
                  <p
                    className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]"
                    data-testid="client-created-at"
                  >
                    {client.createdAt
                      ? `Creado: ${formatClientCreatedAt(client.createdAt) ?? "Fecha no disponible"}`
                      : "Fecha no disponible"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ring-1 ${badgeClass}`}
                  >
                    {CLIENT_STATUS_LABELS[client.status]}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm leading-6">
                {client.primaryContactName ? (
                  <p>
                    <span className="text-[color:var(--muted)]">Contacto:</span> {client.primaryContactName}
                  </p>
                ) : null}

                {client.primaryContactEmail ? (
                  <p>
                    <span className="text-[color:var(--muted)]">Email:</span>{" "}
                    <a
                      href={`mailto:${client.primaryContactEmail}`}
                      className="font-medium text-[color:var(--accent)] underline-offset-2 transition hover:underline"
                    >
                      {client.primaryContactEmail}
                    </a>
                  </p>
                ) : null}

                {client.primaryContactWhatsapp && whatsappHandle ? (
                  <p>
                    <span className="text-[color:var(--muted)]">WhatsApp:</span>{" "}
                    <a
                      href={`https://wa.me/${whatsappHandle}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-[color:var(--accent)] underline-offset-2 transition hover:underline"
                    >
                      {client.primaryContactWhatsapp}
                    </a>
                  </p>
                ) : null}

                {client.notes ? (
                  <p className="text-[color:var(--muted)]">Notas: {truncateNotes(client.notes)}</p>
                ) : null}

                {briefUrl ? (
                  <div className="mt-3 rounded-[14px] bg-slate-50 px-3 py-2.5 ring-1 ring-[color:var(--line)]">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      URL del panel del cliente
                    </p>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="truncate text-xs text-slate-700">{briefUrl}</span>
                      <CopyUrlButton url={briefUrl} />
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-[color:var(--muted)]">Sin proyecto activo — la URL del panel estará disponible al crear un proyecto.</p>
                )}
              </div>

              {/* Acciones */}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[color:var(--line)] pt-3">
                <Link
                  href={`/cliente/${client.id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800"
                  data-testid="view-detail-button"
                >
                  Ver detalle
                </Link>
                {isOperator ? (
                  <>
                    <Link
                      href={`/clientes/${client.id}/editar`}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-[color:var(--line)] transition hover:bg-slate-50"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeletingId(client.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      {deletingClient ? (
        <DeleteClientModal
          clientId={deletingClient.id}
          clientName={deletingClient.name}
          onClose={() => setDeletingId(null)}
          onDeleted={() => {
            setDeletingId(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
