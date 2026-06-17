/**
 * IMPL-20260615-39
 * Respaldo: PROYECTO.md (UI listado de briefs)
 * IMPL-20260611-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260611-01_alineacion_chat_vika_a_especificacion_tecnica_v1.md
 * IMPL-20260603-02
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260603-02_cierre_brief_doble_salida_humano_raw_y_agenda_performance_v1.md
 * IMPL-20260505-22
 * Respaldo: context/CLIENTS_Y_PROJECTS_V1.md, context/SPECs/SPEC_ARCH-20260505-22_clients_y_projects_v1.md, context/SPECs/SPEC_ARCH-20260505-21_memberships_users_y_actor_efectivo_v1.md, context/IDENTIDAD_Y_MEMBERSHIPS_V1.md, context/SPECs/SPEC_ARCH-20260505-19_agente_briefing_persistido_y_revision_humana.md, PROYECTO.md
 */
import { revalidatePath } from "next/cache";
import Link from "next/link";

import {
  appendClientBriefMessage,
  createDerivedBriefVersion,
  getBriefsByTenantEnriched,
  getBriefWorkspace,
  getTenantIdBySlug,
  emptyStructuredBriefSummary,
  reviewBriefVersion,
  submitBriefForOperatorReview,
  updateBriefSummary,
  VIKA_BRIEF_FIELDS,
  type BriefVersion,
  type StructuredBriefSummary
} from "@/lib/briefing";
import {
  actorRoleLabel,
  appendBriefMessage,
  getBriefChat,
  type EntityChat
} from "@/lib/chat";
import { submitBriefAction } from "@/app/cliente/brief/[projectId]/actions";
import { executeDeleteBrief } from "@/lib/entity-delete";
import { BriefChatBubbles, type ChatBubbleItem } from "@/components/brief-chat-bubbles";
import { BriefsListTable } from "@/components/briefs-list-table";
import { supabaseEnv } from "@/lib/supabase";

const VIKA_CHECKLIST_LABELS: Partial<Record<keyof StructuredBriefSummary, string>> = {
  giroYProductoHeroe: "Giro y producto heroe",
  personaPerfil: "Perfil del dueño",
  historiaNegocio: "Historia del negocio",
  administracionNegocio: "Administración del negocio",
  madurez: "Madurez del negocio",
  localFisico: "Local fisico o a domicilio",
  logo: "Logo o marca grafica",
  audience: "Lo que te hace unico (diferenciador)",
  restrictions: "Objeciones frecuentes del cliente",
  publicidadPrevia: "Publicidad previa intentada",
  presupuesto: "Presupuesto mensual",
  cta: "Accion esperada del cliente (CTA)",
  planesFuturo: "Planes a futuro (6-12 meses)",
  historiaYContexto: "Historia y contexto (opcional)",
  projectObjective: "Objetivo del proyecto",
  expectedResult: "Resultado esperado",
  businessContext: "Contexto del negocio",
  requestReason: "Motivo principal de la solicitud",
  mainOffer: "Oferta principal",
  platform: "Plataforma o canal",
  deliverable: "Entregable esperado",
  tone: "Tono",
  references: "Referencias o materiales",
  urgency: "Urgencia o fecha objetivo",
  messageCore: "Mensaje principal",
  gaps: "Faltantes tolerables",
  contradictions: "Contradicciones detectadas",
  structuringConfidence: "Confianza de estructuracion",
  recommendedProductSlotKey: "Slot comercial sugerido",
  recommendedProductConfidence: "Confianza del encaje",
  commercialFitReason: "Razon de encaje comercial",
  upsellSignal: "Senal de upsell o reconduccion",
  operatorReviewNote: "Nota para revision del operador",
  clientFacingSummary: "Resumen para el cliente",
  frontsAsked: "Frentes preguntados (interno)"
};

const VIKA_CHECKLIST_FIELDS: Array<keyof StructuredBriefSummary> = [
  "giroYProductoHeroe",
  "personaPerfil",
  "historiaNegocio",
  "administracionNegocio",
  "madurez",
  "localFisico",
  "logo",
  "audience",
  "restrictions",
  "publicidadPrevia",
  "presupuesto",
  "cta",
  "planesFuturo"
];

