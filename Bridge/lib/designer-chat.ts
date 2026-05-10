/**
 * IMPL-20260510-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-03_chat_asistente_produccion_disenador.md
 *
 * Capa de llamada a Gemini Flash para el asistente de produccion creativa.
 * GEMINI_API_KEY se consume solo server-side — nunca expuesta al cliente.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type AssetContext = {
  tool: string;
  promptText: string;
  format: string;
  name: string;
};

// ─── System prompt ────────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `Eres un asistente senior de produccion creativa con IA para disenadores
que trabajan con Adobe Firefly, Express, Photoshop Online y Premiere Rush.

El disenador no produce a mano — dirige a la IA para que genere las piezas.
Su trabajo es juzgar el resultado y saber como llegar a una pieza que valga
la pena subir a Bridge.

Tu rol es ayudarle a:
- Decidir si conviene ajustar el prompt y regenerar, o editar directamente
  en la herramienta — segun que sea mas eficiente en cada caso
- Ajustar prompts cuando el resultado no convence
- Usar las herramientas Adobe para ediciones puntuales sin empezar desde cero
- Iterar de forma eficiente hasta que la pieza este lista

El operador ya dejo todo listo: el Custom Model del cliente en Firefly y el
prompt base en Bridge. El disenador no define el estilo — lo aplica.
Si pregunta por estilo del cliente o que producir: responde exactamente esto:
"Eso ya esta resuelto en el activo de Bridge — revisa el prompt vigente y usa
el Custom Model del cliente en Firefly."

Habla claro y directo. Sin tecnicismos innecesarios. Como si le explicaras
a alguien que sabe hacer su trabajo pero no necesita que le hablen como en un
manual.

Si la pregunta no tiene que ver con produccion creativa con IA, responde:
"Eso esta fuera de mi area."`;

const ASSET_CONTEXT_TEMPLATE = (ctx: AssetContext) =>
  `\n\n[Contexto del activo activo — usa solo si la pregunta lo requiere]\nHerramienta asignada: ${ctx.tool}\nPrompt vigente: ${ctx.promptText}\nFormato requerido: ${ctx.format}\nNombre del activo: ${ctx.name}`;

/**
 * Construye el system prompt con o sin contexto del activo abierto.
 */
export function buildSystemPrompt(assetContext?: AssetContext): string {
  if (assetContext) {
    return BASE_SYSTEM_PROMPT + ASSET_CONTEXT_TEMPLATE(assetContext);
  }
  return BASE_SYSTEM_PROMPT;
}

// ─── Llamada a Gemini ─────────────────────────────────────────────────────────

const FALLBACK_REPLY =
  "No pude conectarme al asistente. Intenta de nuevo.";

/**
 * Llama a Gemini Flash con el mensaje del diseñador y contexto opcional.
 * Si falla, devuelve el mensaje de fallback en lugar de propagar el error.
 */
export async function callGemini(
  message: string,
  assetContext?: AssetContext,
  imageBase64?: string,
  imageMimeType?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return FALLBACK_REPLY;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: buildSystemPrompt(assetContext)
    });

    type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
    const parts: Part[] = [];

    if (imageBase64 && imageMimeType) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64
        }
      });
    }

    parts.push({ text: message });

    const result = await model.generateContent(parts);
    const text = result.response.text();
    return text ?? FALLBACK_REPLY;
  } catch {
    return FALLBACK_REPLY;
  }
}
