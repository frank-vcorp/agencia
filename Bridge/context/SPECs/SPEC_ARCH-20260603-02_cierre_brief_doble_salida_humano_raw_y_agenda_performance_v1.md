# SPEC ARCH-20260603-02 — Cierre de brief con doble salida (resumen humano + raw para Vika) y agenda performance

- **ID:** ARCH-20260603-02
- **Autor:** Integra (Arquitecto)
- **Fecha:** 2026-06-03
- **Estado:** Autorizada para implementación (Sofia)
- **Brief de referencia para QA manual:** `7d56fb24-e794-4782-80de-1adf7e458a17`
- **Respaldo previo relacionado:** SPEC_ARCH-20260603-01 (estabilización runtime chat), SPEC_ARCH-20260602-01 (procesado único al cierre)

---

## 1. Problema

El cierre del brief genera hoy un **JSON interno de 17 campos comerciales rígidos** (`BriefFinalJson`: `proposalReadiness`, `recommendedProductSlotKey`, `missingCriticalData`, etc.) que:

1. Es sobre-ingeniería: el consumidor real (Vika-VSCode, una IA) no necesita campos granulares, necesita **información raw exprimida sin filtro**.
2. Se guarda como `operatorReviewNote: JSON.stringify(finalJson)` y se plantilla con `buildFinalSummaryText`, produciendo un `final_summary_text` telegráfico y con jerga interna.
3. La página del cliente **no muestra** lo capturado: al cerrar solo aparece un cajón verde genérico ("Ya capturamos la informacion necesaria...").

Se necesitan **dos lecturas distintas del mismo cierre**, con una sola llamada IA:

| Consumidor | Necesita | Tono | Campo destino |
|---|---|---|---|
| Dashboard del cliente (humano) | Entender lo que nos dijo, en sus palabras ordenadas | Humano, claro, sin jerga | `structured_summary_json.clientFacingSummary` |
| Vika-VSCode (IA) | Todo lo exprimible de la conversación, sin filtro | Raw, exhaustivo, estructurado | `final_summary_text` (→ MCP `rawContent`) |

---

## 2. Objetivo

Al cerrar el brief, con **una sola llamada IA**, producir:

1. **`clientSummary`** — narrativa humana, clara, en palabras del cliente, que refleje lo que pidió (sin jerga comercial interna como "readiness" o "slot").
2. **`agentRawBrief`** — volcado exhaustivo y sin filtro de toda la conversación, estructurado para que Vika-VSCode exprima al máximo.

Persistir `clientSummary` donde la página del cliente lo muestre y `agentRawBrief` en el campo que el MCP ya entrega a Vika-VSCode. Eliminar el contrato de 17 campos. Adicionalmente (frente B), reorientar la agenda interna de la conversación a **performance marketing** y añadir **espejeo de tono** del cliente.

---

## 3. Contrato operativo

### 3.1 Archivo ancla inicial
`Bridge/lib/briefing-assistant-ai.ts`

### 3.2 Datos existentes a reutilizar (dónde viven)
- **Cadena de consumo Vika-VSCode (NO TOCAR):** MCP `bridge_get_brief` → `GET /api/v1/projects/[id]/brief` ([route.ts](../../app/api/v1/projects/%5Bid%5D/brief/route.ts)) lee `brief_versions.final_summary_text` y lo mapea a `rawContent` → el handler MCP lo vuelca bajo "## Contenido completo". El `agentRawBrief` debe aterrizar en `final_summary_text` para llegar a Vika sin cambios en el MCP ni en la API.
- `updateBriefSummary(context, patch)` en [briefing.ts](../../lib/briefing.ts) (~L1213): hoy siempre escribe `final_summary_text: buildFinalSummaryText(merged)`.
- `StructuredBriefSummary` (tipo, ~L33), `emptyStructuredBriefSummary` (~L249), `normalizeSummary` (~L274), `mergeStructuredBriefSummary` (~L317).
- `submitBriefAction` en [actions.ts](../../app/cliente/brief/%5BprojectId%5D/actions.ts) (~L82): hoy llama `generateBriefClosureArtifacts` y persiste `operatorReviewNote: JSON.stringify(finalJson)`.
- Render de cierre del cliente en [client-brief-chat.tsx](../../components/client-brief-chat.tsx) (~L204, bloque `hideConversationSurface`). El componente expone `brief.currentVersion.structuredSummary` y `brief.currentVersion.finalSummaryText`.

