/**
 * IMPL-20260506-45
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-45_vista_detallada_activo_creativo_y_propuestas.md
 *
 * Vista detallada del activo creativo — unidad real de trabajo en Bridge.
 * Accesible desde /activos y desde /disenador.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  actorRoleLabel,
  appendAssetMessage,
  formatMessageTimestamp
} from "@/lib/chat";
import {
  applicationLabel,
  assetStatusLabel,
  formatLabel,
  pieceTypeLabel,
  placementLabel,
  type AssetStatus
} from "@/lib/assets";
import { getFullAssetDetail, type ReviewState } from "@/lib/asset-detail";

// ─── Helpers de presentacion ──────────────────────────────────────────────────

const REVIEW_STATE_COLORS: Record<AssetStatus, string> = {
  draft: "bg-slate-50 text-slate-600 ring-slate-200",
  in_progress: "bg-amber-50 text-amber-700 ring-amber-200",
  in_review: "bg-violet-50 text-violet-700 ring-violet-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  delivered: "bg-[color:var(--accent-soft)] text-[color:var(--accent-deep)] ring-[color:rgba(200,93,39,0.18)]",
  archived: "bg-gray-100 text-gray-500 ring-gray-200"
};

function reviewStateNote(state: ReviewState): string {
  if (state.readyForProduction)
    return "Listo para que el disenador inicie produccion en estacion Adobe.";
  if (state.inProduction)
    return "En produccion activa. El disenador trabaja en la estacion Adobe.";
  if (state.readyForReview)
    return "Propuesta devuelta a Bridge. Pendiente de revision por el operador.";
  if (state.isApproved)
    return "Activo aprobado. El flujo Bridge -> Adobe -> Bridge se completo.";
  return "Estado archivado o sin clasificacion activa.";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AssetDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const detail = await getFullAssetDetail(id);
  if (!detail) return notFound();

  const {
    assetDetail: { asset, promptHistory },
    assetContext,
    promptVersion,
    creativeToolSuggestion,
    proposalDrafts,
    reviewState,
    conversationThread,
    sourceRefs,
    gaps
  } = detail;

  // ─── Server action: mensaje en el chat del activo ─────────────────────────
  async function addMessageAction(formData: FormData) {
    "use server";
    const tenantId = String(formData.get("tenantId") ?? "").trim();
    const messageText = String(formData.get("messageText") ?? "").trim();
    if (!tenantId || !messageText) return;
    await appendAssetMessage(id, tenantId, messageText);
    revalidatePath(`/activos/${id}`);
  }

  const ALL_CREATIVE_TOOLS = ["firefly", "adobe_express", "photoshop"] as const;
  const TOOL_LABELS = {
    firefly: "Adobe Firefly",
    adobe_express: "Adobe Express",
    photoshop: "Photoshop",
    other: "Texto"
  };

  return (
    <div className="space-y-6">
      {/* ── Encabezado de navegacion ── */}
      <nav className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
        <Link href="/activos" className="hover:text-[color:var(--accent-deep)] transition">
          ← Activos
        </Link>
        <span>/</span>
        <span className="truncate">{asset.title}</span>
      </nav>

      {/* ── Cabecera del activo ── */}
      <section className="panel rounded-[30px] px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
              {applicationLabel(asset.applicationCode)} · {pieceTypeLabel(asset.pieceTypeCode)} · {placementLabel(asset.placementCode)} · {formatLabel(asset.formatCode)}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
              {asset.title}
            </h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Project {assetContext.projectId ? "vinculado" : "pendiente"} ·{" "}
              Brief {assetContext.briefId ? "vinculado" : "sin brief"} ·{" "}
              Cotizacion {assetContext.quotationId ? "referenciada" : "sin referencia"}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-[16px] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ring-1 ${REVIEW_STATE_COLORS[asset.status]}`}
          >
            {assetStatusLabel(asset.status)}
          </span>
        </div>

        {/* Nota de estado actual */}
        <div className="mt-4 rounded-[18px] bg-slate-900 px-4 py-3 text-white">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Estado operativo</p>
          <p className="mt-1 text-sm leading-6">{reviewStateNote(reviewState)}</p>
        </div>

        {/* Accesos rapidos */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/disenador"
            className="inline-flex items-center rounded-full bg-[color:var(--accent-soft)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-deep)] transition hover:bg-[color:var(--accent-deep)] hover:text-white"
          >
            Workspace disenador
          </Link>
          <Link
            href="/activos"
            className="inline-flex items-center rounded-full bg-white/70 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)] ring-1 ring-[color:var(--line)] transition hover:text-[color:var(--accent-deep)]"
          >
            ← Lista de activos
          </Link>
          {assetContext.briefId && (
            <Link
              href="/briefs"
              className="inline-flex items-center rounded-full bg-white/70 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)] ring-1 ring-[color:var(--line)] transition hover:text-[color:var(--accent-deep)]"
            >
              Brief vinculado
            </Link>
          )}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        {/* ── Columna izquierda ── */}
        <div className="space-y-5">
          {/* Prompt vigente */}
          <section className="panel rounded-[30px] px-6 py-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Prompt vigente
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
              {promptVersion
                ? `Version ${promptVersion.versionNumber}`
                : "Sin prompt activo"}
            </h2>

            {promptVersion ? (
              <div className="mt-4 rounded-[18px] bg-[color:var(--accent-soft)] px-4 py-4 ring-1 ring-[color:rgba(200,93,39,0.12)]">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">
                  Prompt activo — v{promptVersion.versionNumber}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[color:var(--accent-deep)]">
                  {promptVersion.promptText}
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
                <p className="text-sm text-amber-800">
                  Este activo no tiene prompt activo. El operador debe definir el prompt antes de
                  que el disenador pueda saltar a la estacion creativa.
                </p>
              </div>
            )}

            {/* Historial de versiones */}
            {promptHistory.length > 1 && (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
                  Historial de versiones ({promptHistory.length})
                </p>
                <div className="mt-2 space-y-2">
                  {promptHistory.map((pv) => (
                    <div
                      key={pv.id}
                      className={`rounded-[14px] px-3 py-2.5 ring-1 ${
                        pv.status === "active"
                          ? "bg-[color:var(--accent-soft)] ring-[color:rgba(200,93,39,0.12)]"
                          : "bg-white/70 ring-[color:var(--line)]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)]">
                          v{pv.versionNumber}
                        </span>
                        <span className="text-[10px] text-[color:var(--muted)]">
                          {pv.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                        {pv.promptText.length > 120
                          ? pv.promptText.slice(0, 120) + "…"
                          : pv.promptText}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Referencias de contexto */}
            {sourceRefs.length > 0 && (
              <div className="mt-4 border-t border-[color:var(--line)] pt-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
                  Referencias de contexto del prompt
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sourceRefs.map((ref) => (
                    <span
                      key={ref.key}
                      className="rounded-[12px] bg-white/80 px-2.5 py-1 text-[10px] ring-1 ring-[color:var(--line)]"
                    >
                      <span className="font-semibold text-[color:var(--accent-deep)]">{ref.key}</span>
                      <span className="text-[color:var(--muted)]">: {ref.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Flujo Bridge -> Adobe -> Bridge */}
          <section className="panel rounded-[30px] px-6 py-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Flujo creativo
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
              Bridge → Adobe → Bridge
            </h2>
            <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
              Herramienta sugerida para este tipo de pieza: {" "}
              <strong>{creativeToolSuggestion.label}</strong>
            </p>
            <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
              {creativeToolSuggestion.description}
            </p>

            {/* Diagrama de 3 pasos */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {/* Paso 1: Bridge entrega */}
              <div className="rounded-[18px] bg-slate-900 px-4 py-4 text-white">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                  1 — Bridge
                </p>
                <p className="mt-1 text-sm font-medium leading-5">Entrega el prompt y el contexto al disenador</p>
              </div>
              {/* Paso 2: Estacion Adobe */}
              <div
                className={`rounded-[18px] px-4 py-4 ring-1 ${
                  creativeToolSuggestion.tool !== "other"
                    ? "bg-[color:var(--accent-soft)] ring-[color:rgba(200,93,39,0.18)]"
                    : "bg-white/80 ring-[color:var(--line)]"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">
                  2 — Estacion Adobe
                </p>
                <div className="mt-2 space-y-1">
                  {ALL_CREATIVE_TOOLS.map((t) => (
                    <p
                      key={t}
                      className={`text-xs leading-5 ${
                        t === creativeToolSuggestion.tool
                          ? "font-bold text-[color:var(--accent-deep)]"
                          : "text-[color:var(--muted)]"
                      }`}
                    >
                      {t === creativeToolSuggestion.tool ? "▶ " : "○ "}
                      {TOOL_LABELS[t]}
                    </p>
                  ))}
                </div>
              </div>
              {/* Paso 3: Regreso */}
              <div className="rounded-[18px] bg-emerald-50 px-4 py-4 ring-1 ring-emerald-200">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  3 — Bridge
                </p>
                <p className="mt-1 text-sm font-medium leading-5 text-emerald-800">
                  Propuesta devuelta para revision del operador
                </p>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-[color:var(--muted)]">
              V1 — La integracion automatica con Adobe APIs esta fuera de alcance en este corte.
              El disenador devuelve propuestas registrando un mensaje en la conversacion del activo.
            </p>
          </section>

          {/* Propuestas candidatas */}
          <section className="panel rounded-[30px] px-6 py-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Propuestas candidatas
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
              Propuestas del disenador
            </h2>

            {proposalDrafts.length === 0 ? (
              <div className="mt-4 rounded-[18px] bg-white/80 px-4 py-5 ring-1 ring-[color:var(--line)]">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Vacio honesto V1
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  La tabla <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">asset_proposals</code>{" "}
                  no existe en V1. Las propuestas se registran como mensajes en la conversacion del
                  activo hasta que se implemente persistencia dedicada.
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  Flujo V1: el disenador produce en la estacion Adobe y devuelve la propuesta
                  dejando un mensaje en esta conversacion con el resultado.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {proposalDrafts.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-[18px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]"
                  >
                    <p className="text-sm">{p.note}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Columna derecha ── */}
        <div className="space-y-5">
          {/* Conversacion del activo */}
          <section className="panel rounded-[30px] px-6 py-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Conversacion
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
              Hilo del activo
            </h2>

            {conversationThread.messages.length === 0 ? (
              <p className="mt-4 text-sm text-[color:var(--muted)]">
                Sin mensajes aun. El primer comentario puede ser del operador o del disenador.
              </p>
            ) : (
              <div className="mt-4 space-y-2 max-h-96 overflow-y-auto pr-1">
                {conversationThread.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-[12px] bg-white/70 px-3 py-2.5 ring-1 ring-[color:var(--line)]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)]">
                        {actorRoleLabel(msg.actorRole)}
                      </span>
                      <span className="text-[10px] text-[color:var(--muted)]">
                        {formatMessageTimestamp(msg.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-5">{msg.messageText}</p>
                  </div>
                ))}
              </div>
            )}

            <form action={addMessageAction} className="mt-4 space-y-2">
              <input type="hidden" name="tenantId" value={asset.tenantId} />
              <textarea
                name="messageText"
                rows={3}
                placeholder="Comentario del operador o disenador sobre este activo..."
                className="w-full rounded-[14px] border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)] resize-none"
              />
              <button
                type="submit"
                className="w-full rounded-[14px] bg-[color:var(--accent-deep)] px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Enviar mensaje
              </button>
            </form>
          </section>

          {/* Vacios honestos V1 */}
          <section className="panel rounded-[30px] px-6 py-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Estado del corte
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">
              Vacios honestos V1
            </h2>
            <ul className="mt-4 space-y-2">
              {gaps.map((gap) => (
                <li key={gap} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-[color:var(--muted)]">○</span>
                  <span className="text-[11px] leading-5 text-[color:var(--muted)]">{gap}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
