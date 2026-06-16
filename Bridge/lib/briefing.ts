/**
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
import { isSupabaseConfigured, supabaseEnv } from "./supabase";
import { getTenantIdentityContextByTenantId, resolveActorTrace } from "./identity";
import { resolveTenantIdBySlug } from "./tenant";

/**
 * IMPL-20260615-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260615-01_cierre_brief_por_itinerario_y_suficiencia_v1.md
 * Núcleo de suficiencia para el cierre deterministico del brief. Reemplaza
 * al requisito rigido de los 13 campos (ARCH-20260612-01) por 5 frentes
 * comerciales esenciales. Si el cliente da informacion significativa en
 * estos 5 frentes, el equipo ya puede armar una propuesta util y el chat
 * puede cerrarse (no se necesita el checkbox al 100%).
 *
 * IMPL-20260611-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260611-01_alineacion_chat_vika_a_especificacion_tecnica_v1.md
 * IMPL-20260612-01
 * Respaldo: ARCH-20260612-01 — Checklist 13 puntos obligatorios.
 * Payload de 13 puntos obligatorios + narrativa emitido por Vika al cierre.
 */
export type VikaBriefData = {
  giro_y_producto_heroe: string;
  persona_perfil: string;
  historia_negocio: string;
  administracion_negocio: string;
  madurez: string;
  local_fisico: string;
  logo: string;
  diferenciador: string;
  objeciones: string;
  publicidad_previa: string;
  presupuesto: string;
  cta_deseado: string;
  planes_futuro: string;
  historia_y_contexto?: string;
};

export const VIKA_BRIEF_FIELDS = [
  "giro_y_producto_heroe",
  "persona_perfil",
  "historia_negocio",
  "administracion_negocio",
  "madurez",
  "local_fisico",
  "logo",
  "diferenciador",
  "objeciones",
  "publicidad_previa",
  "presupuesto",
  "cta_deseado",
  "planes_futuro"
] as const satisfies ReadonlyArray<keyof VikaBriefData>;

export function emptyVikaBriefData(): VikaBriefData {
  return {
    giro_y_producto_heroe: "",
    persona_perfil: "",
    historia_negocio: "",
    administracion_negocio: "",
    madurez: "",
    local_fisico: "",
    logo: "",
    diferenciador: "",
    objeciones: "",
    publicidad_previa: "",
    presupuesto: "",
    cta_deseado: "",
    planes_futuro: "",
    historia_y_contexto: ""
  };
}

/**
 * IMPL-20260615-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260615-01_cierre_brief_por_itinerario_y_suficiencia_v1.md
 *
 * Núcleo de suficiencia para el cierre del brief. Reemplaza al requisito de
 * los 13 campos del checklist de Vika (ARCH-20260612-01). Cada entrada es:
 *   - `summaryKey`: campo del `StructuredBriefSummary` que se evalua.
 *   - `label`:      etiqueta en espanol natural para mostrar al cliente o al
 *                   operador que un frente del nucleo esta pendiente.
 *
 * `historiaNarrativa` es un frente "o": se cumple si `historiaYContexto`
 * **o** `historiaNegocio` tienen valor significativo (redundancia
 * intencional para no castigar al cliente que solo contesto una narrativa).
 */
export const VIKA_CLOSURE_CORE_KEYS: ReadonlyArray<{
  summaryKey: keyof StructuredBriefSummary;
  label: string;
  narrativePair?: keyof StructuredBriefSummary;
}> = [
  { summaryKey: "giroYProductoHeroe", label: "que vendes y que sale mas" },
  { summaryKey: "audience", label: "a quien le hablas o por que te compran a ti" },
  { summaryKey: "presupuesto", label: "con cuanto cuentas al mes para invertir" },
  { summaryKey: "cta", label: "que accion quieres que haga el cliente" },
  {
    summaryKey: "historiaYContexto",
    label: "el origen o la historia de tu negocio",
    narrativePair: "historiaNegocio"
  }
];

/**
 * IMPL-20260615-10
 * Respaldo: IMPL-20260615-10 — Forzar captura de los 13 frentes antes del cierre.
 *
 * Los 13 frentes comerciales que Vika DEBE preguntar antes de poder cerrar
 * el chat. Si alguno no esta en `summary.frontsAsked`, el cierre se bloquea.
 *
 * 5 del nucleo + 8 complementarios:
 *  - giro_y_producto_heroe
 *  - audience (diferenciador)
 *  - presupuesto
 *  - cta_deseado
 *  - historia_y_contexto
 *  - persona_perfil
 *  - administracion_negocio
 *  - madurez
 *  - local_fisico
 *  - logo
 *  - objeciones
 *  - publicidad_previa
 *  - planes_futuro
 */
export const VIKA_REQUIRED_FRONTS: ReadonlyArray<string> = [
  "giro_y_producto_heroe",
  "persona_perfil",
  "administracion_negocio",
  "madurez",
  "local_fisico",
  "logo",
  "audience",
  "objeciones",
  "publicidad_previa",
  "presupuesto",
  "cta_deseado",
  "planes_futuro",
  "historia_y_contexto"
];

/**
 * IMPL-20260615-10
 * Verifica si todos los 8 frentes obligatorios fueron preguntados.
 * Retorna `true` solo si `frontsAsked` contiene los 8 frentes.
 */
export function areAllRequiredFrontsAsked(summary: StructuredBriefSummary): boolean {
  const asked = summary.frontsAsked ?? [];
  return VIKA_REQUIRED_FRONTS.every((front) => asked.includes(front));
}

/**
 * IMPL-20260615-10
 * Detecta automaticamente que frentes ya fueron preguntados por Vika
 * basandose en el historial de mensajes del asistente.
 *
 * Usa palabras clave contextuales para identificar que frente se pregunto
 * en cada mensaje. Si una palabra clave aparece en un mensaje del asistente,
 * se marca ese frente como preguntado.
 *
 * IMPL-20260615-24: REEMPLAZADO por deteccion de tags explicitos.
 * Vika ahora emite [FRONT_ASKED: nombre] y [FRONT_COMPLETED: nombre]
 * en sus mensajes. Esta funcion parsea esos tags directamente.
 */
export function detectFrontsAskedFromHistory(
  assistantMessages: ReadonlyArray<{ messageText: string }>
): string[] {
  const asked = new Set<string>();
  const validFronts = new Set([
    "giro_y_producto_heroe",
    "audience",
    "presupuesto",
    "cta_deseado",
    "historia_y_contexto",
    "persona_perfil",
    "administracion_negocio",
    "madurez",
    "local_fisico",
    "logo",
    "objeciones",
    "publicidad_previa",
    "planes_futuro"
  ]);

  for (const msg of assistantMessages) {
    const text = msg.messageText ?? "";
    if (!text) continue;

    // Detectar tags [FRONT_ASKED: nombre] y [FRONT_COMPLETED: nombre]
    const tagRegex = /\[(?:FRONT_ASKED|FRONT_COMPLETED):\s*([a-z_]+)\s*\]/g;
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
      const front = match[1];
      if (validFronts.has(front)) {
        asked.add(front);
      }
    }
  }

  return Array.from(asked);
}

/**
 * IMPL-20260615-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260615-01_cierre_brief_por_itinerario_y_suficiencia_v1.md
 *
 * Evalua si el resumen estructurado cubre los 5 frentes del nucleo de
 * suficiencia. Es funcion pura, deterministica, sin dependencias externas.
 * Usa `hasMeaningfulSummaryValue` (reglas de longitud/palabras existentes)
 * para que un valor generico ("si", "hola") no cuente como cubierto.
 */
export function getBriefItinerarySufficiency(summary: StructuredBriefSummary): {
  sufficient: boolean;
  missingCore: string[];
  completedCore: number;
  totalCore: number;
} {
  const missingCore: string[] = [];
  let completedCore = 0;

  for (const coreKey of VIKA_CLOSURE_CORE_KEYS) {
    const primaryValue = String(summary[coreKey.summaryKey] ?? "");
    const hasPrimary = hasMeaningfulSummaryValue(coreKey.summaryKey, primaryValue);

    if (hasPrimary) {
      completedCore += 1;
      continue;
    }

    if (coreKey.narrativePair) {
      const pairValue = String(summary[coreKey.narrativePair] ?? "");
      const hasPair = hasMeaningfulSummaryValue(coreKey.narrativePair, pairValue);
      if (hasPair) {
        completedCore += 1;
        continue;
      }
    }

    missingCore.push(coreKey.label);
  }

  return {
    sufficient: missingCore.length === 0,
    missingCore,
    completedCore,
    totalCore: VIKA_CLOSURE_CORE_KEYS.length
  };
}

/**
 * IMPL-20260611-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260611-01_alineacion_chat_vika_a_especificacion_tecnica_v1.md
 * IMPL-20260612-01
 * Respaldo: ARCH-20260612-01 — Checklist 13 puntos obligatorios.
 *
 * Mapeo entre las 13 claves de Vika (usadas en el chat) y los campos del
 * resumen estructurado que las almacenan en el jsonb existente.
 * `diferenciador` viaja en `audience` y `objeciones` en `restrictions` por
 * la regla de mapeo del contrato (ver `mapVikaBriefDataToStructuredSummary`).
 * Los 5 campos nuevos (persona_perfil, historia_negocio, administracion_negocio,
 * publicidad_previa, planes_futuro) se conservan en el jsonb existente sin migración.
 */
const VIKA_CHECKLIST_TO_SUMMARY_KEY: ReadonlyArray<{
  vikaKey: string;
  summaryKey: keyof StructuredBriefSummary;
}> = [
  { vikaKey: "giro_y_producto_heroe", summaryKey: "giroYProductoHeroe" },
  { vikaKey: "persona_perfil", summaryKey: "personaPerfil" },
  { vikaKey: "historia_negocio", summaryKey: "historiaNegocio" },
  { vikaKey: "administracion_negocio", summaryKey: "administracionNegocio" },
  { vikaKey: "madurez", summaryKey: "madurez" },
  { vikaKey: "local_fisico", summaryKey: "localFisico" },
  { vikaKey: "logo", summaryKey: "logo" },
  { vikaKey: "diferenciador", summaryKey: "audience" },
  { vikaKey: "objeciones", summaryKey: "restrictions" },
  { vikaKey: "publicidad_previa", summaryKey: "publicidadPrevia" },
  { vikaKey: "presupuesto", summaryKey: "presupuesto" },
  { vikaKey: "cta_deseado", summaryKey: "cta" },
  { vikaKey: "planes_futuro", summaryKey: "planesFuturo" }
];

/**
 * IMPL-20260611-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260611-01_alineacion_chat_vika_a_especificacion_tecnica_v1.md
 * IMPL-20260612-01
 * Respaldo: ARCH-20260612-01 — Checklist 13 puntos obligatorios.
 *
 * Renderiza el bloque "PROGRESO ACTUAL DE LA CONVERSACIÓN" que se inyecta en
 * el System Prompt de Vika para que el modelo NO repita preguntas ya
 * respondidas. Devuelve 3 lineas:
 *  1. Encabezado del bloque.
 *  2. Preguntas completadas (checks).
 *  3. Preguntas pendientes (lista numerada con la clave de Vika).
 */
