/**
 * IMPL-20260505-24
 * Respaldo: context/ACTIVOS_OPERABLES_V1.md, context/CATALOGO_ACTIVOS_V1.md,
 *           context/SPECs/SPEC_ARCH-20260505-24_activos_vinculados_a_cotizacion_y_project_v1.md
 */
import { revalidatePath } from "next/cache";

import {
  APPLICATION_CODES,
  FORMAT_CODES,
  PIECE_TYPE_CODES,
  PLACEMENT_CODES,
  applicationLabel,
  assetStatusLabel,
  createAsset,
  formatLabel,
  getAssetsForDefaultTenant,
  getContextIdsForDefaultTenant,
  pieceTypeLabel,
  placementLabel,
  type AssetStatus
} from "@/lib/assets";

async function createAssetAction(formData: FormData) {
  "use server";

  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const quotationId = String(formData.get("quotationId") ?? "").trim() || null;
  const applicationCode = String(formData.get("applicationCode") ?? "").trim();
  const pieceTypeCode = String(formData.get("pieceTypeCode") ?? "").trim();
  const placementCode = String(formData.get("placementCode") ?? "").trim();
  const formatCode = String(formData.get("formatCode") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const promptText = String(formData.get("promptText") ?? "").trim() || undefined;

  if (!tenantId || !clientId || !projectId || !applicationCode || !pieceTypeCode || !placementCode || !formatCode || !title) {
    return;
  }

  await createAsset({
    tenantId,
    clientId,
    projectId,
    quotationId,
    applicationCode,
    pieceTypeCode,
    placementCode,
    formatCode,
    title,
    promptText
  });
  revalidatePath("/activos");
}

function statusBadgeClass(status: AssetStatus): string {
  if (status === "approved" || status === "delivered") {
    return "bg-[color:var(--accent-soft)] text-[color:var(--accent-deep)] ring-[color:rgba(200,93,39,0.18)]";
  }
  if (status === "in_progress") {
    return "bg-yellow-50 text-yellow-700 ring-yellow-200";
  }
  if (status === "in_review") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }
  if (status === "archived") {
    return "bg-gray-100 text-gray-500 ring-gray-200";
  }
  return "bg-white/80 text-[color:var(--muted)] ring-[color:var(--line)]";
}

