# SPEC ARCH-20260529-01: Brief cliente con doble capa conversacional — V1

**ID:** ARCH-20260529-01  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-29  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Issue Jira:** SIN-ISSUE  
**Respaldo:** `Bridge/context/interconsultas/DICTAMEN_FIX-20260529-01_brief_cliente_conversacion_natural_y_extraccion_invisible.md`, `Bridge/context/SPECs/SPEC_ARCH-20260505-19_agente_briefing_persistido_y_revision_humana.md`

---

## 1. Objetivo unico y medible

Hacer que Vika converse con el cliente en lenguaje natural y, en paralelo, produzca una estructuracion interna invisible en Bridge que permita detectar cuando ya hay informacion suficiente para continuar de etapa o cerrar el brief.

## 2. Problema exacto que resuelve

Hoy el brief cliente mezcla la salida visible con el contrato tecnico de estructuracion. Eso hace que el chat suene rigido y exponga un comportamiento de formulario. Ademas, la deteccion de suficiencia de informacion no esta modelada como decision discreta.

## 3. Decision arquitectonica cerrada

El brief cliente opera con **doble capa coordinada**:

1. **Salida visible al cliente:** texto natural, breve, humano, comercial y contextual. Sin etiquetas tecnicas, sin markdown, sin formato de formulario.
2. **Salida invisible para Bridge:** payload estructurado generado por IA para consumo interno, con patch de summary, faltantes, senales y bandera de suficiencia.

Reglas obligatorias:

1. El cliente nunca ve JSON ni etiquetas tipo `FOCO`, `CAPTURADO`, `PREGUNTAS`.
2. Vika debe reconducir al cliente si se desvía de la finalidad del brief.
3. Vika debe detectar de forma discreta cuando la etapa actual ya tiene informacion suficiente aunque no todos los campos esten perfectamente rellenados.
4. Cuando detecta suficiencia, Vika se lo dice al cliente en lenguaje natural y lo orienta a continuar con la siguiente etapa o a enviar a revision humana cuando corresponda.

## 4. Datos existentes a reutilizar

1. `sendClientMessageAction(...)` en `Bridge/app/cliente/brief/[projectId]/actions.ts`.
2. `updateBriefSummary(...)` en `Bridge/lib/briefing.ts`.
3. `buildAssistantGuidance(...)` en `Bridge/lib/briefing.ts` como fallback final si IA falla.
4. `StructuredBriefSummary` y `BriefingStage` en `Bridge/lib/briefing.ts`.

## 5. Datos faltantes a crear

### 5.1 En `Bridge/lib/briefing-assistant-ai.ts`

Reemplazar el contrato actual por un contrato doble:

1. `generateBriefAssistantTurn(...)` retorna un objeto tipado con esta forma exacta:

```ts
{
  visibleReply: string;
  summaryPatch: Partial<StructuredBriefSummary>;
  stageHasSufficientInfo: boolean;
  missingPriorityFields: string[];
  redirectNote: string;
}
```

2. `visibleReply` es el unico texto que ve el cliente.
3. `summaryPatch` se usa internamente para actualizar Bridge.
4. `stageHasSufficientInfo` indica si la etapa actual ya quedo suficientemente madura para pasar a la siguiente.
5. `missingPriorityFields` solo se usa de forma interna para trazabilidad o decisiones futuras; no se renderiza al cliente.
6. `redirectNote` resume internamente si hubo desvio y como se recondujo; no se renderiza al cliente.

### 5.2 Prompt de Vika visible

El prompt visible debe ordenar a Vika:

1. sonar natural y humana, no como cuestionario;
2. hacer una o dos preguntas como maximo por turno;
3. evitar listas, etiquetas tecnicas y formato estructurado visible;
4. reconducir desvíos con suavidad, volviendo al objetivo del brief;
5. cuando haya informacion suficiente en la etapa, decirlo en natural y sugerir continuar.

### 5.3 Payload invisible para Bridge

La misma respuesta IA debe incluir, en capa interna, un payload estructurado con:

1. patch de campos detectados;
2. faltantes prioritarios;
3. bandera de suficiencia;
4. nota de reconduccion si aplica.

La implementacion puede usar un envelope JSON interno siempre que el cliente solo reciba `visibleReply`.

### 5.4 En `Bridge/app/cliente/brief/[projectId]/actions.ts`

Actualizar el flujo exacto:

1. Persistir mensaje del cliente.
2. Invocar `generateBriefAssistantTurn(...)`.
3. Si `summaryPatch` tiene contenido util, persistirlo con `updateBriefSummary(...)`.
4. Persistir solo `visibleReply` como mensaje del asistente.
5. Si IA falla por completo, usar `buildAssistantGuidance(...)` como fallback visible y no romper el flujo.

### 5.5 En `Bridge/lib/briefing.test.ts`

Agregar pruebas para:

1. el contrato doble retorna `visibleReply` y no filtra etiquetas tecnicas visibles;
2. se parsea y usa `summaryPatch` interno;
3. se detecta `stageHasSufficientInfo`;
4. fallback sigue operativo cuando no hay API key o Gemini falla.

## 6. Archivos exactos a crear o modificar

1. `Bridge/lib/briefing-assistant-ai.ts` — MODIFICAR
2. `Bridge/app/cliente/brief/[projectId]/actions.ts` — MODIFICAR
3. `Bridge/lib/briefing.test.ts` — MODIFICAR

Maximo permitido: 3 archivos.

## 7. Cambio exacto esperado

1. El chat visible se siente natural y guiado, no robotico.
2. Bridge recibe estructura util por debajo sin mostrarsela al cliente.
3. Vika detecta cuando ya hay informacion suficiente y lo comunica sin exponer la logica interna.
4. El cliente es reconducido cuando intenta desviarse del objetivo del brief.

## 8. Restricciones de alcance

1. No cambiar UI del chat cliente.
2. No cambiar rutas del portal.
3. No agregar dependencias nuevas.
4. No cambiar el modelo de datos persistido; solo usar `StructuredBriefSummary` existente.

## 9. Validacion minima obligatoria

1. `cd Bridge && npm run build`

## 10. Criterios de aceptacion verificables

1. El texto visible al cliente no contiene etiquetas tecnicas ni formato estructurado.
2. La capa interna actualiza `StructuredBriefSummary` con datos derivados por IA.
3. El sistema puede detectar `stageHasSufficientInfo` y usarlo para una respuesta natural de cierre de etapa.
4. Si el cliente se desvía, la respuesta visible lo trae de vuelta con naturalidad.
5. El fallback local sigue operativo si IA falla.
6. `npm run build` termina sin errores.

## 11. Contrato de ejecucion para Sofia

**Archivo ancla inicial:** `Bridge/lib/briefing-assistant-ai.ts`

**Datos existentes a reutilizar:**
1. `StructuredBriefSummary`
2. `BriefingStage`
3. `buildAssistantGuidance`
4. `updateBriefSummary`

**Datos faltantes a crear:**
1. contrato `generateBriefAssistantTurn(...)`
2. visible reply natural
3. payload invisible con patch y suficiencia de etapa

**Archivos exactos a tocar:**
1. `Bridge/lib/briefing-assistant-ai.ts`
2. `Bridge/app/cliente/brief/[projectId]/actions.ts`
3. `Bridge/lib/briefing.test.ts`

**Validacion exacta esperada:**
1. `cd Bridge && npm run build`

**Condicion de detencion si falta contexto:**
1. Si para cerrar esto hay que tocar mas de 3 archivos, devolver `BLOQUEO DE CONTEXTO`.
2. Si requiere un cambio de schema o nueva tabla, devolver `BLOQUEO DE CONTEXTO`.

## 12. Fuera de alcance explicito

1. Cambios visuales del chat.
2. Nuevas tablas o migraciones.
3. Integracion multimodal.

## 13. Definicion de terminado

Slice terminado cuando el cliente converse con una Vika natural, Bridge reciba estructuracion invisible util y el sistema detecte discretamente suficiencia de informacion por etapa sin exponer la mecanica interna.