export function renderVikaProgressBlock(summary: StructuredBriefSummary): string {
  const completed = VIKA_CHECKLIST_TO_SUMMARY_KEY.filter(({ summaryKey }) =>
    hasMeaningfulSummaryValue(summaryKey, String(summary[summaryKey] ?? ""))
  );
  const pending = VIKA_CHECKLIST_TO_SUMMARY_KEY.filter(
    ({ summaryKey }) => !hasMeaningfulSummaryValue(summaryKey, String(summary[summaryKey] ?? ""))
  );

  return [
    "[PROGRESO ACTUAL DE LA CONVERSACIÓN]",
    `Preguntas completadas: ${completed.length > 0 ? completed.map(() => "\u2713").join(" ") : "Ninguna"}`,
    `Preguntas pendientes: ${pending
      .map(({ vikaKey }) => {
        const index = VIKA_CHECKLIST_TO_SUMMARY_KEY.findIndex((item) => item.vikaKey === vikaKey);
        return `${index + 1}. ${vikaKey}`;
      })
      .join(", ")}`
  ].join("\n");
}

/**
 * IMPL-20260611-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260611-01_alineacion_chat_vika_a_especificacion_tecnica_v1.md
 * IMPL-20260612-01
 * Respaldo: ARCH-20260612-01 — Checklist 13 puntos obligatorios.
 * Mapea el JSON de 13 puntos emitido por Vika a los campos del resumen estructurado.
 * Los 5 campos nuevos (personaPerfil, historiaNegocio, administracionNegocio,
 * publicidadPrevia, planesFuturo) se conservan en el jsonb existente.
 */
export function mapVikaBriefDataToStructuredSummary(
  vika: Partial<VikaBriefData>
): Partial<StructuredBriefSummary> {
  const get = (key: keyof VikaBriefData): string => (typeof vika[key] === "string" ? (vika[key] as string).trim() : "");

  const giro = get("giro_y_producto_heroe");
  const personaPerfil = get("persona_perfil");
  const historiaNegocio = get("historia_negocio");
  const administracionNegocio = get("administracion_negocio");
  const madurez = get("madurez");
  const logo = get("logo");
  const presupuesto = get("presupuesto");
  const localFisico = get("local_fisico");
  const diferenciador = get("diferenciador");
  const objeciones = get("objeciones");
  const publicidadPrevia = get("publicidad_previa");
  const cta = get("cta_deseado");
  const planesFuturo = get("planes_futuro");
  const historia = get("historia_y_contexto");

  const patch: Partial<StructuredBriefSummary> = {
    personaPerfil,
    historiaNegocio,
    administracionNegocio,
    madurez,
    logo,
    presupuesto,
    localFisico,
    giroYProductoHeroe: giro,
    publicidadPrevia,
    planesFuturo,
    historiaYContexto: historia
  };

  if (giro) {
    patch.giroYProductoHeroe = giro;
    patch.mainOffer = giro;
    patch.projectObjective = giro;
  }

  if (personaPerfil) {
    patch.personaPerfil = personaPerfil;
  }

  if (historiaNegocio) {
    patch.historiaNegocio = historiaNegocio;
  }

  if (administracionNegocio) {
    patch.administracionNegocio = administracionNegocio;
  }

  if (madurez) {
    patch.madurez = madurez;
  }

  if (logo) {
    patch.logo = logo;
  }

  if (presupuesto) {
    patch.presupuesto = presupuesto;
  }

  if (localFisico) {
    patch.localFisico = localFisico;
  }

  if (diferenciador) {
    patch.audience = diferenciador;
  }

  if (objeciones) {
    patch.restrictions = objeciones;
  }

  if (publicidadPrevia) {
    patch.publicidadPrevia = publicidadPrevia;
  }

  if (cta) {
    patch.cta = cta;
  }

  if (planesFuturo) {
    patch.planesFuturo = planesFuturo;
  }

  if (historia) {
    patch.historiaYContexto = historia;
  }

  return patch;
}

/**
 * IMPL-20260611-07
 * Respaldo: fix Bug 3 - Cierre deterministico requiere summary no vacio.
 *
 * Heuristica liviana que infiere un patch de resumen estructurado a partir
 * del ultimo mensaje del cliente. Solo llena campos VACIOS (no sobrescribe
 * valores existentes) y solo para los 8 puntos del checklist de Vika. Se
 * ejecuta en el server action `sendClientMessageAction` despues de persistir
 * el mensaje del cliente y ANTES de llamar a Gemini, para que
 * `shouldForceClosure` pueda detectar cuando los 8 puntos estan completos
 * sin depender exclusivamente de lo que el modelo emita en el System Prompt.
 *
 * Es deliberadamente conservadora: si no detecta nada plausible, devuelve
 * `{}` y el flujo sigue normalmente. Si detecta valores plausibles, los
 * persiste via `updateBriefSummary` y luego se relee la version para
 * pasarsela a `generateBriefChatReply` con el `summary` actualizado.
 *
 * El parametro `stage` se acepta para mantener la firma estable con el
 * caller; en esta version no se usa para discriminar campos porque los
 * 8 puntos de Vika son ortogonales a las 3 etapas legacy.
 */
export function inferBriefSummaryPatchFromClientMessage(
  stage: BriefingStage,
  summary: StructuredBriefSummary,
  messageText: string
): Partial<StructuredBriefSummary> {
  void stage;
  const normalized = messageText.trim();

  if (!normalized) {
    return {};
  }

  const patch: Partial<StructuredBriefSummary> = {};

  // giroYProductoHeroe: capturar frases tipo "vendo X", "tengo un negocio de X".
  if (!hasMeaningfulSummaryValue("giroYProductoHeroe", summary.giroYProductoHeroe)) {
    const candidate = extractFirstMatch(normalized, [
      /(?:vendo|ofrezco|vendemos|ofrecemos|tengo un negocio de|tenemos un negocio de|mi negocio es|negocio de|soy duen[oa] de|trabajo en|trabajamos en)\s+([^.;\n]{4,140})/i,
      /(?:es un|son unos?)\s+([^.;\n]{4,140})/i
    ]);

    if (candidate && hasMeaningfulSummaryValue("giroYProductoHeroe", candidate)) {
      patch.giroYProductoHeroe = candidate;
      if (!hasMeaningfulSummaryValue("mainOffer", summary.mainOffer)) {
        patch.mainOffer = candidate;
      }
    }
  }

  // madurez: tiempo operando (anos/meses).
  if (!hasMeaningfulSummaryValue("madurez", summary.madurez)) {
    const candidate = extractFirstMatch(normalized, [
      /(?:llevo|tenemos|ya)\s+(\d+\s+(?:anos|año|meses|semanas|dias|días)(?:\s+(?:de|operando|abierto|en el negocio))?)/i,
      /(\d+\s+(?:anos|año|meses|semanas|dias|días)(?:\s+(?:de|operando|abierto|en el negocio))?)/i
    ]);

    if (candidate && hasMeaningfulSummaryValue("madurez", candidate)) {
      patch.madurez = candidate;
    }
  }

  // localFisico: local a la calle vs a domicilio/online.
  if (!hasMeaningfulSummaryValue("localFisico", summary.localFisico)) {
    if (/(?:local|taller|tienda|fisico|físico|establecimiento|presencial|a la calle|negocio presencial)/i.test(normalized)) {
      patch.localFisico = "Local a la calle";
    } else if (/(?:a domicilio|domicilio|online|en linea|en línea|por whats|whatsapp solamente|trabajo desde casa)/i.test(normalized)) {
      patch.localFisico = "A domicilio / online";
    }
  }

  // logo: tiene logotipo o solo el nombre.
  if (!hasMeaningfulSummaryValue("logo", summary.logo)) {
    if (/(?:tengo|tenemos|si tengo|si tenemos|cuenta con)\s+(?:un\s+)?(?:logotipo|logo)|logo\s+profesional|tiene\s+logo/i.test(normalized)) {
      patch.logo = "Tiene logotipo";
    } else if (/(?:no tengo|no tenemos|sin logo|solo el nombre|no tiene logo|aun no)/i.test(normalized) && /logo/i.test(normalized)) {
      patch.logo = "Solo el nombre";
    }
  }

  // presupuesto: monto explicito o $0.
  if (!hasMeaningfulSummaryValue("presupuesto", summary.presupuesto)) {
    const moneyMatch = normalized.match(/\$\s*[\d,]+(?:\s*(?:mil|k|mxn|pesos))?(?:\s*(?:mxn|pesos|mensuales|al mes|por mes))?/i);
    if (moneyMatch) {
      patch.presupuesto = cleanHeuristicValue(moneyMatch[0]);
    } else if (/(?:no tengo|no hay|sin presupuesto|cero|por ahora no|nada)\b/i.test(normalized) && /(?:presupuesto|inversion|inversión|publicidad|anuncios|para invertir)/i.test(normalized)) {
      patch.presupuesto = "$0 / Organico";
    } else {
      const kMatch = extractFirstMatch(normalized, [
        /(\d+\s*(?:mil|k)\s*(?:pesos|mxn)?(?:\s*(?:mensuales|al mes|por mes))?)/i
      ]);
      if (kMatch && /pes|mxn/i.test(kMatch)) {
        patch.presupuesto = kMatch;
      }
    }
  }

  // cta: WhatsApp, llamada, visita, agendar.
  if (!hasMeaningfulSummaryValue("cta", summary.cta)) {
    if (/(?:whatsapp|por whats|whats|wa\b)/i.test(normalized)) {
      patch.cta = "Escribir por WhatsApp";
    } else if (/(?:llamar|llamada|por telefono|por teléfono)/i.test(normalized)) {
      patch.cta = "Llamar por telefono";
    } else if (/(?:visitar|visita|ir al local|que vaya)/i.test(normalized)) {
      patch.cta = "Visitar el local";
    } else if (/(?:agendar|cita|reunion|reunión|agenda)/i.test(normalized)) {
      patch.cta = "Agendar cita";
    }
  }

  return patch;
}

export const briefingStages = ["discovery", "precision", "commercial_fit"] as const;

export type BriefingStage = (typeof briefingStages)[number];

export const briefingStatuses = [
  "draft",
  "stage_1_discovery",
  "stage_2_precision",
  "stage_3_commercial_fit",
  "pending_operator_review",
  "operator_review_in_progress",
  "approved_locked",
  "returned_for_rework",
  "superseded"
] as const;

export type BriefingStatus = (typeof briefingStatuses)[number];

