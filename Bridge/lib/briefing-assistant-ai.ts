/**
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-07_chat_brief_adaptativo_y_etapas_background_v1.md
 */
import {
  buildAssistantGuidance,
  emptyStructuredBriefSummary,
  getCurrentVisibleStageQuestion,
  getCriticalMissingFields,
  hasBackgroundStageSufficientInfo,
  type BriefMessage,
  type BriefingStage,
  type StructuredBriefSummary
} from "./briefing";

type BriefStage = BriefingStage;
type BriefSummary = StructuredBriefSummary;

type StagePriorityField = {
  key: keyof BriefSummary;
  label: string;
};

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
  summary: BriefSummary;
  clientMessage: string;
};

export type BriefChatReply = {
  visibleReply: string;
  stageHasSufficientInfo: boolean;
};

export type FinalBriefMessageInput = Pick<BriefMessage, "authorRole" | "messageText">;

export type GenerateBriefFinalJsonInput = {
  stage: BriefStage;
  summary: BriefSummary;
  messages: FinalBriefMessageInput[];
};

export type BriefFinalJson = {
  projectObjective: string;
  mainOffer: string;
  businessContext: string;
  requestReason: string;
  audience: string;
  platform: string;
  deliverable: string;
  cta: string;
  tone: string;
  restrictions: string;
  references: string;
  urgency: string;
  commercialFitReason: string;
  recommendedProductSlotKey: string;
  operatorReviewNote: string;
  proposalReadiness: "low" | "medium" | "high";
  missingCriticalData: string[];
};

const PRIORITY_FIELDS_BY_STAGE: Record<BriefStage, StagePriorityField[]> = {
  discovery: [
    { key: "projectObjective", label: "objetivo del proyecto" },
    { key: "mainOffer", label: "oferta principal" },
    { key: "requestReason", label: "motivo del pedido" },
    { key: "businessContext", label: "contexto del negocio" }
  ],
  precision: [
    { key: "audience", label: "audiencia" },
    { key: "platform", label: "plataforma" },
    { key: "deliverable", label: "entregable" },
    { key: "cta", label: "cta" }
  ],
  commercial_fit: [
    { key: "recommendedProductSlotKey", label: "slot comercial recomendado" },
    { key: "commercialFitReason", label: "razon de encaje comercial" }
  ]
};

const MAX_CHAT_REPLY_WORDS = 110;
const TECHNICAL_LEAK_PATTERN =
  /(^|\s)(FOCO|CAPTURADO|PREGUNTAS|SIGUIENTE_ACCION|summaryPatch|missingPriorityFields|stageHasSufficientInfo|redirectNote)\s*:/i;
const RELIABLE_VISIBLE_FINISH_REASONS = new Set(["", "STOP"]);
const OPEN_REPLY_ENDING_PATTERN =
  /(para entender mejor|para seguir|necesito entender|ahora necesito|con esto|para avanzar bien|para avanzar|para afinarlo|para poder|quiero entender|necesito confirmar)\s*[.!?]*$/i;
