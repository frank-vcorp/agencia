# CHECKPOINT IMPL-20260611-06 — Cierre determinístico + texto canónico de despedida

- **ID:** IMPL-20260611-06
- **SPEC (referencia):** `Bridge/context/Especificación Técnica Chat Vika.md` — sección 4 (System Prompt Maestro) y sección 3.B (State Machine y Etiquetas de Cierre).
- **Agente:** SOFIA (Constructora Principal)
- **Fecha:** 2026-06-11
- **Tipo:** `feat(brief)` — determinismo de cierre + endurecimiento del System Prompt de Vika.

## Objetivo

Resolver el problema donde Vika no cierra la conversación de forma consistente cuando los 8 puntos están completos. La regla de cierre ya estaba en el prompt, pero el modelo la interpretaba de forma variable. La solución es **doble**:

1. **Reforzar el System Prompt** con la despedida canónica literal de la Especificación Técnica (sin variaciones permitidas) y limitar la fase narrativa a dos preguntas concretas.
2. **Cierre determinístico en código** que detecta el momento exacto (8 puntos + pregunta narrativa respondida) y emite la despedida + tag + JSON sin volver a llamar a Gemini.

## Archivos modificados (regla de la tarea: SOLO 2 archivos)

### 1. `Bridge/lib/briefing-assistant-ai.ts`

#### a) `VIKA_MASTER_PROMPT` — `[REGLA DE CIERRE OBLIGATORIO]` y `[FASE DE NARRATIVA]`

- Reescritas ambas secciones con el texto canónico de la SPEC.
- El bloque ahora contiene **verbatim** la despedida: `"¡Qué gran historia! Mi equipo ya tiene toda esta información. La analizaremos a detalle y te contactaremos por WhatsApp con los pasos a seguir. ¡Mucho éxito!"` y exige emitir los tags + JSON de 9 claves inmediatamente después, sin texto intermedio.
- La sección de fase narrativa se renombra a `[FASE DE DESCUBRIMIENTO NARRATIVO / FASE DE NARRATIVA]` (mantiene el nombre legacy para no romper el test existente que verifica el string `FASE DE DESCUBRIMIENTO NARRATIVO`) e incluye las dos preguntas canónicas como únicas opciones válidas.

#### b) Nuevas constantes exportadas

```ts
export const VIKA_NARRATIVE_QUESTIONS: readonly string[] = [
  "¿Cómo te animaste a poner el negocio?",
  "¿Qué ha sido lo más difícil?"
];

const VIKA_CHECKLIST_SUMMARY_KEYS: ReadonlyArray<keyof BriefSummary> = [
  "giroYProductoHeroe",   // giro_y_producto_heroe
  "madurez",
  "localFisico",          // local_fisico
  "logo",
  "audience",             // diferenciador (mapeo del contrato)
  "restrictions",         // objeciones (mapeo del contrato)
  "presupuesto",
  "cta"                   // cta_deseado
];
```

#### c) Nueva función pública `shouldForceClosure(summary, lastAssistantMessage): boolean`

- Pura, determinística, sin estado externo.
- Retorna `true` si y solo si:
  1. Los 8 campos Vika tienen valor significativo (`hasMeaningfulSummaryValue` para cada `summaryKey`).
  2. El último mensaje del asistente contiene una de las preguntas narrativas canónicas (match tolerante: se compara con la pregunta sin `¿` inicial y sin `?` final, para tolerar prefijos del modelo como "¡Listo! ... ¿cómo te animaste a poner el negocio?").

#### d) Nueva función privada `buildForcedClosureReply(summary): BriefChatReply`

- Compone `visibleReply` con: `VIKA_CLOSING_HUMAN_TEXT` + `[SYS_ACTION: LOCK_SUCCESS]` + `[BRIEF_COMPLETO]` + JSON serializado (`deterministicClosureJson`).
- Marca `degraded: false` y `forcedClosure: true`.

#### e) Tipo `BriefChatReply` extendido

```ts
export type BriefChatReply = {
  visibleReply: string;
  degraded: boolean;
  forcedClosure?: boolean; // IMPL-20260611-06
};
```

#### f) `generateBriefChatReply` — punto de entrada al cierre determinístico

- Antes de gastar una llamada a Gemini, busca el último mensaje del asistente en `input.messages`.
- Si `shouldForceClosure(summary, lastAssistantMessage) === true`, retorna directamente `buildForcedClosureReply(summary)` con `forcedClosure: true`. **No se invoca a Gemini** (ahorro de tokens y latencia).
- Si la condición no se cumple, sigue el flujo original (loop de hasta 2 intentos contra Gemini).

### 2. `Bridge/app/cliente/brief/[projectId]/actions.ts`