const VIKA_NARRATIVE_FIELD: keyof StructuredBriefSummary = "historiaYContexto";

const VIKA_FIELDS = new Set<string>(VIKA_BRIEF_FIELDS);

function isVikaField(value: string): value is (typeof VIKA_BRIEF_FIELDS)[number] {
  return (VIKA_BRIEF_FIELDS as readonly string[]).includes(value);
}

function buildSummaryPatchSeed(): StructuredBriefSummary {
  // IMPL-20260615-40: usar emptyStructuredBriefSummary para evitar
  // duplicar campos y olvidar los nuevos (narrativeQuestionAsked, narrativeAnswer)
  return emptyStructuredBriefSummary();
}

async function saveSummaryAction(formData: FormData) {
  "use server";

  const briefId = String(formData.get("briefId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");

  await updateBriefSummary(
    { briefId, versionId },
    Object.fromEntries(
      Object.keys(buildSummaryPatchSeed()).map((key) => [key, String(formData.get(key) ?? "")])
    ) as Partial<StructuredBriefSummary>
  );

  revalidatePath("/briefs");
}

async function addMessageAction(formData: FormData) {
  "use server";

  const briefId = String(formData.get("briefId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  const messageText = String(formData.get("messageText") ?? "").trim();

  if (!messageText) {
    return;
  }

  await appendClientBriefMessage({ briefId, versionId }, messageText);
  revalidatePath("/briefs");
}

async function submitForReviewAction(formData: FormData) {
  "use server";

  const briefId = String(formData.get("briefId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");

  // IMPL-20260611-01: delegamos al flujo Vika que detecta el tag [SYS_ACTION: LOCK_SUCCESS].
  if (projectId) {
    await submitBriefAction(projectId, briefId, versionId);
  } else {
    await submitBriefForOperatorReview({ briefId, versionId });
  }
  revalidatePath("/briefs");
}

async function operatorReviewAction(formData: FormData) {
  "use server";

  const decision = String(formData.get("decision") ?? "review_started") as "review_started" | "approved" | "returned" | "reconducted";

  await reviewBriefVersion(
    {
      briefId: String(formData.get("briefId") ?? ""),
      versionId: String(formData.get("versionId") ?? "")
    },
    decision,
    String(formData.get("note") ?? ""),
    String(formData.get("recommendedProductSlotKey") ?? "")
  );
  revalidatePath("/briefs");
}

async function createDerivedVersionAction(formData: FormData) {
  "use server";

  await createDerivedBriefVersion({
    briefId: String(formData.get("briefId") ?? ""),
    versionId: String(formData.get("versionId") ?? "")
  });
  revalidatePath("/briefs");
}

async function addBriefChatMessageAction(formData: FormData) {
  "use server";

  const briefId = String(formData.get("briefId") ?? "").trim();
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const messageText = String(formData.get("messageText") ?? "").trim();

  if (!briefId || !tenantId || !messageText) return;

  await appendBriefMessage(briefId, tenantId, messageText);
  revalidatePath("/briefs");
}

async function deleteBriefAction(formData: FormData) {
  "use server";

  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const briefId = String(formData.get("briefId") ?? "").trim();
  const confirmationText = String(formData.get("confirmationText") ?? "").trim();
  const requestedByLabel = String(formData.get("requestedByLabel") ?? "operador").trim();
  const approvedByLabel = String(formData.get("approvedByLabel") ?? "operador").trim();
  const reason = String(formData.get("reason") ?? "otro").trim();

  if (!tenantId || !briefId) {
    revalidatePath("/briefs");
    return;
  }

  const previewConfirmationText = `ELIMINAR BRIEF ${briefId}`;

  if (confirmationText !== previewConfirmationText) {
    revalidatePath("/briefs");
    return;
  }

  await executeDeleteBrief(
    tenantId,
    briefId,
    requestedByLabel,
    approvedByLabel,
    reason,
    confirmationText,
    previewConfirmationText
  );

  revalidatePath("/briefs");
  revalidatePath(`/briefs?id=${briefId}`);
}

function statusLabel(status: BriefVersion["status"] | null) {
  if (!status) {
    return "Sin version activa";
  }

  return status.replaceAll("_", " ");
}

function presupuestoBadge(value: string): { label: string; tone: "organic" | "paid" | "empty" } {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return { label: "Sin definir", tone: "empty" };
  }
  if (normalized === "$0" || normalized.includes("organico") || normalized.includes("gratis")) {
    return { label: "$0 / Organico", tone: "organic" };
  }
  return { label: value, tone: "paid" };
}

function extractVikaJsonFromMessages(messages: BriefVersion["messages"]): Record<string, string> | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.authorRole !== "assistant") continue;
    if (!message.messageText.includes("[SYS_ACTION: LOCK_SUCCESS]")) continue;
    const match = message.messageText.match(/\{[\s\S]*\}/);
    if (!match) continue;
    try {
      const parsed = JSON.parse(match[0]) as Record<string, unknown>;
      const json: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string" && isVikaField(key)) {
          json[key] = value.trim();
        }
      }
      return Object.keys(json).length > 0 ? json : null;
    } catch {
      continue;
    }
  }
  return null;
}

