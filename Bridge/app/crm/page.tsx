/**
 * IMPL-20260505-26
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-26_crm_ligero_operativo_y_seguimiento_minimo_v1.md
 * IMPL-20260505-27
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-27_vinculacion_explicita_lead_client_project_v1.md
 */
import { revalidatePath } from "next/cache";

import {
  LEAD_SOURCE_CHANNELS,
  addLeadNote,
  createLeadForDefaultTenant,
  getCrmLinkOptionsForDefaultTenant,
  getLeadWorkspace,
  getLeadsForDefaultTenant,
  leadSourceChannelLabel,
  leadStatusLabel,
  nextLeadStatuses,
  updateLeadStatus,
  type LeadSourceChannel,
  type LeadStatus
} from "@/lib/crm";
import { getBriefWorkspace } from "@/lib/briefing";

// ─── Server Actions ───────────────────────────────────────────────────────────

async function createLeadAction(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const sourceChannel = String(formData.get("sourceChannel") ?? "").trim() as LeadSourceChannel;
  const requestedService = String(formData.get("requestedService") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "").trim() || null;
  const projectId = String(formData.get("projectId") ?? "").trim() || null;

  if (!name || !sourceChannel) return;

  await createLeadForDefaultTenant({ name, sourceChannel, requestedService, clientId, projectId });
  revalidatePath("/crm");
}

