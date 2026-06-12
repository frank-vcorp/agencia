/**
 * IMPL-20260611-02
 * Respaldo: solicitud de negocio (regla condicional de local en el System Prompt de Vika)
 * IMPL-20260611-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260611-01_alineacion_chat_vika_a_especificacion_tecnica_v1.md
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
  hasMeaningfulSummaryValue,
  renderVikaProgressBlock,
  type BriefMessage,
  type StructuredBriefSummary
} from "./briefing";

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
  messages: FinalBriefMessageInput[];
  clientMessage: string;
  /**
   * IMPL-20260611-01
   * Resumen estructurado actual de la version del brief. Se inyecta en el
   * System Prompt de Vika como bloque "PROGRESO ACTUAL DE LA CONVERSACIÓN"
   * para evitar que el modelo repita preguntas ya respondidas.
   * Opcional para mantener compatibilidad con callers/tests previos.
   */
  summary?: BriefSummary;
};

export type BriefChatReply = {
  visibleReply: string;
  degraded: boolean;
  /**
   * IMPL-20260611-06
   * `true` cuando la respuesta fue generada por el camino deterministico de
   * `shouldForceClosure` (los 8 puntos completos + pregunta narrativa ya
   * respondida). En ese caso el `visibleReply` ya contiene la despedida
   * canonica + tag [SYS_ACTION: LOCK_SUCCESS] + [BRIEF_COMPLETO] + JSON con
   * las 9 claves y NO se gasto una llamada a Gemini. El caller debe detectar
   * este flag para ejecutar `submitBriefForOperatorReview` sin esperar un
   * click del usuario.
   */
  forcedClosure?: boolean;
};

export type FinalBriefMessageInput = Pick<BriefMessage, "authorRole" | "messageText">;

export type GenerateBriefClosureInput = {
  summary: BriefSummary;
  messages: FinalBriefMessageInput[];
};

export type BriefClosureResult = {
  visibleReply: string;
  json: Record<string, string> | null;
};

/**
 * IMPL-20260611-01
 * Regex de deteccion del tag de cierre emitido por Vika al bloquear el brief.
 * Segun SPEC: `/\[SYS_ACTION: LOCK_SUCCESS\]/`
 */
export const LOCK_SUCCESS_TAG_REGEX = /\[SYS_ACTION: LOCK_SUCCESS\]/;
export const BRIEF_COMPLETO_TAG_REGEX = /\[BRIEF_COMPLETO\]/;
export const VIKA_CLOSING_HUMAN_TEXT =
  "\u00a1Qu\u00e9 gran historia! Mi equipo ya tiene toda esta informaci\u00f3n. La analizaremos a detalle y te contactaremos por WhatsApp con los pasos a seguir. \u00a1Mucho \u00e9xito!";

/**
 * IMPL-20260611-06
 * Respaldo: cierre deterministico + texto canonico de despedida
 *
 * Preguntas narrativas canonicas de la [FASE DE NARRATIVA] de Vika. Cuando el
 * modelo emite una de estas preguntas significa que los 8 puntos del checklist
 * ya estan completos y solo falta la respuesta del cliente para emitir el
 * cierre. El codigo las usa para detectar el momento exacto en que se debe
 * forzar la despedida sin volver a llamar a Gemini.
 */
export const VIKA_NARRATIVE_QUESTIONS: readonly string[] = [
  "\u00bfC\u00f3mo te animaste a poner el negocio?",
  "\u00bfQu\u00e9 ha sido lo m\u00e1s dif\u00edcil?"
];

/**
 * IMPL-20260611-06
 * Respaldo: cierre deterministico + texto canonico de despedida
 *
 * Lista de campos de `StructuredBriefSummary` que Vika debe llenar como parte
 * de los 8 puntos obligatorios del checklist. Se replica aqui (en lugar de
 * importarse desde briefing.ts) para evitar acoplamiento adicional entre
 * modulos. El orden y mapeo coincide con `VIKA_CHECKLIST_TO_SUMMARY_KEY`.
 */
const VIKA_CHECKLIST_SUMMARY_KEYS: ReadonlyArray<keyof BriefSummary> = [
  "giroYProductoHeroe",
  "madurez",
  "localFisico",
  "logo",
  "audience",
  "restrictions",
  "presupuesto",
  "cta"
];