export type StructuredBriefSummary = {
  projectObjective: string;
  expectedResult: string;
  businessContext: string;
  requestReason: string;
  mainOffer: string;
  audience: string;
  platform: string;
  deliverable: string;
  cta: string;
  tone: string;
  restrictions: string;
  references: string;
  urgency: string;
  messageCore: string;
  gaps: string;
  contradictions: string;
  structuringConfidence: string;
  recommendedProductSlotKey: string;
  recommendedProductConfidence: string;
  commercialFitReason: string;
  upsellSignal: string;
  operatorReviewNote: string;
  clientFacingSummary: string;
  /**
   * IMPL-20260611-01
   * Campos del flujo Vika (8 puntos) que viajan en el jsonb existente.
   * No requieren migración de Supabase.
   * IMPL-20260612-01
   * 5 campos nuevos del checklist 13 puntos: personaPerfil, historiaNegocio,
   * administracionNegocio, publicidadPrevia, planesFuturo.
   */
  madurez: string;
  logo: string;
  presupuesto: string;
  localFisico: string;
  giroYProductoHeroe: string;
  historiaYContexto: string;
  personaPerfil: string;
  historiaNegocio: string;
  administracionNegocio: string;
  publicidadPrevia: string;
  planesFuturo: string;
  /**
   * IMPL-20260615-10
   * Tracking de los frentes comerciales por los que Vika ya preguntó.
   * El cierre NO procede hasta que los 8 frentes estén marcados aquí.
   * Valores posibles: 'giro_y_producto_heroe', 'audience', 'presupuesto',
   *   'cta_deseado', 'historia_y_contexto', 'persona_perfil',
   *   'administracion_negocio', 'madurez', 'local_fisico', 'logo',
   *   'objeciones', 'publicidad_previa', 'planes_futuro'
   */
  frontsAsked?: string[];
};

export type BriefMessage = {
  id: string;
  versionId: string;
  stage: BriefingStage;
  authorRole: "client" | "assistant" | "operator";
  actorLabel: string;
  actorUserId: string | null;
  actorMembershipId: string | null;
  actorAgentId: string | null;
  effectiveUserId: string | null;
  effectiveMembershipId: string | null;
  messageText: string;
  createdAt: string;
};

export type BriefReviewEvent = {
  id: string;
  versionId: string;
  eventType: "submitted" | "review_started" | "approved" | "returned" | "reconducted" | "derived_version";
  note: string;
  createdByLabel: string;
  actorUserId: string | null;
  actorMembershipId: string | null;
  actorAgentId: string | null;
  effectiveUserId: string | null;
  effectiveMembershipId: string | null;
  recommendedProductSlotKey: string;
  createdAt: string;
};

export type BriefVersion = {
  id: string;
  briefId: string;
  versionNumber: number;
  stage: BriefingStage;
  status: BriefingStatus;
  editable: boolean;
  finalSummaryText: string;
  structuredSummary: StructuredBriefSummary;
  derivedFromVersionId: string | null;
  messages: BriefMessage[];
  reviewEvents: BriefReviewEvent[];
  createdAt: string;
  updatedAt: string;
};

export type BriefClientContainer = {
  id: string;
  tenantId: string;
  name: string;
  legalName: string | null;
  status: "active" | "prospect" | "inactive";
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactWhatsapp: string | null;
  primaryContactChannel: string | null;
  notes: string | null;
};

export type BriefProjectContainer = {
  id: string;
  tenantId: string;
  clientId: string;
  projectType: "lanzamiento" | "presencia" | "contenido" | "campana" | "interno";
  name: string;
  objective: string | null;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  ownerMembershipId: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type BriefOperationalContainer = {
  source: "brief" | "tenant_active" | "none";
  client: BriefClientContainer | null;
  project: BriefProjectContainer | null;
};

export type BriefRecord = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  clientId: string | null;
  projectId: string | null;
  status: BriefingStatus;
  sourceChannel: string;
  currentVersionNumber: number;
  createdAt: string;
  updatedAt: string;
  container: BriefOperationalContainer;
  currentVersion: BriefVersion | null;
};

type TenantRecord = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

type BriefRow = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  project_id: string | null;
  status: BriefingStatus;
  source_channel: string;
  current_version_number: number;
  active_version_id: string | null;
  created_at: string;
  updated_at: string;
};

type BriefVersionRow = {
  id: string;
  brief_id: string;
  version_number: number;
  stage_key: BriefingStage;
  status: BriefingStatus;
  final_summary_text: string | null;
  structured_summary_json: StructuredBriefSummary | null;
  derived_from_version_id: string | null;
  created_at: string;
  updated_at: string;
};

type BriefMessageRow = {
  id: string;
  brief_version_id: string;
  stage_key: BriefingStage;
  author_role: "client" | "assistant" | "operator";
  actor_label: string;
  actor_user_id: string | null;
  actor_membership_id: string | null;
  actor_agent_id: string | null;
  effective_user_id: string | null;
  effective_membership_id: string | null;
  message_text: string;
  created_at: string;
};

type BriefReviewEventRow = {
  id: string;
  brief_version_id: string;
  event_type: BriefReviewEvent["eventType"];
  note: string | null;
  created_by_label: string;
  actor_user_id: string | null;
  actor_membership_id: string | null;
  actor_agent_id: string | null;
  effective_user_id: string | null;
  effective_membership_id: string | null;
  recommended_product_slot_key: string | null;
  created_at: string;
};

type ClientRow = {
  id: string;
  tenant_id: string;
  name: string;
  legal_name: string | null;
  status: BriefClientContainer["status"];
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_whatsapp: string | null;
  primary_contact_channel: string | null;
  notes: string | null;
};

type ProjectRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  project_type: BriefProjectContainer["projectType"];
  name: string;
  objective: string | null;
  status: BriefProjectContainer["status"];
  owner_membership_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  clients:
    | ClientRow
    | ClientRow[]
    | null;
};

type MutationContext = {
  briefId: string;
  versionId: string;
};

export const emptyStructuredBriefSummary = (): StructuredBriefSummary => ({
  projectObjective: "",
  expectedResult: "",
  businessContext: "",
  requestReason: "",
  mainOffer: "",
  audience: "",
  platform: "",
  deliverable: "",
  cta: "",
  tone: "",
  restrictions: "",
  references: "",
  urgency: "",
  messageCore: "",
  gaps: "",
  contradictions: "",
  structuringConfidence: "",
  recommendedProductSlotKey: "",
  recommendedProductConfidence: "",
  commercialFitReason: "",
  upsellSignal: "",
  operatorReviewNote: "",
  clientFacingSummary: "",
  madurez: "",
  logo: "",
  presupuesto: "",
  localFisico: "",
  giroYProductoHeroe: "",
  historiaYContexto: "",
  personaPerfil: "",
  historiaNegocio: "",
  administracionNegocio: "",
  publicidadPrevia: "",
  planesFuturo: "",
  frontsAsked: []
});

export function normalizeSummary(input: Partial<StructuredBriefSummary> | null | undefined): StructuredBriefSummary {
  const base = emptyStructuredBriefSummary();

  if (!input) {
    return base;
  }

  return Object.fromEntries(
    Object.entries(base).map(([key, value]) => {
      const nextValue = input[key as keyof StructuredBriefSummary];
      // IMPL-20260615-32: preservar campos no-string (arrays como frontsAsked)
      // ademas de strings. Antes, normalizeSummary descartaba silenciosamente
      // cualquier array del patch, lo que rompia el tracking de frentes
      // preguntados al persistir el resumen via mergeStructuredBriefSummary.
      if (typeof nextValue === "string") {
        return [key, nextValue.trim()];
      }
      if (Array.isArray(nextValue)) {
        return [key, [...nextValue]];
      }
      return [key, value];
    })
  ) as StructuredBriefSummary;
}

export function statusFromStage(stage: BriefingStage): BriefingStatus {
  if (stage === "discovery") {
    return "stage_1_discovery";
  }

  if (stage === "precision") {
    return "stage_2_precision";
  }

  return "stage_3_commercial_fit";
}

export function nextStage(stage: BriefingStage): BriefingStage | null {
  if (stage === "discovery") {
    return "precision";
  }

  if (stage === "precision") {
    return "commercial_fit";
  }

  return null;
}

export function isVersionEditable(status: BriefingStatus): boolean {
  return !["pending_operator_review", "operator_review_in_progress", "approved_locked", "superseded"].includes(status);
}

export function mergeStructuredBriefSummary(
  current: StructuredBriefSummary,
  patch: Partial<StructuredBriefSummary>
): StructuredBriefSummary {
  return normalizeSummary({
    ...current,
    ...patch
  });
}

export function getCriticalMissingFields(summary: StructuredBriefSummary): string[] {
  const missing: string[] = [];

  if (!summary.projectObjective) {
    missing.push("objetivo del proyecto");
  }

  if (!summary.mainOffer) {
    missing.push("oferta principal");
  }

  if (!summary.audience) {
    missing.push("publico objetivo");
  }

  if (!summary.platform) {
    missing.push("plataforma o canal");
  }

  if (!summary.deliverable) {
    missing.push("entregable esperado");
  }

  if (!summary.cta) {
    missing.push("CTA");
  }

  const hasCommercialRoute =
    Boolean(summary.recommendedProductSlotKey) ||
    /revision comercial/i.test(`${summary.commercialFitReason} ${summary.operatorReviewNote}`);

  if (!hasCommercialRoute) {
    missing.push("encaje comercial o nota explicita de revision comercial");
  }

  return missing;
}

export function buildFinalSummaryText(summary: StructuredBriefSummary): string {
  const lines = [
    summary.projectObjective && `Objetivo: ${summary.projectObjective}.`,
    summary.mainOffer && `Oferta: ${summary.mainOffer}.`,
    summary.audience && `Publico: ${summary.audience}.`,
    summary.platform && `Canal o plataforma: ${summary.platform}.`,
    summary.deliverable && `Entregable esperado: ${summary.deliverable}.`,
    summary.cta && `CTA principal: ${summary.cta}.`,
    summary.restrictions && `Restricciones: ${summary.restrictions}.`,
    summary.gaps && `Faltantes o alertas: ${summary.gaps}.`,
    summary.recommendedProductSlotKey && `Slot comercial sugerido: ${summary.recommendedProductSlotKey}.`,
    summary.commercialFitReason && `Razon de encaje: ${summary.commercialFitReason}.`,
    summary.upsellSignal && `Oportunidad comercial: ${summary.upsellSignal}.`,
    summary.madurez && `Madurez del negocio: ${summary.madurez}.`,
    summary.logo && `Logo o marca: ${summary.logo}.`,
    summary.presupuesto && `Presupuesto mensual: ${summary.presupuesto}.`,
    summary.localFisico && `Local fisico: ${summary.localFisico}.`,
    summary.giroYProductoHeroe && `Giro y producto heroe: ${summary.giroYProductoHeroe}.`,
    summary.historiaYContexto && `Historia y contexto: ${summary.historiaYContexto}.`,
    summary.personaPerfil && `Perfil del dueño: ${summary.personaPerfil}.`,
    summary.historiaNegocio && `Historia del negocio: ${summary.historiaNegocio}.`,
    summary.administracionNegocio && `Administración: ${summary.administracionNegocio}.`,
    summary.publicidadPrevia && `Publicidad previa: ${summary.publicidadPrevia}.`,
    summary.planesFuturo && `Planes a futuro: ${summary.planesFuturo}.`
  ].filter(Boolean);

  return lines.join(" ");
}

function cleanHeuristicValue(value: string): string {
  return value.replace(/\s+/g, " ").trim().replace(/^[,.:;\-\s]+/, "").replace(/[.?!\s]+$/, "");
}

