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
 * IMPL-20260612-01
 * Respaldo: ARCH-20260612-01 — Checklist 13 puntos obligatorios + regla ejemplos dinámicos + fase narrativa dual.
 */
import {
  areAllRequiredFrontsAsked,
  buildFinalSummaryText,
  detectFrontsAskedFromHistory,
  emptyStructuredBriefSummary,
  getBriefItinerarySufficiency,
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
   * `shouldForceClosure` (los 13 puntos completos + pregunta narrativa ya
   * respondida). En ese caso el `visibleReply` ya contiene la despedida
   * canonica + tag [SYS_ACTION: LOCK_SUCCESS] + [BRIEF_COMPLETO] + JSON con
   * las 13 claves y NO se gasto una llamada a Gemini. El caller debe detectar
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
  "¡Qué gran historia! Mi equipo ya tiene toda esta información. La analizaremos a detalle y te contactaremos por WhatsApp con los pasos a seguir. ¡Mucho éxito!";

/**
 * IMPL-20260611-06
 * Respaldo: cierre deterministico + texto canonico de despedida
 *
 * Preguntas narrativas canonicas de la [FASE DE NARRATIVA] de Vika. Cuando el
 * modelo emite una de estas preguntas significa que los 13 puntos del checklist
 * ya estan completos y solo falta la respuesta del cliente para emitir el
 * cierre. El codigo las usa para detectar el momento exacto en que se debe
 * forzar la despedida sin volver a llamar a Gemini.
 */
export const VIKA_NARRATIVE_QUESTIONS: readonly string[] = [
  "¿Cómo te animaste a poner el negocio?",
  "¿Qué ha sido lo más difícil?"
];

/**
 * IMPL-20260615-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260615-01_cierre_brief_por_itinerario_y_suficiencia_v1.md
 *
 * La regla de cierre deterministico ya NO depende de los 13 campos del
 * checklist de Vika. Se importa `getBriefItinerarySufficiency` desde
 * `briefing.ts` (exporta `VIKA_CLOSURE_CORE_KEYS` con los 5 frentes del
 * nucleo) y se aplica via `isBriefSufficientForClosure`.
 *
 * IMPL-20260611-06
 * Respaldo: cierre deterministico + texto canonico de despedida
 *
 * Lista de campos de `StructuredBriefSummary` que Vika debe llenar como parte
 * de los 13 puntos obligatorios del checklist. OBSOLETO desde IMPL-20260615-01
 * (el cierre ya no exige los 13, basta con los 5 frentes del nucleo via
 * `VIKA_CLOSURE_CORE_KEYS`). Conservado solo por trazabilidad historica.
 */

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
 * Respaldo: Bridge/context/Especificación Técnica Chat Vika.md (sección 4 - System Prompt Maestro)
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
 * IMPL-20260615-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260615-01_cierre_brief_por_itinerario_y_suficiencia_v1.md
 *  - El System Prompt Maestro pasa de "13 puntos obligatorios" a
 *    "ITINERARIO + SUFICIENCIA". El chat cierra cuando el cliente ha dado
 *    informacion significativa en los 5 frentes del nucleo, NO cuando un
 *    checklist de 13 preguntas este al 100%. Esto es coherente con la
 *    filosofia de brief conversacional y elimina la friccion del cliente
 *    que siente que lo estan interrogando.
 *  - `shouldForceClosure` se apoya en `getBriefItinerarySufficiency` y
 *    ya no exige los 13 campos del `VIKA_CHECKLIST_SUMMARY_KEYS`.
 *  - `deterministicClosureJson` emite solo las claves con valor
 *    significativo, no fuerza 13 claves.
 *
 * IMPL-20260611-06
 * Respaldo: cierre deterministico + texto canonico de despedida
 *  - El System Prompt Maestro de Vika ahora contiene la despedida canonica
 *    (verbatim de la Especificacion Tecnica) y la pregunta narrativa como
 *    unica opcion valida. Esto reduce la variabilidad del modelo.
 *  - El codigo detecta cuando los 13 puntos + la pregunta narrativa estan
 *    completos y fuerza el cierre sin volver a llamar a Gemini.
 *
 * IMPL-20260611-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260611-01_alineacion_chat_vika_a_especificacion_tecnica_v1.md
 *
 * System Prompt Maestro de Vika segun la Especificacion Tecnica.
 * Copiado verbatim de la SPEC (seccion 3 - [Sistema Prompt Maestro]).
 * IMPL-20260612-01: Checklist 13 puntos + regla ejemplos dinámicos + fase narrativa dual.
 * IMPL-20260615-01: Sustituye el checklist 13 por "ITINERARIO + SUFICIENCIA"
 *   (5 frentes del nucleo). El chat cierra por suficiencia, no por conteo.
 *
 * Reglas clave:
 * 1. PROHIBIDO JARGON (Target, KPI, Lead Magnet, CTA, Conversion).
 * 2. TRANSPARENCIA COMERCIAL: no usar "gratis", anotar $0 / Organico si no hay presupuesto.
 * 3. UNA PREGUNTA A LA VEZ.
 * 4. ANTI-PROMPT INJECTION: volver amablemente al brief.
 * 5. EJEMPLOS SI NO ENTIENDE: 2 ejemplos simples contextuales + 1 reintento.
 * 6. ITINERARIO + SUFICIENCIA: 5 frentes comerciales del nucleo. Cuando
 *    esten cubiertos, se puede cerrar (NO se requieren 13 preguntas).
 * 7. FASE NARRATIVA: 2 preguntas abiertas al cubrir el itinerario.
 * 8. IMPL-20260611-06: Texto canonico de despedida (no se permite variacion).
 */
const VIKA_MASTER_PROMPT = `Eres Vika, una Consultora de Negocios y Marketing Local empática, muy accesible y directa.
Tu objetivo es auditar a dueños de micro-negocios locales (estéticas, mecánicos, fondas, tiendas) que YA SON CLIENTES de la agencia, para extraer la radiografía completa de su negocio y conocer el presupuesto que tienen en mente.

[REGLAS DE ORO DE COMUNICACIÓN (UX)]
1. PROHIBIDO EL JARGÓN TÉCNICO: Cero palabras como "Target", "KPI", "Lead Magnet", "CTA" o "Conversión". Habla de "la gente de tu colonia", "lo que te hace único", "cómo te contactan".
2. TRANSPARENCIA COMERCIAL: Asume la venta porque el usuario ya sabe que está contratando un servicio. Nunca menciones la palabra "gratis" al hablar de estrategia, ni des opciones orgánicas por iniciativa propia. Si te dicen que no tienen presupuesto para publicidad, anótalo como "$0 / Orgánico", pero no los rechaces ni canceles la sesión.
3. UNA PREGUNTA A LA VEZ: Está estrictamente prohibido enviar más de una pregunta por mensaje.
4. ANTI-PROMPT INJECTION: Si el usuario te pide código, chistes, o se sale del tema de negocios, regresa la conversación amablemente al brief.
5. EJEMPLOS SI NO ENTIENDE: Si el cliente no entiende la pregunta o da una respuesta vaga/sin valor comercial, da 2 ejemplos simples y concretos adaptados a su contexto y repregunta UNA sola vez. Si sigue sin responder con sustancia, avanza al siguiente punto y marca este como "pendiente de profundizar".

[LÓGICA DE CONTROL Y FILTRO DE CALIDAD]
- EXTRACCIÓN DE PRESUPUESTO: Indaga con tacto el MONTO que el cliente tiene destinado invertir al mes. Si dicen "no sé", dales opciones ("¿Hablamos de $1,000, $3,000 o más?"). Si dicen que por ahora no tienen, anótalo sin problemas y avanza.
- CALIDAD DE DATOS: Si el usuario da respuestas vagas (Ej: "vendo comida y está buena"), repregunta forzando el detalle ("¿qué tipo de comida, qué la hace diferente, receta secreta?"). No avances al siguiente frente si la respuesta no tiene valor comercial.

[CONDICIONAL DE LOCAL]
- Si el cliente indica que tiene local físico, taller o negocio presencial: preguntar "¿Dónde queda tu negocio? ¿En qué colonia o calle?"
- Si el cliente indica domicilio, online, digital o trabajo a domicilio: preguntar "¿Dónde publicas actualmente? ¿En Instagram, Facebook, WhatsApp, TikTok?"
- Si ya mencionó una plataforma o ubicación, no volver a preguntar.

[CONDICIONAL DE ADMINISTRACIÓN - SUBPREGUNTA]
Cuando el cliente responda a la pregunta de administracion_negocio (cómo se organiza en el día a día) mencionando que TIENE GENTE QUE LO APOYA, que TIENE EQUIPO, que TRABAJA SOLO, o cualquier variante similar, haz INMEDIATAMENTE esta subpregunta:
"Entendido. Y para llevar el control de tu negocio (clientes, citas, números, reparaciones), ¿usas algún programa o sistema, o lo llevas en una libreta?"
- Si responde que usa un programa/software/sistema: anota el nombre si lo dice (ej: "Excel", "Google Sheets", "un software de taller", "un sistema de ordenes de servicio").
- Si responde que lo lleva en libreta: anota "lleva en libreta" o similar.
- Si responde que no lleva control o no sabe: anota "sin control formal".
- Esta subpregunta es REQUERIDA cuando se detecta que tiene equipo o trabaja solo. NO omitasla.
- La respuesta se acumula en el campo administracion_negocio del resumen.

[ITINERARIO DE LA CONVERSACIÓN (14 PREGUNTAS TOTALES - 1 APERTURA + 1 CONDICIONAL + 13 FRENTES)]
Esta conversacion explora los 13 frentes comerciales relevantes para entender el negocio de manera natural.
Recorre TODOS los frentes antes de cerrar. NO permitas cerrar hasta que los 13 frentes hayan sido preguntados al menos una vez.

NUCLEO (5 frentes, cierre requiere que esten suficientemente cubiertos):
1. giro_y_producto_heroe: que vende y que sale mas.
2. diferenciador (audience): a quien le habla y por que le compran a el.
3. presupuesto: monto mensual asignado o "$0 / Organico" si no hay.
4. cta_deseado: que accion quiere que haga la persona (WhatsApp, llamada, visita).
5. historia_y_contexto: el origen o la historia del negocio (cubre tambien historia_negocio).

FRENTES COMPLEMENTARIOS (8 frentes, DEBEN preguntarse para permitir el cierre):
- persona_perfil: cómo se describe el dueño como persona y lider.
- administracion_negocio: cómo administra el día a día, equipo.
- madurez: tiempo operando.
- local_fisico: local a la calle vs a domicilio.
- logo: tiene marca gráfica o solo el nombre.
- objeciones: qué duda tiene el cliente antes de pagar.
- publicidad_previa: si intentó publicidad, qué y cómo le fue.
- planes_futuro: planes para el negocio en 6-12 meses.

INSTRUCCION DE PREGUNTAS (OBLIGATORIA - IMPL-20260615-10):
- DEBES preguntar por los 13 frentes OBLIGATORIOS antes de intentar cerrar la conversación.
- Los 13 frentes obligatorios son:
  1. giro_y_producto_heroe: que vende y que sale mas.
  2. audience (diferenciador): a quien le habla y por que le compran a el.
  3. presupuesto: monto mensual asignado o "$0 / Organico" si no hay.
  4. cta_deseado: que accion quiere que haga la persona.
  5. historia_y_contexto: el origen o la historia del negocio.
  6. persona_perfil: como se describe como dueno y lider.
  7. administracion_negocio: como organiza el dia a dia, si tiene equipo.
  8. madurez: cuanto tiempo lleva operando.
  9. local_fisico: local a la calle o a domicilio.
  10. logo: tiene marca grafica o solo el nombre.
  11. objeciones: que dudas tienen los clientes antes de pagar.
  12. publicidad_previa: si ha hecho publicidad antes, que hizo y como le fue.
  13. planes_futuro: metas para el negocio en 6-12 meses.
- REGLA DE REINTENTOS: Si la respuesta del cliente es vaga o no tiene valor comercial, repregunta UNA SOLA VEZ con 2 ejemplos simples contextuales. Despues de ese unico reintento, anota lo que haya dicho (aunque sea ambiguo) y avanza al siguiente frente.
- NO intentes cerrar NUNCA hasta que los 13 frentes esten en frontsAsked.
- Cuando respondan a administracion_negocio mencionando que tiene equipo o trabaja solo, haz INMEDIATAMENTE la subpregunta de sistema/libreta.

[REGLA DE CIERRE OBLIGATORIO]
SOLO cuando el bloque [PROGRESO ACTUAL DE LA CONVERSACIÓN] muestre los 13 frentes obligatorios marcados como preguntados (los 5 del NUCLEO cubiertos con suficiente informacion Y los 8 complementarios restantes preguntados al menos una vez),
haz UNA pregunta abierta de la [FASE DE NARRATIVA]. Cuando el cliente responda,
en tu siguiente turno despídete EXACTAMENTE con este texto (sin variaciones):

"¡Qué gran historia! Mi equipo ya tiene toda esta información. La analizaremos a detalle y te contactaremos por WhatsApp con los pasos a seguir. ¡Mucho éxito!"

Inmediatamente después, sin texto intermedio, emite:
[SYS_ACTION: LOCK_SUCCESS]
[BRIEF_COMPLETO]
{JSON con las claves que tengan valor significativo}

NO agregues más texto, NO hagas más preguntas, NO pidas confirmación.
Emite SOLO las claves con valor real; omite las vacias (no llenes con placeholders).

Si el bloque [PROGRESO ACTUAL] muestra frentes pendientes, avanza SOLO al siguiente pendiente. NO repitas preguntas ya marcadas con ✓.

[FASE DE NARRATIVA - 2 PREGUNTAS OBLIGATORIAS]
1. "¿Cómo te animaste a poner el negocio?" (captura historia_negocio o historia_y_contexto)
2. "¿Qué ha sido lo más difícil?" (captura profundidad emocional/contexto)

(Al cubrir los 5 frentes del NUCLEO, escoge UNA de las dos preguntas narrativas, relajando la plática. Deja que el usuario responda libremente. No insistas si es cortante. La segunda pregunta narrativa es opcional si el cliente ya dio contexto rico en la primera.)`;

const VIKA_OPENING_QUESTION =
  "¡Hola! Para armar tu estrategia, cuéntame: ¿De qué es tu negocio y qué es lo que más se vende?";

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
    "Durante la conversacion, responde solo con texto visible para el cliente (sin JSON, sin markdown, sin bloques de codigo, sin etiquetas internas). Una sola pregunta por turno. EXCEPCION: cuando cierres el brief, SI debes emitir los tags [SYS_ACTION: LOCK_SUCCESS] y [BRIEF_COMPLETO] y el JSON con las claves que tengan valor significativo (omite las vacias) como se indico en [REGLA DE CIERRE OBLIGATORIO]."
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
    "Al final, OBLIGATORIAMENTE emite el tag [SYS_ACTION: LOCK_SUCCESS], seguido SIEMPRE del tag [BRIEF_COMPLETO] y el objeto JSON con la informacion que tenga valor significativo. SOLO incluye las claves que NO esten vacias; omite las que no se capturaron. Usa estas claves (las que apliquen):",
    '{"giro_y_producto_heroe":"","persona_perfil":"","historia_negocio":"","administracion_negocio":"","madurez":"","local_fisico":"","logo":"","diferenciador":"","objeciones":"","publicidad_previa":"","presupuesto":"","cta_deseado":"","planes_futuro":"","historia_y_contexto":""}',
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

/**
 * IMPL-20260615-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260615-01_cierre_brief_por_itinerario_y_suficiencia_v1.md
 *
 * Emite el JSON de cierre del brief. A diferencia de versiones anteriores
 * que forzaban 13 claves (algunas vacias), aqui SOLO se incluyen las claves
 * con valor significativo. Esto refleja honestamente lo que se capturo y
 * reduce ruido en el payload persistido.
 *
 * `mapVikaBriefDataToStructuredSummary` ya tolera campos faltantes, por lo
 * que un JSON parcial se persiste sin errores.
 */
function deterministicClosureJson(summary: BriefSummary): Record<string, string> {
  const candidatePairs: Array<[string, string]> = [
    ["giro_y_producto_heroe", summary.giroYProductoHeroe || summary.mainOffer || summary.projectObjective || ""],
    ["persona_perfil", summary.personaPerfil || ""],
    ["historia_negocio", summary.historiaNegocio || ""],
    ["administracion_negocio", summary.administracionNegocio || ""],
    ["madurez", summary.madurez || ""],
    ["local_fisico", summary.localFisico || ""],
    ["logo", summary.logo || ""],
    ["diferenciador", summary.audience || ""],
    ["objeciones", summary.restrictions || ""],
    ["publicidad_previa", summary.publicidadPrevia || ""],
    ["presupuesto", summary.presupuesto || ""],
    ["cta_deseado", summary.cta || ""],
    ["planes_futuro", summary.planesFuturo || ""],
    ["historia_y_contexto", summary.historiaYContexto || ""]
  ];

  const json: Record<string, string> = {};
  for (const [key, value] of candidatePairs) {
    const trimmed = value.trim();
    if (trimmed) {
      json[key] = trimmed;
    }
  }
  return json;
}

/**
 * IMPL-20260615-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260615-01_cierre_brief_por_itinerario_y_suficiencia_v1.md
 *
 * Determina si la conversacion del brief ya cumplio la SUFICIENCIA
 * necesaria para cerrarse. Es la "primera mitad" del predicado de cierre
 * deterministico: los 5 frentes del nucleo deben estar cubiertos.
 *
 * Se exporta separada de `shouldForceClosure` para que `actions.ts` pueda
 * usarla como red de seguridad: si el modelo no emite el tag de cierre
 * pero la suficiencia ya esta cumplida, el server action puede forzar la
 * despedida canonica sin volver a llamar a Gemini.
 */
export function isBriefSufficientForClosure(
  summary: BriefSummary | undefined | null
): boolean {
  if (!summary) {
    return false;
  }
  return getBriefItinerarySufficiency(summary).sufficient;
}

/**
 * IMPL-20260615-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260615-01_cierre_brief_por_itinerario_y_suficiencia_v1.md
 *  - Antes: requeria los 13 campos del checklist (ARCH-20260612-01).
 *  - Ahora: requiere que los 5 frentes del NUCLEO de suficiencia esten
 *    cubiertos (ver `getBriefItinerarySufficiency`). Esto refleja la
 *    filosofia de "itinerario + suficiencia" y no obliga al cliente a
 *    responder 13 preguntas para cerrar el chat.
 *
 * IMPL-20260611-06
 * Respaldo: cierre deterministico + texto canonico de despedida
 *
 * Determina si el codigo debe forzar la despedida canonica de Vika sin
 * volver a llamar al modelo. Retorna `true` cuando se cumplen las DOS
 * condiciones:
 *  1. Los 5 frentes del nucleo de suficiencia estan cubiertos
 *     (`isBriefSufficientForClosure`).
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

  if (!isBriefSufficientForClosure(summary)) {
    return false;
  }

  if (!areAllRequiredFrontsAsked(summary)) {
    return false;
  }

  const normalizedLastMessage = (lastAssistantMessage ?? "").trim();

  if (!normalizedLastMessage) {
    return false;
  }

  // Normalizar el mensaje del asistente y las preguntas canonicas
  // quitando TODOS los signos de interrogacion para hacer match flexible.
  const normalizeForMatch = (text: string): string =>
    text.replace(/[\u00bf\u003F\u003F]/g, "").trim().toLowerCase();
  const normalizedForMatch = normalizeForMatch(normalizedLastMessage);
  return VIKA_NARRATIVE_QUESTIONS.some((question) =>
    normalizedForMatch.includes(normalizeForMatch(question))
  );
}

/**
 * IMPL-20260611-06
 * Respaldo: cierre deterministico + texto canonico de despedida
 *
 * Lista de todos los campos de `StructuredBriefSummary` que tracked en el brief.
 * Aunque se recopilan todos los campos, solo los 5 frentes del NUCLEO son
 * requeridos para el cierre del chat (ver `isBriefSufficientForClosure`).
 * El orden y mapeo coincide con `VIKA_CHECKLIST_TO_SUMMARY_KEY` en briefing.ts.
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

  // IMPL-20260615-10: detectar automaticamente los frentes preguntados
  // basandose en el historial de mensajes del asistente.
  const detectedFronts = detectFrontsAskedFromHistory(input.messages ?? []);
  const summaryWithDetectedFronts: BriefSummary = {
    ...(input.summary as BriefSummary),
    frontsAsked: [
      ...(input.summary?.frontsAsked ?? []),
      ...detectedFronts.filter((f) => !(input.summary?.frontsAsked ?? []).includes(f))
    ]
  };

  if (shouldForceClosure(summaryWithDetectedFronts, lastAssistantMessage)) {
    return buildForcedClosureReply(summaryWithDetectedFronts);
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
 * IMPL-20260612-01: JSON de cierre con 13 claves.
 *
 * Genera el cierre del brief con tag [SYS_ACTION: LOCK_SUCCESS] + [BRIEF_COMPLETO] + JSON
 * de 13 puntos + historia. Si la API key no esta configurada, devuelve un fallback
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