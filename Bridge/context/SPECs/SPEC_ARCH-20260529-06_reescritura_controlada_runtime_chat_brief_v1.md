# SPEC ARCH-20260529-06: Reescritura controlada del runtime del chat brief cliente — V1

**ID:** ARCH-20260529-06  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-29  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Issue Jira:** SIN-ISSUE  
**Respaldo:** `Bridge/context/interconsultas/HANDOFF_FIX-20260529-02_para_integra_saneamiento_chat_brief_cliente.md`

---

## 1. Objetivo unico y medible

Reescribir de forma controlada el runtime del chat del brief cliente para eliminar loops de aclaración, evitar exposición de etiquetas internas al cliente y separar claramente conversación visible, captura estructurada y cierre del brief.

## 2. Problema exacto que resuelve

El runtime actual mezcla demasiadas responsabilidades en el mismo turno: apertura local, inferencia heurística, prompt IA, fallback visible, control de etapa y cierre. Esa mezcla produce respuestas truncadas, loops conversacionales y preguntas visibles con etiquetas internas como `oferta principal`.

## 3. Decision arquitectonica cerrada

Se autoriza un primer corte de reescritura controlada del runtime siguiendo la Ruta B propuesta en el handoff forense.

### 3.1 Contrato nuevo de turno conversacional

Cada turno del chat debe resolver estas responsabilidades en este orden exacto:

1. persistir mensaje cliente;
2. inferir patch estructurado local si existe señal útil;
3. evaluar faltantes internos por etapa;
4. traducir faltantes internos a una pregunta natural visible, sin exponer labels internas;
5. usar IA solo para formular o enriquecer la respuesta visible dentro de ese contrato;
6. si la respuesta IA no es confiable, degradar a una pregunta natural deterministicamente generada;
7. evaluar cierre por etapa sin contaminar el mensaje visible con estructura técnica.

### 3.2 Regla de visibilidad

Las etiquetas internas del modelo de datos nunca deben mostrarse al cliente final. Ejemplos prohibidos como texto visible:

1. `oferta principal`
2. `objetivo del proyecto`
3. `CTA`
4. `plataforma`
5. `entregable`

Cada faltante interno debe traducirse a una pregunta natural cliente-friendly.

### 3.3 Regla de aclaración

Las repreguntas del cliente deben ser una responsabilidad explícita del runtime. Si el cliente pregunta variantes como:

1. `que oferta principal`
2. `cual oferta`
3. `a que te refieres con oferta`

el sistema debe responder aclarando en lenguaje natural y proponiendo opciones concretas, no repetir la misma consigna.

### 3.4 Apertura unica

La apertura inicial no debe quedar duplicada entre `buildAssistantGuidance(...)`, fallback y prompt IA. Debe existir una sola fuente de verdad para la primera pregunta visible del brief.

## 4. Datos existentes a reutilizar

1. `StructuredBriefSummary` en `Bridge/lib/briefing.ts`.
2. `inferBriefSummaryPatchFromClientMessage(...)` como base inicial de captura estructurada.
3. `generateBriefChatReply(...)` en `Bridge/lib/briefing-assistant-ai.ts` como punto de entrada de IA visible.
4. `submitBriefForOperatorReview(...)` y flujo actual de cierre.
5. pruebas existentes en `Bridge/lib/briefing.test.ts`.

## 5. Datos faltantes a crear

### 5.1 Traducción visible por faltante

Crear una capa determinística que traduzca cada campo faltante a una pregunta natural visible.

Ejemplo esperado:

- interno: `mainOffer`
- visible: `¿Cuál es el servicio o producto principal que quieres mover primero?`

### 5.2 Aclaración por repregunta

Crear una capa que detecte repreguntas de aclaración sobre el faltante actual y responda sin repetir la misma frase.

### 5.3 Apertura unificada

Eliminar la duplicidad conceptual de la primera pregunta visible, dejando una sola fuente de verdad para el arranque del brief.

### 5.4 Fallback natural por contrato

El fallback ya no debe construirse con labels internas sino con preguntas visibles cliente-friendly derivadas del faltante actual.

## 6. Archivos exactos a modificar

1. `Bridge/lib/briefing-assistant-ai.ts` — MODIFICAR
2. `Bridge/app/cliente/brief/[projectId]/actions.ts` — MODIFICAR
3. `Bridge/lib/briefing.ts` — MODIFICAR
4. `Bridge/lib/briefing.test.ts` — MODIFICAR

Maximo permitido: 4 archivos.

## 7. Cambio exacto esperado

1. El cliente no debe volver a ver labels internas como `oferta principal`.
2. El chat no debe repetir la misma pregunta cuando el cliente pide aclaración.
3. El primer faltante visible debe expresarse en lenguaje cliente-friendly.
4. La apertura del brief debe quedar gobernada por una sola fuente de verdad.
5. El runtime debe compilar y mantener el flujo actual de persistencia y cierre.

## 8. Restricciones de alcance

1. No tocar `Bridge/components/client-brief-chat.tsx`.
2. No cambiar schema ni migraciones.
3. No agregar dependencias nuevas.
4. No cambiar rutas del portal.
5. Si el saneamiento exige tocar más de 4 archivos, detenerse y devolver `BLOQUEO DE CONTEXTO`.

## 9. Validacion minima obligatoria

1. `cd Bridge && npm run build`

## 10. Criterios de aceptacion verificables

1. Ante una repregunta como `Que oferta principal?`, el chat responde con aclaración natural y no repite la misma consigna.
2. Una respuesta amplia como la de Rodamax deja de empujar al sistema a exponer labels internas al cliente.
3. La apertura inicial visible proviene de una sola fuente de verdad.
4. La suite de pruebas cubre al menos:
   - traducción natural del faltante `mainOffer`;
   - manejo de repregunta de aclaración;
   - rechazo de exposición de labels internas en fallback visible.
5. El build queda limpio.

## 11. Contrato de ejecucion para Sofia

**Archivo ancla inicial:** `Bridge/lib/briefing-assistant-ai.ts`

**Datos existentes a reutilizar:**
1. `StructuredBriefSummary`
2. `inferBriefSummaryPatchFromClientMessage(...)`
3. `generateBriefChatReply(...)`
4. `submitBriefForOperatorReview(...)`

**Datos faltantes a crear:**
1. traducción natural por faltante;
2. manejo explícito de repreguntas de aclaración;
3. apertura unificada;
4. fallback visible sin labels internas.

**Archivos exactos a tocar:**
1. `Bridge/lib/briefing-assistant-ai.ts`
2. `Bridge/app/cliente/brief/[projectId]/actions.ts`
3. `Bridge/lib/briefing.ts`
4. `Bridge/lib/briefing.test.ts`

**Validacion exacta esperada:**
1. `cd Bridge && npm run build`

**Condicion de detencion si falta contexto:**
1. Si requiere tocar más de 4 archivos, devolver `BLOQUEO DE CONTEXTO`.
2. Si requiere cambios de schema o migraciones, devolver `BLOQUEO DE CONTEXTO`.

## 12. Definicion de terminado

Slice terminado cuando el runtime del chat brief cliente deje de exponer labels internas, resuelva repreguntas de aclaración sin loop, unifique la apertura visible y mantenga compilación limpia sin ampliar el alcance más allá de 4 archivos.