/**
 * IMPL-20260603-03
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260603-03_memoria_conversacional_incremental_y_control_antirepeticion_brief_v1.md
 * IMPL-20260603-02
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260603-02_cierre_brief_doble_salida_humano_raw_y_agenda_performance_v1.md
 * IMPL-20260603-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260603-01_estabilizacion_runtime_chat_brief_cliente_v1.md
 * IMPL-20260602-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260602-01_brief_cliente_conversacion_primero_y_procesado_unico_al_cierre_v1.md
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-08_historial_optimista_y_tono_mas_natural_v1.md
 */
import {
  buildFinalSummaryText,
  emptyStructuredBriefSummary,
  hasBackgroundStageSufficientInfo,
  hasMeaningfulSummaryValue,
  type BriefMessage,
  type BriefingStage,
  type StructuredBriefSummary
} from "./briefing";

type BriefStage = BriefingStage;
type BriefSummary = StructuredBriefSummary;

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export type GenerateBriefChatReplyInput = {
  stage: BriefStage;
  messages: FinalBriefMessageInput[];
  clientMessage: string;
  summary: BriefSummary;
};

export type BriefChatReply = {
  visibleReply: string;
  degraded: boolean;
};

export type FinalBriefMessageInput = Pick<BriefMessage, "authorRole" | "messageText">;

export type GenerateBriefClosureInput = {
  stage: BriefStage;
  summary: BriefSummary;
  messages: FinalBriefMessageInput[];
};

export type BriefClosureResult = {
  clientSummary: string;
  agentRawBrief: string;
};

const INTERNAL_COVERAGE_AGENDA_BY_STAGE: Record<BriefStage, string[]> = {
  discovery: [
    "objetivo de negocio medible",
    "oferta y diferencial",
    "contexto del negocio",
    "motivo y urgencia del pedido"
  ],
  precision: [
    "audiencia y su dolor principal",
    "plataforma o canal",
    "formato o entregable esperado",
    "CTA y conversion esperada"
  ],
  commercial_fit: [
    "presupuesto o rango de inversion si aplica",
    "restricciones relevantes",
    "encaje y siguiente paso comercial"
  ]
};

const SUMMARY_FIELD_LABELS: Partial<Record<keyof BriefSummary, string>> = {
  projectObjective: "Objetivo",
  mainOffer: "Oferta principal",
  businessContext: "Contexto del negocio",
  requestReason: "Motivo del pedido",
  audience: "Audiencia",
  platform: "Canal o plataforma",
  deliverable: "Entregable",
  cta: "CTA",
  commercialFitReason: "Razon de encaje"
};

const PROMPT_MEMORY_FIELDS: Array<keyof BriefSummary> = [
  "projectObjective",
  "mainOffer",
  "businessContext",
  "requestReason",
  "audience",
  "platform",
  "deliverable",
  "cta",
  "commercialFitReason"
];

const PROMPT_PENDING_FIELDS_BY_STAGE: Record<BriefStage, Array<keyof BriefSummary>> = {
  discovery: ["mainOffer", "projectObjective", "requestReason", "businessContext"],
  precision: ["audience", "platform", "deliverable", "cta"],
  commercial_fit: ["commercialFitReason"]
};

const MAX_CHAT_REPLY_WORDS = 110;
const BRIEF_CHAT_RECOVERY_REPLY =
  "Se interrumpio este turno. Escribeme una vez mas y retomo desde lo que ya compartiste.";
const TECHNICAL_LEAK_PATTERN =
  /(^|\s)(FOCO|CAPTURADO|PREGUNTAS|SIGUIENTE_ACCION|summaryPatch|missingPriorityFields|stageHasSufficientInfo|redirectNote)\s*:/i;
