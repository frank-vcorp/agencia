/**
 * IMPL-20260616-01
 * Respaldo: ARCH-20260616-01 — listado de briefs en /briefs con cliente,
 * proyecto, fecha y acciones.
 *
 * Tabla cliente con TODOS los briefs del tenant, mostrada ARRIBA del
 * detalle actual en `/briefs`. El operador puede editar (link a
 * `/briefs?id=<uuid>#edicion-resumen`) o eliminar (form con server action
 * + confirm nativo) cualquier fila sin necesidad de entrar primero por el
 * cliente.
 *
 * FIX-20260617-02
 * Respaldo: CHK_2026-06-17_1330_incidente_build_vercel_fix_emails_v1.md
 * Se elimina el formateo en runtime de la fecha (causa del hydration
 * mismatch / React error #418) y se consume `createdAtLabel` ya
 * pre-formateado en UTC desde el server. Se agrega
 * `suppressHydrationWarning` a la celda de fecha como segunda red de
 * seguridad.
 */
"use client";

import Link from "next/link";

import type { EnrichedBriefListItem } from "@/lib/briefing";

type DeleteAction = (formData: FormData) => void | Promise<void>;

function truncateId(value: string | null): string {
  if (!value) {
    return "—";
  }
  return `${value.slice(0, 8)}…`;
}

function formatStatusLabel(value: string): string {
  return value.replaceAll("_", " ");
}

export function BriefsListTable({
  briefs,
  activeBriefId,
  deleteAction
}: {
  briefs: EnrichedBriefListItem[];
  activeBriefId?: string;
  deleteAction: DeleteAction;
}) {
  return (
    <section className="panel rounded-[30px] px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Briefs del tenant</p>
          <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
            {briefs.length} {briefs.length === 1 ? "brief disponible" : "briefs disponibles"}
          </h2>
        </div>
        <p className="text-[11px] text-[color:var(--muted)]">
          Vista global del tenant. Edita o elimina cualquier brief sin pasar por el cliente.
        </p>
      </div>

      {briefs.length === 0 ? (
        <p className="mt-4 rounded-[16px] bg-white/70 px-4 py-4 text-sm text-[color:var(--muted)] ring-1 ring-[color:var(--line)]">
          El tenant aun no tiene briefs registrados.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                <th className="border-b border-[color:var(--line)] px-3 py-2 font-medium">Cliente</th>
                <th className="border-b border-[color:var(--line)] px-3 py-2 font-medium">ID del cliente</th>
                <th className="border-b border-[color:var(--line)] px-3 py-2 font-medium">Proyecto</th>
                <th className="border-b border-[color:var(--line)] px-3 py-2 font-medium">Fecha de creacion</th>
                <th className="border-b border-[color:var(--line)] px-3 py-2 font-medium">Estado</th>
                <th className="border-b border-[color:var(--line)] px-3 py-2 font-medium">Version</th>
                <th className="border-b border-[color:var(--line)] px-3 py-2 font-medium">Canal</th>
                <th className="border-b border-[color:var(--line)] px-3 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {briefs.map((row) => {
                const isActive = row.id === activeBriefId;
                const rowClasses = isActive
                  ? "bg-[color:var(--accent-soft)] ring-1 ring-inset ring-[color:rgba(200,93,39,0.25)]"
                  : "bg-white/80 ring-1 ring-inset ring-[color:var(--line)] hover:bg-stone-50";
                return (
                  <tr key={row.id} className={rowClasses}>
                    <td className="max-w-[200px] truncate border-b border-[color:var(--line)] px-3 py-2 text-sm font-medium">
                      {row.clientName ?? "Sin cliente"}
                    </td>
                    <td className="border-b border-[color:var(--line)] px-3 py-2 font-mono text-[11px] text-[color:var(--muted)]">
                      {truncateId(row.client_id)}
                    </td>
                    <td className="max-w-[200px] truncate border-b border-[color:var(--line)] px-3 py-2 text-sm">
                      {row.projectName ?? "Sin proyecto"}
                    </td>
                    <td
                      suppressHydrationWarning
                      className="border-b border-[color:var(--line)] px-3 py-2 text-[11px] text-[color:var(--muted)]"
                    >
                      {row.createdAtLabel}
                    </td>
                    <td className="border-b border-[color:var(--line)] px-3 py-2 text-[11px] capitalize">
                      {formatStatusLabel(row.status)}
                    </td>
                    <td className="border-b border-[color:var(--line)] px-3 py-2 text-[11px] font-semibold">
                      v{row.current_version_number}
                    </td>
                    <td className="border-b border-[color:var(--line)] px-3 py-2 text-[11px] text-[color:var(--muted)]">
                      {row.source_channel || "—"}
                    </td>
                    <td className="border-b border-[color:var(--line)] px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/briefs?id=${row.id}#edicion-resumen`}
                          className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold ring-1 ring-[color:var(--line)] hover:bg-stone-50"
                        >
                          Editar
                        </Link>
                        <form action={deleteAction} className="inline">
                          <input type="hidden" name="tenantId" value={row.tenant_id} />
                          <input type="hidden" name="briefId" value={row.id} />
                          <input
                            type="hidden"
                            name="confirmationText"
                            value={`ELIMINAR BRIEF ${row.id}`}
                          />
                          <input type="hidden" name="requestedByLabel" value="operador" />
                          <input type="hidden" name="approvedByLabel" value="operador" />
                          <input type="hidden" name="reason" value="otro" />
                          <button
                            type="submit"
                            className="rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                            onClick={(event) => {
                              if (
                                typeof window !== "undefined" &&
                                !window.confirm(
                                  `Vas a eliminar el brief ${row.id.slice(0, 8)}… y todas sus versiones. Esta accion no se puede deshacer.`
                                )
                              ) {
                                event.preventDefault();
                              }
                            }}
                          >
                            Eliminar
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