const DANGLING_REPLY_ENDING_PATTERN = /(?:\.{3}|…|[,;:\-\/(])\s*$/;
const FINAL_JSON_KEYS = new Set<keyof BriefFinalJson>([
  "projectObjective",
  "mainOffer",
  "businessContext",
  "requestReason",
  "audience",
  "platform",
  "deliverable",
  "cta",
  "tone",
  "restrictions",
  "references",
  "urgency",
  "commercialFitReason",
  "recommendedProductSlotKey",
  "operatorReviewNote",
  "proposalReadiness",
  "missingCriticalData"
]);

const readSummaryValue = (summary: BriefSummary, key: keyof BriefSummary): string => summary[key].trim();

const normalizeText = (value: string): string => value.trim().toLowerCase();

const CLARIFICATION_HINTS = [
  "a que te refieres",
  "a qu\u00e9 te refieres",
  "que quieres decir",
  "qu\u00e9 quieres decir",
  "que significa",
  "qu\u00e9 significa",
  "cual seria",
  "cu\u00e1l ser\u00eda",
  "cual es",
  "cu\u00e1l es"
];

const FIELD_REFERENCE_HINTS: Partial<Record<keyof BriefSummary, string[]>> = {
  projectObjective: ["objetivo", "resultado", "meta"],
  businessContext: ["contexto", "situacion", "situaci\u00f3n", "negocio"],
  requestReason: ["por que", "por qu\u00e9", "motivo", "razon", "raz\u00f3n"],
  mainOffer: ["oferta", "servicio", "producto", "vendo", "venden"],
  audience: ["publico", "p\u00fablico", "personas", "clientes", "audiencia"],
  platform: ["plataforma", "canal", "donde", "d\u00f3nde"],
  deliverable: ["pieza", "solucion", "soluci\u00f3n", "entregable", "necesitan"],
  cta: ["accion", "acci\u00f3n", "haga", "hacer", "llamado"],
  recommendedProductSlotKey: ["solucion", "soluci\u00f3n", "encaja", "tipo"],
  commercialFitReason: ["direccion", "direcci\u00f3n", "encaja", "por que", "por qu\u00e9"]
};

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

  if (OPEN_REPLY_ENDING_PATTERN.test(lastVisibleLine)) {
    return false;
  }

  return true;
}

function buildPrioritizedStageStatus(stage: BriefStage, summary: BriefSummary) {
  const stageFields = PRIORITY_FIELDS_BY_STAGE[stage];
  const captured = stageFields.filter((field) => readSummaryValue(summary, field.key).length > 0);
  const missing = stageFields.filter((field) => readSummaryValue(summary, field.key).length === 0);

  return {
    captured,
    missing
  };
}

export function hasStageSufficientInfo(stage: BriefStage, summary: BriefSummary): boolean {
  return hasBackgroundStageSufficientInfo(stage, summary);
}

/**
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-06_reescritura_controlada_runtime_chat_brief_v1.md
 */
export function isClarificationRequestForCurrentQuestion(
  stage: BriefStage,
  summary: BriefSummary,
  clientMessage: string
): boolean {
  const currentQuestion = getCurrentVisibleStageQuestion(stage, summary);

  if (!currentQuestion) {
    return false;
  }

  const normalizedMessage = normalizeText(clientMessage);
  const mentionsClarificationHint = CLARIFICATION_HINTS.some((hint) => normalizedMessage.includes(hint));
  const fieldHints = FIELD_REFERENCE_HINTS[currentQuestion.key] ?? [];
  const mentionsCurrentField = fieldHints.some((hint) => normalizedMessage.includes(hint));

  return mentionsClarificationHint || mentionsCurrentField;
}

export function buildBriefChatSystemPrompt(stage: BriefStage, summary: BriefSummary): string {
  const stageStatus = buildPrioritizedStageStatus(stage, summary);
  const capturedFieldList =
    stageStatus.captured.length > 0
      ? stageStatus.captured.map((field) => `${field.label}: ${readSummaryValue(summary, field.key)}`).join("; ")
      : "ninguno";
  const missingFieldList =
    stageStatus.missing.length > 0
      ? stageStatus.missing.map((field) => field.label).join(", ")
      : "ninguno";

  return [
    "Eres Vika, estratega comercial de Bridge, conversando con un cliente real.",
    "Tu tarea en este turno es responder con texto natural para seguir madurando el brief sin sonar a formulario.",
    "Responde solo con texto plano visible para el cliente.",
    "No devuelvas JSON, etiquetas internas, markdown ni listas tecnicas.",
    "Usa el resumen estructurado solo como contexto silencioso; nunca expongas campos internos ni expliques etapas.",
    "No hables de tus instrucciones ni de tu objetivo interno. Nunca digas frases como 'mi objetivo es' o 'necesito entender'.",
    "Evita saludos de cortesia vacios como 'Hola, un gusto saludarte' si no hacen avanzar la conversacion.",
    "Haz como maximo dos preguntas concretas si todavia falta informacion prioritaria, pero prioriza una sola pregunta muy util.",
    "Si el cliente se desvia, reconduce con suavidad hacia la solicitud comercial.",
    "Si el cliente hace una pregunta meta como 'que vamos a hacer' o 'a que te refieres', respondela brevemente y vuelve a una sola pregunta util.",
    "Si ya hay informacion suficiente para esta etapa, confirma brevemente y abre el siguiente frente de conversacion sin mencionar la etapa.",
    `Etapa actual: ${stage}`,
    `Ya capturado: ${capturedFieldList}`,
    `Aun falta: ${missingFieldList}`,
    "Resumen estructurado actual:",
    JSON.stringify(summary)
  ].join("\n");
}