async function updateStatusAction(formData: FormData) {
  "use server";

  const leadId = String(formData.get("leadId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as LeadStatus;

  if (!leadId || !status) return;

  await updateLeadStatus(leadId, status);
  revalidatePath("/crm");
}

async function addNoteAction(formData: FormData) {
  "use server";

  const leadId = String(formData.get("leadId") ?? "").trim();
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const noteText = String(formData.get("noteText") ?? "").trim();

  if (!leadId || !tenantId || !noteText) return;

  await addLeadNote({ leadId, tenantId, noteText });
  revalidatePath("/crm");
}

// ─── Helpers de estilos ───────────────────────────────────────────────────────

function statusBadgeClass(status: LeadStatus): string {
  if (status === "cerrado_ganado") {
    return "bg-[color:var(--accent-soft)] text-[color:var(--accent-deep)] ring-[color:rgba(200,93,39,0.18)]";
  }
  if (status === "cerrado_perdido") {
    return "bg-slate-100 text-slate-500 ring-slate-200";
  }
  if (status === "propuesta_enviada") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  return "bg-blue-50 text-blue-700 ring-blue-200";
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function CrmPage() {
  const [leads, linkOptions, briefWorkspace] = await Promise.all([
    getLeadsForDefaultTenant(),
    getCrmLinkOptionsForDefaultTenant(),
    getBriefWorkspace()
  ]);

  const workspaces = await Promise.all(leads.map((l) => getLeadWorkspace(l.id)));

  // ─── Defaults del contenedor activo ─────────────────────────────────────────────────
  const activeClientId = briefWorkspace?.container.client?.id ?? null;
  const activeProjectId = briefWorkspace?.container.project?.id ?? null;

  // Lookup rápido para resolver nombres en tarjetas
  const clientMap = Object.fromEntries(linkOptions.clients.map((c) => [c.id, c]));
  const projectMap = Object.fromEntries(linkOptions.projects.map((p) => [p.id, p]));

  const hasClients = linkOptions.clients.length > 0;
  const hasProjects = linkOptions.projects.length > 0;

  return (
    <div className="space-y-8 px-1">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">CRM ligero</p>
          <h1 className="mt-1 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
            Pipeline de leads
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--muted)]">
            Registra oportunidades, mueve estados y deja seguimiento sin depender de chats dispersos.
          </p>
        </div>
        <div className="text-sm text-[color:var(--muted)]">
          {leads.length > 0
            ? `${leads.length} lead${leads.length !== 1 ? "s" : ""} registrado${leads.length !== 1 ? "s" : ""}`
            : "Sin leads aún"}
        </div>
      </div>

      {/* Formulario de alta de lead */}
      <section className="panel rounded-[28px] px-6 py-6">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Nuevo lead</p>
        <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
          Alta mínima de oportunidad
        </h2>
        <form action={createLeadAction} className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]" htmlFor="lead-name">
              Nombre *
            </label>
            <input
              id="lead-name"
              name="name"
              required
              placeholder="Ej. María García — Lanzamiento de marca"
              className="w-full rounded-[14px] border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]" htmlFor="lead-channel">
              Canal de origen *
            </label>
            <select
              id="lead-channel"
              name="sourceChannel"
              required
              className="w-full rounded-[14px] border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
            >
              {LEAD_SOURCE_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {leadSourceChannelLabel(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]" htmlFor="lead-service">
              Servicio solicitado
            </label>
            <input
              id="lead-service"
              name="requestedService"
              placeholder="Ej. Campaña de lanzamiento en Instagram"
              className="w-full rounded-[14px] border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
            />
          </div>
          {/* Selección de cliente y proyecto — IMPL-20260505-27 */}
          {hasClients && (
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]" htmlFor="lead-client">
                Cliente
              </label>
              <select
                id="lead-client"
                name="clientId"
                defaultValue={activeClientId ?? ""}
                className="w-full rounded-[14px] border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
              >
                <option value="">Sin cliente</option>
                {linkOptions.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {hasProjects && (
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]" htmlFor="lead-project">
                Proyecto
              </label>
              <select
                id="lead-project"
                name="projectId"
                defaultValue={activeProjectId ?? ""}
                className="w-full rounded-[14px] border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
              >
                <option value="">Sin proyecto</option>
                {linkOptions.projects.map((p) => {
                  const clientName = clientMap[p.clientId]?.name;
                  return (
                    <option key={p.id} value={p.id}>
                      {clientName ? `${clientName} — ${p.name}` : p.name}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Registrar lead
            </button>
          </div>
        </form>
      </section>

      {/* Lista de leads */}
      {leads.length === 0 ? (
        <section className="panel rounded-[28px] px-6 py-10 text-center">
          <p className="font-[family-name:var(--font-heading)] text-xl font-semibold">Sin leads registrados</p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Usa el formulario de arriba para registrar la primera oportunidad comercial.
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {workspaces.map((ws) => {
            if (!ws) return null;
            const { lead, notes } = ws;
            const nextStatuses = nextLeadStatuses(lead.status);
            const isClosed = lead.status === "cerrado_ganado" || lead.status === "cerrado_perdido";

            return (
              <article key={lead.id} className="panel rounded-[28px] px-6 py-6">
                {/* Cabecera del lead */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold">{lead.name}</h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] ring-1 ${statusBadgeClass(lead.status)}`}
                      >
                        {leadStatusLabel(lead.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      {leadSourceChannelLabel(lead.sourceChannel)}
                      {lead.requestedService ? ` · ${lead.requestedService}` : ""}
                      {lead.clientId && clientMap[lead.clientId]
                        ? ` · Cliente: ${clientMap[lead.clientId].name}`
                        : lead.clientId
                        ? " · Cliente vinculado"
                        : ""}
                      {lead.projectId && projectMap[lead.projectId]
                        ? ` · Proyecto: ${projectMap[lead.projectId].name}`
                        : lead.projectId
                        ? " · Proyecto vinculado"
                        : ""}
                    </p>
                  </div>
                  <p className="text-[11px] text-[color:var(--muted)]">
                    {new Date(lead.createdAt).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </p>
                </div>

                {/* Cambio de estado */}
                {!isClosed && nextStatuses.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">Mover a:</span>
                    {nextStatuses.map((s) => (
                      <form key={s} action={updateStatusAction}>
                        <input type="hidden" name="leadId" value={lead.id} />
                        <input type="hidden" name="status" value={s} />
                        <button
                          type="submit"
                          className="rounded-xl border border-[color:var(--line)] bg-white/70 px-3 py-1 text-[11px] font-medium transition hover:bg-white hover:shadow-sm"
                        >
                          {leadStatusLabel(s)}
                        </button>
                      </form>
                    ))}
                  </div>
                )}

                {/* Notas de seguimiento */}
                {notes.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">Seguimiento</p>
                    {notes.map((note) => (
                      <div key={note.id} className="rounded-[16px] bg-white/60 px-3 py-2.5 ring-1 ring-[color:var(--line)]">
                        <p className="text-sm leading-6">{note.noteText}</p>
                        <p className="mt-0.5 text-[10px] text-[color:var(--muted)]">
                          {new Date(note.createdAt).toLocaleString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Agregar nota */}
                <form action={addNoteAction} className="mt-4 flex gap-2">
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="tenantId" value={lead.tenantId} />
                  <input
                    name="noteText"
                    placeholder="Deja una nota de seguimiento..."
                    className="flex-1 rounded-[14px] border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
                  />
                  <button
                    type="submit"
                    className="rounded-[14px] bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Agregar
                  </button>
                </form>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
