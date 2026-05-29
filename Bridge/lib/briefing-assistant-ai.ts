/**
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-01_brief_cliente_doble_capa_conversacional_v1.md
 */
import { emptyStructuredBriefSummary, type BriefingStage, type StructuredBriefSummary } from "@/lib/briefing";

type BriefStage = BriefingStage;
type BriefSummary = StructuredBriefSummary;

type GenerateBriefAssistantTurnInput = {
  stage: BriefStage;
  summary: BriefSummary;
  clientMessage: string;
};

export type BriefAssistantTurn = {
  visibleReply: string;
  summaryPatch: Partial<BriefSummary>;
  stageHasSufficientInfo: boolean;
  missingPriorityFields: string[];
  redirectNote: string;
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
const ALLOWED_SUMMARY_KEYS = new Set<keyof BriefSummary>(Object.keys(emptyStructuredBriefSummary()) as Array<keyof BriefSummary>);
const TECHNICAL_LEAK_PATTERN =
  /(^|\s)(FOCO|CAPTURADO|PREGUNTAS|SIGUIENTE_ACCION|summaryPatch|missingPriorityFields|stageHasSufficientInfo|redirectNote)\s*:/i;

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
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

  if (!trimmed) {
    return "";
  }

  if (TECHNICAL_LEAK_PATTERN.test(trimmed) || (/^[\[{]/.test(trimmed) && /[\]}]$/.test(trimmed))) {
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
    "Eres Vika, estratega comercial de Bridge, conversando con un cliente real.",
    "Objetivo unico: responder con lenguaje natural al cliente y, al mismo tiempo, producir una capa estructurada invisible para Bridge.",
    "Responde solo con JSON valido y sin markdown.",
    "Contrato exacto de salida:",
    '{"visibleReply":"string","summaryPatch":{},"stageHasSufficientInfo":false,"missingPriorityFields":[],"redirectNote":""}',
    "Reglas para visibleReply:",
    "- Debe sonar natural, humana, breve, comercial y contextual.",
    "- Nunca debe incluir etiquetas tecnicas, listas de formulario, markdown ni JSON visible.",
    "- Formula maximo 2 preguntas concretas por turno y solo si realmente faltan datos prioritarios.",
    "- Si el cliente se desvia, reconduce con suavidad y vuelve al objetivo del brief.",
    "- Si la etapa ya tiene informacion suficiente, dilo con naturalidad y orienta a continuar con la siguiente etapa o revision humana.",
    "Reglas para summaryPatch:",
    "- Incluye solo campos de StructuredBriefSummary con evidencia suficiente en el mensaje del cliente.",
    "- No inventes datos ni sobrescribas con texto vacio.",
    "Reglas para stageHasSufficientInfo:",
    "- true cuando los datos actuales ya permiten cerrar la etapa con criterio practico aunque no este todo perfecto.",
    "Reglas para missingPriorityFields:",
    "- Lista interna con keys faltantes de la etapa actual, sin inventar campos nuevos.",
    "Reglas para redirectNote:",
    "- Resume internamente si hubo desvio y como lo recondujiste. Si no hubo desvio, usa cadena vacia.",
    `Etapa actual: ${stage}`,
    `Campos prioritarios de etapa: ${stageFieldList}`,
    `Capturado en etapa: ${capturedFieldList}`,
    `Faltantes prioritarios de etapa: ${missingFieldList}`,
    "Resumen estructurado actual (JSON):",
    JSON.stringify(summary)
  ].join("\n");
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

function sanitizeSummaryPatch(rawPatch: unknown): Partial<BriefSummary> {
  if (!rawPatch || typeof rawPatch !== "object" || Array.isArray(rawPatch)) {
    return {};
  }

  const sanitizedEntries = Object.entries(rawPatch).flatMap(([key, value]) => {
    if (!ALLOWED_SUMMARY_KEYS.has(key as keyof BriefSummary) || typeof value !== "string") {
      return [];
    }

    const normalizedValue = value.trim();
    return normalizedValue ? [[key, normalizedValue] as [keyof BriefSummary, string]] : [];
  });

  return Object.fromEntries(sanitizedEntries) as Partial<BriefSummary>;
}

function sanitizeMissingPriorityFields(rawFields: unknown, stage: BriefStage): string[] {
  if (!Array.isArray(rawFields)) {
    return [];
  }

  const allowedStageFields = new Set(PRIORITY_FIELDS_BY_STAGE[stage].map((field) => field.key));

  return rawFields
    .filter((field): field is string => typeof field === "string")
    .map((field) => field.trim())
    .filter((field) => field.length > 0 && allowedStageFields.has(field as keyof BriefSummary));
}

function parseBriefAssistantTurn(rawText: string, stage: BriefStage): BriefAssistantTurn | null {
  const jsonText = extractJsonObject(rawText);

  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as Partial<BriefAssistantTurn> & { summaryPatch?: unknown };
    const visibleReply = typeof parsed.visibleReply === "string" ? sanitizeAssistantReply(parsed.visibleReply) : "";

    if (!visibleReply) {
      return null;
    }

    return {
      visibleReply,
      summaryPatch: sanitizeSummaryPatch(parsed.summaryPatch),
      stageHasSufficientInfo: parsed.stageHasSufficientInfo === true,
      missingPriorityFields: sanitizeMissingPriorityFields(parsed.missingPriorityFields, stage),
      redirectNote: typeof parsed.redirectNote === "string" ? parsed.redirectNote.trim() : ""
    };
  } catch {
    return null;
  }
}

export async function generateBriefAssistantTurn(
  input: GenerateBriefAssistantTurnInput
): Promise<BriefAssistantTurn | null> {
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

    return candidateText ? parseBriefAssistantTurn(candidateText, input.stage) : null;
  } catch {
    return null;
  }
}

export async function generateBriefAssistantReply(
  input: GenerateBriefAssistantTurnInput
): Promise<string | null> {
  const turn = await generateBriefAssistantTurn(input);

  return turn?.visibleReply ?? null;
}