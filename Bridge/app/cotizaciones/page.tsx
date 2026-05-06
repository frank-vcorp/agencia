/**
 * IMPL-20260505-23
 * Respaldo: context/COTIZACIONES_VERSIONADAS_V1.md, context/SPECs/SPEC_ARCH-20260505-23_cotizaciones_versionadas_v1.md, context/CLIENTS_Y_PROJECTS_V1.md, PROYECTO.md
 */
import { revalidatePath } from "next/cache";

import {
  createQuotationDraftVersion,
  getQuotationWorkspace,
  nextVersionNumber,
  quotationStatusLabel,
  setQuotationActiveVersion,
  versionAdminStatusLabel,
  type QuotationVersion
} from "@/lib/quotations";

async function createDraftVersionAction(formData: FormData) {
  "use server";

  const quotationId = String(formData.get("quotationId") ?? "").trim();
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const versionNumber = Number(formData.get("versionNumber") ?? "1");
  const title = String(formData.get("title") ?? "").trim();
  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();

  if (!quotationId || !tenantId || !title) {
    return;
  }

  await createQuotationDraftVersion(quotationId, tenantId, title, bodyMarkdown, versionNumber);
  revalidatePath("/cotizaciones");
}

async function setActiveVersionAction(formData: FormData) {
  "use server";

  const quotationId = String(formData.get("quotationId") ?? "").trim();
  const versionId = String(formData.get("versionId") ?? "").trim();

  if (!quotationId || !versionId) {
    return;
  }

  await setQuotationActiveVersion(quotationId, versionId);
  revalidatePath("/cotizaciones");
}

function adminStatusBadgeClass(status: QuotationVersion["adminStatus"]): string {
  if (status === "approved") {
    return "bg-[color:var(--accent-soft)] text-[color:var(--accent-deep)] ring-[color:rgba(200,93,39,0.18)]";
  }

  if (status === "in_review") {
    return "bg-yellow-50 text-yellow-700 ring-yellow-200";
  }

  if (status === "rejected") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (status === "superseded") {
    return "bg-gray-100 text-gray-500 ring-gray-200";
  }

  return "bg-white/80 text-[color:var(--muted)] ring-[color:var(--line)]";
}

