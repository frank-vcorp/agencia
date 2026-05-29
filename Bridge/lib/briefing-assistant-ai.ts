/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-09_hardening_prompt_brief_cliente_por_etapas_v1.md
 */
import { buildAssistantGuidance } from "@/lib/briefing";

type BriefStage = Parameters<typeof buildAssistantGuidance>[0];
type BriefSummary = Parameters<typeof buildAssistantGuidance>[1];

type GenerateBriefAssistantReplyInput = {
  stage: BriefStage;
  summary: BriefSummary;
  clientMessage: string;
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

type StagePriorityField = {
  key: keyof BriefSummary;
  label: string;
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

const MAX_ASSISTANT_REPLY_WORDS = 120;

const readSummaryValue = (summary: BriefSummary, key: keyof BriefSummary): string => summary[key].trim();

const buildPrioritizedStageStatus = (stage: BriefStage, summary: BriefSummary) => {
  const stageFields = PRIORITY_FIELDS_BY_STAGE[stage];
  const captured = stageFields.filter((field) => readSummaryValue(summary, field.key).length > 0);
  const missing = stageFields.filter((field) => readSummaryValue(summary, field.key).length === 0);

  return {
    stageFields,
    captured,
    missing
  };
};

export function sanitizeAssistantReply(rawReply: string): string {
  const trimmed = rawReply
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

  if (!trimmed) {
    return "";
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= MAX_ASSISTANT_REPLY_WORDS) {
    return trimmed;
  }

  return `${words.slice(0, MAX_ASSISTANT_REPLY_WORDS).join(" ")}...`;
}

export function buildBriefAssistantSystemPrompt(stage: BriefStage, summary: BriefSummary): string {
  const prioritizedStatus = buildPrioritizedStageStatus(stage, summary);
  const stageFieldList = prioritizedStatus.stageFields.map((field) => `${field.key} (${field.label})`).join(", ");
  const capturedFieldList =
    prioritizedStatus.captured.length > 0
      ? prioritizedStatus.captured
          .map((field) => `${field.key}="${readSummaryValue(summary, field.key)}"`)
          .join("; ")
      : "ninguno";
  const missingFieldList =
    prioritizedStatus.missing.length > 0
      ? prioritizedStatus.missing.map((field) => `${field.key} (${field.label})`).join(", ")
      : "ninguno";

  return [
    "Eres Bridge briefing en modo entrevistador comercial estricto.",
    "Objetivo unico: capturar faltantes prioritarios de la etapa actual con salida breve y accionable.",
    "Reglas duras:",
    "- Responde en espanol neutro y tecnico.",
    "- Mantente solo en la etapa actual; no saltes a etapas futuras.",
    "- Prohibe saludo, agradecimiento o relleno social cuando existan faltantes.",
    "- Formula maximo 2 preguntas concretas por turno.",
    "- Cada pregunta debe apuntar a un faltante prioritario actual.",
    "- Si el mensaje del cliente es ambiguo o breve, reconduce con una pregunta y ejemplo de respuesta.",
    "- No inventes informacion del cliente ni cierres la etapa sin datos minimos.",
    "- Limite de extension: maximo 110 palabras.",
    "Formato de salida obligatorio (sin markdown):",
    "FOCO: <una frase de enfoque de etapa>",
    "CAPTURADO: <campos ya capturados de esta etapa o 'ninguno'>",
    "PREGUNTAS: 1) <pregunta 1> 2) <pregunta 2 opcional>",
    "SIGUIENTE_ACCION: <microaccion concreta para continuar>",
    `Etapa actual: ${stage}`,
    `Campos prioritarios de etapa: ${stageFieldList}`,
    `Capturado en etapa: ${capturedFieldList}`,
    `Faltantes prioritarios de etapa: ${missingFieldList}`,
    "Resumen estructurado actual (JSON):",
    JSON.stringify(summary)
  ].join("\n");
}

export async function generateBriefAssistantReply(
  input: GenerateBriefAssistantReplyInput
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const systemPrompt = buildBriefAssistantSystemPrompt(input.stage, input.summary);
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
          temperature: 0.4,
          maxOutputTokens: 220
        }
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse;
    const candidateText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();
    const sanitizedText = candidateText ? sanitizeAssistantReply(candidateText) : "";

    return sanitizedText ? sanitizedText : null;
  } catch {
    return null;
  }
}