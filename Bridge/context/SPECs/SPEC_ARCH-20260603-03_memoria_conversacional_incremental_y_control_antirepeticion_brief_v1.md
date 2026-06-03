# SPEC ARCH-20260603-03 — Memoria conversacional incremental y control anti-repeticion del brief cliente

- **ID:** ARCH-20260603-03
- **Autor:** Integra (Arquitecto)
- **Fecha:** 2026-06-03
- **Estado:** Autorizada para implementacion (Sofia)
- **DEAC asociado:** `Bridge/context/clientes/DEAC-ARCH-20260603-03.md`
- **Proyecto de referencia para QA manual:** `b84859fb-6ac2-417c-a66e-235ab997cfa8` (Piloto 2.0 / Rodamax)
- **Respaldo previo relacionado:** `ARCH-20260529-07`, `ARCH-20260602-01`, `ARCH-20260603-01`, `ARCH-20260603-02`

---

## 1. Problema

El chat de brief cliente en Bridge suena repetitivo porque el runtime IA no trabaja con memoria conversacional estructurada viva.

Hoy ocurre esto:

1. `sendClientMessageAction` persiste el mensaje del cliente y luego llama a Gemini sin pasar `structuredSummary` actualizado.
2. `appendClientBriefMessage(...)` no infiere ni persiste campos capturados; solo agrega texto a `brief_messages`.
3. `buildBriefChatSystemPrompt(...)` depende de una ventana de historial reciente y de una agenda por etapa, pero no recibe un bloque de “ya capturado” ni de “frentes pendientes”.
4. La etapa no avanza automaticamente aunque ya haya suficientes datos para salir de discovery o precision.

Resultado: el modelo vuelve a preguntar servicios, audiencia, diferenciadores o contexto aunque el cliente ya los haya dicho antes.

---

## 2. Objetivo

Mejorar el chat de brief cliente para que se comporte mas cerca de Elecsa en continuidad conversacional, sin replicar todas sus features. El comportamiento minimo exigible es:

1. Construir memoria incremental barata en `structuredSummary` a partir de cada mensaje del cliente.
2. Alimentar el prompt con esa memoria antes de generar la siguiente respuesta.
3. Bloquear re-preguntas sobre datos ya capturados salvo ambiguedad, contradiccion o respuesta demasiado vaga.
4. Avanzar de etapa en background cuando la etapa actual ya tenga informacion suficiente.

---

## 3. Contrato operativo

### 3.1 Archivo ancla inicial

`Bridge/app/cliente/brief/[projectId]/actions.ts`

El control real del turno vive aqui: persistencia del mensaje del cliente, recarga del brief actual, llamada al runtime IA y revalidacion.

### 3.2 Datos existentes a reutilizar (donde viven)

1. `StructuredBriefSummary`, `normalizeSummary`, `mergeStructuredBriefSummary`, `hasMeaningfulSummaryValue`, `hasBackgroundStageSufficientInfo`, `advanceBriefStageInBackground`, `updateBriefSummary` en [Bridge/lib/briefing.ts](../../lib/briefing.ts).
2. Utilidades heuristicas ya presentes en [Bridge/lib/briefing.ts](../../lib/briefing.ts): `cleanHeuristicValue`, `normalizeHeuristicText`, `extractFirstMatch`, `detectKeywordValue`.
3. Prompt runtime actual y helpers de sanitizacion en [Bridge/lib/briefing-assistant-ai.ts](../../lib/briefing-assistant-ai.ts).
4. Flujo actual del turno en [Bridge/app/cliente/brief/[projectId]/actions.ts](../../app/cliente/brief/%5BprojectId%5D/actions.ts).

### 3.3 Datos faltantes a crear (donde y como)

No se crean columnas nuevas ni tablas nuevas.

Se deben crear solo helpers puros y reusar el json existente:

1. **`inferBriefSummaryPatchFromClientMessage(...)`** en `briefing.ts` para derivar un patch incremental barato desde el ultimo mensaje del cliente.
2. **Bloque de memoria para prompt** en `briefing-assistant-ai.ts`, construido desde `summary`, distinguiendo “ya capturado” y “pendiente”.

### 3.4 Cambios exactos por archivo (maximo 4 archivos de codigo + 1 test)

**A) `Bridge/app/cliente/brief/[projectId]/actions.ts`**

1. Extender el flujo de `sendClientMessageAction`:
   - Persistir el mensaje del cliente como hoy.
   - Recargar `brief` y `currentVersion`.
   - Construir `summaryPatch` con el nuevo helper heuristico usando `currentVersion.stage`, `currentVersion.structuredSummary` y `normalizedText`.
   - Si el patch no esta vacio, persistirlo con `updateBriefSummary(...)` antes de llamar a Gemini.
