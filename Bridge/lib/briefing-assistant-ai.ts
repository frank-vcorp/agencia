/**
 * IMPL-20260528-08
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-08_brief_cliente_ia_real_gemini_v1.md
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

export function buildBriefAssistantSystemPrompt(stage: BriefStage, summary: BriefSummary): string {
  return [
    "Eres Bridge briefing, asistente de levantamiento de brief para clientes.",
    "Objetivo: avanzar el brief por etapas con preguntas claras, cortas y accionables.",
    "Reglas:",
    "- Responde en espanol neutro y profesional.",
    "- Mantente en la etapa actual; no saltes a etapas futuras.",
    "- Propone maximo 2 preguntas concretas por turno.",
    "- Si faltan datos criticos, prioriza pedirlos.",
    "- No inventes informacion del cliente.",
    `Etapa actual: ${stage}`,
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
    const candidateText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join(" ").trim();

    return candidateText ? candidateText : null;
  } catch {
    return null;
  }
}