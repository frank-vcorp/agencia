/**
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-02_brief_cliente_chat_natural_y_json_final_v1.md
 */
import {
  buildAssistantGuidance,
  emptyStructuredBriefSummary,
  getCriticalMissingFields,
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
  const stageStatus = buildPrioritizedStageStatus(stage, summary);

  if (stage === "commercial_fit") {
    return stageStatus.missing.length === 0 && getCriticalMissingFields(summary).length === 0;
  }

  return stageStatus.missing.length === 0;
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
    "Tu unica tarea en este turno es responder con texto natural para seguir madurando el brief.",
    "Responde solo con texto plano visible para el cliente.",
    "No devuelvas JSON, etiquetas internas, markdown ni listas tecnicas.",
    "Haz como maximo dos preguntas concretas si todavia falta informacion prioritaria.",
    "Si el cliente se desvia, reconduce con suavidad hacia la solicitud comercial.",
    "Si ya hay informacion suficiente para esta etapa, confirma brevemente y orienta al siguiente paso sin mostrar estructura interna.",
    `Etapa actual: ${stage}`,
    `Ya capturado: ${capturedFieldList}`,
    `Aun falta: ${missingFieldList}`,
    "Resumen estructurado actual:",
    JSON.stringify(summary)
  ].join("\n");
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
  const fallbackReply = buildAssistantGuidance(input.stage, input.summary);
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
          maxOutputTokens: 180
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
    const candidateText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();

    if (!candidateText) {
      return {
        visibleReply: fallbackReply,
        stageHasSufficientInfo
      };
    }

    const visibleReply = sanitizeAssistantReply(candidateText);
    return {
      visibleReply: visibleReply || fallbackReply,
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