const MAX_CHAT_REPLY_WORDS = 110;
const BRIEF_CHAT_RECOVERY_REPLY =
  "Se interrumpio este turno. Escribeme una vez mas y retomo desde lo que ya compartiste.";
const TECHNICAL_LEAK_PATTERN =
  /(^|\s)(FOCO|CAPTURADO|PREGUNTAS|SIGUIENTE_ACCION|summaryPatch|missingPriorityFields|stageHasSufficientInfo|redirectNote)\s*:/i;
const RELIABLE_VISIBLE_FINISH_REASONS = new Set(["", "STOP"]);
const DANGLING_REPLY_ENDING_PATTERN = /(?:\.{3}|\u2026|[,;:\-\/(])\s*$/;

function formatConversationHistory(messages: FinalBriefMessageInput[], limit = 50): string {
  const conversation = messages
    .slice(-limit)
    .map((message) =>
      `${message.authorRole === "client" ? "Cliente" : message.authorRole === "assistant" ? "Vika" : "Operador"}: ${message.messageText}`
    )
    .join("\n");

  return conversation || "Sin historial previo.";
}

/**
 * IMPL-20260611-01
 * Respaldo: Bridge/context/Especificaci\u00f3n T\u00e9cnica Chat Vika.md (secci\u00f3n 4 - System Prompt Maestro)
 *
 * Extrae el primer objeto JSON de un texto. Soporta bloques ```json``` y objetos en linea.
 * Exportado para uso del server action `submitBriefAction` que detecta el cierre.
 */
export function extractJsonObject(rawText: string): string | null {
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

/**
 * IMPL-20260611-06
 * Respaldo: cierre deterministico + texto canonico de despedida
 *  - El System Prompt Maestro de Vika ahora contiene la despedida canonica
 *    (verbatim de la Especificacion Tecnica) y la pregunta narrativa como
 *    unica opcion valida. Esto reduce la variabilidad del modelo.
 *  - El codigo detecta cuando los 8 puntos + la pregunta narrativa estan
 *    completos y fuerza el cierre sin volver a llamar a Gemini.
 *
 * IMPL-20260611-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260611-01_alineacion_chat_vika_a_especificacion_tecnica_v1.md
 *
 * System Prompt Maestro de Vika segun la Especificacion Tecnica.
 * Copiado verbatim de la SPEC (seccion 3 - [Sistema Prompt Maestro]).
 *
 * Reglas clave:
 * 1. PROHIBIDO JARGON (Target, KPI, Lead Magnet, CTA, Conversion).
 * 2. TRANSPARENCIA COMERCIAL: no usar "gratis", anotar $0 / Organico si no hay presupuesto.
 * 3. UNA PREGUNTA A LA VEZ.
 * 4. ANTI-PROMPT INJECTION: volver amablemente al brief.
 * 5. CHECKLIST de 8 puntos obligatorios antes del cierre.
 * 6. FASE NARRATIVA: una pregunta abierta al completar los 8 puntos.
 * 7. IMPL-20260611-06: Texto canonico de despedida (no se permite variacion).
 */
const VIKA_MASTER_PROMPT = `Eres Vika, una Consultora de Negocios y Marketing Local emp\u00e1tica, muy accesible y directa.
Tu objetivo es auditar a due\u00f1os de micro-negocios locales (est\u00e9ticas, mec\u00e1nicos, fondas, tiendas) que YA SON CLIENTES de la agencia, para extraer la radiograf\u00eda de su negocio y conocer el presupuesto que tienen en mente.

[REGLAS DE ORO DE COMUNICACI\u00d3N (UX)]
1. PROHIBIDO EL JARG\u00d3N T\u00c9CNICO: Cero palabras como "Target", "KPI", "Lead Magnet", "CTA" o "Conversi\u00f3n". Habla de "la gente de tu colonia", "lo que te hace \u00fanico", "c\u00f3mo te contactan".
2. TRANSPARENCIA COMERCIAL: Asume la venta porque el usuario ya sabe que est\u00e1 contratando un servicio. Nunca menciones la palabra "gratis" al hablar de estrategia, ni des opciones org\u00e1nicas por iniciativa propia. Si te dicen que no tienen presupuesto para publicidad, an\u00f3talo como "$0 / Org\u00e1nico", pero no los rechaces ni canceles la sesi\u00f3n.
3. UNA PREGUNTA A LA VEZ: Est\u00e1 estrictamente prohibido enviar m\u00e1s de una pregunta por mensaje.
4. ANTI-PROMPT INJECTION: Si el usuario te pide c\u00f3digo, chistes, o se sale del tema de negocios, regresa la conversaci\u00f3n amablemente al brief.

[L\u00d3GICA DE CONTROL Y FILTRO DE CALIDAD]
- EXTRACCI\u00d3N DE PRESUPUESTO: Indaga con tacto el MONTO que el cliente tiene destinado invertir al mes. Si dicen "no s\u00e9", dales opciones ("\u00bfHablamos de $1,000, $3,000 o m\u00e1s?"). Si dicen que por ahora no tienen, an\u00f3talo sin problemas y avanza.
- CALIDAD DE DATOS: Si el usuario da respuestas vagas (Ej: "vendo comida y est\u00e1 buena"), repregunta forzando el detalle ("\u00bfqu\u00e9 tipo de comida, qu\u00e9 la hace diferente, receta secreta?"). No avances al siguiente punto si la respuesta no tiene valor comercial.

[CONDICIONAL DE LOCAL]
- Si el cliente indica que tiene local f\u00edsico, taller o negocio presencial: preguntar "\u00bfD\u00f3nde queda tu negocio? \u00bfEn qu\u00e9 colonia o calle?"
- Si el cliente indica domicilio, online, digital o trabajo a domicilio: preguntar "\u00bfD\u00f3nde publicas actualmente? \u00bfEn Instagram, Facebook, WhatsApp, TikTok?"
- Si ya mencion\u00f3 una plataforma o ubicaci\u00f3n, no volver a preguntar.

[CHECKLIST DE EXTRACCI\u00d3N (8 PUNTOS OBLIGATORIOS)]
Valida en tu memoria interna los siguientes puntos:
1. giro_y_producto_heroe (Qu\u00e9 vende y qu\u00e9 sale m\u00e1s)
2. madurez (Tiempo operando)
3. local_fisico (Local a la calle vs a domicilio)
4. logo (Tiene marca gr\u00e1fica o solo el nombre)
5. diferenciador (Por qu\u00e9 le compran a \u00e9l)
6. objeciones (Qu\u00e9 duda tiene el cliente antes de pagar)
7. presupuesto (Monto mensual asignado o $0 si no tienen)
8. cta_deseado (WhatsApp, llamada, visita directa)

[REGLA DE CIERRE OBLIGATORIO]
Cuando el bloque [PROGRESO ACTUAL DE LA CONVERSACI\u00d3N] muestre las 8 preguntas completadas (\u2713),
haz UNA pregunta abierta de la [FASE DE NARRATIVA]. Cuando el cliente responda,
en tu siguiente turno desp\u00eddete EXACTAMENTE con este texto (sin variaciones):

"\u00a1Qu\u00e9 gran historia! Mi equipo ya tiene toda esta informaci\u00f3n. La analizaremos a detalle y te contactaremos por WhatsApp con los pasos a seguir. \u00a1Mucho \u00e9xito!"

Inmediatamente despu\u00e9s, sin texto intermedio, emite:
[SYS_ACTION: LOCK_SUCCESS]
[BRIEF_COMPLETO]
{JSON con 9 claves}

NO agregues m\u00e1s texto, NO hagas m\u00e1s preguntas, NO pidas confirmaci\u00f3n.

Si el bloque [PROGRESO ACTUAL] muestra preguntas pendientes, avanza SOLO a la siguiente pendiente. NO repitas preguntas ya marcadas con \u2713.

[FASE DE DESCUBRIMIENTO NARRATIVO / FASE DE NARRATIVA]
"\u00bfC\u00f3mo te animaste a poner el negocio?" o "\u00bfQu\u00e9 ha sido lo m\u00e1s dif\u00edcil?"
(Al completar los 8 puntos, escoge UNA de las dos preguntas narrativas, relajando la pl\u00e1tica. Deja que el usuario responda libremente. No insistas si es cortante.)`;

const VIKA_OPENING_QUESTION =
  "\u00a1Hola! Para armar tu estrategia, cu\u00e9ntame: \u00bfDe qu\u00e9 es tu negocio y qu\u00e9 es lo que m\u00e1s se vende?";

export function buildBriefChatSystemPrompt(
  messages: FinalBriefMessageInput[],
  clientMessage: string,
  summary?: BriefSummary
): string {
  return [
    VIKA_MASTER_PROMPT,
    "",
    "[PROGRESO ACTUAL DE LA CONVERSACIÓN]",
    renderVikaProgressBlock(summary ?? emptyStructuredBriefSummary()),
    "",
    "[SALIDA INICIAL OBLIGATORIA]",
    VIKA_OPENING_QUESTION,
    "",
    "[HISTORIAL RECIENTE]",
    formatConversationHistory(messages),
    "",
    "[ULTIMO MENSAJE DEL CLIENTE]",
    clientMessage,
    "",
    "[INSTRUCCION DE FORMATO]",
    "Durante la conversacion, responde solo con texto visible para el cliente (sin JSON, sin markdown, sin bloques de codigo, sin etiquetas internas). Una sola pregunta por turno. EXCEPCION: cuando cierres el brief, SI debes emitir los tags [SYS_ACTION: LOCK_SUCCESS] y [BRIEF_COMPLETO] y el JSON de 9 claves como se indico en [REGLA DE CIERRE OBLIGATORIO]."
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
    VIKA_MASTER_PROMPT,
    "",
    "[INSTRUCCION DE CIERRE]",
    "Debes cerrar la conversacion de manera humana y tecnica.",
    `Despide al cliente confirmando que el equipo de expertos analizara la informacion para disenar la estrategia. NO prometas generacion automatica de campanas.`,
    "Al final, OBLIGATORIAMENTE emite el tag [SYS_ACTION: LOCK_SUCCESS], seguido SIEMPRE del tag [BRIEF_COMPLETO] y el objeto JSON con la informacion recolectada con EXACTAMENTE estas 9 claves:",
    '{"giro_y_producto_heroe":"","madurez":"","local_fisico":"","logo":"","diferenciador":"","objeciones":"","presupuesto":"","cta_deseado":"","historia_y_contexto":""}',
    "",
    "[HISTORIAL COMPLETO]",
    formatFullConversationHistory(input.messages),
    "",
    "[RESUMEN ESTRUCTURADO ACTUAL]",
    JSON.stringify(input.summary)
  ].join("\n");
}

function buildDeterministicBriefClosure(input: GenerateBriefClosureInput): BriefClosureResult {
  const summaryText = buildFinalSummaryText(input.summary) || buildFinalSummaryText(emptyStructuredBriefSummary());
  const json = deterministicClosureJson(input.summary);
  const visibleReply = [
    VIKA_CLOSING_HUMAN_TEXT,
    "[SYS_ACTION: LOCK_SUCCESS]",
    "[BRIEF_COMPLETO]",
    JSON.stringify(json, null, 2)
  ].join("\n");

  return {
    visibleReply: `${visibleReply}\n\nResumen persistido: ${summaryText}`,
    json
  };
}

function deterministicClosureJson(summary: BriefSummary): Record<string, string> {
  return {
    giro_y_producto_heroe: summary.giroYProductoHeroe || summary.mainOffer || summary.projectObjective || "",
    madurez: summary.madurez || "",
    local_fisico: summary.localFisico || "",
    logo: summary.logo || "",
    diferenciador: summary.audience || "",
    objeciones: summary.restrictions || "",
    presupuesto: summary.presupuesto || "",
    cta_deseado: summary.cta || "",
    historia_y_contexto: summary.historiaYContexto || ""
  };
}

/**
 * IMPL-20260611-06
 * Respaldo: cierre deterministico + texto canonico de despedida
 *
 * Determina si el codigo debe forzar la despedida canonica de Vika sin
 * volver a llamar al modelo. Retorna `true` cuando se cumplen las DOS
 * condiciones:
 *  1. Los 8 campos del checklist de Vika ya tienen un valor significativo
 *     segun `hasMeaningfulSummaryValue`.
 *  2. El ultimo mensaje del asistente contiene una de las preguntas
 *     narrativas canonicas de la [FASE DE NARRATIVA], lo que indica que
 *     el cliente respondio y estamos en el turno del cierre.
 *
 * Esta funcion es sincrona y deterministica: no depende del modelo ni de
 * estado externo, solo del resumen y del ultimo mensaje del asistente.
 */
export function shouldForceClosure(
  summary: BriefSummary | undefined | null,
  lastAssistantMessage: string | null | undefined
): boolean {
  if (!summary) {
    return false;
  }

  const allFieldsComplete = VIKA_CHECKLIST_SUMMARY_KEYS.every((summaryKey) =>
    hasMeaningfulSummaryValue(summaryKey, summary[summaryKey] ?? "")
  );

  if (!allFieldsComplete) {
    return false;
  }

  const normalizedLastMessage = (lastAssistantMessage ?? "").trim();

  if (!normalizedLastMessage) {
    return false;
  }

  return VIKA_NARRATIVE_QUESTIONS.some((question) =>
    normalizedLastMessage.includes(question.replace(/^\u00bf|\?$/g, "").trim())
  );
}

/**
 * IMPL-20260611-06
 * Respaldo: cierre deterministico + texto canonico de despedida
 *
 * Compone la respuesta final del chat cuando se detecta la condicion de
 * cierre deterministico. Emite la despedida canonica + tag de bloqueo +
 * JSON de 9 claves a partir del resumen. No consulta a Gemini.
 */
function buildForcedClosureReply(summary: BriefSummary): BriefChatReply {
  const json = deterministicClosureJson(summary);
  const visibleReply = [
    VIKA_CLOSING_HUMAN_TEXT,
    "[SYS_ACTION: LOCK_SUCCESS]",
    "[BRIEF_COMPLETO]",
    JSON.stringify(json, null, 2)
  ].join("\n");

  return {
    visibleReply,
    degraded: false,
    forcedClosure: true
  };
}

export async function generateBriefChatReply(
  input: GenerateBriefChatReplyInput
): Promise<BriefChatReply> {
  // IMPL-20260611-06: cierre deterministico sin llamada a Gemini.
  const lastAssistantMessage =
    [...(input.messages ?? [])]
      .reverse()
      .find((message) => message.authorRole === "assistant")?.messageText ?? null;

  if (shouldForceClosure(input.summary, lastAssistantMessage)) {
    return buildForcedClosureReply(input.summary as BriefSummary);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return {
      visibleReply: BRIEF_CHAT_RECOVERY_REPLY,
      degraded: true
    };
  }

  const visiblePrompt = buildBriefChatSystemPrompt(input.messages, input.clientMessage, input.summary);

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

/**
 * IMPL-20260611-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260611-01_alineacion_chat_vika_a_especificacion_tecnica_v1.md
 *
 * Genera el cierre del brief con tag [SYS_ACTION: LOCK_SUCCESS] + [BRIEF_COMPLETO] + JSON
 * de 8 puntos + historia. Si la API key no esta configurada, devuelve un fallback
 * deterministico.
 */
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
    const response = await requestGeminiContent(closurePrompt, apiKey);
    const candidateText = response.candidateText;
    const jsonText = candidateText ? extractJsonObject(candidateText) : null;

    if (!jsonText) {
      return fallback;
    }

    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    const json: Record<string, string> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        json[key] = value.trim();
      }
    }

    if (!LOCK_SUCCESS_TAG_REGEX.test(candidateText)) {
      // El modelo respondio JSON pero sin el tag. Aun asi lo aceptamos: el tag se
      // anade programaticamente desde el server action.
      return {
        visibleReply: `${VIKA_CLOSING_HUMAN_TEXT}\n[SYS_ACTION: LOCK_SUCCESS]\n[BRIEF_COMPLETO]\n${JSON.stringify(json, null, 2)}`,
        json
      };
    }

    return {
      visibleReply: candidateText,
      json
    };
  } catch {
    return fallback;
  }
}