2. Despues de aplicar el patch, evaluar `hasBackgroundStageSufficientInfo(currentStage, mergedSummary)`.
   - Si da `true`, llamar `advanceBriefStageInBackground({ briefId, versionId })`.
   - Releer el brief/version actual para que Gemini responda desde la nueva etapa sin sembrar mensaje rigido intermedio.
3. Cambiar la llamada a `generateBriefChatReply(...)` para pasar tambien `summary: currentVersion.structuredSummary`.
4. Mantener **una sola llamada IA por turno**.

**B) `Bridge/lib/briefing.ts`**

1. Crear y exportar un helper puro:
   ```ts
   export function inferBriefSummaryPatchFromClientMessage(
     stage: BriefingStage,
     currentSummary: StructuredBriefSummary,
     messageText: string
   ): Partial<StructuredBriefSummary>
   ```
2. Este helper debe reusar las utilidades heuristicas ya existentes para capturar incrementalmente, al menos:
   - `projectObjective`
   - `mainOffer`
   - `businessContext`
   - `requestReason`
   - `audience`
   - `platform`
   - `deliverable`
   - `cta`
   - `commercialFitReason`
3. Regla de escritura:
   - Llenar campos vacios cuando haya una señal suficientemente util.
   - No sobreescribir valores ya significativos por otros mas vagos.
   - Si el valor nuevo es mas especifico y claramente mejor, permitir upgrade solo sobre el mismo campo.
4. Mantener el helper barato, determinista y sin llamadas IA.

**C) `Bridge/lib/briefing-assistant-ai.ts`**

1. Extender `GenerateBriefChatReplyInput` con:
   ```ts
   summary: BriefSummary;
   ```
2. Ajustar `buildBriefChatSystemPrompt(...)` y `buildBriefChatTurnPrompt(...)` para recibir `summary`.
3. Inyectar al prompt dos bloques nuevos:
   - **Datos ya capturados**: solo campos relevantes con valor significativo.
   - **Frentes pendientes de esta etapa**: campos prioritarios aun sin resolver.
4. Agregar una regla explicita anti-repeticion, por ejemplo:
   - “No vuelvas a preguntar por un dato ya capturado salvo que el cliente lo haya contradicho, sea ambiguo o siga siendo demasiado vago para accionar.”
5. Mantener historial reciente, pero dejar de depender solo de el para continuidad. El historial puede quedarse acotado; la fuente principal de memoria debe pasar a ser `summary`.
6. No cambiar el modelo, ni agregar tools, ni sumar llamadas IA.

**D) `Bridge/lib/briefing.test.ts`**

Agregar o ajustar tests para cubrir:

1. `inferBriefSummaryPatchFromClientMessage(...)` llena campos vacios a partir de mensajes reales tipo Rodamax.
2. No sobreescribe un campo ya significativo con una respuesta mas vaga.
3. `hasBackgroundStageSufficientInfo(...)` da `true` cuando un summary ya cubre la etapa.
4. El prompt del chat incluye memoria capturada y regla anti-repeticion (si decides ubicar este test aqui reutilizando exports; no crear archivo nuevo).

### 3.5 Restricciones

1. **Sin cambios de esquema** en Supabase.
2. **Sin cambios** en MCP ni en la API v1 externa.
3. **Sin nuevas llamadas IA por turno.**
4. **Sin rediseño UI.**
5. **Maximo 4 archivos de codigo + 1 archivo de tests.**
6. Mantener comentarios de marca de agua `IMPL-20260603-03` con respaldo a esta SPEC en cada archivo tocado.

### 3.6 Validacion exacta esperada

Desde `Bridge/` ejecutar:

```bash
npm run build && npx vitest run
```

Esperado:

1. Build verde.
2. Suite verde salvo los 3 fallos preexistentes ya documentados y no relacionados (`designer-workspace` x2, `bridge-data` x1).
3. QA manual en el proyecto de referencia:
   - La conversacion deja de reabrir servicios, audiencia o diferenciadores ya respondidos.
   - Si discovery queda cubierto, el siguiente turno cambia naturalmente de frente sin pedir avance manual.

---

## 4. Fuera de alcance (exclusiones explicitas)

1. Paridad funcional completa con Elecsa.
2. Resumen automatico multi-turno con IA en cada mensaje.
3. Cierre comercial, handoff a humano, tools de catalogo o reglas de WhatsApp.
4. Refactor general del brief o del modelo de etapas.

---

## 5. Definicion de listo

Este slice se considera listo cuando:

1. El chat reutiliza memoria incremental real de lo ya capturado.
2. La repeticion visible baja de forma clara en QA manual con Rodamax.
3. El runtime sigue siendo de una sola llamada IA por turno.
4. No se introducen regresiones en build/tests fuera de los fallos ya conocidos.