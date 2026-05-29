# SPEC ARCH-20260528-09: Hardening de prompt del brief cliente por etapas — V1

**ID:** ARCH-20260528-09  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-28  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Issue Jira:** SIN-ISSUE  
**Respaldo:** `Bridge/context/interconsultas/DICTAMEN_FIX-20260528-05_prompt_brief_cliente_etapas.md`

---

## 1. Objetivo unico y medible

Endurecer el prompt del asistente de brief cliente para que cada turno avance captura de datos de la etapa actual y elimine respuestas genericas de cortesia.

## 2. Problema exacto que resuelve

Con la capa IA ya activa, el asistente todavia responde en modo conversacional abierto y no garantiza disciplina de entrevista comercial por etapa.

## 3. Decision arquitectonica cerrada

1. El prompt pasa a modo entrevistador comercial estricto.
2. Se define prioridad explicita de campos faltantes por etapa.
3. Se obliga salida breve, accionable y sin saludo/agradecimiento.
4. Se mantiene fallback determinista existente cuando IA no responda.

## 4. Datos existentes a reutilizar

1. `buildBriefAssistantSystemPrompt(...)` en `Bridge/lib/briefing-assistant-ai.ts`.
2. `generateBriefAssistantReply(...)` en `Bridge/lib/briefing-assistant-ai.ts`.
3. `StructuredBriefSummary` y `BriefingStage` en `Bridge/lib/briefing.ts`.
4. Fallback con `buildAssistantGuidance(...)` ya integrado en actions.

## 5. Datos faltantes a crear

### 5.1 En `Bridge/lib/briefing-assistant-ai.ts`

1. Definir mapa de campos prioritarios por etapa:
   - discovery: `projectObjective`, `mainOffer`, `requestReason`, `businessContext`
   - precision: `audience`, `platform`, `deliverable`, `cta`
   - commercial_fit: `recommendedProductSlotKey`, `commercialFitReason`
2. Construir listas derivadas por turno:
   - campos capturados
   - campos faltantes prioritarios
3. Reemplazar el prompt por version estricta con:
   - rol de entrevistador comercial,
   - prohibicion de saludo/cortesia vacia,
   - maximo 2 preguntas por turno,
   - limite de extension,
   - formato de salida obligatorio.
4. Post-procesar salida para reducir desborde:
   - trim de espacios/lineas vacias repetidas,
   - truncado razonable por palabras si excede limite operativo.

### 5.2 En `Bridge/lib/briefing.test.ts`

Agregar pruebas para:

1. El system prompt incluye etapa actual y campos faltantes prioritarios.
2. El system prompt contiene restricciones anti-saludo y maximo 2 preguntas.
3. El post-procesado recorta salida excesiva.

## 6. Archivos exactos a crear o modificar

1. `Bridge/lib/briefing-assistant-ai.ts` — MODIFICAR
2. `Bridge/lib/briefing.test.ts` — MODIFICAR

Maximo permitido: 2 archivos.

## 7. Cambio exacto esperado

1. El asistente deja de responder con cortesia generica sin extraccion.
2. Cada turno empuja uno o dos datos faltantes de la etapa actual.
3. Se reduce deriva de etapa y verbosidad innecesaria.

## 8. Restricciones de alcance

1. No tocar UI del chat cliente.
2. No modificar rutas ni server actions de brief.
3. No agregar dependencias nuevas.
4. No cambiar modelo de datos.

## 9. Validacion minima obligatoria

1. `cd Bridge && npm run build`

## 10. Criterios de aceptacion verificables

1. El prompt construido menciona etapa, faltantes y reglas estrictas por turno.
2. Respuestas de prueba no incluyen saludo vacio cuando hay faltantes.
3. Se mantiene fallback al guidance local cuando IA falla.
4. Build completo termina sin errores.

## 11. Contrato de ejecucion para Sofia

**Archivo ancla inicial:** `Bridge/lib/briefing-assistant-ai.ts`

**Datos existentes a reutilizar:**
1. `buildBriefAssistantSystemPrompt`
2. `generateBriefAssistantReply`
3. Tipos derivados desde `buildAssistantGuidance`

**Datos faltantes a crear:**
1. Mapa de prioridad por etapa
2. Derivacion de faltantes prioritarios
3. Prompt estricto final y post-procesado de salida

**Archivos exactos a tocar:**
1. `Bridge/lib/briefing-assistant-ai.ts`
2. `Bridge/lib/briefing.test.ts`

**Validacion exacta esperada:**
1. `cd Bridge && npm run build`

**Condicion de detencion si falta contexto:**
1. Si para cerrar el objetivo hay que tocar mas de 2 archivos, devolver `BLOQUEO DE CONTEXTO`.
2. Si requiere cambio de contrato de `StructuredBriefSummary`, devolver `BLOQUEO DE CONTEXTO`.

## 12. Fuera de alcance explicito

1. Cambio de layout/estilos del chat.
2. Ajustes de rutas o navegacion del portal.
3. Integracion multimodal en brief cliente.

## 13. Definicion de terminado

Slice terminado cuando el prompt del asistente fuerce entrevista por etapa con salidas accionables y build sin regresiones.