#### `sendClientMessageAction` — detección de cierre + bloqueo automático

- Después de persistir el mensaje del asistente, evalúa `isClosure = aiReply.forcedClosure === true || LOCK_SUCCESS_TAG_REGEX.test(aiReply.visibleReply)`.
- Si hay cierre:
  1. Extrae el JSON con `extractJsonObject`.
  2. Lo parsea y valida que todos los valores sean strings.
  3. Mapea Vika → `StructuredBriefSummary` con `mapVikaBriefDataToStructuredSummary`.
  4. Compone `clientFacingSummary` con el mismo formato que `submitBriefAction`.
  5. Persiste el resumen con `updateBriefSummary` y `finalSummaryTextOverride` apuntando al reply completo (que contiene la despedida + tags + JSON).
  6. Llama `submitBriefForOperatorReview` para enviar a revisión humana.

Esto replica el comportamiento de `submitBriefAction` directamente en el flujo de chat, eliminando la dependencia de que el operador (o el cliente) presione un botón para bloquear el brief.

## Validación

### Build

```bash
npm run build
✓ Compiled successfully in 3.7s
✓ Generating static pages (17/17)
```

### Tests

```bash
npx vitest run lib/briefing.test.ts
✓ 26 tests passed | 1 failed (1)
```

**Detalle de la única falla**: el test `"suaviza la guia visible en discovery y precision sin perder foco comercial (legacy)"` ya fallaba en `main` antes de mis cambios (verificado con `git stash` + re-ejecución). Es un test legacy deprecado que espera texto antiguo de `buildAssistantGuidance`. No es regresión introducida por IMPL-20260611-06.

Los 26 tests relevantes al flujo Vika/cierre pasan correctamente, incluyendo:
- `incluye el System Prompt Maestro de Vika con sus reglas de oro y checklist de 8 puntos` ✓
- `expone regex de deteccion de tag LOCK_SUCCESS y BRIEF_COMPLETO` ✓
- `usa fallback deterministico para cierre cuando GEMINI_API_KEY no existe y emite tag + JSON` ✓
- `mantiene viable el cierre aunque falle Gemini, sin tocar la conversacion previa` ✓
- `anade tag [SYS_ACTION: LOCK_SUCCESS] programaticamente si el modelo responde JSON sin tag` ✓

### Qodo self-review

⚠️ **No ejecutado**: `qodo self-review` retorna el mensaje "Qodo Command has been sunset and is no longer available. You can still get automated code reviews by connecting your Git provider at https://app.qodo.ai." Esta herramienta ya no está disponible en el entorno, por lo que no es posible completar este gate automáticamente.

Recomendación para el revisor: ejecutar revisión manual o conectar el proveedor Git al flujo de Qodo para futuras intervenciones.

## Trazabilidad

- **Tipo de cambio:** `feat(brief)` (cierre determinístico) + endurecimiento del prompt de Vika.
- **Archivos tocados:** 2 (regla de la tarea cumplida).
- **Funciones nuevas exportadas:** `shouldForceClosure`, `VIKA_NARRATIVE_QUESTIONS`.
- **Tipo modificado:** `BriefChatReply` (campo opcional `forcedClosure`, no rompe compatibilidad).
- **Regresiones:** ninguna (validado con `git stash`).

## Riesgos y consideraciones

1. **Coincidencia de preguntas narrativas**: `shouldForceClosure` usa un match laxo (pregunta sin `¿` y sin `?`). Si el modelo reformula la pregunta, el cierre no se fuerza. Esto es deliberado: preferimos no forzar un cierre falso y dejar que el modelo use su fallback. La probabilidad de reformulación es baja porque el prompt exige las dos preguntas como únicas opciones válidas.
2. **Persistencia doble**: si el modelo emite `[SYS_ACTION: LOCK_SUCCESS]` correctamente y `shouldForceClosure` también lo detecta (porque ya tenía los 8 puntos + la pregunta narrativa), el código podría cerrar dos veces. Sin embargo, `submitBriefForOperatorReview` valida `isVersionEditable` y rechaza si la versión ya está en `pending_operator_review`, por lo que la doble llamada es idempotente y segura.
3. **Backward compat**: el tipo `BriefChatReply.forcedClosure` es opcional, por lo que callers existentes que no lo lean siguen funcionando. El prompt nuevo sigue conteniendo la cadena `FASE DE DESCUBRIMIENTO NARRATIVO`, por lo que el test que la verifica sigue pasando.

## Próximos pasos

1. Commit con mensaje en español (formato INTEGRA).
2. PR apuntando a `main`.
3. Solicitar QA a GEMINI con interconsulta `subagent_type='gemini'`.
4. Sincronizar estado con CRONISTA (`subagent_type='cronista'`).
