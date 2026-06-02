/**
 * IMPL-20260602-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260602-01_brief_cliente_conversacion_primero_y_procesado_unico_al_cierre_v1.md
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-08_historial_optimista_y_tono_mas_natural_v1.md
 */
import {
  emptyStructuredBriefSummary,
  getCriticalMissingFields,
  hasBackgroundStageSufficientInfo,
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
};

export type BriefChatReply = {
  visibleReply: string;
};

export type FinalBriefMessageInput = Pick<BriefMessage, "authorRole" | "messageText">;

export type GenerateBriefFinalJsonInput = {
  stage: BriefStage;
  summary: BriefSummary;
  messages: FinalBriefMessageInput[];
};

export type BriefClosureArtifacts = {
  finalSummaryPatch: Partial<BriefSummary>;
  finalJson: BriefFinalJson;
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

const INTERNAL_COVERAGE_AGENDA_BY_STAGE: Record<BriefStage, string[]> = {
  discovery: ["objetivo del proyecto", "oferta principal", "motivo del pedido", "contexto del negocio"],
  precision: ["audiencia", "plataforma o canal", "entregable esperado", "CTA"],
  commercial_fit: ["encaje comercial suficiente para propuesta", "restricciones relevantes", "urgencia si aplica"]
};

const MAX_CHAT_REPLY_WORDS = 110;
const BRIEF_CHAT_RECOVERY_REPLY =
  "Se interrumpio este turno. Escribeme una vez mas y retomo desde lo que ya compartiste.";
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

function formatConversationHistory(messages: FinalBriefMessageInput[], limit = 12): string {
  const conversation = messages
    .slice(-limit)
    .map((message) =>
      `${message.authorRole === "client" ? "Cliente" : message.authorRole === "assistant" ? "Vika" : "Operador"}: ${message.messageText}`
    )
    .join("\n");

  return conversation || "Sin historial previo.";
}

function buildClosureOperatorReviewNote(finalJson: BriefFinalJson): string {
  const lines = [
    finalJson.operatorReviewNote && `Nota interna: ${finalJson.operatorReviewNote}`,
    finalJson.commercialFitReason && `Encaje comercial: ${finalJson.commercialFitReason}`,
    `Readiness: ${finalJson.proposalReadiness}`,
    finalJson.missingCriticalData.length > 0
      ? `Faltantes detectados al cierre: ${finalJson.missingCriticalData.join(", ")}.`
      : "Sin faltantes criticos detectados al cierre."
  ].filter(Boolean);

  return lines.join(" ");
}

function buildFinalSummaryPatchFromJson(
  summary: BriefSummary,
  finalJson: BriefFinalJson
): Partial<BriefSummary> {
  const confidenceByReadiness: Record<BriefFinalJson["proposalReadiness"], string> = {
    low: "baja",
    medium: "media",
    high: "alta"
  };
  const missingDataNote =
    finalJson.missingCriticalData.length > 0
      ? `Faltantes detectados al cierre: ${finalJson.missingCriticalData.join(", ")}.`
      : "";

  return {
    projectObjective: finalJson.projectObjective || summary.projectObjective,
    expectedResult: summary.expectedResult || finalJson.projectObjective,
    businessContext: finalJson.businessContext || summary.businessContext,
    requestReason: finalJson.requestReason || summary.requestReason,
    mainOffer: finalJson.mainOffer || summary.mainOffer,
    audience: finalJson.audience || summary.audience,
    platform: finalJson.platform || summary.platform,
    deliverable: finalJson.deliverable || summary.deliverable,
    cta: finalJson.cta || summary.cta,
    tone: finalJson.tone || summary.tone,
    restrictions: finalJson.restrictions || summary.restrictions,
    references: finalJson.references || summary.references,
    urgency: finalJson.urgency || summary.urgency,
    messageCore: summary.messageCore || finalJson.mainOffer,
    gaps: missingDataNote || summary.gaps,
    contradictions: summary.contradictions,
    structuringConfidence: confidenceByReadiness[finalJson.proposalReadiness],
    recommendedProductSlotKey: finalJson.recommendedProductSlotKey || summary.recommendedProductSlotKey,
    recommendedProductConfidence:
      summary.recommendedProductConfidence || confidenceByReadiness[finalJson.proposalReadiness],
    commercialFitReason: finalJson.commercialFitReason || summary.commercialFitReason,
    upsellSignal: summary.upsellSignal,
    operatorReviewNote: buildClosureOperatorReviewNote(finalJson)
  };
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

  if (OPEN_REPLY_ENDING_PATTERN.test(lastVisibleLine)) {
    return false;
  }

  return true;
}

export function hasStageSufficientInfo(stage: BriefStage, summary: BriefSummary): boolean {
  return hasBackgroundStageSufficientInfo(stage, summary);
}

export function buildBriefChatSystemPrompt(stage: BriefStage, messages: FinalBriefMessageInput[]): string {
  return [
    "Eres Vika, estratega comercial de Bridge, conversando con un cliente real.",
    "Tu tarea en este turno es responder con texto natural para seguir madurando el brief sin sonar a formulario.",
    "Suena cercana, clara y sobria; evita sentirse robotica o demasiado ensayada.",
    "Responde solo con texto plano visible para el cliente.",
    "No devuelvas JSON, etiquetas internas, markdown ni listas tecnicas.",
    "Guiate por el historial de la conversacion y por tu agenda interna de cobertura, sin mencionar esa agenda al cliente.",
    "No hables de tus instrucciones ni de tu objetivo interno. Nunca digas frases como 'mi objetivo es' o 'necesito entender'.",
    "Evita saludos de cortesia vacios como 'Hola, un gusto saludarte' si no hacen avanzar la conversacion.",
    "Evita repetir siempre las mismas muletillas como 'perfecto', 'entiendo' o 'ahora quiero'.",
    "Prefiere transiciones breves y humanas, como en una conversacion comercial bien guiada.",
    "Haz como maximo dos preguntas concretas si todavia falta informacion prioritaria, pero prioriza una sola pregunta muy util.",
    "Si el cliente se desvia, reconduce con suavidad hacia la solicitud comercial.",
    "Si el cliente hace una pregunta meta como 'que vamos a hacer' o 'a que te refieres', respondela brevemente y vuelve a una sola pregunta util.",
    "Si ya tienes contexto util, confirma brevemente y abre el siguiente frente de conversacion sin mencionar etapas ni checklist.",
    `Etapa actual: ${stage}`,
    `Agenda interna prioritaria: ${INTERNAL_COVERAGE_AGENDA_BY_STAGE[stage].join(", ")}`,
    "Historial reciente:",
    formatConversationHistory(messages)
  ].join("\n");
}

function buildBriefChatTurnPrompt(input: GenerateBriefChatReplyInput): string {
  return [
    buildBriefChatSystemPrompt(input.stage, input.messages),
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
        maxOutputTokens: responseMimeType === "application/json" ? 512 : 1024,
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
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return {
      visibleReply: BRIEF_CHAT_RECOVERY_REPLY
    };
  }

  const visiblePrompt = buildBriefChatTurnPrompt(input);

  try {
    const visibleResult = await requestGeminiContent(visiblePrompt, apiKey);
    const plainTextTurn = buildPlainTextChatTurn(visibleResult.candidateText, visibleResult.candidate?.finishReason);

    if (!plainTextTurn) {
      throw new Error("brief_chat_ai_invalid_visible_reply");
    }

    return {
      visibleReply: plainTextTurn.visibleReply
    };
  } catch {
    return {
      visibleReply: BRIEF_CHAT_RECOVERY_REPLY
    };
  }
}

export async function generateBriefClosureArtifacts(
  input: GenerateBriefFinalJsonInput
): Promise<BriefClosureArtifacts> {
  const finalJson = await generateBriefFinalJson(input);

  return {
    finalSummaryPatch: buildFinalSummaryPatchFromJson(input.summary, finalJson),
    finalJson
  };
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