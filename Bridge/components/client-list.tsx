"use client";

/**
 * IMPL-ARCH-20260528-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-05_directorio_clientes_operador_v1.md
 */
import { useState } from "react";

import type { ClientDirectory, ClientStatus } from "@/lib/clients";
import { CLIENT_STATUS_LABELS } from "@/lib/clients";

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

export function ClientListView({
  directory,
  portalBaseUrl
}: {
  directory: ClientDirectory;
  portalBaseUrl: string;
}) {
  if (directory.isEmpty) {
    return (
      <section className="panel rounded-[28px] px-6 py-8 ring-1 ring-[color:var(--line)]">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
          Directorio de clientes
        </h2>
        <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">Aun no hay clientes registrados.</p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="panel rounded-[30px] px-6 py-6 ring-1 ring-[color:var(--line)]">
        <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
          Directorio de clientes
        </h2>
        <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
          {directory.clients.length} cliente{directory.clients.length !== 1 ? "s" : ""} en el tenant {directory.tenantSlug}.
        </p>
      </section>

      <section className="space-y-4">
        {directory.clients.map((client) => {
          const badgeClass = STATUS_BADGE_CLASS[client.status];
          const whatsappHandle = client.primaryContactWhatsapp
            ? toWhatsappHandle(client.primaryContactWhatsapp)
            : null;
          const briefUrl = client.recentProjectId
            ? `${portalBaseUrl}/cliente/brief/${client.recentProjectId}`
            : null;

          return (
            <article
              key={client.id}
              className="panel rounded-[28px] px-5 py-5 ring-1 ring-[color:var(--line)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-[family-name:var(--font-heading)] text-base font-bold tracking-tight">
                    {client.name}
                  </h3>
                  {client.legalName ? (
                    <p className="mt-1 text-xs text-[color:var(--muted)]">({client.legalName})</p>
                  ) : null}
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ring-1 ${badgeClass}`}
                >
                  {CLIENT_STATUS_LABELS[client.status]}
                </span>
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
            </article>
          );
        })}
      </section>
    </div>
  );
}