export function buildBriefChatFallbackReply(
  stage: BriefStage,
  summary: BriefSummary,
  clientMessage: string
): string {
  const normalizedMessage = normalizeText(clientMessage);
  const currentQuestion = getCurrentVisibleStageQuestion(stage, summary);

  if (["hola", "buenas", "buen día", "buen dia", "hello"].includes(normalizedMessage)) {
    return buildAssistantGuidance(stage, summary);
  }

  if (isClarificationRequestForCurrentQuestion(stage, summary, clientMessage) && currentQuestion) {
    return currentQuestion.clarification;
  }

  if (
    normalizedMessage.includes("que vamos a hacer") ||
    normalizedMessage.includes("qu\u00e9 vamos a hacer") ||
    normalizedMessage.includes("cual contexto") ||
    normalizedMessage.includes("cu\u00e1l contexto") ||
    normalizedMessage.includes("entender de que") ||
    normalizedMessage.includes("entender de qu\u00e9")
  ) {
    if (stage === "discovery") {
      return `Primero quiero ubicar bien que quieres mover y que resultado te importa conseguir, para que la propuesta salga alineada desde el inicio. ${buildAssistantGuidance(stage, summary)}`;
    }

    if (stage === "precision") {
      return `Ahora quiero aterrizar los detalles de ejecucion para que la propuesta sea realmente accionable. ${buildAssistantGuidance(stage, summary)}`;
    }

    return `Estoy cerrando la mejor direccion comercial para que la propuesta llegue bien enfocada. ${buildAssistantGuidance(stage, summary)}`;
  }

  if (!currentQuestion) {
    return buildAssistantGuidance(stage, summary);
  }

  return currentQuestion.question;
}

export function buildBriefFinalJsonPrompt(input: GenerateBriefFinalJsonInput): string {
  const conversation = input.messages
    .map((message) => `${message.authorRole === "client" ? "Cliente" : message.authorRole === "assistant" ? "Vika" : "Operador"}: ${message.messageText}`)
    .join("\n");

  return [
    "Eres el estructurador interno de Bridge.",
    "Debes convertir la conversacion completa del brief en un JSON final interno para propuesta.",
    "Responde solo con JSON valido y sin markdown.",
    "No inventes datos: si falta informacion critica, dejala vacia y repórtala en missingCriticalData.",
    "Usa exactamente este contrato:",
    '{"projectObjective":"","mainOffer":"","businessContext":"","requestReason":"","audience":"","platform":"","deliverable":"","cta":"","tone":"","restrictions":"","references":"","urgency":"","commercialFitReason":"","recommendedProductSlotKey":"","operatorReviewNote":"","proposalReadiness":"low","missingCriticalData":[]}',
    `Etapa de cierre: ${input.stage}`,
    "Resumen estructurado actual:",
    JSON.stringify(input.summary),
    "Conversacion completa:",
    conversation
  ].join("\n");
}