export default async function BriefsPage({
  searchParams
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedId = Array.isArray(params.id) ? params.id[0] : params.id;
  const tenantId = await getTenantIdBySlug(supabaseEnv.defaultTenant).catch(() => null);

  const brief = await getBriefWorkspace(supabaseEnv.defaultTenant, requestedId || undefined);
  const currentVersion = brief?.currentVersion ?? null;

  // Listado completo de briefs del tenant — IMPL-20260615-39
  // IMPL-20260616-01: usar la version enriquecida con join de cliente y
  // proyecto para alimentar la tabla global.
  const enrichedBriefs = tenantId ? await getBriefsByTenantEnriched(tenantId).catch(() => []) : [];

  // Chat contextual del brief — IMPL-20260506-33
  const briefChat: EntityChat = brief ? await getBriefChat(brief.id) : { thread: null, messages: [] };

  if (!brief || !currentVersion) {
    return (
      <div className="space-y-6">
        <BriefsListTable briefs={enrichedBriefs} deleteAction={deleteBriefAction} />
        <section className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Brief persistido V1</p>
          <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">Primer objeto operativo listo para iniciar</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[color:var(--muted)]">
            Esta vista crea el primer brief del tenant por defecto y lo deja listo para la conversacion con Vika.
          </p>
        </section>
      </div>
    );
  }

  const vikaJson = extractVikaJsonFromMessages(currentVersion.messages);
  const summary = currentVersion.structuredSummary;
  const hasLockTag = currentVersion.messages.some(
    (message) => message.authorRole === "assistant" && message.messageText.includes("[SYS_ACTION: LOCK_SUCCESS]")
  );
  const isEditable = currentVersion.editable;
  const presupuestoState = presupuestoBadge(summary.presupuesto);

  return (
    <div className="space-y-6">
      <BriefsListTable
        briefs={enrichedBriefs}
        activeBriefId={brief.id}
        deleteAction={deleteBriefAction}
      />
      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="panel rounded-[30px] px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Tenant {brief.tenantSlug}</p>
              <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">Brief actual v{currentVersion.versionNumber}</h1>
              <p className="mt-2 max-w-3xl text-base leading-7 text-[color:var(--muted)]">
                Flujo Vika: 8 preguntas obligatorias, conversacion natural, cierre con tag de bloqueo.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent-soft)] px-4 py-2 text-[color:var(--accent-deep)] ring-1 ring-[color:rgba(200,93,39,0.18)]">
              <span className="text-[10px] uppercase tracking-[0.22em]">Estado actual</span>
              <span className="font-[family-name:var(--font-heading)] text-sm font-bold capitalize">{statusLabel(currentVersion.status)}</span>
            </div>
          </div>
        </article>

        <aside className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Resumen final persistido</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Cierre conversacional</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[color:var(--muted)]">
            {currentVersion.finalSummaryText || "Aun no existe resumen final consolidado para esta version."}
          </p>
          {currentVersion.status === "approved_locked" ? (
            <form action={createDerivedVersionAction} className="mt-5 space-y-3">
              <input name="briefId" type="hidden" value={brief.id} />
              <input name="versionId" type="hidden" value={currentVersion.id} />
              <button className="rounded-full bg-[color:var(--ink)] px-5 py-3 text-sm font-semibold text-white" type="submit">
                Crear nueva version derivada
              </button>
              <p className="text-xs leading-6 text-[color:var(--muted)]">La version aprobada permanece bloqueada y el trabajo continua en una nueva derivada.</p>
            </form>
          ) : null}
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="panel rounded-[30px] px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Conversacion fuente</p>
              <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Mensajes de la version actual</h2>
            </div>
            <div className="text-sm text-[color:var(--muted)]">{currentVersion.messages.length} mensajes</div>
          </div>

          <BriefChatBubbles
            className="mt-5"
            messages={currentVersion.messages.map<ChatBubbleItem>((message) => ({
              id: message.id,
              text: message.messageText,
              role: message.authorRole,
              actorLabel: message.actorLabel,
              createdAt: message.createdAt
            }))}
            maxHeight="480px"
            rightRoles={["client", "user"]}
            emptyState={<p className="text-center text-[11px] text-[color:var(--muted)]">Sin mensajes registrados para esta version.</p>}
            footer={
              <form action={addMessageAction} className="space-y-2 border-t border-[color:var(--line)] bg-white/60 px-3 py-3">
                <input name="briefId" type="hidden" value={brief.id} />
                <input name="versionId" type="hidden" value={currentVersion.id} />
                <textarea
                  className="min-h-20 w-full resize-none rounded-[14px] border border-[color:var(--line)] bg-white px-3 py-2 text-sm leading-6 outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
                  disabled={!currentVersion.editable}
                  name="messageText"
                  placeholder="Texto de demo controlada para registrar la conversacion fuente del brief."
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-[color:var(--muted)]">
                    {currentVersion.editable
                      ? "El mensaje se publica como cliente en la conversacion fuente."
                      : "Version bloqueada — no se pueden agregar mas mensajes."}
                  </p>
                  <button
                    className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!currentVersion.editable}
                    type="submit"
                  >
                    Registrar
                  </button>
                </div>
              </form>
            }
          />
        </article>

        {/* ── Checklist Vika (8 puntos obligatorios) — IMPL-20260611-01 ─────────── */}
        <article className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Checklist Vika</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">8 puntos obligatorios</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            Verificacion del cierre conversacional. Se detecta el tag <code>[SYS_ACTION: LOCK_SUCCESS]</code> automaticamente.
          </p>

          <ul className="mt-3 space-y-1">
            {VIKA_CHECKLIST_FIELDS.map((field) => {
              const value = summary[field];
              const filled = Boolean(
                typeof value === "string" && value && value.trim().length > 0
              );
              const isPresupuesto = field === "presupuesto";
              return (
                <li
                  key={field}
                  className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 ring-1 ${
                    filled
                      ? "bg-emerald-50 ring-emerald-200"
                      : "bg-white/80 ring-[color:var(--line)]"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                        filled ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-500"
                      }`}
                    >
                      {filled ? "OK" : "—"}
                    </span>
                    <p className="truncate text-[11px] font-medium leading-tight">
                      {VIKA_CHECKLIST_LABELS[field]}
                      <span className="ml-1.5 font-normal text-[color:var(--muted)]">
                        {filled ? value : "—"}
                      </span>
                    </p>
                  </div>
                  {isPresupuesto && filled ? (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${
                        presupuestoState.tone === "organic"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-emerald-100 text-emerald-900"
                      }`}
                    >
                      {presupuestoState.label}
                    </span>
                  ) : null}
                </li>
              );
            })}
            <li
              className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 ring-1 ${
                typeof summary[VIKA_NARRATIVE_FIELD] === "string" &&
                summary[VIKA_NARRATIVE_FIELD] &&
                summary[VIKA_NARRATIVE_FIELD].trim().length > 0
                  ? "bg-emerald-50 ring-emerald-200"
                  : "bg-white/80 ring-[color:var(--line)]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                typeof summary[VIKA_NARRATIVE_FIELD] === "string" &&
                summary[VIKA_NARRATIVE_FIELD] &&
                summary[VIKA_NARRATIVE_FIELD].trim().length > 0
                      ? "bg-emerald-600 text-white"
                      : "bg-stone-200 text-stone-500"
                  }`}
                >
                  {typeof summary[VIKA_NARRATIVE_FIELD] === "string" && summary[VIKA_NARRATIVE_FIELD] && summary[VIKA_NARRATIVE_FIELD].trim().length > 0 ? "OK" : "—"}
                </span>
                <p className="truncate text-[11px] font-medium leading-tight">
                  {VIKA_CHECKLIST_LABELS[VIKA_NARRATIVE_FIELD]}
                  <span className="ml-1.5 font-normal text-[color:var(--muted)]">
                    {summary[VIKA_NARRATIVE_FIELD] || "Narrativa opcional"}
                  </span>
                </p>
              </div>
            </li>
          </ul>

          <div className="mt-6 rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">Estado de cierre</div>
            <p className="mt-2 text-sm leading-7">
              {hasLockTag
                ? "Vika emitio el tag [SYS_ACTION: LOCK_SUCCESS]. El brief ya puede enviarse a revision humana."
                : "Aun no se detecta el tag de cierre. El cliente debe completar la conversacion con Vika."}
            </p>
            {vikaJson ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-[color:var(--accent-deep)]">
                  Ver JSON extraido del ultimo cierre
                </summary>
                <pre className="mt-2 max-h-72 overflow-auto rounded-[14px] bg-stone-900 p-3 text-[11px] leading-5 text-emerald-100">
                  {JSON.stringify(vikaJson, null, 2)}
                </pre>
              </details>
            ) : null}
          </div>

          {isEditable ? (
            <form action={submitForReviewAction} className="mt-5 space-y-2">
              <input name="briefId" type="hidden" value={brief.id} />
              <input name="versionId" type="hidden" value={currentVersion.id} />
              {brief.container.project?.id ? (
                <input name="projectId" type="hidden" value={brief.container.project.id} />
              ) : null}
              <button
                className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
              >
                Brief completado: enviar a revision del operador
              </button>
              <p className="text-xs leading-6 text-[color:var(--muted)]">
                Detecta automaticamente el tag de cierre y mapea el JSON de 8 puntos al resumen estructurado.
              </p>
            </form>
          ) : null}
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Edicion del resumen estructurado</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Campos persistidos por version</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            Mantenemos la edicion manual de los 8 puntos Vika + campos auxiliares. El operador puede ajustar el resumen
            extraido por el modelo cuando lo considere necesario.
          </p>

          <form action={saveSummaryAction} className="mt-5 space-y-4">
            <input name="briefId" type="hidden" value={brief.id} />
            <input name="versionId" type="hidden" value={currentVersion.id} />

            <div className="grid gap-4 md:grid-cols-2">
              {VIKA_CHECKLIST_FIELDS.map((field) => (
                <label key={field} className="block text-sm">
                  <span className="mb-2 block font-medium">{VIKA_CHECKLIST_LABELS[field]}</span>
                  <textarea
                    className="min-h-20 w-full rounded-[20px] border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                    defaultValue={summary[field]}
                    disabled={!currentVersion.editable}
                    name={field}
                    placeholder={field === "presupuesto" ? "Ej. $3,000 MXN / mes" : `Captura de ${VIKA_CHECKLIST_LABELS[field]}`}
                  />
                </label>
              ))}
            </div>

            <label className="block text-sm">
              <span className="mb-2 block font-medium">{VIKA_CHECKLIST_LABELS[VIKA_NARRATIVE_FIELD]}</span>
              <textarea
                className="min-h-20 w-full rounded-[20px] border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                defaultValue={summary[VIKA_NARRATIVE_FIELD]}
                disabled={!currentVersion.editable}
                name={VIKA_NARRATIVE_FIELD}
                placeholder="Historia y contexto opcional"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!currentVersion.editable}
                type="submit"
              >
                Guardar resumen
              </button>
              <span className="text-sm text-[color:var(--muted)]">La version aprobada queda bloqueada y no se edita en esta misma ruta.</span>
            </div>
          </form>
        </article>

        <article className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Revision humana minima</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Decision del operador</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            La revision usa la membership activa de operador del tenant cuando existe. El actor tecnico queda reservado para eventos automatizados del flujo.
          </p>
          <form action={operatorReviewAction} className="mt-5 space-y-4">
            <input name="briefId" type="hidden" value={brief.id} />
            <input name="versionId" type="hidden" value={currentVersion.id} />
            <label className="block text-sm font-medium">
              Nota de revision
              <textarea
                className="mt-2 min-h-28 w-full rounded-[24px] border border-[color:var(--line)] bg-white/80 px-4 py-4 outline-none"
                name="note"
                placeholder="Registrar observaciones de aprobacion, devolucion o reconduccion."
              />
            </label>
            <label className="block text-sm font-medium">
              Slot comercial sugerido por operador
              <input
                className="mt-2 w-full rounded-[20px] border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                defaultValue={summary.recommendedProductSlotKey}
                name="recommendedProductSlotKey"
                placeholder="Ej. slot_lanzamiento_conversacional"
                type="text"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-full bg-[color:var(--ink)] px-5 py-3 text-sm font-semibold text-white" name="decision" type="submit" value="review_started">
                Marcar revision en curso
              </button>
              <button className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white" name="decision" type="submit" value="approved">
                Aprobar y bloquear
              </button>
              <button className="rounded-full bg-white px-5 py-3 text-sm font-semibold ring-1 ring-[color:var(--line)]" name="decision" type="submit" value="returned">
                Devolver a rework
              </button>
              <button className="rounded-full bg-white px-5 py-3 text-sm font-semibold ring-1 ring-[color:var(--line)]" name="decision" type="submit" value="reconducted">
                Reconducir slot comercial
              </button>
            </div>
          </form>
        </article>
      </section>

      <section className="panel rounded-[30px] px-6 py-6">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Resumen para el cliente</p>
        <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Mensaje final humano</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[color:var(--muted)]">
          {summary.clientFacingSummary || "Aun no se ha generado un resumen para el cliente. Aparecera aqui cuando se cierre el brief."}
        </p>
      </section>

      {/* ── Chat contextual del brief — IMPL-20260506-33 ──────────────────── */}
      <section className="panel rounded-[30px] px-6 py-6">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Conversacion operativa</p>
        <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
          Chat del brief
        </h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
          Seguimiento y decisiones operativas sobre este brief. Independiente de la conversacion fuente del cliente.
        </p>

        <BriefChatBubbles
          className="mt-5"
          messages={briefChat.messages.map<ChatBubbleItem>((msg) => ({
            id: msg.id,
            text: msg.messageText,
            role: msg.actorRole,
            actorLabel: actorRoleLabel(msg.actorRole),
            createdAt: msg.createdAt
          }))}
          maxHeight="420px"
          rightRoles={["operator", "designer"]}
          emptyState={
            <p className="text-center text-[11px] text-[color:var(--muted)]">
              Sin mensajes aun — inicia la conversacion operativa sobre este brief.
            </p>
          }
          footer={
            <form action={addBriefChatMessageAction} className="flex gap-2 border-t border-[color:var(--line)] bg-white/60 px-3 py-3">
              <input type="hidden" name="briefId" value={brief.id} />
              <input type="hidden" name="tenantId" value={brief.tenantId} />
              <input
                name="messageText"
                placeholder="Escribe un mensaje operativo sobre este brief..."
                className="flex-1 rounded-[14px] border border-[color:var(--line)] bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[color:var(--accent-deep)]"
              />
              <button
                type="submit"
                className="rounded-[14px] bg-[color:var(--accent-deep)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
              >
                Enviar
              </button>
            </form>
          }
        />
      </section>
    </div>
  );
}
