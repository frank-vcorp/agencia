/**
 * IMPL-20260615-39
 * Respaldo: PROYECTO.md (UI listado de briefs)
 *
 * Listado de briefs del tenant con acciones Editar y Eliminar.
 * Componente cliente para poder pedir confirmacion antes de eliminar.
 */
"use client";

import Link from "next/link";

export type BriefListItem = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  project_id: string | null;
  status: string;
  source_channel: string;
  current_version_number: number;
  active_version_id: string | null;
  created_at: string;
  updated_at: string;
};

type DeleteAction = (formData: FormData) => void | Promise<void>;

export function BriefsListSection({
  briefs,
  activeBriefId,
  deleteAction
}: {
  briefs: BriefListItem[];
  activeBriefId?: string;
  deleteAction: DeleteAction;
}) {
  return (
    <section className="panel rounded-[30px] px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Briefs del tenant</p>
          <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
            {briefs.length} {briefs.length === 1 ? "brief" : "briefs"} disponibles
          </h2>
        </div>
        <p className="text-[11px] text-[color:var(--muted)]">
          Selecciona uno para abrirlo, edita su resumen o eliminelo.
        </p>
      </div>

      {briefs.length === 0 ? (
        <p className="mt-4 rounded-[16px] bg-white/70 px-4 py-4 text-sm text-[color:var(--muted)] ring-1 ring-[color:var(--line)]">
          El tenant aun no tiene briefs registrados.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {briefs.map((row) => {
            const isActive = row.id === activeBriefId;
            return (
              <li
                key={row.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-[16px] px-4 py-2.5 ring-1 ${
                  isActive
                    ? "bg-[color:var(--accent-soft)] ring-[color:rgba(200,93,39,0.25)]"
                    : "bg-white/80 ring-[color:var(--line)]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    Brief {row.id.slice(0, 8)}…
                    {isActive ? (
                      <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[color:var(--accent-deep)] ring-1 ring-[color:rgba(200,93,39,0.25)]">
                        Activo
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    {row.status} · v{row.current_version_number} · {row.source_channel} ·{" "}
                    {new Date(row.updated_at).toLocaleString("es-ES")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