function normalizeHeuristicText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFirstMatch(messageText: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = messageText.match(pattern);
    const candidate = cleanHeuristicValue(match?.[1] ?? "");

    if (candidate) {
      return candidate;
    }
  }

  return "";
}

function detectKeywordValue(
  normalizedText: string,
  options: Array<{ value: string; keywords: string[] }>
): string {
  for (const option of options) {
    if (option.keywords.some((keyword) => normalizedText.includes(keyword))) {
      return option.value;
    }
  }

  return "";
}

function joinNaturalList(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]} y ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/**
 * IMPL-20260528-02
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260528-04_brief_chat_portal_cliente_v1.md
 */
type StageQuestionConfig = {
  key: keyof StructuredBriefSummary;
  question: string;
  clarification: string;
};

const VISIBLE_QUESTION_BY_FIELD: Partial<Record<keyof StructuredBriefSummary, StageQuestionConfig | null>> = {
  projectObjective: {
    key: "projectObjective",
    question: "¿Qué resultado concreto te gustaría conseguir con este proyecto?",
    clarification:
      "Me refiero al cambio que te gustaría lograr con esta iniciativa: por ejemplo vender más, generar más leads, conseguir reuniones o lanzar una nueva oferta. ¿Qué resultado quieres mover primero?"
  },
  expectedResult: null,
  businessContext: {
    key: "businessContext",
    question: "¿Cómo está hoy tu negocio o esta línea de servicio, y qué contexto deberíamos considerar?",
    clarification:
      "Aquí me ayuda entender el punto de partida: por ejemplo si ya vendes esto, si es algo nuevo, si tienes audiencia activa o si vienes de una baja en ventas. ¿Cómo está hoy ese frente del negocio?"
  },
  requestReason: {
    key: "requestReason",
    question: "¿Por qué te importa mover esto ahora y qué disparó esta necesidad?",
    clarification:
      "Busco entender qué activó este pedido ahora: por ejemplo una meta comercial, una caída en resultados, una campaña que viene o una oportunidad puntual. ¿Qué lo detonó?"
  },
  mainOffer: {
    key: "mainOffer",
    question: "¿Cuál es el servicio o producto principal que quieres mover primero?",
    clarification:
      "Me refiero a lo que quieres vender o impulsar primero en esta conversación. Puede ser un servicio, un producto, una promoción, una membresía o una oferta puntual. ¿Qué quieres mover exactamente?"
  },
  audience: {
    key: "audience",
    question: "¿A qué tipo de personas o empresas quieres llegar primero?",
    clarification:
      "Aquí me sirve ubicar a quién quieres atraer: por ejemplo dueños de negocio, madres jóvenes, pacientes, equipos comerciales o empresas de cierto tamaño. ¿Quién es ese público principal?"
  },
  platform: {
    key: "platform",
    question: "¿En qué canal o plataforma quieres mover esta acción primero?",
    clarification:
      "Me refiero al lugar donde quieres activar esto primero: por ejemplo Instagram, WhatsApp, landing, sitio web, email o anuncios. ¿Dónde quieres moverlo?"
  },
  deliverable: {
    key: "deliverable",
    question: "¿Qué pieza o solución necesitas que preparemos para mover esa acción?",
    clarification:
      "Aquí quiero entender qué necesitas producir: por ejemplo una landing, anuncios, una secuencia de mensajes, un video, piezas gráficas o una campaña completa. ¿Qué necesitas exactamente?"
  },
  cta: {
    key: "cta",
    question: "¿Qué acción te gustaría que haga la persona al ver esta pieza?",
    clarification:
      "Me refiero a la respuesta que esperas provocar: por ejemplo escribirte, agendar, comprar, pedir cotización o registrarse. ¿Qué acción quieres empujar?"
  },
  tone: null,
  restrictions: null,
  references: null,
  urgency: null,
  messageCore: null,
  gaps: null,
  contradictions: null,
  structuringConfidence: null,
  recommendedProductSlotKey: {
    key: "recommendedProductSlotKey",
    question: "Con lo que hemos hablado, ¿qué tipo de solución sientes que encaja mejor con lo que necesitas ahora?",
    clarification:
      "Estoy buscando confirmar qué clase de solución te haría más sentido hoy: por ejemplo campaña, presencia digital, contenido o lanzamiento. Si prefieres, también puedes decirme qué esperas que resolvamos primero."
  },
  recommendedProductConfidence: null,
  commercialFitReason: {
    key: "commercialFitReason",
    question: "¿Qué te hace pensar que esta es la dirección correcta para resolver tu caso?",
    clarification:
      "Aquí me ayuda entender por qué esta vía te hace sentido: por ejemplo por velocidad, presupuesto, complejidad del caso o porque ya intentaste otra cosa. ¿Qué te hace pensar que esta es la mejor dirección?"
  },
  upsellSignal: null,
  operatorReviewNote: null,
  clientFacingSummary: null,
  madurez: {
    key: "madurez",
    question: "¿Cuánto tiempo llevas con el negocio abierto?",
    clarification:
      "Me interesa saber si apenas estás empezando o si ya tienes un tiempo operando. Eso me ayuda a pensar la estrategia adecuada."
  },
  logo: {
    key: "logo",
    question: "¿Tienes un logotipo o usas el nombre del negocio con letras bonitas?",
    clarification:
      "Con esto ubico si ya tienes marca gráfica lista o si necesitamos contemplarla dentro de la estrategia."
  },
  presupuesto: {
    key: "presupuesto",
    question: "¿De cuánto dinero dispones al mes para invertir en este proyecto?",
    clarification:
      "Si no tienes un monto claro, lo anotamos como $0 / Orgánico y diseñamos la estrategia en consecuencia."
  },
  localFisico: {
    key: "localFisico",
    question: "¿Tienes un local donde la gente te visita o entregas a domicilio?",
    clarification:
      "Con eso decido si conviene mostrar la fachada del local o si la estrategia es 100% digital o a domicilio."
  },
  giroYProductoHeroe: null,
  historiaYContexto: null,
  personaPerfil: {
    key: "personaPerfil",
    question: "¿Cómo te describirías tú como dueño del negocio?",
    clarification:
      "Me ayuda a entender tu estilo: por ejemplo si eres manos a la obra, si delegas, si vienes del lado técnico o comercial. ¿Cómo te ves tú en el día a día?"
  },
  historiaNegocio: {
    key: "historiaNegocio",
    question: "¿Cómo te animaste a poner el negocio?",
    clarification:
      "Me interesa conocer el origen: por ejemplo herencia familiar, detectaste una necesidad, siempre te gustó el rubro, o fue una oportunidad que apareció. Cuéntamelo en tus palabras."
  },
  administracionNegocio: {
    key: "administracionNegocio",
    question: "¿Cómo administras el día a día? ¿Tienes equipo o estás solo?",
    clarification:
      "Quiero entender la operación: por ejemplo 'yo solo hago todo', 'tengo 2 empleados y un socio', 'tercerizo lo operativo'. ¿Cómo está armado tu equipo?"
  },
  publicidadPrevia: {
    key: "publicidadPrevia",
    question: "¿Has intentado publicidad antes? ¿Qué hiciste y cómo te fue?",
    clarification:
      "Me sirve saber si ya probaste algo: por ejemplo 'boost en Instagram $500, pocos resultados', 'flyers en la zona', 'Google Ads un mes', 'nunca he invertido en publicidad'."
  },
  planesFuturo: {
    key: "planesFuturo",
    question: "¿Qué planes tienes para el negocio en los próximos 6-12 meses?",
    clarification:
      "Me ayuda a alinear la estrategia: por ejemplo 'abrir segunda sucursal', 'lanzar producto nuevo', 'franquiciar', 'estabilizar y ordenar', 'crecer 30% en ventas'."
  }
};

const STAGE_FIELD_PRIORITY: Record<BriefingStage, Array<keyof StructuredBriefSummary>> = {
  discovery: ["mainOffer", "projectObjective", "requestReason", "businessContext", "personaPerfil", "historiaNegocio", "administracionNegocio"],
  precision: ["audience", "platform", "deliverable", "cta"],
  commercial_fit: ["recommendedProductSlotKey", "commercialFitReason", "presupuesto", "planesFuturo", "madurez", "logo", "localFisico", "publicidadPrevia"]
};

const FIELD_COMPLETION_RULES: Partial<
  Record<keyof StructuredBriefSummary, { minLength: number; minWords?: number }>
> = {
  projectObjective: { minLength: 12, minWords: 3 },
  businessContext: { minLength: 18, minWords: 4 },
  requestReason: { minLength: 12, minWords: 3 },
  mainOffer: { minLength: 6, minWords: 1 },
  audience: { minLength: 6, minWords: 1 },
  platform: { minLength: 3, minWords: 1 },
  deliverable: { minLength: 4, minWords: 1 },
  cta: { minLength: 4, minWords: 1 },
  recommendedProductSlotKey: { minLength: 4, minWords: 1 },
  commercialFitReason: { minLength: 12, minWords: 3 },
  madurez: { minLength: 2, minWords: 1 },
  logo: { minLength: 2, minWords: 1 },
  presupuesto: { minLength: 1, minWords: 1 },
  localFisico: { minLength: 2, minWords: 1 },
  giroYProductoHeroe: { minLength: 4, minWords: 1 },
  historiaYContexto: { minLength: 4, minWords: 1 },
  personaPerfil: { minLength: 4, minWords: 1 },
  historiaNegocio: { minLength: 8, minWords: 2 },
  administracionNegocio: { minLength: 6, minWords: 1 },
  publicidadPrevia: { minLength: 4, minWords: 1 },
  planesFuturo: { minLength: 6, minWords: 1 }
};

const GENERIC_SUMMARY_VALUES = new Set(["hola", "buenas", "gracias", "si", "no", "ok", "dale", "listo"]);

const HEURISTIC_PLATFORM_OPTIONS = [
  { value: "Instagram", keywords: ["instagram", "ig", "reels"] },
  { value: "WhatsApp", keywords: ["whatsapp", "whats", "wa"] },
  { value: "Landing", keywords: ["landing", "pagina", "página", "sitio web", "sitio", "web"] },
  { value: "Facebook", keywords: ["facebook", "meta ads", "meta"] },
  { value: "TikTok", keywords: ["tiktok", "tik tok"] },
  { value: "Email", keywords: ["email", "correo", "mail"] },
  { value: "Google Ads", keywords: ["google ads", "google", "search"] }
];

const HEURISTIC_DELIVERABLE_OPTIONS = [
  { value: "Landing", keywords: ["landing", "pagina", "página", "sitio", "web"] },
  { value: "Campana publicitaria", keywords: ["campana", "campaña", "ads", "anuncios", "publicidad"] },
  { value: "Piezas graficas", keywords: ["piezas", "creativos", "grafica", "gráfica", "banners"] },
  { value: "Video", keywords: ["video", "reel", "spot"] },
  { value: "Secuencia de mensajes", keywords: ["secuencia", "mensajes", "whatsapp", "follow up"] },
  { value: "Cotizacion comercial", keywords: ["cotizacion", "cotización", "propuesta"] }
];