### 3.3 Datos faltantes a crear (dónde y cómo)
- **Nuevo campo único** `clientFacingSummary: string` en `StructuredBriefSummary` (un solo campo, no 17). Agregarlo al tipo y a `emptyStructuredBriefSummary`. `normalizeSummary` lo propaga automáticamente (itera sobre las claves de la base), igual que `mergeStructuredBriefSummary`. No requiere columna nueva en DB: viaja dentro del jsonb `structured_summary_json` ya existente.

### 3.4 Cambios exactos por archivo (máximo 6 archivos)

**A) `Bridge/lib/briefing-assistant-ai.ts`**
1. **Eliminar** el contrato de 17 campos y todo lo exclusivo del cierre viejo: tipo `BriefFinalJson`, `BriefClosureArtifacts`, `FINAL_JSON_KEYS`, `buildClosureOperatorReviewNote`, `buildFinalSummaryPatchFromJson`, `buildBriefFinalJsonPrompt`, `sanitizeFinalBriefJson`, `buildDeterministicBriefFinalJson`, `generateBriefFinalJson`, `generateBriefClosureArtifacts`, `extractJsonObject` (si queda sin uso). **Conservar** utilidades reutilizadas por otros módulos: `getCriticalMissingFields`, `hasBackgroundStageSufficientInfo` siguen exportadas desde `briefing.ts`; eliminar de este archivo solo lo que quede sin referencias tras el cambio (verificar `isBriefReadyForProposal` y su uso antes de borrar — si nadie lo usa, eliminar).
2. **Nuevo tipo de salida del cierre:**
   ```ts
   export type BriefClosureResult = {
     clientSummary: string;   // humano, para el dashboard del cliente
     agentRawBrief: string;    // raw exhaustivo, para Vika-VSCode
   };
   ```
3. **Nueva función única** `generateBriefClosure(input: GenerateBriefFinalJsonInput): Promise<BriefClosureResult>` que hace **una sola llamada Gemini** (`responseMimeType: "application/json"`, `maxOutputTokens: 8192`) y devuelve un JSON de **2 claves** `{ clientSummary, agentRawBrief }`. Renombrar `GenerateBriefFinalJsonInput` a `GenerateBriefClosureInput` (mantiene `{ stage, summary, messages }`).
4. **Nuevo prompt** `buildBriefClosurePrompt(input)`:
   - Pide exactamente `{"clientSummary":"","agentRawBrief":""}`.
   - `clientSummary`: redactado para que **el cliente entienda lo que nos dijo**, en lenguaje natural y cálido, sin jerga interna (prohibido "readiness", "slot", "encaje comercial", "upsell"). Estructura libre legible (puede usar 2-4 frases o viñetas suaves). No inventar datos.
   - `agentRawBrief`: volcado **exhaustivo y sin filtro** de todo lo exprimible de la conversación, organizado para IA (objetivo, oferta/diferencial, contexto de negocio, motivo, audiencia y dolor, plataforma/canal, entregable, CTA, tono, restricciones, referencias, urgencia, señales comerciales y cualquier dato suelto relevante). No omitir nada útil; si falta un dato, indicarlo explícitamente como "No especificado".
5. **Fallback determinístico** (sin `GEMINI_API_KEY` o ante fallo/JSON inválido): `agentRawBrief` = `buildFinalSummaryText(summary)` concatenado con el historial completo de la conversación; `clientSummary` = `buildFinalSummaryText(summary)`. Nunca lanzar: degradar a fallback.
6. **Frente B — Agenda performance** en `INTERNAL_COVERAGE_AGENDA_BY_STAGE`, reorientada a performance marketing (sin romper claves de etapa `discovery`/`precision`/`commercial_fit`):
   - `discovery`: ["objetivo de negocio medible", "oferta y diferencial", "contexto del negocio", "motivo y urgencia del pedido"]
   - `precision`: ["audiencia y su dolor principal", "plataforma o canal", "formato/entregable esperado", "CTA y conversión esperada"]
   - `commercial_fit`: ["presupuesto o rango de inversión si aplica", "restricciones relevantes", "encaje y siguiente paso comercial"]
7. **Frente B — Espejeo de tono** en `buildBriefChatSystemPrompt`: añadir una instrucción para **reflejar el registro del cliente** (formal/informal, técnico/casual, breve/extenso) sin imitación forzada ni perder claridad. Una sola línea nueva, sin reestructurar el prompt.