export default async function CotizacionesPage() {
  const workspace = await getQuotationWorkspace();
  const nextNum = workspace ? nextVersionNumber(workspace.versions) : 1;

  if (!workspace) {
    return (
      <div className="space-y-6">
        <section className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
            Cotizaciones versionadas V1
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
            Aun no hay cotizacion activa para este tenant
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[color:var(--muted)]">
            Ejecuta la migracion <code>20260506000000_quotations_versionadas_v1.sql</code> en Supabase para sembrar la cotizacion demo de Vectoria, o crea una cotizacion desde el project activo.
          </p>
        </section>
      </div>
    );
  }

  const { quotation, activeVersion, versions } = workspace;
  const summary = activeVersion?.commercialSummaryJson;

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="panel rounded-[30px] px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                Cotizacion activa — {quotationStatusLabel(quotation.status)}
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                {activeVersion?.title ?? "Sin version vigente"}
              </h1>
              <p className="mt-2 max-w-3xl text-base leading-7 text-[color:var(--muted)]">
                Propuesta comercial versionada ligada al project activo. El cliente solo ve la version vigente.
              </p>
            </div>
            <div
              className={`rounded-[24px] px-4 py-4 ring-1 ${adminStatusBadgeClass(activeVersion?.adminStatus ?? "draft")}`}
            >
              <div className="text-[11px] uppercase tracking-[0.22em]">Estado administrativo</div>
              <div className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold">
                {versionAdminStatusLabel(activeVersion?.adminStatus ?? "draft")}
              </div>
              {activeVersion ? (
                <p className="mt-2 text-sm leading-6">Version {activeVersion.versionNumber}</p>
              ) : null}
            </div>
          </div>

          {activeVersion ? (
            <div className="mt-6 rounded-[24px] bg-white/80 px-5 py-5 ring-1 ring-[color:var(--line)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
                Propuesta vigente
              </div>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-7">
                {activeVersion.bodyMarkdown}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] bg-white/80 px-5 py-5 ring-1 ring-[color:var(--line)]">
              <p className="text-sm text-[color:var(--muted)]">
                No hay version vigente. Marca una version como vigente desde el historial.
              </p>
            </div>
          )}
        </article>

        <aside className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
            Resumen comercial
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
            Datos del caso activo
          </h2>

          {summary ? (
            <div className="mt-5 space-y-3">
              <div className="rounded-[24px] bg-[color:var(--accent-soft)] px-4 py-4 ring-1 ring-[color:rgba(200,93,39,0.18)]">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--accent-deep)]">
                  Total estimado
                </div>
                <div className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold text-[color:var(--accent-deep)]">
                  {summary.totalEstimado}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
                    Plazo
                  </div>
                  <div className="mt-2 font-medium">{summary.plazo}</div>
                </div>
                <div className="rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
                    Alcance
                  </div>
                  <div className="mt-2 font-medium">{summary.alcance}</div>
                </div>
              </div>
              {summary.incluye?.length ? (
                <div className="rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
                    Incluye
                  </div>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6">
                    {summary.incluye.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {summary.nota ? (
                <div className="rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
                    Nota
                  </div>
                  <p className="mt-2 text-sm leading-6">{summary.nota}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-5 text-sm text-[color:var(--muted)]">
              Sin resumen comercial en la version vigente.
            </p>
          )}
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
            Historial de versiones
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
            {versions.length} {versions.length === 1 ? "version" : "versiones"}
          </h2>

          <div className="mt-5 space-y-3">
            {versions.map((version) => {
              const isActive = version.id === quotation.activeVersionId;

              return (
                <div
                  key={version.id}
                  className={`rounded-[24px] px-4 py-4 ring-1 ${
                    isActive
                      ? "bg-[color:var(--accent-soft)] ring-[color:rgba(200,93,39,0.18)]"
                      : "bg-white/80 ring-[color:var(--line)]"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                        V{version.versionNumber} {isActive ? "· VIGENTE" : ""}
                      </div>
                      <div className="mt-1 font-medium leading-6">{version.title}</div>
                      <div className="mt-1 text-xs text-[color:var(--muted)]">
                        {versionAdminStatusLabel(version.adminStatus)} ·{" "}
                        {new Date(version.createdAt).toLocaleDateString("es-ES")}
                      </div>
                    </div>
                    {!isActive ? (
                      <form action={setActiveVersionAction} className="sm:shrink-0">
                        <input name="quotationId" type="hidden" value={quotation.id} />
                        <input name="versionId" type="hidden" value={version.id} />
                        <button
                          className="w-full rounded-full bg-[color:var(--ink)] px-4 py-2 text-xs font-semibold text-white sm:w-auto"
                          type="submit"
                        >
                          Marcar vigente
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
            Nueva version
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
            Crear version borrador
          </h2>
          <p className="mt-2 text-base leading-7 text-[color:var(--muted)]">
            La nueva version queda en estado borrador hasta que el operador la marque como vigente.
          </p>

          <form action={createDraftVersionAction} className="mt-5 space-y-4">
            <input name="quotationId" type="hidden" value={quotation.id} />
            <input name="tenantId" type="hidden" value={quotation.tenantId} />
            <input name="versionNumber" type="hidden" value={nextNum} />

            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="title">
                Titulo de la version
              </label>
              <input
                className="w-full rounded-[24px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm outline-none"
                id="title"
                name="title"
                placeholder={`Ej. Propuesta V${nextNum} — Ajuste de alcance`}
                required
                type="text"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="bodyMarkdown">
                Propuesta (markdown)
              </label>
              <textarea
                className="min-h-32 w-full rounded-[24px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm outline-none"
                id="bodyMarkdown"
                name="bodyMarkdown"
                placeholder="## Propuesta&#10;&#10;Describe el alcance, entregables y condiciones comerciales de esta version."
              />
            </div>

            <button
              className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white"
              type="submit"
            >
              Crear version V{nextNum}
            </button>
          </form>
        </article>
      </section>
    </div>
  );
}
