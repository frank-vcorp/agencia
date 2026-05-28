/**
 * IMPL-20260506-47
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-47_activo_archivos_y_evidencias_reales.md
 * IMPL-20260513-17
 * Respaldo: context/AGENTE_VIKA_Y_SKILLS_TECNICAS_V1.md
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
  assetOperationalKindLabel,
  assetStatusLabel,
  formatLabel,
  pieceTypeLabel,
  placementLabel,
  resolveAssetOperationalKind,
  type AssetStatus
} from "@/lib/assets";
import {
  getFullAssetDetail,
  insertAssetProposal,
  insertProposalEvidence,
  updateProposalDecision,
  uploadEvidenceToStorage,
  upsertClientApproval,
  REVIEW_DECISION_LABELS,
  REVIEW_DECISION_COLORS,
  CLIENT_APPROVAL_LABELS,
  CLIENT_APPROVAL_COLORS,
  type ReviewState,
  type ReviewDecision,
  type ClientApprovalStatus
} from "@/lib/asset-detail";
import { EvidencePreview } from "./EvidencePreview";

// ─── Helpers de presentacion ──────────────────────────────────────────────────

const REVIEW_STATE_COLORS: Record<AssetStatus, string> = {
  draft: "bg-slate-50 text-slate-600 ring-slate-200",
  in_progress: "bg-amber-50 text-amber-700 ring-amber-200",
  in_review: "bg-violet-50 text-violet-700 ring-violet-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  delivered: "bg-[color:var(--accent-soft)] text-[color:var(--accent-deep)] ring-[color:rgba(200,93,39,0.18)]",
  archived: "bg-gray-100 text-gray-500 ring-gray-200",
  changes_requested: "bg-rose-50 text-rose-700 ring-rose-200"
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
    primaryProposal,
    secondaryProposal,
    proposalComparisonNote,
    reviewDecision,
    reviewState,
    conversationThread,
    sourceRefs,
    comparisonView,
    clientApproval,
    assetAnalytics,
    gaps
  } = detail;
  const operationalKind = resolveAssetOperationalKind(asset.title);
  const operationalKindClass =
    operationalKind === "captura"
      ? "bg-white/80 text-[color:var(--muted)] ring-[color:var(--line)]"
      : "bg-[color:var(--accent-soft)] text-[color:var(--accent-deep)] ring-[color:rgba(200,93,39,0.18)]";

  // ─── Server action: mensaje en el chat del activo ─────────────────────────
  async function addMessageAction(formData: FormData) {
    "use server";
    const tenantId = String(formData.get("tenantId") ?? "").trim();
    const messageText = String(formData.get("messageText") ?? "").trim();
    if (!tenantId || !messageText) return;
    await appendAssetMessage(id, tenantId, messageText);
    revalidatePath(`/activos/${id}`);
  }

  // ─── Server action: registrar propuesta del disenador ────────────────────
  async function addProposalAction(formData: FormData) {
    "use server";
    const tenantId   = String(formData.get("tenantId") ?? "").trim();
    const note       = String(formData.get("note") ?? "").trim();
    const toolUsed   = String(formData.get("toolUsed") ?? "other").trim();
    const isPrimary  = formData.get("isPrimary") === "true";
    const promptVid  = String(formData.get("promptVersionId") ?? "").trim() || null;
    const file       = formData.get("file");
    if (!tenantId || !note) return;
    const proposal = await insertAssetProposal({
      tenantId,
      assetId:          id,
      promptVersionId:  promptVid,
      note,
      toolUsed:         toolUsed as "firefly" | "adobe_express" | "photoshop" | "other",
      isPrimary,
      reviewDecision:   "pending"
    });

    if (proposal && file instanceof File && file.size > 0) {
      const ext = file.name.split(".").pop() ?? "bin";
      const uniqueId = crypto.randomUUID();
      const storagePath = `${tenantId}/${id}/${proposal.id}/${uniqueId}.${ext}`;
      const buffer = await file.arrayBuffer();
      const uploaded = await uploadEvidenceToStorage(
        storagePath,
        buffer,
        file.type || "application/octet-stream"
      );

      if (uploaded) {
        await insertProposalEvidence({
          tenantId,
          assetId: id,
          proposalId: proposal.id,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          storagePath,
          fileSizeBytes: file.size
        });
      }
    }

    revalidatePath(`/activos/${id}`);
  }

  // ─── Server action: actualizar decision operativa de una propuesta ────────
  async function updateDecisionAction(formData: FormData) {
    "use server";
    const proposalId = String(formData.get("proposalId") ?? "").trim();
    const decision   = String(formData.get("decision") ?? "").trim() as ReviewDecision;
    if (!proposalId || !decision) return;
    await updateProposalDecision(proposalId, decision);
    revalidatePath(`/activos/${id}`);
  }

  // ─── Server action: subir evidencia real a una propuesta (SPEC-47) ────────
  async function uploadEvidenceAction(formData: FormData) {
    "use server";
    const tenantId   = String(formData.get("tenantId") ?? "").trim();
    const assetId    = String(formData.get("assetId") ?? "").trim();
    const proposalId = String(formData.get("proposalId") ?? "").trim();
    const file       = formData.get("file");
    if (!tenantId || !assetId || !proposalId || !(file instanceof File) || file.size === 0) return;

    const ext         = file.name.split(".").pop() ?? "bin";
    const uniqueId    = crypto.randomUUID();
    const storagePath = `${tenantId}/${assetId}/${proposalId}/${uniqueId}.${ext}`;
    const buffer      = await file.arrayBuffer();
    const uploaded    = await uploadEvidenceToStorage(storagePath, buffer, file.type || "application/octet-stream");

    if (uploaded) {
      await insertProposalEvidence({
        tenantId,
        assetId,
        proposalId,
        fileName:       file.name,
        mimeType:       file.type || "application/octet-stream",
        storagePath,
        fileSizeBytes:  file.size
      });
    }
    revalidatePath(`/activos/${id}`);
  }

  const ALL_CREATIVE_TOOLS = ["firefly", "adobe_express", "photoshop"] as const;

  // ─── Server action: aprobacion final del cliente (SPEC-51) ───────────────
  async function upsertClientApprovalAction(formData: FormData) {
    "use server";
    const tenantId = String(formData.get("tenantId") ?? "").trim();
    const status   = String(formData.get("status") ?? "").trim() as ClientApprovalStatus;
    const comment  = String(formData.get("comment") ?? "").trim() || null;
    if (!tenantId || !status) return;
    await upsertClientApproval({ tenantId, assetId: id, status, comment });
    revalidatePath(`/activos/${id}`);
  }  const TOOL_LABELS = {
    firefly: "Adobe Firefly",
    adobe_express: "Adobe Express",
    photoshop: "Photoshop",
    other: "Texto"
  };

  const REVIEW_DECISIONS: ReviewDecision[] = [
    "pending",
    "needs_adjustment",
    "in_review",
    "approved_internal"
  ];

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
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-[16px] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ring-1 ${operationalKindClass}`}
            >
              {assetOperationalKindLabel(operationalKind)}
            </span>
            <span
              className={`rounded-[16px] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ring-1 ${REVIEW_STATE_COLORS[asset.status]}`}
            >
              {assetStatusLabel(asset.status)}
            </span>
          </div>
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
              El disenador devuelve propuestas registrandolas en esta ficha y puede adjuntar la evidencia real cuando ya la tenga lista.
            </p>
          </section>

          {/* Propuestas candidatas (SPEC-46: persistencia real) */}
          <section className="panel rounded-[30px] px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Propuestas candidatas
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
                  Propuestas del disenador
                </h2>
              </div>
              <span
                className={`shrink-0 rounded-[14px] px-3 py-1 text-[10px] uppercase tracking-[0.18em] ring-1 ${REVIEW_DECISION_COLORS[reviewDecision]}`}
              >
                {REVIEW_DECISION_LABELS[reviewDecision]}
              </span>
            </div>

            {proposalDrafts.length === 0 ? (
              <div className="mt-4 rounded-[18px] bg-white/80 px-4 py-5 ring-1 ring-[color:var(--line)]">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Sin propuestas aun
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  El disenador aun no ha registrado propuestas para este activo.
                  Usa el formulario de abajo para devolver la primera entrega desde la estacion Adobe.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {/* Tarjeta propuesta principal */}
                {primaryProposal && (
                  <div className="rounded-[20px] bg-[color:var(--accent-soft)] px-5 py-5 ring-1 ring-[color:rgba(200,93,39,0.18)]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">
                        Propuesta principal
                      </span>
                      <span className={`rounded-[12px] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ring-1 ${REVIEW_DECISION_COLORS[primaryProposal.reviewDecision]}`}>
                        {REVIEW_DECISION_LABELS[primaryProposal.reviewDecision]}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[color:var(--accent-deep)]">
                      {primaryProposal.note}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[color:var(--muted)]">
                      <span className="rounded bg-white/60 px-2 py-0.5 ring-1 ring-[color:rgba(200,93,39,0.1)]">
                        {TOOL_LABELS[primaryProposal.toolUsed as keyof typeof TOOL_LABELS] ?? primaryProposal.toolUsed}
                      </span>
                      {primaryProposal.promptVersionId && (
                        <span className="rounded bg-white/60 px-2 py-0.5 ring-1 ring-[color:rgba(200,93,39,0.1)]">
                          Prompt v{promptHistory.find(p => p.id === primaryProposal.promptVersionId)?.versionNumber ?? "?"}
                        </span>
                      )}
                      <span className="rounded bg-white/60 px-2 py-0.5 ring-1 ring-[color:rgba(200,93,39,0.1)]">
                        {new Date(primaryProposal.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    {/* Decision operativa para la propuesta principal */}
                    <form action={updateDecisionAction} className="mt-4 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="proposalId" value={primaryProposal.id} />
                      <select
                        name="decision"
                        defaultValue={primaryProposal.reviewDecision}
                        className="rounded-[12px] border border-[color:rgba(200,93,39,0.2)] bg-white/70 px-2.5 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
                      >
                        {REVIEW_DECISIONS.map((d) => (
                          <option key={d} value={d}>{REVIEW_DECISION_LABELS[d]}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-[12px] bg-[color:var(--accent-deep)] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-90"
                      >
                        Guardar decision
                      </button>
                    </form>

                    {/* Evidencia real de la propuesta principal (SPEC-47, IMPL-20260506-49) */}
                    <div className="mt-4 border-t border-[color:rgba(200,93,39,0.15)] pt-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">
                        Evidencia real
                      </p>
                      {primaryProposal.hasEvidence && primaryProposal.evidence ? (
                        <EvidencePreview evidence={primaryProposal.evidence} variant="primary" />
                      ) : (
                        <form
                          action={uploadEvidenceAction}
                          encType="multipart/form-data"
                          className="mt-2 flex flex-wrap items-center gap-2"
                        >
                          <input type="hidden" name="tenantId" value={asset.tenantId} />
                          <input type="hidden" name="assetId" value={asset.id} />
                          <input type="hidden" name="proposalId" value={primaryProposal.id} />
                          <input
                            type="file"
                            name="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/quicktime"
                            className="text-[11px] text-[color:var(--muted)] file:mr-2 file:rounded-[10px] file:border-0 file:bg-[color:var(--accent-soft)] file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-[color:var(--accent-deep)]"
                          />
                          <button
                            type="submit"
                            className="rounded-[12px] bg-[color:var(--accent-deep)] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-90"
                          >
                            Subir evidencia
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {/* Tarjeta propuesta alternativa */}
                {secondaryProposal && (
                  <div className="rounded-[20px] bg-white/80 px-5 py-5 ring-1 ring-[color:var(--line)]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                        Propuesta alternativa
                      </span>
                      <span className={`rounded-[12px] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ring-1 ${REVIEW_DECISION_COLORS[secondaryProposal.reviewDecision]}`}>
                        {REVIEW_DECISION_LABELS[secondaryProposal.reviewDecision]}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                      {secondaryProposal.note}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[color:var(--muted)]">
                      <span className="rounded bg-slate-50 px-2 py-0.5 ring-1 ring-[color:var(--line)]">
                        {TOOL_LABELS[secondaryProposal.toolUsed as keyof typeof TOOL_LABELS] ?? secondaryProposal.toolUsed}
                      </span>
                      {secondaryProposal.promptVersionId && (
                        <span className="rounded bg-slate-50 px-2 py-0.5 ring-1 ring-[color:var(--line)]">
                          Prompt v{promptHistory.find(p => p.id === secondaryProposal.promptVersionId)?.versionNumber ?? "?"}
                        </span>
                      )}
                    </div>

                    <form action={updateDecisionAction} className="mt-4 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="proposalId" value={secondaryProposal.id} />
                      <select
                        name="decision"
                        defaultValue={secondaryProposal.reviewDecision}
                        className="rounded-[12px] border border-[color:var(--line)] bg-white/70 px-2.5 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
                      >
                        {REVIEW_DECISIONS.map((d) => (
                          <option key={d} value={d}>{REVIEW_DECISION_LABELS[d]}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-[12px] bg-slate-700 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-90"
                      >
                        Guardar decision
                      </button>
                    </form>

                    {/* Evidencia real de la propuesta alternativa (SPEC-47, IMPL-20260506-49) */}
                    <div className="mt-4 border-t border-[color:var(--line)] pt-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                        Evidencia real
                      </p>
                      {secondaryProposal.hasEvidence && secondaryProposal.evidence ? (
                        <EvidencePreview evidence={secondaryProposal.evidence} variant="secondary" />
                      ) : (
                        <form
                          action={uploadEvidenceAction}
                          encType="multipart/form-data"
                          className="mt-2 flex flex-wrap items-center gap-2"
                        >
                          <input type="hidden" name="tenantId" value={asset.tenantId} />
                          <input type="hidden" name="assetId" value={asset.id} />
                          <input type="hidden" name="proposalId" value={secondaryProposal.id} />
                          <input
                            type="file"
                            name="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/quicktime"
                            className="text-[11px] text-[color:var(--muted)] file:mr-2 file:rounded-[10px] file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-slate-600"
                          />
                          <button
                            type="submit"
                            className="rounded-[12px] bg-slate-700 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-90"
                          >
                            Subir evidencia
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {/* Nota de comparacion si hay dos propuestas */}
                {proposalComparisonNote && (
                  <div className="rounded-[14px] bg-slate-50 px-4 py-3 ring-1 ring-[color:var(--line)]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Diferencia entre propuestas
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{proposalComparisonNote}</p>
                  </div>
                )}

                {/* Comparacion visual lado a lado (SPEC-51 §1) */}
                {comparisonView && comparisonView.kind === "images" && (
                  <div className="rounded-[20px] bg-white/90 px-5 py-5 ring-1 ring-[color:var(--line)]">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                      Comparacion visual
                    </p>
                    <p className="mt-1 text-[11px] text-[color:var(--muted)]">
                      Principal vs Alternativa — lado a lado
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      {/* Principal */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">
                          Principal
                        </p>
                        <div className="overflow-hidden rounded-[14px] ring-2 ring-[color:rgba(200,93,39,0.25)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={comparisonView.primary.signedUrl}
                            alt={comparisonView.primary.fileName}
                            className="h-48 w-full object-cover"
                          />
                        </div>
                        <div className="space-y-1 text-[10px] text-[color:var(--muted)]">
                          <p className="truncate font-medium">{comparisonView.primary.fileName}</p>
                          <p>{comparisonView.primary.toolUsed}</p>
                          {comparisonView.primary.fileSizeBytes && (
                            <p>{Math.round(comparisonView.primary.fileSizeBytes / 1024)} KB</p>
                          )}
                        </div>
                      </div>
                      {/* Alternativa */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                          Alternativa
                        </p>
                        <div className="overflow-hidden rounded-[14px] ring-1 ring-[color:var(--line)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={comparisonView.secondary.signedUrl}
                            alt={comparisonView.secondary.fileName}
                            className="h-48 w-full object-cover"
                          />
                        </div>
                        <div className="space-y-1 text-[10px] text-[color:var(--muted)]">
                          <p className="truncate font-medium">{comparisonView.secondary.fileName}</p>
                          <p>{comparisonView.secondary.toolUsed}</p>
                          {comparisonView.secondary.fileSizeBytes && (
                            <p>{Math.round(comparisonView.secondary.fileSizeBytes / 1024)} KB</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {comparisonView && comparisonView.kind === "no_images" && (
                  <div className="rounded-[14px] bg-slate-50 px-4 py-3 ring-1 ring-[color:var(--line)]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Comparacion visual
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                      {comparisonView.reason}
                    </p>
                  </div>
                )}

                {/* Propuestas adicionales (mas de 2) */}
                {proposalDrafts.length > 2 && (
                  <p className="text-[11px] text-[color:var(--muted)]">
                    + {proposalDrafts.length - 2} propuesta(s) adicionale(s) registradas.
                  </p>
                )}
              </div>
            )}

            {/* Formulario de devolucion de propuesta por el disenador */}
            <div className="mt-6 border-t border-[color:var(--line)] pt-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Registrar devolucion del disenador
              </p>
              <form action={addProposalAction} encType="multipart/form-data" className="mt-3 space-y-3">
                <input type="hidden" name="tenantId" value={asset.tenantId} />
                <input
                  type="hidden"
                  name="promptVersionId"
                  value={promptVersion?.id ?? ""}
                />
                <textarea
                  name="note"
                  rows={3}
                  placeholder="Descripcion corta de la propuesta entregada desde la estacion Adobe..."
                  className="w-full rounded-[14px] border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)] resize-none"
                />
                <div className="rounded-[14px] border border-dashed border-[color:var(--line)] bg-white/60 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    Evidencia opcional de esta propuesta
                  </p>
                  <input
                    type="file"
                    name="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/quicktime"
                    className="mt-2 text-[11px] text-[color:var(--muted)] file:mr-2 file:rounded-[10px] file:border-0 file:bg-[color:var(--accent-soft)] file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-[color:var(--accent-deep)]"
                  />
                  <p className="mt-2 text-[11px] leading-5 text-[color:var(--muted)]">
                    Si ya traes la pieza desde Adobe, puedes subirla en el mismo paso en que registras la propuesta.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    name="toolUsed"
                    className="rounded-[12px] border border-[color:var(--line)] bg-white/80 px-2.5 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
                  >
                    <option value="firefly">Adobe Firefly</option>
                    <option value="adobe_express">Adobe Express</option>
                    <option value="photoshop">Photoshop</option>
                    <option value="other">Otra herramienta</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-[11px] text-[color:var(--muted)]">
                    <input type="hidden" name="isPrimary" value="false" />
                    <input
                      type="checkbox"
                      name="isPrimary"
                      value="true"
                      className="accent-[color:var(--accent-deep)]"
                    />
                    Marcar como principal
                  </label>
                  <button
                    type="submit"
                    className="rounded-[12px] bg-[color:var(--accent-deep)] px-4 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-90"
                  >
                    Registrar propuesta
                  </button>
                </div>
              </form>
            </div>
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

          {/* Aprobacion final del cliente (SPEC-51 §2) */}
          <section className="panel rounded-[30px] px-6 py-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Aprobacion del cliente
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">
              Decision final
            </h2>

            {clientApproval ? (
              <div className="mt-4 space-y-3">
                <div
                  className={`rounded-[16px] px-4 py-3 ring-1 ${CLIENT_APPROVAL_COLORS[clientApproval.status]}`}
                >
                  <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">
                    Estado actual
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {CLIENT_APPROVAL_LABELS[clientApproval.status]}
                  </p>
                  {clientApproval.comment && (
                    <p className="mt-2 text-xs leading-5 opacity-80">{clientApproval.comment}</p>
                  )}
                  <p className="mt-2 text-[10px] opacity-60">
                    {new Date(clientApproval.decidedAt).toLocaleDateString("es-MX", {
                      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[color:var(--muted)]">
                Pendiente de registro. Usa el formulario para registrar la decision del cliente.
              </p>
            )}

            <form action={upsertClientApprovalAction} className="mt-4 space-y-3 border-t border-[color:var(--line)] pt-4">
              <input type="hidden" name="tenantId" value={asset.tenantId} />
              <select
                name="status"
                defaultValue={clientApproval?.status ?? "pending_client"}
                className="w-full rounded-[12px] border border-[color:var(--line)] bg-white/80 px-2.5 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
              >
                <option value="pending_client">Pendiente de aprobacion</option>
                <option value="approved_client">Aprobado por cliente</option>
                <option value="rejected_changes">Requiere cambios</option>
              </select>
              <input
                type="text"
                name="comment"
                defaultValue={clientApproval?.comment ?? ""}
                placeholder="Comentario corto opcional..."
                maxLength={300}
                className="w-full rounded-[12px] border border-[color:var(--line)] bg-white/80 px-2.5 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
              />
              <button
                type="submit"
                className="w-full rounded-[12px] bg-[color:var(--accent-deep)] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-90"
              >
                Registrar decision
              </button>
            </form>
          </section>

          {/* Analytics minimos por activo (SPEC-51 §3) */}
          <section className="panel rounded-[30px] px-6 py-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Lectura historica
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">
              Analytics del activo
            </h2>
            <dl className="mt-4 space-y-2">
              <div className="flex items-center justify-between rounded-[12px] bg-white/70 px-3 py-2 ring-1 ring-[color:var(--line)]">
                <dt className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">Creado</dt>
                <dd className="text-[11px] font-medium">
                  {new Date(assetAnalytics.createdAt).toLocaleDateString("es-MX", {
                    day: "2-digit", month: "short", year: "numeric"
                  })}
                </dd>
              </div>
              <div className="flex items-center justify-between rounded-[12px] bg-white/70 px-3 py-2 ring-1 ring-[color:var(--line)]">
                <dt className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">Propuestas</dt>
                <dd className="text-[11px] font-medium">{assetAnalytics.proposalCount}</dd>
              </div>
              <div className="flex items-center justify-between rounded-[12px] bg-white/70 px-3 py-2 ring-1 ring-[color:var(--line)]">
                <dt className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">Con evidencia</dt>
                <dd className="text-[11px] font-medium">{assetAnalytics.evidenceCount}</dd>
              </div>
              {assetAnalytics.lastActivityAt && (
                <div className="flex items-center justify-between rounded-[12px] bg-white/70 px-3 py-2 ring-1 ring-[color:var(--line)]">
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">Ultima actividad</dt>
                  <dd className="text-[11px] font-medium">
                    {new Date(assetAnalytics.lastActivityAt).toLocaleDateString("es-MX", {
                      day: "2-digit", month: "short", year: "numeric"
                    })}
                  </dd>
                </div>
              )}
              {assetAnalytics.daysToInternalApproval !== null && (
                <div className="flex items-center justify-between rounded-[12px] bg-emerald-50 px-3 py-2 ring-1 ring-emerald-200">
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-emerald-700">Dias a aprobacion interna</dt>
                  <dd className="text-[11px] font-semibold text-emerald-800">{assetAnalytics.daysToInternalApproval}d</dd>
                </div>
              )}
              {assetAnalytics.daysToClientApproval !== null && (
                <div className="flex items-center justify-between rounded-[12px] bg-[color:var(--accent-soft)] px-3 py-2 ring-1 ring-[color:rgba(200,93,39,0.18)]">
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent-deep)]">Dias a aprobacion cliente</dt>
                  <dd className="text-[11px] font-semibold text-[color:var(--accent-deep)]">{assetAnalytics.daysToClientApproval}d</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Vacios honestos V1 */}
          <section className="panel rounded-[30px] px-6 py-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Estado del corte
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">
              {gaps.length === 0 ? "Ficha cerrada" : "Vacios honestos"}
            </h2>
            {gaps.length === 0 ? (
              <div className="mt-4 rounded-[14px] bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
                <p className="text-sm font-medium text-emerald-800">
                  Todos los gaps fueron cerrados en SPEC-51.
                </p>
                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  Comparacion visual, aprobacion del cliente y analytics historicos disponibles en esta ficha.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {gaps.map((gap) => (
                  <li key={gap} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-[color:var(--muted)]">○</span>
                    <span className="text-[11px] leading-5 text-[color:var(--muted)]">{gap}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
