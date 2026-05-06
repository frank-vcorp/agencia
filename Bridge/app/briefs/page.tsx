/**
 * IMPL-20260505-22
 * Respaldo: context/CLIENTS_Y_PROJECTS_V1.md, context/SPECs/SPEC_ARCH-20260505-22_clients_y_projects_v1.md, context/SPECs/SPEC_ARCH-20260505-21_memberships_users_y_actor_efectivo_v1.md, context/IDENTIDAD_Y_MEMBERSHIPS_V1.md, context/SPECs/SPEC_ARCH-20260505-19_agente_briefing_persistido_y_revision_humana.md, PROYECTO.md
 */
import { revalidatePath } from "next/cache";

import {
  advanceBriefStage,
  appendClientBriefMessage,
  briefingStages,
  buildAssistantGuidance,
  createBriefForDefaultTenant,
  createDerivedBriefVersion,
  getBriefWorkspace,
  getCriticalMissingFields,
  reviewBriefVersion,
  submitBriefForOperatorReview,
  updateBriefSummary,
  type BriefVersion,
  type StructuredBriefSummary
} from "@/lib/briefing";
import {
  actorRoleLabel,
  appendBriefMessage,
  formatMessageTimestamp,
  getBriefChat,
  type EntityChat
} from "@/lib/chat";
import { getTenantIdentityContext } from "@/lib/identity";

const summarySections: Array<{
  title: string;
  detail: string;
  fields: Array<{ key: keyof StructuredBriefSummary; label: string; placeholder: string; multiline?: boolean }>;
}> = [
  {
    title: "Etapa 1. Discovery",
    detail: "Captura objetivo, contexto y motivo principal de la solicitud.",
    fields: [
      { key: "projectObjective", label: "Objetivo del proyecto", placeholder: "Ej. Validar una oferta y generar reuniones calificadas.", multiline: true },
      { key: "expectedResult", label: "Resultado esperado", placeholder: "Ej. 20 leads calificados en 30 dias.", multiline: true },
      { key: "businessContext", label: "Contexto del negocio", placeholder: "Ej. Marca nueva con base organica pequeña.", multiline: true },
      { key: "requestReason", label: "Motivo principal de la solicitud", placeholder: "Ej. Lanzamiento de servicio o necesidad de ordenar la captacion.", multiline: true },
      { key: "mainOffer", label: "Oferta principal", placeholder: "Ej. Programa, servicio o producto que se quiere mover.", multiline: true }
    ]
  },
  {
    title: "Etapa 2. Precision",
    detail: "Aterriza publico, canal, CTA, tono, restricciones y tiempos.",
    fields: [
      { key: "audience", label: "Publico objetivo", placeholder: "Ej. Dueños de negocio con ventas por WhatsApp.", multiline: true },
      { key: "platform", label: "Plataforma o canal", placeholder: "Ej. Instagram, landing y WhatsApp.", multiline: true },
      { key: "deliverable", label: "Entregable esperado", placeholder: "Ej. Sistema de mensajes, anuncios y landing corta.", multiline: true },
      { key: "cta", label: "CTA principal", placeholder: "Ej. Agendar llamada o pedir diagnostico.", multiline: true },
      { key: "tone", label: "Tono", placeholder: "Ej. Claro, consultivo y sin exageraciones.", multiline: true },
      { key: "restrictions", label: "Restricciones", placeholder: "Ej. No usar testimonios aun ni promesas agresivas.", multiline: true },
      { key: "references", label: "Referencias o materiales", placeholder: "Ej. Landing actual, reels o brochures existentes.", multiline: true },
      { key: "urgency", label: "Urgencia o fecha objetivo", placeholder: "Ej. Lanzamiento en dos semanas.", multiline: true },
      { key: "messageCore", label: "Mensaje principal", placeholder: "Ej. Diferencial o idea central que debe quedar clara.", multiline: true }
    ]
  },
  {
    title: "Etapa 3. Commercial Fit",
    detail: "Cierra faltantes tolerables y orientacion hacia slot comercial configurable.",
    fields: [
      { key: "gaps", label: "Faltantes tolerables", placeholder: "Ej. Aun falta validacion de presupuesto exacto.", multiline: true },
      { key: "contradictions", label: "Contradicciones detectadas", placeholder: "Ej. Quiere ventas rapidas pero aun no define oferta.", multiline: true },
      { key: "structuringConfidence", label: "Confianza de estructuracion", placeholder: "Ej. alta, media o baja con razon.", multiline: true },
      { key: "recommendedProductSlotKey", label: "Recommended product slot key", placeholder: "Ej. slot_lanzamiento_conversacional" },
      { key: "recommendedProductConfidence", label: "Confianza del encaje", placeholder: "Ej. alta o media con criterio." },
      { key: "commercialFitReason", label: "Razon de encaje comercial", placeholder: "Explica por que este caso calza o por que requiere revision comercial.", multiline: true },
      { key: "upsellSignal", label: "Senal de upsell o reconduccion", placeholder: "Ej. Puede derivar a paquete de activos recurrentes.", multiline: true },
      { key: "operatorReviewNote", label: "Nota para revision del operador", placeholder: "Observaciones concretas para aprobacion, devolucion o reconduccion.", multiline: true }
    ]
  }
];