const HEURISTIC_CTA_OPTIONS = [
  { value: "Agendar llamada", keywords: ["agendar", "agenda", "llamada", "reunion", "reunión", "cita"] },
  { value: "Escribir por WhatsApp", keywords: ["whatsapp", "escribir", "mensaje"] },
  { value: "Solicitar cotizacion", keywords: ["cotizacion", "cotización", "cotizar", "presupuesto"] },
  { value: "Comprar", keywords: ["comprar", "pagar"] },
  { value: "Registrarse", keywords: ["registrarse", "registro", "inscribirse", "inscripcion", "inscripción"] }
];

function countWords(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-07_chat_brief_adaptativo_y_etapas_background_v1.md
 */
export function hasMeaningfulSummaryValue(
  field: keyof StructuredBriefSummary,
  value: string
): boolean {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return false;
  }

  if (GENERIC_SUMMARY_VALUES.has(normalizedValue.toLowerCase())) {
    return false;
  }

  const rule = FIELD_COMPLETION_RULES[field];

  if (!rule) {
    return normalizedValue.length > 0;
  }

  if (normalizedValue.length < rule.minLength) {
    return false;
  }

  if (rule.minWords && countWords(normalizedValue) < rule.minWords) {
    return false;
  }

  return true;
}

function extractProjectObjectiveCandidate(messageText: string, normalizedText: string): string {
  return (
    extractFirstMatch(messageText, [
      /(?:objetivo|meta|resultado(?:\s+principal)?)\s+(?:es|seria|sería)?\s*([^.;\n]+)/i,
      /(?:queremos|buscamos|necesitamos)\s+((?:captar|generar|vender|agendar|llenar|posicionar|activar|conseguir|lanzar)[^.;\n]+)/i,
      /((?:captar|generar|vender|agendar|llenar|posicionar|activar|conseguir|lanzar)[^.;\n]+)/i
    ]) ||
    detectKeywordValue(normalizedText, [
      { value: "Generar leads calificados", keywords: ["leads", "prospectos"] },
      { value: "Agendar citas", keywords: ["citas", "agendar"] },
      { value: "Vender mas", keywords: ["vender", "ventas"] },
      { value: "Lanzar una oferta", keywords: ["lanzar", "preventa"] }
    ])
  );
}

function extractMainOfferCandidate(messageText: string): string {
  return extractFirstMatch(messageText, [
    /(?:servicio|producto|oferta|linea|línea|frente)\s+(?:principal\s+)?(?:es|son)?\s*([^.;\n]+)/i,
    /(?:quiero|queremos|busco|buscamos|necesito|necesitamos)\s+(?:mover|vender|impulsar|promocionar|lanzar)\s+([^.;\n]+)/i,
    /(?:ofrecemos|vendo|vendemos)\s+([^.;\n]+)/i
  ]);
}

function extractBusinessContextCandidate(messageText: string): string {
  return extractFirstMatch(messageText, [
    /(?:hoy|actualmente|ahora)\s+([^.;\n]+)/i,
    /(?:venimos|hasta ahora|ya)\s+([^.;\n]+)/i,
    /(?:somos|tenemos)\s+([^.;\n]+)/i
  ]);
}

function extractRequestReasonCandidate(messageText: string): string {
  return extractFirstMatch(messageText, [
    /(?:porque|por que|ya que|debido a que)\s+([^.;\n]+)/i,
    /(?:nos urge|me urge|urge|nos importa ahora|me importa ahora)\s+([^.;\n]+)/i,
    /(?:la necesidad|este pedido|esto)\s+(?:nace|viene)\s+de\s+([^.;\n]+)/i
  ]);
}

function extractAudienceCandidate(messageText: string): string {
  return extractFirstMatch(messageText, [
    /(?:publico|público|audiencia|cliente(?:s)? ideal(?:es)?)\s+(?:principal|objetivo)?\s*(?:es|son)?\s*([^.;\n]+)/i,
    /(?:dirigido|enfocado|orientado)\s+a\s+([^.;\n]+)/i,
    /(?:para)\s+((?:personas|empresas|negocios|duenos?|dueños?|madres?|padres?|pacientes?|equipos|profesionales|marcas)[^.;\n]*)/i
  ]);
}

function extractPlatformCandidate(messageText: string, normalizedText: string): string {
  return (
    detectKeywordValue(normalizedText, HEURISTIC_PLATFORM_OPTIONS) ||
    extractFirstMatch(messageText, [
      /(?:canal|plataforma)\s+(?:principal\s+)?(?:es|seria|sería)?\s*([^.;\n]+)/i,
      /(?:en|por|via|vía)\s+([^.;\n]+(?:instagram|whatsapp|landing|facebook|tiktok|email|google)[^.;\n]*)/i
    ])
  );
}

function extractDeliverableCandidate(messageText: string, normalizedText: string): string {
  return (
    extractFirstMatch(messageText, [
      /(?:necesitamos|quiero|queremos|busco|buscamos)\s+(?:una|un|unos|unas)?\s*(landing|campana|campaña|video|sitio web|pagina|página|cotizacion|cotización|propuesta|secuencia de mensajes|piezas graficas|piezas gráficas)/i,
      /(?:pieza|entregable|solucion|solución)\s+(?:principal\s+)?(?:es|seria|sería)?\s*([^.;\n]+)/i
    ]) || detectKeywordValue(normalizedText, HEURISTIC_DELIVERABLE_OPTIONS)
  );
}

function extractCtaCandidate(messageText: string, normalizedText: string): string {
  return (
    extractFirstMatch(messageText, [
      /(?:cta|accion|acción)\s+(?:principal\s+)?(?:es|seria|sería)?\s*([^.;\n]+)/i,
      /(?:queremos|quiero|busco|buscamos)\s+que\s+(?:la gente|las personas|el cliente)\s+([^.;\n]+)/i
    ]) || detectKeywordValue(normalizedText, HEURISTIC_CTA_OPTIONS)
  );
}

function extractCommercialFitReasonCandidate(messageText: string): string {
  return extractFirstMatch(messageText, [
    /(?:nos hace sentido|hace sentido|conviene|encaja)\s+([^.;\n]+)/i,
    /(?:porque|por que|ya que)\s+([^.;\n]+)/i,
    /(?:la mejor opcion|la mejor opción|lo mejor)\s+(?:es|seria|sería)?\s*([^.;\n]+)/i
  ]);
}

function shouldApplySummaryCandidate(
  field: keyof StructuredBriefSummary,
  currentValue: string,
  candidateValue: string
): boolean {
  const nextValue = cleanHeuristicValue(candidateValue);

  if (!hasMeaningfulSummaryValue(field, nextValue)) {
    return false;
  }

  const current = cleanHeuristicValue(currentValue);

  if (!hasMeaningfulSummaryValue(field, current)) {
    return true;
  }

  const normalizedCurrent = normalizeHeuristicText(current);
  const normalizedNext = normalizeHeuristicText(nextValue);

  if (!normalizedNext || normalizedCurrent === normalizedNext) {
    return false;
  }

  if (normalizedNext.includes(normalizedCurrent) && nextValue.length > current.length + 4) {
    return true;
  }

  return nextValue.length >= current.length + 12 && countWords(nextValue) >= countWords(current) + 1;
}

/**
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-07_chat_brief_adaptativo_y_etapas_background_v1.md
 */
export function hasBackgroundStageSufficientInfo(
  stage: BriefingStage,
  summary: StructuredBriefSummary
): boolean {
  const hasAllStageFields = STAGE_FIELD_PRIORITY[stage].every((field) =>
    hasMeaningfulSummaryValue(field, String(summary[field] ?? ""))
  );

  if (!hasAllStageFields) {
    return false;
  }

  if (stage !== "commercial_fit") {
    return true;
  }

  return getCriticalMissingFields(summary).length === 0;
}

/**
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-06_reescritura_controlada_runtime_chat_brief_v1.md
 */
export function getCurrentVisibleStageQuestion(
  stage: BriefingStage,
  summary: StructuredBriefSummary
): StageQuestionConfig | null {
  for (const fieldKey of STAGE_FIELD_PRIORITY[stage]) {
    if (String(summary[fieldKey] ?? "").trim()) {
      continue;
    }

    const questionConfig = VISIBLE_QUESTION_BY_FIELD[fieldKey];

    if (questionConfig) {
      return questionConfig;
    }
  }

  return null;
}

export function buildAssistantGuidance(stage: BriefingStage, summary: StructuredBriefSummary): string {
  const currentQuestion = getCurrentVisibleStageQuestion(stage, summary);

  if (stage === "discovery") {
    if (!summary.mainOffer && !summary.projectObjective && !summary.requestReason && !summary.businessContext) {
      return "\u00a1Hola! Para armar tu estrategia, cu\u00e9ntame: \u00bfDe qu\u00e9 es tu negocio y qu\u00e9 es lo que m\u00e1s se vende?";
    }

    if (!currentQuestion) {
      return "Ya ubico bien el frente principal. Ahora me sirve saber a qui\u00e9n quieres llegar primero y en qu\u00e9 canal tiene m\u00e1s sentido moverlo.";
    }

    return currentQuestion.question;
  }

  if (stage === "precision") {
    return currentQuestion?.question
      ? currentQuestion.question
      : "Con eso ya tengo una base \u00fatil. Si hay un matiz de tono, tiempos o l\u00edmites que deba cuidar, cu\u00e9ntamelo y lo considero desde la propuesta.";
  }

  return summary.recommendedProductSlotKey
    ? "Ya veo por d\u00f3nde puede ir la propuesta. Si hay algo importante que debamos respetar s\u00ed o s\u00ed, cu\u00e9ntamelo y cierro el encaje final."
    : currentQuestion?.question ||
        "Antes de cerrar, quiero confirmar qu\u00e9 tipo de soluci\u00f3n te har\u00eda m\u00e1s sentido en este momento.";
}

export function selectPreferredProject<T extends { status: BriefProjectContainer["status"] }>(projects: T[]): T | null {
  const priority: BriefProjectContainer["status"][] = ["active", "draft", "paused", "completed", "archived"];

  for (const status of priority) {
    const project = projects.find((candidate) => candidate.status === status);

    if (project) {
      return project;
    }
  }

  return projects[0] ?? null;
}

function normalizeClientRow(row: ClientRow): BriefClientContainer {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    legalName: row.legal_name,
    status: row.status,
    primaryContactName: row.primary_contact_name,
    primaryContactEmail: row.primary_contact_email,
    primaryContactWhatsapp: row.primary_contact_whatsapp,
    primaryContactChannel: row.primary_contact_channel,
    notes: row.notes
  };
}

function normalizeProjectContainer(row: ProjectRow): BriefOperationalContainer {
  const client = Array.isArray(row.clients) ? row.clients[0] ?? null : row.clients;

  return {
    source: "brief",
    client: client ? normalizeClientRow(client) : null,
    project: {
      id: row.id,
      tenantId: row.tenant_id,
      clientId: row.client_id,
      projectType: row.project_type,
      name: row.name,
      objective: row.objective,
      status: row.status,
      ownerMembershipId: row.owner_membership_id,
      startDate: row.start_date,
      endDate: row.end_date
    }
  };
}

function getServerApiKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseEnv.anonKey;
}

async function postgrest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${supabaseEnv.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: getServerApiKey(),
      Authorization: `Bearer ${getServerApiKey()}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`supabase_postgrest_error:${response.status}`);
  }

  if (response.status === 204) {
    return [] as T;
  }

  return (await response.json()) as T;
}

async function getTenantRecord(slug = supabaseEnv.defaultTenant): Promise<TenantRecord | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const params = new URLSearchParams({
    select: "id,slug,name,status",
    slug: `eq.${slug}`,
    limit: "1"
  });
  const rows = await postgrest<TenantRecord[]>(`tenants?${params.toString()}`, {
    method: "GET"
  });

  return rows[0] ?? null;
}

async function getLatestBriefRow(tenantId: string): Promise<BriefRow | null> {
  const params = new URLSearchParams({
    select: "id,tenant_id,client_id,project_id,status,source_channel,current_version_number,active_version_id,created_at,updated_at",
    tenant_id: `eq.${tenantId}`,
    order: "updated_at.desc",
    limit: "1"
  });
  const rows = await postgrest<BriefRow[]>(`briefs?${params.toString()}`, {
    method: "GET"
  });

  return rows[0] ?? null;
}

async function getBriefVersionRow(versionId: string): Promise<BriefVersionRow | null> {
  const params = new URLSearchParams({
    select: "id,brief_id,version_number,stage_key,status,final_summary_text,structured_summary_json,derived_from_version_id,created_at,updated_at",
    id: `eq.${versionId}`,
    limit: "1"
  });
  const rows = await postgrest<BriefVersionRow[]>(`brief_versions?${params.toString()}`, {
    method: "GET"
  });

  return rows[0] ?? null;
}

async function getClientRowById(clientId: string): Promise<ClientRow | null> {
  const params = new URLSearchParams({
    select: "id,tenant_id,name,legal_name,status,primary_contact_name,primary_contact_channel,notes",
    id: `eq.${clientId}`,
    limit: "1"
  });
  const rows = await postgrest<ClientRow[]>(`clients?${params.toString()}`, {
    method: "GET"
  });

  return rows[0] ?? null;
}

async function getProjectContainerById(projectId: string): Promise<BriefOperationalContainer | null> {
  const params = new URLSearchParams({
    select: "id,tenant_id,client_id,project_type,name,objective,status,owner_membership_id,start_date,end_date,created_at,updated_at,clients!projects_client_id_fkey(id,tenant_id,name,legal_name,status,primary_contact_name,primary_contact_channel,notes)",
    id: `eq.${projectId}`,
    limit: "1"
  });
  const rows = await postgrest<ProjectRow[]>(`projects?${params.toString()}`, {
    method: "GET"
  });
  const project = rows[0] ?? null;

  return project ? normalizeProjectContainer(project) : null;
}

async function getTenantActiveContainer(tenantId: string): Promise<BriefOperationalContainer> {
  const params = new URLSearchParams({
    select: "id,tenant_id,client_id,project_type,name,objective,status,owner_membership_id,start_date,end_date,created_at,updated_at,clients!projects_client_id_fkey(id,tenant_id,name,legal_name,status,primary_contact_name,primary_contact_channel,notes)",
    tenant_id: `eq.${tenantId}`,
    order: "created_at.asc"
  });
  const rows = await postgrest<ProjectRow[]>(`projects?${params.toString()}`, {
    method: "GET"
  });
  const selectedProject = selectPreferredProject(rows);

  if (selectedProject) {
    return {
      ...normalizeProjectContainer(selectedProject),
      source: "tenant_active"
    };
  }

  return {
    source: "none",
    client: null,
    project: null
  };
}

async function resolveBriefOperationalContainer(brief: BriefRow): Promise<BriefOperationalContainer> {
  if (brief.project_id) {
    const projectContainer = await getProjectContainerById(brief.project_id);

    if (projectContainer) {
      return {
        ...projectContainer,
        source: "brief"
      };
    }
  }

  if (brief.client_id) {
    const client = await getClientRowById(brief.client_id);

    if (client) {
      return {
        source: "brief",
        client: normalizeClientRow(client),
        project: null
      };
    }
  }

  return getTenantActiveContainer(brief.tenant_id);
}

async function getLatestBriefVersionRow(briefId: string): Promise<BriefVersionRow | null> {
  const params = new URLSearchParams({
    select: "id,brief_id,version_number,stage_key,status,final_summary_text,structured_summary_json,derived_from_version_id,created_at,updated_at",
    brief_id: `eq.${briefId}`,
    order: "version_number.desc",
    limit: "1"
  });
  const rows = await postgrest<BriefVersionRow[]>(`brief_versions?${params.toString()}`, {
    method: "GET"
  });

  return rows[0] ?? null;
}

/**
 * IMPL-20260528-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260528-06_hardening_rehidratacion_brief_cliente_v1.md
 */
async function hydrateBriefRecord(briefRow: BriefRow, tenant: TenantRecord): Promise<BriefRecord> {
  const currentVersionRow = briefRow.active_version_id
    ? await getBriefVersionRow(briefRow.active_version_id)
    : await getLatestBriefVersionRow(briefRow.id);
  const container = await resolveBriefOperationalContainer(briefRow);
  const currentVersion = currentVersionRow ? await serializeVersion(currentVersionRow) : null;

  return {
    id: briefRow.id,
    tenantId: briefRow.tenant_id,
    tenantSlug: tenant.slug,
    clientId: briefRow.client_id,
    projectId: briefRow.project_id,
    status: briefRow.status,
    sourceChannel: briefRow.source_channel,
    currentVersionNumber: briefRow.current_version_number,
    createdAt: briefRow.created_at,
    updatedAt: briefRow.updated_at,
    container,
    currentVersion
  };
}

async function getBriefMessages(versionId: string): Promise<BriefMessage[]> {
  const params = new URLSearchParams({
    select: "id,brief_version_id,stage_key,author_role,actor_label,actor_user_id,actor_membership_id,actor_agent_id,effective_user_id,effective_membership_id,message_text,created_at",
    brief_version_id: `eq.${versionId}`,
    order: "created_at.asc"
  });
  const rows = await postgrest<BriefMessageRow[]>(`brief_messages?${params.toString()}`, {
    method: "GET"
  });

  return rows.map((row) => ({
    id: row.id,
    versionId: row.brief_version_id,
    stage: row.stage_key,
    authorRole: row.author_role,
    actorLabel: row.actor_label,
    actorUserId: row.actor_user_id,
    actorMembershipId: row.actor_membership_id,
    actorAgentId: row.actor_agent_id,
    effectiveUserId: row.effective_user_id,
    effectiveMembershipId: row.effective_membership_id,
    messageText: row.message_text,
    createdAt: row.created_at
  }));
}

async function getBriefReviewEvents(versionId: string): Promise<BriefReviewEvent[]> {
  const params = new URLSearchParams({
    select: "id,brief_version_id,event_type,note,created_by_label,actor_user_id,actor_membership_id,actor_agent_id,effective_user_id,effective_membership_id,recommended_product_slot_key,created_at",
    brief_version_id: `eq.${versionId}`,
    order: "created_at.desc"
  });
  const rows = await postgrest<BriefReviewEventRow[]>(`brief_review_events?${params.toString()}`, {
    method: "GET"
  });

  return rows.map((row) => ({
    id: row.id,
    versionId: row.brief_version_id,
    eventType: row.event_type,
    note: row.note ?? "",
    createdByLabel: row.created_by_label,
    actorUserId: row.actor_user_id,
    actorMembershipId: row.actor_membership_id,
    actorAgentId: row.actor_agent_id,
    effectiveUserId: row.effective_user_id,
    effectiveMembershipId: row.effective_membership_id,
    recommendedProductSlotKey: row.recommended_product_slot_key ?? "",
    createdAt: row.created_at
  }));
}

async function serializeVersion(row: BriefVersionRow): Promise<BriefVersion> {
  const [messages, reviewEvents] = await Promise.all([getBriefMessages(row.id), getBriefReviewEvents(row.id)]);

  return {
    id: row.id,
    briefId: row.brief_id,
    versionNumber: row.version_number,
    stage: row.stage_key,
    status: row.status,
    editable: isVersionEditable(row.status),
    finalSummaryText: row.final_summary_text ?? buildFinalSummaryText(normalizeSummary(row.structured_summary_json)),
    structuredSummary: normalizeSummary(row.structured_summary_json),
    derivedFromVersionId: row.derived_from_version_id,
    messages,
    reviewEvents,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function updateBriefStatus(briefId: string, status: BriefingStatus, activeVersionId?: string | null, currentVersionNumber?: number) {
  const patch: Record<string, string | number | null> = { status };

  if (typeof activeVersionId !== "undefined") {
    patch.active_version_id = activeVersionId;
  }

  if (typeof currentVersionNumber !== "undefined") {
    patch.current_version_number = currentVersionNumber;
  }

  await postgrest<BriefRow[]>(`briefs?id=eq.${briefId}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
}

async function insertReviewEvent(params: {
  tenantId: string;
  briefId: string;
  versionId: string;
  eventType: BriefReviewEvent["eventType"];
  note?: string;
  createdByLabel: string;
  actorUserId?: string | null;
  actorMembershipId?: string | null;
  actorAgentId?: string | null;
  effectiveUserId?: string | null;
  effectiveMembershipId?: string | null;
  recommendedProductSlotKey?: string;
}) {
  await postgrest<BriefReviewEventRow[]>("brief_review_events", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: params.tenantId,
      brief_id: params.briefId,
      brief_version_id: params.versionId,
      event_type: params.eventType,
      note: params.note ?? "",
      created_by_label: params.createdByLabel,
      actor_user_id: params.actorUserId ?? null,
      actor_membership_id: params.actorMembershipId ?? null,
      actor_agent_id: params.actorAgentId ?? null,
      effective_user_id: params.effectiveUserId ?? null,
      effective_membership_id: params.effectiveMembershipId ?? null,
      recommended_product_slot_key: params.recommendedProductSlotKey ?? ""
    })
  });
}