export default async function ActivosPage() {
  const [workspaces, ctx] = await Promise.all([
    getAssetsForDefaultTenant(),
    getContextIdsForDefaultTenant()
  ]);

  const canCreate = Boolean(ctx.tenantId && ctx.clientId && ctx.projectId);

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <section className="panel rounded-[30px] px-6 py-6">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
          Activos operables V1
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
          {workspaces.length === 0
            ? "Sin activos registrados aun"
            : `${workspaces.length} ${workspaces.length === 1 ? "activo" : "activos"} del proyecto`}
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-[color:var(--muted)]">
          Piezas de produccion ligadas al project activo y a la cotizacion vigente. Cada activo tiene clasificacion de catalogo y prompt operativo inicial.
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Lista de activos */}
        <section className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
            Activos del proyecto
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
            Lista de piezas
          </h2>

          {workspaces.length === 0 ? (
            <div className="mt-6 rounded-[24px] bg-white/80 px-5 py-5 ring-1 ring-[color:var(--line)]">
              <p className="text-sm text-[color:var(--muted)]">
                Aun no hay activos. Crea el primero desde el formulario o ejecuta la migracion{" "}
                <code>20260506020000_assets_and_prompt_versions_v1.sql</code> para cargar el activo demo de Vectoria.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {workspaces.map(({ asset, activePrompt }) => (
                <article
                  key={asset.id}
                  className="rounded-[24px] bg-white/80 px-5 py-5 ring-1 ring-[color:var(--line)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium leading-6">{asset.title}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                        {applicationLabel(asset.applicationCode)} · {pieceTypeLabel(asset.pieceTypeCode)} · {placementLabel(asset.placementCode)} · {formatLabel(asset.formatCode)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-[16px] px-3 py-1 text-[11px] uppercase tracking-[0.18em] ring-1 ${statusBadgeClass(asset.status)}`}
                    >
                      {assetStatusLabel(asset.status)}
                    </span>
                  </div>

                  {activePrompt ? (
                    <div className="mt-4 rounded-[18px] bg-[color:var(--accent-soft)] px-4 py-4 ring-1 ring-[color:rgba(200,93,39,0.12)]">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">
                        Prompt vigente — v{activePrompt.versionNumber}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--accent-deep)]">
                        {activePrompt.promptText.length > 320
                          ? activePrompt.promptText.slice(0, 320) + "…"
                          : activePrompt.promptText}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[18px] bg-white/60 px-4 py-3 ring-1 ring-[color:var(--line)]">
                      <p className="text-[11px] text-[color:var(--muted)]">Sin prompt vigente aun.</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Formulario de creación guiada */}
        <aside className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
            Crear activo
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
            Seleccion guiada
          </h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            Elige desde catalogo. El activo queda ligado al project y cotizacion activos.
          </p>

          {!canCreate ? (
            <div className="mt-6 rounded-[24px] bg-white/80 px-5 py-5 ring-1 ring-[color:var(--line)]">
              <p className="text-sm text-[color:var(--muted)]">
                Se requiere un tenant, client y project activos para crear activos. Verifica las migraciones anteriores.
              </p>
            </div>
          ) : (
            <form action={createAssetAction} className="mt-6 space-y-4">
              <input type="hidden" name="tenantId" value={ctx.tenantId!} />
              <input type="hidden" name="clientId" value={ctx.clientId!} />
              <input type="hidden" name="projectId" value={ctx.projectId!} />
              {ctx.quotationId ? (
                <input type="hidden" name="quotationId" value={ctx.quotationId} />
              ) : null}

              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Aplicativo
                </label>
                <select
                  name="applicationCode"
                  required
                  defaultValue=""
                  className="mt-2 w-full rounded-[18px] bg-white/80 px-4 py-3 text-sm ring-1 ring-[color:var(--line)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
                >
                  <option value="" disabled>
                    Selecciona aplicativo
                  </option>
                  {APPLICATION_CODES.map((code) => (
                    <option key={code} value={code}>
                      {applicationLabel(code)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Tipo de pieza
                </label>
                <select
                  name="pieceTypeCode"
                  required
                  defaultValue=""
                  className="mt-2 w-full rounded-[18px] bg-white/80 px-4 py-3 text-sm ring-1 ring-[color:var(--line)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
                >
                  <option value="" disabled>
                    Selecciona tipo de pieza
                  </option>
                  {PIECE_TYPE_CODES.map((code) => (
                    <option key={code} value={code}>
                      {pieceTypeLabel(code)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Placement o uso
                </label>
                <select
                  name="placementCode"
                  required
                  defaultValue=""
                  className="mt-2 w-full rounded-[18px] bg-white/80 px-4 py-3 text-sm ring-1 ring-[color:var(--line)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
                >
                  <option value="" disabled>
                    Selecciona placement
                  </option>
                  {PLACEMENT_CODES.map((code) => (
                    <option key={code} value={code}>
                      {placementLabel(code)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Formato tecnico
                </label>
                <select
                  name="formatCode"
                  required
                  defaultValue=""
                  className="mt-2 w-full rounded-[18px] bg-white/80 px-4 py-3 text-sm ring-1 ring-[color:var(--line)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
                >
                  <option value="" disabled>
                    Selecciona formato
                  </option>
                  {FORMAT_CODES.map((code) => (
                    <option key={code} value={code}>
                      {formatLabel(code)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Titulo del activo
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="Ej: Imagen lanzamiento — Feed Instagram"
                  className="mt-2 w-full rounded-[18px] bg-white/80 px-4 py-3 text-sm ring-1 ring-[color:var(--line)] placeholder:text-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Prompt inicial (opcional)
                </label>
                <textarea
                  name="promptText"
                  rows={4}
                  placeholder="Describe el activo, estilo visual, mensaje principal y CTA..."
                  className="mt-2 w-full resize-none rounded-[18px] bg-white/80 px-4 py-3 text-sm ring-1 ring-[color:var(--line)] placeholder:text-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-full rounded-[18px] bg-[color:var(--accent-deep)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)] focus:ring-offset-2"
              >
                Crear activo
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}