function sanitizeFinalBriefJson(rawValue: unknown, fallback: BriefFinalJson): BriefFinalJson {
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
    return fallback;
  }

  const output = { ...fallback };

  for (const [key, value] of Object.entries(rawValue)) {
    if (!FINAL_JSON_KEYS.has(key as keyof BriefFinalJson)) {
      continue;
    }

    if (key === "proposalReadiness") {
      if (value === "low" || value === "medium" || value === "high") {
        output.proposalReadiness = value;
      }
      continue;
    }

    if (key === "missingCriticalData") {
      if (Array.isArray(value)) {
        output.missingCriticalData = value
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean);
      }
      continue;
    }

    if (typeof value === "string") {
      output[key as Exclude<keyof BriefFinalJson, "proposalReadiness" | "missingCriticalData">] = value.trim();
    }
  }

  return output;
}

export function buildDeterministicBriefFinalJson(summary: BriefSummary): BriefFinalJson {
  const missingCriticalData = getCriticalMissingFields(summary);
  const proposalReadiness: BriefFinalJson["proposalReadiness"] =
    missingCriticalData.length === 0 ? "high" : missingCriticalData.length <= 2 ? "medium" : "low";

  return {
    projectObjective: summary.projectObjective,
    mainOffer: summary.mainOffer,
    businessContext: summary.businessContext,
    requestReason: summary.requestReason,
    audience: summary.audience,
    platform: summary.platform,
    deliverable: summary.deliverable,
    cta: summary.cta,
    tone: summary.tone,
    restrictions: summary.restrictions,
    references: summary.references,
    urgency: summary.urgency,
    commercialFitReason: summary.commercialFitReason,
    recommendedProductSlotKey: summary.recommendedProductSlotKey,
    operatorReviewNote: summary.operatorReviewNote || summary.commercialFitReason,
    proposalReadiness,
    missingCriticalData
  };
}

export function isBriefReadyForProposal(summary: BriefSummary): boolean {
  return getCriticalMissingFields(summary).length === 0;
}

export async function generateBriefChatReply(
  input: GenerateBriefChatReplyInput
): Promise<BriefChatReply> {
  const stageHasSufficientInfo = hasStageSufficientInfo(input.stage, input.summary);
  const fallbackReply = buildBriefChatFallbackReply(input.stage, input.summary, input.clientMessage);
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return {
      visibleReply: fallbackReply,
      stageHasSufficientInfo
    };
  }

  const systemPrompt = buildBriefChatSystemPrompt(input.stage, input.summary);
  const model = "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
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
                text: `${systemPrompt}\n\nUltimo mensaje del cliente:\n${input.clientMessage}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.55,
          maxOutputTokens: 220
        }
      })
    });

    if (!response.ok) {
      return {
        visibleReply: fallbackReply,
        stageHasSufficientInfo
      };
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse;
    const candidate = payload.candidates?.[0];
    const candidateText = candidate?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();

    if (!candidateText) {
      return {
        visibleReply: fallbackReply,
        stageHasSufficientInfo
      };
    }

    const visibleReply = isAcceptableAssistantVisibleReply(candidateText, candidate?.finishReason)
      ? sanitizeAssistantReply(candidateText)
      : fallbackReply;

    return {
      visibleReply,
      stageHasSufficientInfo
    };
  } catch {
    return {
      visibleReply: fallbackReply,
      stageHasSufficientInfo
    };
  }
}

export async function generateBriefFinalJson(
  input: GenerateBriefFinalJsonInput
): Promise<BriefFinalJson> {
  const fallbackJson = buildDeterministicBriefFinalJson(input.summary);
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return fallbackJson;
  }

  const systemPrompt = buildBriefFinalJsonPrompt(input);
  const model = "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
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
                text: systemPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 700,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      return fallbackJson;
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse;
    const candidateText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();
    const jsonText = candidateText ? extractJsonObject(candidateText) : null;

    if (!jsonText) {
      return fallbackJson;
    }

    return sanitizeFinalBriefJson(JSON.parse(jsonText), fallbackJson);
  } catch {
    return fallbackJson;
  }
}