async function updateVersionRecord(versionId: string, patch: Partial<BriefVersionRow>) {
  await postgrest<BriefVersionRow[]>(`brief_versions?id=eq.${versionId}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
}

export async function getBriefWorkspace(tenantSlug = supabaseEnv.defaultTenant): Promise<BriefRecord | null> {
  const tenant = await getTenantRecord(tenantSlug);

  if (!tenant) {
    return null;
  }

  const briefRow = await getLatestBriefRow(tenant.id);

  if (!briefRow) {
    return null;
  }

  const currentVersionRow = briefRow.active_version_id
    ? await getBriefVersionRow(briefRow.active_version_id)
    : await getLatestBriefVersionRow(briefRow.id);
  const container = await resolveBriefOperationalContainer(briefRow);
  const currentVersion = currentVersionRow ? await serializeVersion(currentVersionRow) : null;

  return {
    id: briefRow.id,
    tenantId: briefRow.tenant_id,
    tenantSlug: tenant.slug,
    clientId: briefRow.client_id,
    projectId: briefRow.project_id,
    status: briefRow.status,
    sourceChannel: briefRow.source_channel,
    currentVersionNumber: briefRow.current_version_number,
    createdAt: briefRow.created_at,
    updatedAt: briefRow.updated_at,
    container,
    currentVersion
  };
}

export async function createBriefForDefaultTenant(tenantSlug = supabaseEnv.defaultTenant): Promise<BriefRecord> {
  const tenant = await getTenantRecord(tenantSlug);

  if (!tenant) {
    throw new Error("tenant_not_found");
  }

  const activeContainer = await getTenantActiveContainer(tenant.id);

  const [briefRow] = await postgrest<BriefRow[]>("briefs", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: tenant.id,
      client_id: activeContainer.client?.id ?? null,
      project_id: activeContainer.project?.id ?? null,
      status: "stage_1_discovery",
      source_channel: "bridge_web",
      current_version_number: 1
    })
  });
  const [versionRow] = await postgrest<BriefVersionRow[]>("brief_versions", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: tenant.id,
      brief_id: briefRow.id,
      version_number: 1,
      stage_key: "discovery",
      status: "stage_1_discovery",
      structured_summary_json: emptyStructuredBriefSummary(),
      final_summary_text: ""
    })
  });

  const identity = await getTenantIdentityContextByTenantId(tenant.id);
  const assistantTrace = resolveActorTrace({
    fallbackLabel: "Bridge briefing",
    technicalActor: identity?.serviceAgent,
    effectiveMembership: identity?.operatorMembership
  });

  await updateBriefStatus(briefRow.id, "stage_1_discovery", versionRow.id, 1);
  await appendBriefMessage({
    briefId: briefRow.id,
    versionId: versionRow.id,
    authorRole: "assistant",
    actorLabel: assistantTrace.actorLabel,
    actorUserId: assistantTrace.actorUserId,
    actorMembershipId: assistantTrace.actorMembershipId,
    actorAgentId: assistantTrace.actorAgentId,
    effectiveUserId: assistantTrace.effectiveUserId,
    effectiveMembershipId: assistantTrace.effectiveMembershipId,
    messageText: buildAssistantGuidance("discovery", emptyStructuredBriefSummary()),
    stage: "discovery"
  });

  const workspace = await getBriefWorkspace(tenantSlug);

  if (!workspace) {
    throw new Error("brief_creation_failed");
  }

  return workspace;
}

export async function appendBriefMessage(params: {
  briefId: string;
  versionId: string;
  authorRole: BriefMessage["authorRole"];
  actorLabel: string;
  actorUserId?: string | null;
  actorMembershipId?: string | null;
  actorAgentId?: string | null;
  effectiveUserId?: string | null;
  effectiveMembershipId?: string | null;
  messageText: string;
  stage: BriefingStage;
}) {
  const version = await getBriefVersionRow(params.versionId);
  const brief = await getBriefRowById(params.briefId);

  if (!version || !brief || !isVersionEditable(version.status)) {
    throw new Error("version_not_editable");
  }

  await postgrest<BriefMessageRow[]>("brief_messages", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: brief.tenant_id,
      brief_id: params.briefId,
      brief_version_id: params.versionId,
      stage_key: params.stage,
      author_role: params.authorRole,
      actor_label: params.actorLabel,
      actor_user_id: params.actorUserId ?? null,
      actor_membership_id: params.actorMembershipId ?? null,
      actor_agent_id: params.actorAgentId ?? null,
      effective_user_id: params.effectiveUserId ?? null,
      effective_membership_id: params.effectiveMembershipId ?? null,
      message_text: params.messageText
    })
  });
}

export async function appendClientBriefMessage(context: MutationContext, messageText: string): Promise<void> {
  const brief = await getBriefRowById(context.briefId);
  const version = await getBriefVersionRow(context.versionId);

  if (!brief || !version) {
    throw new Error("brief_not_found");
  }

  const identity = await getTenantIdentityContextByTenantId(brief.tenant_id);
  const clientTrace = resolveActorTrace({
    fallbackLabel: "Cliente demo",
    effectiveMembership: identity?.clientMembership
  });

  await appendBriefMessage({
    briefId: context.briefId,
    versionId: context.versionId,
    stage: version.stage_key,
    authorRole: "client",
    actorLabel: clientTrace.actorLabel,
    actorUserId: clientTrace.actorUserId,
    actorMembershipId: clientTrace.actorMembershipId,
    actorAgentId: clientTrace.actorAgentId,
    effectiveUserId: clientTrace.effectiveUserId,
    effectiveMembershipId: clientTrace.effectiveMembershipId,
    messageText
  });
}

async function getBriefRowById(briefId: string): Promise<BriefRow | null> {
  const params = new URLSearchParams({
    select: "id,tenant_id,client_id,project_id,status,source_channel,current_version_number,active_version_id,created_at,updated_at",
    id: `eq.${briefId}`,
    limit: "1"
  });
  const rows = await postgrest<BriefRow[]>(`briefs?${params.toString()}`, {
    method: "GET"
  });

  return rows[0] ?? null;
}

export async function updateBriefSummary(
  context: MutationContext,
  patch: Partial<StructuredBriefSummary>,
  options?: { finalSummaryTextOverride?: string }
): Promise<BriefVersion> {
  const version = await getBriefVersionRow(context.versionId);

  if (!version || !isVersionEditable(version.status)) {
    throw new Error("version_not_editable");
  }

  const merged = mergeStructuredBriefSummary(normalizeSummary(version.structured_summary_json), patch);
  await updateVersionRecord(context.versionId, {
    structured_summary_json: merged,
    final_summary_text: options?.finalSummaryTextOverride || buildFinalSummaryText(merged)
  });

  const current = await getBriefVersionRow(context.versionId);

  if (!current) {
    throw new Error("version_not_found");
  }

  return serializeVersion(current);
}

async function updateBriefStage(
  context: MutationContext,
  options?: { appendAssistantMessage?: boolean }
): Promise<BriefVersion> {
  const version = await getBriefVersionRow(context.versionId);

  if (!version || !isVersionEditable(version.status)) {
    throw new Error("version_not_editable");
  }

  const upcomingStage = nextStage(version.stage_key);

  if (!upcomingStage) {
    throw new Error("final_stage_reached");
  }

  const brief = await getBriefRowById(context.briefId);
  const identity = brief ? await getTenantIdentityContextByTenantId(brief.tenant_id) : null;
  const assistantTrace = resolveActorTrace({
    fallbackLabel: "Bridge briefing",
    technicalActor: identity?.serviceAgent,
    effectiveMembership: identity?.operatorMembership
  });

  await updateVersionRecord(context.versionId, {
    stage_key: upcomingStage,
    status: statusFromStage(upcomingStage)
  });
  await updateBriefStatus(context.briefId, statusFromStage(upcomingStage));

  const currentSummary = normalizeSummary(version.structured_summary_json);
  if (options?.appendAssistantMessage !== false) {
    await appendBriefMessage({
      briefId: context.briefId,
      versionId: context.versionId,
      authorRole: "assistant",
      actorLabel: assistantTrace.actorLabel,
      actorUserId: assistantTrace.actorUserId,
      actorMembershipId: assistantTrace.actorMembershipId,
      actorAgentId: assistantTrace.actorAgentId,
      effectiveUserId: assistantTrace.effectiveUserId,
      effectiveMembershipId: assistantTrace.effectiveMembershipId,
      messageText: buildAssistantGuidance(upcomingStage, currentSummary),
      stage: upcomingStage
    });
  }

  const current = await getBriefVersionRow(context.versionId);

  if (!current) {
    throw new Error("version_not_found");
  }

  return serializeVersion(current);
}

/**
 * IMPL-20260529-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260529-07_chat_brief_adaptativo_y_etapas_background_v1.md
 */
export async function advanceBriefStage(context: MutationContext): Promise<BriefVersion> {
  return updateBriefStage(context, { appendAssistantMessage: true });
}

export async function submitBriefForOperatorReview(context: MutationContext): Promise<BriefVersion> {
  const version = await getBriefVersionRow(context.versionId);

  if (!version || !isVersionEditable(version.status)) {
    throw new Error("version_not_editable");
  }

  const summary = normalizeSummary(version.structured_summary_json);
  const missing = getCriticalMissingFields(summary);
  const finalSummaryBase = buildFinalSummaryText(summary);
  const finalSummaryText =
    missing.length > 0 && !summary.gaps
      ? `${finalSummaryBase} Faltantes detectados al cierre: ${joinNaturalList(missing)}.`.trim()
      : finalSummaryBase;
  const brief = await getBriefRowById(context.briefId);

  if (!brief) {
    throw new Error("brief_not_found");
  }

  const identity = await getTenantIdentityContextByTenantId(brief.tenant_id);
  const submittedTrace = resolveActorTrace({
    fallbackLabel: "Bridge briefing",
    technicalActor: identity?.serviceAgent,
    effectiveMembership: identity?.operatorMembership
  });

  await updateVersionRecord(context.versionId, {
    status: "pending_operator_review",
    final_summary_text: finalSummaryText
  });
  await updateBriefStatus(context.briefId, "pending_operator_review");
  await insertReviewEvent({
    tenantId: brief.tenant_id,
    briefId: context.briefId,
    versionId: context.versionId,
    eventType: "submitted",
    note: finalSummaryText,
    createdByLabel: submittedTrace.actorLabel,
    actorUserId: submittedTrace.actorUserId,
    actorMembershipId: submittedTrace.actorMembershipId,
    actorAgentId: submittedTrace.actorAgentId,
    effectiveUserId: submittedTrace.effectiveUserId,
    effectiveMembershipId: submittedTrace.effectiveMembershipId,
    recommendedProductSlotKey: summary.recommendedProductSlotKey
  });

  const current = await getBriefVersionRow(context.versionId);

  if (!current) {
    throw new Error("version_not_found");
  }

  return serializeVersion(current);
}

export async function reviewBriefVersion(
  context: MutationContext,
  decision: "review_started" | "approved" | "returned" | "reconducted",
  note: string,
  recommendedProductSlotKey = ""
): Promise<BriefVersion> {
  const version = await getBriefVersionRow(context.versionId);
  const brief = await getBriefRowById(context.briefId);

  if (!version || !brief) {
    throw new Error("brief_not_found");
  }

  const identity = await getTenantIdentityContextByTenantId(brief.tenant_id);

  if (!identity?.operatorMembership) {
    throw new Error("membership_required:operator");
  }

  const operatorTrace = resolveActorTrace({
    fallbackLabel: "Operador Bridge",
    effectiveMembership: identity.operatorMembership
  });

  let nextStatus: BriefingStatus = version.status;
  let eventType: BriefReviewEvent["eventType"] = "review_started";
  let nextSummary = normalizeSummary(version.structured_summary_json);

  if (decision === "review_started") {
    nextStatus = "operator_review_in_progress";
    eventType = "review_started";
  }

  if (decision === "approved") {
    nextStatus = "approved_locked";
    eventType = "approved";
  }

  if (decision === "returned") {
    nextStatus = "returned_for_rework";
    eventType = "returned";
  }

  if (decision === "reconducted") {
    nextStatus = "returned_for_rework";
    eventType = "reconducted";
    nextSummary = mergeStructuredBriefSummary(nextSummary, {
      recommendedProductSlotKey: recommendedProductSlotKey || nextSummary.recommendedProductSlotKey,
      operatorReviewNote: note || nextSummary.operatorReviewNote
    });
  }

  await updateVersionRecord(context.versionId, {
    status: nextStatus,
    structured_summary_json: nextSummary,
    final_summary_text: buildFinalSummaryText(nextSummary)
  });
  await updateBriefStatus(context.briefId, nextStatus);
  await insertReviewEvent({
    tenantId: brief.tenant_id,
    briefId: context.briefId,
    versionId: context.versionId,
    eventType,
    note,
    createdByLabel: operatorTrace.actorLabel,
    actorUserId: operatorTrace.actorUserId,
    actorMembershipId: operatorTrace.actorMembershipId,
    actorAgentId: operatorTrace.actorAgentId,
    effectiveUserId: operatorTrace.effectiveUserId,
    effectiveMembershipId: operatorTrace.effectiveMembershipId,
    recommendedProductSlotKey
  });

  const current = await getBriefVersionRow(context.versionId);

  if (!current) {
    throw new Error("version_not_found");
  }

  return serializeVersion(current);
}

export async function createDerivedBriefVersion(context: MutationContext): Promise<BriefVersion> {
  const version = await getBriefVersionRow(context.versionId);
  const brief = await getBriefRowById(context.briefId);

  if (!version || !brief) {
    throw new Error("brief_not_found");
  }

  if (version.status !== "approved_locked") {
    throw new Error("version_must_be_approved");
  }

  const identity = await getTenantIdentityContextByTenantId(brief.tenant_id);

  if (!identity?.operatorMembership) {
    throw new Error("membership_required:operator");
  }

  const operatorTrace = resolveActorTrace({
    fallbackLabel: "Operador Bridge",
    effectiveMembership: identity.operatorMembership
  });
  const assistantTrace = resolveActorTrace({
    fallbackLabel: "Bridge briefing",
    technicalActor: identity.serviceAgent,
    effectiveMembership: identity.operatorMembership
  });

  const [derived] = await postgrest<BriefVersionRow[]>("brief_versions", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: brief.tenant_id,
      brief_id: context.briefId,
      version_number: version.version_number + 1,
      stage_key: "discovery",
      status: "stage_1_discovery",
      structured_summary_json: normalizeSummary(version.structured_summary_json),
      final_summary_text: buildFinalSummaryText(normalizeSummary(version.structured_summary_json)),
      derived_from_version_id: version.id
    })
  });

  await updateBriefStatus(context.briefId, "stage_1_discovery", derived.id, derived.version_number);
  await insertReviewEvent({
    tenantId: brief.tenant_id,
    briefId: context.briefId,
    versionId: derived.id,
    eventType: "derived_version",
    note: "Nueva version derivada desde una version aprobada por cambio material del brief.",
    createdByLabel: operatorTrace.actorLabel,
    actorUserId: operatorTrace.actorUserId,
    actorMembershipId: operatorTrace.actorMembershipId,
    actorAgentId: operatorTrace.actorAgentId,
    effectiveUserId: operatorTrace.effectiveUserId,
    effectiveMembershipId: operatorTrace.effectiveMembershipId,
    recommendedProductSlotKey: normalizeSummary(version.structured_summary_json).recommendedProductSlotKey
  });
  await appendBriefMessage({
    briefId: context.briefId,
    versionId: derived.id,
    authorRole: "assistant",
    actorLabel: assistantTrace.actorLabel,
    actorUserId: assistantTrace.actorUserId,
    actorMembershipId: assistantTrace.actorMembershipId,
    actorAgentId: assistantTrace.actorAgentId,
    effectiveUserId: assistantTrace.effectiveUserId,
    effectiveMembershipId: assistantTrace.effectiveMembershipId,
    messageText: "Se abrio una nueva version derivada. Revalida los cambios materiales desde discovery antes de volver a revision.",
    stage: "discovery"
  });

  const current = await getBriefVersionRow(derived.id);

  if (!current) {
    throw new Error("version_not_found");
  }

  return serializeVersion(current);
}

/**
 * IMPL-20260526-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-06_unificacion_resolucion_tenant_dominio_bridge_v1.md
 */
export async function getTenantIdBySlug(slug: string): Promise<string | null> {
  return resolveTenantIdBySlug(slug);
}

/**
 * IMPL-20260526-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
export async function getBriefsByTenant(tenantId: string): Promise<
  Array<{
    id: string;
    tenant_id: string;
    client_id: string | null;
    project_id: string | null;
    status: string;
    source_channel: string;
    current_version_number: number;
    active_version_id: string | null;
    created_at: string;
    updated_at: string;
  }>
> {
  const params = new URLSearchParams({
    select: "id,tenant_id,client_id,project_id,status,source_channel,current_version_number,active_version_id,created_at,updated_at",
    tenant_id: `eq.${tenantId}`,
    order: "updated_at.desc"
  });

  return postgrest<
    Array<{
      id: string;
      tenant_id: string;
      client_id: string | null;
      project_id: string | null;
      status: string;
      source_channel: string;
      current_version_number: number;
      active_version_id: string | null;
      created_at: string;
      updated_at: string;
    }>
  >(`briefs?${params.toString()}`, {
    method: "GET"
  });
}

/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
export async function getBriefById(
  tenantId: string,
  briefId: string
): Promise<{
  id: string;
  tenant_id: string;
  client_id: string | null;
  project_id: string | null;
  status: string;
  source_channel: string;
  current_version_number: number;
  active_version_id: string | null;
  created_at: string;
  updated_at: string;
} | null> {
  const params = new URLSearchParams({
    select: "id,tenant_id,client_id,project_id,status,source_channel,current_version_number,active_version_id,created_at,updated_at",
    tenant_id: `eq.${tenantId}`,
    id: `eq.${briefId}`,
    limit: "1"
  });

  const rows = await postgrest<
    Array<{
      id: string;
      tenant_id: string;
      client_id: string | null;
      project_id: string | null;
      status: string;
      source_channel: string;
      current_version_number: number;
      active_version_id: string | null;
      created_at: string;
      updated_at: string;
    }>
  >(`briefs?${params.toString()}`, { method: "GET" });

  return rows[0] ?? null;
}

/**
 * IMPL-20260526-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 */
export async function updateBriefById(
  tenantId: string,
  briefId: string,
  patch: Partial<{
    status: BriefingStatus;
    source_channel: string;
    client_id: string | null;
    project_id: string | null;
  }>
): Promise<{
  id: string;
  tenant_id: string;
  client_id: string | null;
  project_id: string | null;
  status: string;
  source_channel: string;
  current_version_number: number;
  active_version_id: string | null;
  created_at: string;
  updated_at: string;
} | null> {
  const params = new URLSearchParams({
    tenant_id: `eq.${tenantId}`,
    id: `eq.${briefId}`
  });

  const rows = await postgrest<
    Array<{
      id: string;
      tenant_id: string;
      client_id: string | null;
      project_id: string | null;
      status: string;
      source_channel: string;
      current_version_number: number;
      active_version_id: string | null;
      created_at: string;
      updated_at: string;
    }>
  >(`briefs?${params.toString()}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });

  return rows[0] ?? null;
}