async function startBriefAction() {
  "use server";

  await createBriefForDefaultTenant();
  revalidatePath("/briefs");
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

async function advanceStageAction(formData: FormData) {
  "use server";

  await advanceBriefStage({
    briefId: String(formData.get("briefId") ?? ""),
    versionId: String(formData.get("versionId") ?? "")
  });
  revalidatePath("/briefs");
}

async function submitForReviewAction(formData: FormData) {
  "use server";

  await submitBriefForOperatorReview({
    briefId: String(formData.get("briefId") ?? ""),
    versionId: String(formData.get("versionId") ?? "")
  });
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

function buildSummaryPatchSeed(): StructuredBriefSummary {
  return {
    projectObjective: "",
    expectedResult: "",
    businessContext: "",
    requestReason: "",
    mainOffer: "",
    audience: "",
    platform: "",
    deliverable: "",
    cta: "",
    tone: "",
    restrictions: "",
    references: "",
    urgency: "",
    messageCore: "",
    gaps: "",
    contradictions: "",
    structuringConfidence: "",
    recommendedProductSlotKey: "",
    recommendedProductConfidence: "",
    commercialFitReason: "",
    upsellSignal: "",
    operatorReviewNote: ""
  };
}

function statusLabel(status: BriefVersion["status"] | null) {
  if (!status) {
    return "Sin version activa";
  }

  return status.replaceAll("_", " ");
}

function stageLabel(stage: BriefVersion["stage"]) {
  if (stage === "discovery") {
    return "Discovery";
  }

  if (stage === "precision") {
    return "Precision";
  }

  return "Commercial fit";
}

export default async function BriefsPage() {
  const brief = await getBriefWorkspace();
  const identity = await getTenantIdentityContext();
  const currentVersion = brief?.currentVersion ?? null;
  const missingFields = currentVersion ? getCriticalMissingFields(currentVersion.structuredSummary) : [];
  const ownerLabel = brief?.container.project?.ownerMembershipId && brief.container.project.ownerMembershipId === identity?.operatorMembership?.id
    ? identity.operatorMembership.displayName
    : "Sin owner_membership operativa";

  // Chat contextual del brief — IMPL-20260506-33
  const briefChat: EntityChat = brief ? await getBriefChat(brief.id) : { thread: null, messages: [] };

  if (!brief || !currentVersion) {
    return (
      <div className="space-y-6">
        <section className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Brief persistido V1</p>
          <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">Primer objeto operativo listo para iniciar</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[color:var(--muted)]">
            Esta vista crea el primer brief del tenant por defecto y lo deja listo para discovery, precision, commercial fit y revision humana minima del operador.
          </p>
          <form action={startBriefAction} className="mt-6">
            <button className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white" type="submit">
              Crear brief persistido de demo controlada
            </button>
          </form>
        </section>
      </div>
    );
  }

  const guidance = buildAssistantGuidance(currentVersion.stage, currentVersion.structuredSummary);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="panel rounded-[30px] px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Tenant {brief.tenantSlug}</p>
              <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">Brief actual v{currentVersion.versionNumber}</h1>
              <p className="mt-2 max-w-3xl text-base leading-7 text-[color:var(--muted)]">
                Flujo persistido con fuente primaria conversacional, resumen estructurado vigente y decision humana antes del bloqueo final.
              </p>
            </div>
            <div className="rounded-[24px] bg-[color:var(--accent-soft)] px-4 py-4 text-[color:var(--accent-deep)] ring-1 ring-[color:rgba(200,93,39,0.18)]">
              <div className="text-[11px] uppercase tracking-[0.22em]">Estado actual</div>
              <div className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold capitalize">{statusLabel(currentVersion.status)}</div>
              <p className="mt-2 text-sm leading-6">Canal fuente: {brief.sourceChannel}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {briefingStages.map((stage, index) => {
              const isActive = currentVersion.stage === stage;
              const isDone = briefingStages.indexOf(currentVersion.stage) > index || currentVersion.status === "pending_operator_review" || currentVersion.status === "operator_review_in_progress" || currentVersion.status === "approved_locked";

              return (
                <div
                  key={stage}
                  className={`rounded-[24px] px-4 py-4 ring-1 ${
                    isActive
                      ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-deep)] ring-[color:rgba(200,93,39,0.18)]"
                      : isDone
                        ? "bg-white/80 ring-[color:var(--line)]"
                        : "bg-[color:rgba(255,255,255,0.52)] ring-[color:rgba(27,31,35,0.08)]"
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-[0.22em]">Etapa {index + 1}</div>
                  <div className="mt-2 font-medium">{stageLabel(stage)}</div>
                  <p className="mt-2 text-sm leading-6 opacity-80">{isActive ? "Etapa vigente" : isDone ? "Etapa recorrida" : "Pendiente"}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">Operator membership</div>
              <div className="mt-2 font-medium">{identity?.operatorMembership?.displayName ?? "Operador demo pendiente"}</div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{identity?.operatorMembership?.email ?? "Sin membership activa de operador."}</p>
            </div>
            <div className="rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">Client membership</div>
              <div className="mt-2 font-medium">{identity?.clientMembership?.displayName ?? "Cliente demo pendiente"}</div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{identity?.clientMembership?.email ?? "Sin membership activa de cliente."}</p>
            </div>
            <div className="rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">Actor tecnico</div>
              <div className="mt-2 font-medium">{identity?.serviceAgent?.name ?? "Agente tecnico pendiente"}</div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                {identity?.serviceAgent?.scopes[0]
                  ? `${identity.serviceAgent.scopes[0].resourceType} · ${identity.serviceAgent.scopes[0].operation}`
                  : "Sin scope inicial de briefing."}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">Client operativo</div>
              <div className="mt-2 font-medium">{brief.container.client?.name ?? "Cliente demo controlado pendiente"}</div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                {brief.container.client?.primaryContactChannel ?? brief.container.client?.legalName ?? "El brief aun no tiene contenedor client-project activo."}
              </p>
            </div>
            <div className="rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">Project operativo</div>
              <div className="mt-2 font-medium">{brief.container.project?.name ?? "Proyecto demo controlado pendiente"}</div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                {brief.container.project
                  ? `${brief.container.project.projectType} · ${brief.container.project.status}`
                  : "Sin project asociado al brief activo."}
              </p>
            </div>
            <div className="rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">Owner del proyecto</div>
              <div className="mt-2 font-medium">{ownerLabel}</div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                {brief.container.source === "brief"
                  ? "Contenedor ligado directamente al caso activo."
                  : brief.container.source === "tenant_active"
                    ? "Contenedor demo activo heredado del tenant para iniciar el caso."
                    : "No existe contenedor demo disponible todavia."}
              </p>
            </div>
          </div>
        </article>

        <aside className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Resumen final persistido</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Cierre conversacional</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[color:var(--muted)]">
            {currentVersion.finalSummaryText || "Aun no existe resumen final consolidado para esta version."}
          </p>
          <div className="mt-5 rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">Siguiente guia del agente</div>
            <p className="mt-2 text-sm leading-7">{guidance}</p>
          </div>
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

          <div className="mt-5 space-y-3">
            {currentVersion.messages.map((message) => (
              <div key={message.id} className="rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  <span>{message.actorLabel}</span>
                  <span>{stageLabel(message.stage)}</span>
                </div>
                <p className="mt-2 text-sm leading-7">{message.messageText}</p>
                <div className="mt-2 text-xs text-[color:var(--muted)]">{new Date(message.createdAt).toLocaleString("es-ES")}</div>
              </div>
            ))}
          </div>

          <form action={addMessageAction} className="mt-5 space-y-3">
            <input name="briefId" type="hidden" value={brief.id} />
            <input name="versionId" type="hidden" value={currentVersion.id} />
            <label className="block text-sm font-medium">Agregar mensaje fuente del cliente</label>
            <textarea
              className="min-h-28 w-full rounded-[24px] border border-[color:var(--line)] bg-white/80 px-4 py-4 text-sm outline-none"
              disabled={!currentVersion.editable}
              name="messageText"
              placeholder="Texto de demo controlada para registrar la conversacion fuente del brief."
            />
            <button
              className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!currentVersion.editable}
              type="submit"
            >
              Registrar mensaje
            </button>
          </form>
        </article>

        <article className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Resumen estructurado</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Campos persistidos por version</h2>

          <form action={saveSummaryAction} className="mt-5 space-y-6">
            <input name="briefId" type="hidden" value={brief.id} />
            <input name="versionId" type="hidden" value={currentVersion.id} />

            {summarySections.map((section) => (
              <div key={section.title} className="rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{section.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{section.detail}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {section.fields.map((field) => (
                    <label key={field.key} className="block text-sm">
                      <span className="mb-2 block font-medium">{field.label}</span>
                      {field.multiline ? (
                        <textarea
                          className="min-h-24 w-full rounded-[20px] border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                          defaultValue={currentVersion.structuredSummary[field.key]}
                          disabled={!currentVersion.editable}
                          name={field.key}
                          placeholder={field.placeholder}
                        />
                      ) : (
                        <input
                          className="w-full rounded-[20px] border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                          defaultValue={currentVersion.structuredSummary[field.key]}
                          disabled={!currentVersion.editable}
                          name={field.key}
                          placeholder={field.placeholder}
                          type="text"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-3">
              <button
                className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!currentVersion.editable}
                type="submit"
              >
                Guardar resumen estructurado
              </button>
              <span className="text-sm text-[color:var(--muted)]">La version aprobada queda bloqueada y no se edita en esta misma ruta.</span>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap gap-3">
            {currentVersion.editable && currentVersion.stage !== "commercial_fit" ? (
              <form action={advanceStageAction}>
                <input name="briefId" type="hidden" value={brief.id} />
                <input name="versionId" type="hidden" value={currentVersion.id} />
                <button className="rounded-full bg-[color:var(--ink)] px-5 py-3 text-sm font-semibold text-white" type="submit">
                  Avanzar a la siguiente etapa
                </button>
              </form>
            ) : null}

            {currentVersion.editable && currentVersion.stage === "commercial_fit" ? (
              <form action={submitForReviewAction} className="space-y-2">
                <input name="briefId" type="hidden" value={brief.id} />
                <input name="versionId" type="hidden" value={currentVersion.id} />
                <button className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white" type="submit">
                  Cerrar conversacion y enviar a pending operator review
                </button>
                <p className="text-xs leading-6 text-[color:var(--muted)]">
                  {missingFields.length > 0
                    ? `Antes de enviar faltan: ${missingFields.join(", ")}.`
                    : "El resumen ya cumple el minimo para pasar a revision humana."}
                </p>
              </form>
            ) : null}
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
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
                defaultValue={currentVersion.structuredSummary.recommendedProductSlotKey}
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

        <article className="panel rounded-[30px] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">Estado de revision</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">Historial del operador</h2>
          <div className="mt-5 space-y-3">
            {currentVersion.reviewEvents.length === 0 ? (
              <div className="rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)] text-sm text-[color:var(--muted)]">
                Aun no hay eventos de revision para esta version.
              </div>
            ) : (
              currentVersion.reviewEvents.map((event) => (
                <div key={event.id} className="rounded-[24px] bg-white/80 px-4 py-4 ring-1 ring-[color:var(--line)]">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    <span>{event.createdByLabel}</span>
                    <span>{event.eventType.replaceAll("_", " ")}</span>
                  </div>
                  <p className="mt-2 text-sm leading-7">{event.note || "Sin nota adicional."}</p>
                  <div className="mt-2 text-xs text-[color:var(--muted)]">
                    {event.recommendedProductSlotKey ? `Slot: ${event.recommendedProductSlotKey} · ` : ""}
                    {new Date(event.createdAt).toLocaleString("es-ES")}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
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

        <div className="mt-5">
          {briefChat.messages.length === 0 ? (
            <p className="py-3 text-center text-[11px] text-[color:var(--muted)]">
              Sin mensajes aun — inicia la conversacion operativa sobre este brief.
            </p>
          ) : (
            <div className="space-y-2">
              {briefChat.messages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-[14px] bg-white/70 px-3 py-2.5 ring-1 ring-[color:var(--line)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)]">
                      {actorRoleLabel(msg.actorRole)}
                    </span>
                    <span className="text-[10px] text-[color:var(--muted)]">
                      {formatMessageTimestamp(msg.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6">{msg.messageText}</p>
                </div>
              ))}
            </div>
          )}

          <form action={addBriefChatMessageAction} className="mt-3 flex gap-2">
            <input type="hidden" name="briefId" value={brief.id} />
            <input type="hidden" name="tenantId" value={brief.tenantId} />
            <input
              name="messageText"
              placeholder="Escribe un mensaje operativo sobre este brief..."
              className="flex-1 rounded-[14px] border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
            />
            <button
              type="submit"
              className="rounded-[14px] bg-[color:var(--accent-deep)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Enviar
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