**B) `Bridge/lib/briefing.ts`**
1. Agregar `clientFacingSummary: string;` al tipo `StructuredBriefSummary` y `clientFacingSummary: ""` en `emptyStructuredBriefSummary`.
2. Extender `updateBriefSummary` con tercer parámetro opcional:
   ```ts
   export async function updateBriefSummary(
     context: MutationContext,
     patch: Partial<StructuredBriefSummary>,
     options?: { finalSummaryTextOverride?: string }
   ): Promise<BriefVersion>
   ```
   Si `options?.finalSummaryTextOverride` está definido (string, puede ser vacío→usar default), escribir `final_summary_text: options.finalSummaryTextOverride` en vez de `buildFinalSummaryText(merged)`. Comportamiento sin el parámetro: idéntico al actual (no romper otros llamadores).

**C) `Bridge/app/cliente/brief/[projectId]/actions.ts`**
1. En `submitBriefAction`, reemplazar `generateBriefClosureArtifacts` por `generateBriefClosure`.
2. Persistir así:
   ```ts
   const closure = await generateBriefClosure({ stage, summary: currentVersion.structuredSummary, messages });
   await updateBriefSummary(
     { briefId, versionId },
     { clientFacingSummary: closure.clientSummary },
     { finalSummaryTextOverride: closure.agentRawBrief }
   );
   ```
3. **Eliminar** la línea `operatorReviewNote: JSON.stringify(closureArtifacts.finalJson)`. No volver a serializar JSON gigante en `operatorReviewNote`.

**D) `Bridge/components/client-brief-chat.tsx`**
1. En el bloque `hideConversationSurface` (~L204), mostrar el resumen humano capturado. Leer `currentVersion?.structuredSummary.clientFacingSummary` con fallback a `currentVersion?.finalSummaryText`. Si hay texto, renderizar una tarjeta "Esto es lo que capturamos de tu proyecto" con el texto en `whitespace-pre-wrap`, seguida del mensaje actual de equipo en siguiente acción. Si no hay texto, mantener solo el mensaje genérico actual.

**E) `Bridge/lib/briefing-assistant-ai.test.ts`** (si existe; si no, crear)
1. Eliminar/reemplazar tests que dependían de `BriefFinalJson`/`generateBriefFinalJson`/`generateBriefClosureArtifacts`.
2. Agregar test de fallback de `generateBriefClosure` sin `GEMINI_API_KEY`: devuelve `{ clientSummary, agentRawBrief }` no vacíos derivados del summary/conversación.

**F) `Bridge/lib/briefing.test.ts`**
1. Si hay test de `normalizeSummary`/`emptyStructuredBriefSummary` que valide la forma del objeto, actualizarlo para incluir `clientFacingSummary`.

### 3.5 Restricciones
- **Una sola llamada IA en el cierre** (igual que hoy). Prohibido añadir llamadas IA extra.
- **Sin columnas nuevas en DB.** `clientFacingSummary` viaja en el jsonb existente.
- **Sin cambios** en el MCP (`Bridge/mcp/**`) ni en la API v1. El raw llega por `final_summary_text`.
- **No tocar** la conversación turno-a-turno salvo las dos adiciones del frente B (agenda + una línea de espejeo).
- Máximo **6 archivos**. Si surge necesidad de tocar un 7º, detenerse y consultar.
- Mantener marcas de agua JSDoc con `IMPL-20260603-02` y ruta de esta SPEC.

### 3.6 Validación exacta esperada
Ejecutar desde `Bridge/`:
```bash
npm run build && npx vitest run
```
- Build verde.
- Suite verde salvo los **3 fallos preexistentes ya documentados** y NO relacionados (designer-workspace `scoreDesignerTask` 45/35 vs 35/45, y un test de navegación de bridge-data). No deben aparecer fallos nuevos.
- QA manual: cerrar el brief de referencia y verificar que (a) la página del cliente muestra el resumen humano legible y (b) `final_summary_text` contiene el raw exhaustivo (consumible vía MCP).

---

## 4. Fuera de alcance (exclusiones explícitas)
- No se modifica el esquema de Supabase.
- No se rediseña el panel de operador ni la lectura comercial del operador (si en el futuro se necesita lectura comercial, irá como nota interna separada; no en este slice).
- No se cambia el MCP ni la API v1.
- No se reescribe el flujo conversacional completo: solo agenda + espejeo.