/**
 * IMPL-20260528-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260528-04_brief_chat_portal_cliente_v1.md
 */
export async function getBriefByProjectId(projectId: string, tenantSlug = supabaseEnv.defaultTenant): Promise<BriefRecord | null> {
  const tenant = await getTenantRecord(tenantSlug);

  if (!tenant) {
    return null;
  }

  const [briefRow] = await postgrest<BriefRow[]>(
    `briefs?tenant_id=eq.${tenant.id}&project_id=eq.${projectId}&order=updated_at.desc&limit=1`
  );

  if (!briefRow) {
    return null;
  }

  return hydrateBriefRecord(briefRow, tenant);
}

/**
 * IMPL-20260603-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260603-01_estabilizacion_runtime_chat_brief_cliente_v1.md
 */
export async function getOrCreateBriefForProject(
  projectId: string,
  tenantSlug = supabaseEnv.defaultTenant
): Promise<BriefRecord> {
  const existingBrief = await getBriefByProjectId(projectId, tenantSlug);

  if (existingBrief) {
    return existingBrief;
  }

  try {
    return await createBriefForProject(projectId, tenantSlug);
  } catch (error) {
    const briefAfterCreateError = await getBriefByProjectId(projectId, tenantSlug);

    if (briefAfterCreateError) {
      return briefAfterCreateError;
    }

    throw error;
  }
}

/**
 * IMPL-20260528-01
 * Respaldo: Bridge/context/SPECs/SPEC_ARCH-20260528-04_brief_chat_portal_cliente_v1.md
 */
export async function createBriefForProject(projectId: string, tenantSlug = supabaseEnv.defaultTenant): Promise<BriefRecord> {
  const tenant = await getTenantRecord(tenantSlug);

  if (!tenant) {
    throw new Error("tenant_not_found");
  }

  const projectContainer = await getProjectContainerById(projectId);

  if (!projectContainer || projectContainer.project?.tenantId !== tenant.id) {
    throw new Error("project_not_found");
  }

  const [briefRow] = await postgrest<BriefRow[]>("briefs", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: tenant.id,
      client_id: projectContainer.client?.id ?? null,
      project_id: projectId,
      status: "stage_1_discovery",
      source_channel: "bridge_web",
      current_version_number: 1
    })
  });
  const [versionRow] = await postgrest<BriefVersionRow[]>("brief_versions", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: tenant.id,
      brief_id: briefRow.id,
      version_number: 1,
      stage_key: "discovery",
      status: "stage_1_discovery",
      structured_summary_json: emptyStructuredBriefSummary(),
      final_summary_text: ""
    })
  });

  const identity = await getTenantIdentityContextByTenantId(tenant.id);
  const assistantTrace = resolveActorTrace({
    fallbackLabel: "Bridge briefing",
    technicalActor: identity?.serviceAgent,
    effectiveMembership: identity?.operatorMembership
  });

  await updateBriefStatus(briefRow.id, "stage_1_discovery", versionRow.id, 1);
  await appendBriefMessage({
    briefId: briefRow.id,
    versionId: versionRow.id,
    authorRole: "assistant",
    actorLabel: assistantTrace.actorLabel,
    actorUserId: assistantTrace.actorUserId,
    actorMembershipId: assistantTrace.actorMembershipId,
    actorAgentId: assistantTrace.actorAgentId,
    effectiveUserId: assistantTrace.effectiveUserId,
    effectiveMembershipId: assistantTrace.effectiveMembershipId,
    messageText: buildAssistantGuidance("discovery", emptyStructuredBriefSummary()),
    stage: "discovery"
  });

  const hydratedBriefRow: BriefRow = {
    ...briefRow,
    status: "stage_1_discovery",
    active_version_id: versionRow.id,
    current_version_number: 1
  };
  const workspace = await hydrateBriefRecord(hydratedBriefRow, tenant);

  if (!workspace) {
    throw new Error("brief_creation_failed");
  }

  return workspace;
}