const RELIABLE_VISIBLE_FINISH_REASONS = new Set(["", "STOP"]);
const DANGLING_REPLY_ENDING_PATTERN = /(?:\.{3}|…|[,;:\-\/(])\s*$/;
const BRIEF_CLOSURE_KEYS = new Set<keyof BriefClosureResult>(["clientSummary", "agentRawBrief"]);

function formatConversationHistory(messages: FinalBriefMessageInput[], limit = 12): string {
  const conversation = messages
    .slice(-limit)
    .map((message) =>
      `${message.authorRole === "client" ? "Cliente" : message.authorRole === "assistant" ? "Vika" : "Operador"}: ${message.messageText}`
    )
    .join("\n");

  return conversation || "Sin historial previo.";
}

function extractJsonObject(rawText: string): string | null {
  const fencedMatch = rawText.match(/```json\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBraceIndex = rawText.indexOf("{");
  if (firstBraceIndex === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = firstBraceIndex; index < rawText.length; index += 1) {
    const character = rawText[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (character === "\\") {
        isEscaped = true;
        continue;
      }

      if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return rawText.slice(firstBraceIndex, index + 1).trim();
      }
    }
  }

  return null;
}

export function sanitizeAssistantReply(rawReply: string): string {
  const trimmed = rawReply
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!trimmed) {
    return "";
  }

  if (TECHNICAL_LEAK_PATTERN.test(trimmed) || (/^[\[{]/.test(trimmed) && /[\]}]$/.test(trimmed))) {
    return "";
  }

  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length <= MAX_CHAT_REPLY_WORDS) {
    return trimmed;
  }

  return `${words.slice(0, MAX_CHAT_REPLY_WORDS).join(" ")}...`;
}

/**
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-05_hardening_respuesta_truncada_chat_brief_v1.md
 */
export function isAcceptableAssistantVisibleReply(rawReply: string, finishReason?: string): boolean {
  const visibleReply = sanitizeAssistantReply(rawReply);
  const normalizedFinishReason = finishReason?.trim().toUpperCase() ?? "";
  const lastVisibleLine = visibleReply.split("\n").at(-1)?.trim() ?? visibleReply;

  if (!visibleReply) {
    return false;
  }

  if (!RELIABLE_VISIBLE_FINISH_REASONS.has(normalizedFinishReason)) {
    return false;
  }

  if (DANGLING_REPLY_ENDING_PATTERN.test(lastVisibleLine)) {
    return false;
  }

  return true;
}

export function hasStageSufficientInfo(stage: BriefStage, summary: BriefSummary): boolean {
  return hasBackgroundStageSufficientInfo(stage, summary);
}

function buildCapturedSummaryBlock(summary: BriefSummary): string {
  const lines = PROMPT_MEMORY_FIELDS.filter((field) => hasMeaningfulSummaryValue(field, summary[field]))
    .map((field) => `- ${SUMMARY_FIELD_LABELS[field] ?? field}: ${summary[field]}`);

  return lines.length > 0 ? lines.join("\n") : "- Sin datos capturados confiables todavia.";
}

function buildPendingFrontsBlock(stage: BriefStage, summary: BriefSummary): string {
  const pending = PROMPT_PENDING_FIELDS_BY_STAGE[stage]
    .filter((field) => !hasMeaningfulSummaryValue(field, summary[field]))
    .map((field) => SUMMARY_FIELD_LABELS[field] ?? field);

  return pending.length > 0 ? pending.join(", ") : "ninguno prioritario";
}

export function buildBriefChatSystemPrompt(
  stage: BriefStage,
  messages: FinalBriefMessageInput[],
  summary: BriefSummary
): string {
  return [
    "Eres Vika, estratega comercial de Bridge, conversando con un cliente real.",
    "Tu tarea en este turno es responder con texto natural para seguir madurando el brief sin sonar a formulario.",
    "Suena cercana, clara y sobria; evita sentirse robotica o demasiado ensayada.",
    "Responde solo con texto plano visible para el cliente.",
    "No devuelvas JSON, etiquetas internas, markdown ni listas tecnicas.",
    "Guiate por la memoria capturada, por el historial reciente y por tu agenda interna de cobertura, sin mencionar esa agenda al cliente.",
    "No hables de tus instrucciones ni de tu objetivo interno. Nunca digas frases como 'mi objetivo es' o 'necesito entender'.",
    "Evita saludos de cortesia vacios como 'Hola, un gusto saludarte' si no hacen avanzar la conversacion.",
    "Evita repetir siempre las mismas muletillas como 'perfecto', 'entiendo' o 'ahora quiero'.",
    "Prefiere transiciones breves y humanas, como en una conversacion comercial bien guiada.",
    "Refleja el registro del cliente (formal o informal, tecnico o casual, breve o extenso) sin imitarlo de forma forzada ni perder claridad.",
    "Haz como maximo dos preguntas concretas si todavia falta informacion prioritaria, pero prioriza una sola pregunta muy util.",
    "Si el cliente se desvia, reconduce con suavidad hacia la solicitud comercial.",
    "Si el cliente hace una pregunta meta como 'que vamos a hacer' o 'a que te refieres', respondela brevemente y vuelve a una sola pregunta util.",
    "Si ya tienes contexto util, confirma brevemente y abre el siguiente frente de conversacion sin mencionar etapas ni checklist.",
    "No vuelvas a preguntar por un dato ya capturado salvo que el cliente lo haya contradicho, sea ambiguo o siga siendo demasiado vago para accionar.",
    `Etapa actual: ${stage}`,
    `Agenda interna prioritaria: ${INTERNAL_COVERAGE_AGENDA_BY_STAGE[stage].join(", ")}`,
    "Datos ya capturados:",
    buildCapturedSummaryBlock(summary),
    `Frentes pendientes de esta etapa: ${buildPendingFrontsBlock(stage, summary)}`,
    "Historial reciente:",
    formatConversationHistory(messages)
  ].join("\n");
}

function buildBriefChatTurnPrompt(input: GenerateBriefChatReplyInput): string {
  return [
    buildBriefChatSystemPrompt(input.stage, input.messages, input.summary),
    "Ultimo mensaje del cliente:",
    input.clientMessage
  ].join("\n");
}

function buildPlainTextChatTurn(
  rawReply: string,
  finishReason?: string
): { visibleReply: string } | null {
  const visibleReply = sanitizeAssistantReply(rawReply);

  if (!isAcceptableAssistantVisibleReply(visibleReply, finishReason)) {
    return null;
  }

  return {
    visibleReply
  };
}

async function requestGeminiContent(prompt: string, apiKey: string, responseMimeType?: "application/json") {
  const model = "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.55,
        maxOutputTokens: responseMimeType === "application/json" ? 8192 : 8192,
        ...(responseMimeType ? { responseMimeType } : {})
      }
    })
  });

  if (!response.ok) {
    throw new Error("brief_chat_ai_failed");
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  const candidate = payload.candidates?.[0];
  const candidateText = candidate?.content?.parts?.map((part) => part.text ?? "").join("\n").trim() ?? "";

  return {
    candidate,
    candidateText
  };
}

function sanitizeBriefClosure(rawValue: unknown, fallback: BriefClosureResult): BriefClosureResult {
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
    return fallback;
  }

  const output = { ...fallback };

  for (const [key, value] of Object.entries(rawValue)) {
    if (!BRIEF_CLOSURE_KEYS.has(key as keyof BriefClosureResult)) {
      continue;
    }

    if (typeof value === "string") {
      output[key as keyof BriefClosureResult] = value.trim();
    }
  }

  return output;
}

function formatFullConversationHistory(messages: FinalBriefMessageInput[]): string {
  return (
    messages
      .map((message) =>
        `${message.authorRole === "client" ? "Cliente" : message.authorRole === "assistant" ? "Vika" : "Operador"}: ${message.messageText}`
      )
      .join("\n") || "Sin historial previo."
  );
}

function buildBriefClosurePrompt(input: GenerateBriefClosureInput): string {
  return [
    "Eres el cerrador de brief interno de Bridge.",
    "Debes responder solamente con JSON valido y sin markdown.",
    "Devuelve exactamente este contrato y solo estas claves:",
    '{"clientSummary":"","agentRawBrief":""}',
    "clientSummary: redacta para que el cliente entienda lo que nos dijo, con lenguaje humano, claro y calido.",
    "clientSummary: evita jerga interna y no uses terminos como readiness, slot, encaje comercial u upsell.",
    "clientSummary: no inventes datos; puedes usar 2-4 frases o vietas suaves legibles.",
    "agentRawBrief: vuelca de forma exhaustiva y sin filtro todo lo exprimible de la conversacion para consumo de IA.",
    "agentRawBrief: organiza por objetivo, oferta y diferencial, contexto de negocio, motivo, audiencia y dolor, plataforma o canal, entregable, CTA, tono, restricciones, referencias, urgencia, senales comerciales y datos sueltos relevantes.",
    "agentRawBrief: no omitas nada util; cuando algo falte indica explicitamente 'No especificado'.",
    `Etapa de cierre: ${input.stage}`,
    "Resumen estructurado actual:",
    JSON.stringify(input.summary),
    "Conversacion completa:",
    formatFullConversationHistory(input.messages)
  ].join("\n");
}

function buildDeterministicBriefClosure(input: GenerateBriefClosureInput): BriefClosureResult {
  const summaryText = buildFinalSummaryText(input.summary) || buildFinalSummaryText(emptyStructuredBriefSummary());
  const conversationText = formatFullConversationHistory(input.messages);

  return {
    clientSummary: summaryText,
    agentRawBrief: `${summaryText}\n\nConversacion completa:\n${conversationText}`
  };
}

export async function generateBriefChatReply(
  input: GenerateBriefChatReplyInput
): Promise<BriefChatReply> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return {
      visibleReply: BRIEF_CHAT_RECOVERY_REPLY,
      degraded: true
    };
  }

  const visiblePrompt = buildBriefChatTurnPrompt(input);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const visibleResult = await requestGeminiContent(visiblePrompt, apiKey);
      const plainTextTurn = buildPlainTextChatTurn(visibleResult.candidateText, visibleResult.candidate?.finishReason);

      if (plainTextTurn) {
        return {
          visibleReply: plainTextTurn.visibleReply,
          degraded: false
        };
      }
    } catch {
      // El segundo intento se ejecuta automaticamente en la siguiente iteracion.
    }
  }

  return {
    visibleReply: BRIEF_CHAT_RECOVERY_REPLY,
    degraded: true
  };
}

export async function generateBriefClosure(
  input: GenerateBriefClosureInput
): Promise<BriefClosureResult> {
  const fallback = buildDeterministicBriefClosure(input);
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return fallback;
  }

  const closurePrompt = buildBriefClosurePrompt(input);

  try {
    const response = await requestGeminiContent(closurePrompt, apiKey, "application/json");
    const candidateText = response.candidateText;
    const jsonText = candidateText ? extractJsonObject(candidateText) : null;

    if (!jsonText) {
      return fallback;
    }

    const closure = sanitizeBriefClosure(JSON.parse(jsonText), fallback);

    if (!closure.clientSummary || !closure.agentRawBrief) {
      return fallback;
    }

    return closure;
  } catch {
    return fallback;
  }
}