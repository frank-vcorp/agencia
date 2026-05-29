# SPEC ARCH-20260528-08: Brief cliente con capa IA real (Gemini) — V1

**ID:** ARCH-20260528-08  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-28  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Issue Jira:** SIN-ISSUE  
**Respaldo:** `Bridge/context/SPECs/SPEC_ARCH-20260528-07_portal_cliente_por_proyecto_brief_first_v1.md`, `Bridge/context/SPECs/SPEC_ARCH-20260510-03_chat_asistente_produccion_disenador.md`

---

## 1. Objetivo unico y medible

Reemplazar la respuesta guiada local del chat de brief cliente por una respuesta de IA real con Gemini, manteniendo persistencia conversacional y etapa del brief sin romper la UX actual.

## 2. Problema exacto que resuelve

Hoy el chat de cliente no usa la misma capa IA que el chat del diseñador. En `app/cliente/brief/[projectId]/actions.ts` la respuesta del asistente se construye con `buildAssistantGuidance(...)` en `lib/briefing.ts`, por lo que el flujo se percibe repetitivo y no suficientemente adaptativo.

## 3. Decision arquitectonica cerrada

El asistente del brief cliente pasa a capa IA server-side con Gemini y queda alineado al patron del diseñador:

1. El mensaje del cliente se persiste primero.
2. Se infiere y persiste patch de `structuredSummary` como hasta ahora.
3. La respuesta del asistente se genera con Gemini usando:
   - etapa actual,
   - resumen estructurado actualizado,
   - ultimo mensaje del cliente.
4. Si Gemini falla o no hay clave configurada, se usa fallback determinista con `buildAssistantGuidance(...)` para no romper el flujo.

## 4. Datos existentes a reutilizar

1. `sendClientMessageAction(...)` en `Bridge/app/cliente/brief/[projectId]/actions.ts`.
2. `inferBriefSummaryPatchFromClientMessage(...)` en `Bridge/lib/briefing.ts`.
3. `updateBriefSummary(...)` en `Bridge/lib/briefing.ts`.
4. `buildAssistantGuidance(...)` en `Bridge/lib/briefing.ts` como fallback.
5. Patron Gemini ya productivo en diseñador: `Bridge/lib/designer-chat.ts`.

## 5. Datos faltantes a crear

### 5.1 Nuevo modulo IA de briefing cliente

Crear `Bridge/lib/briefing-assistant-ai.ts` con:

1. `buildBriefAssistantSystemPrompt(stage, summary)`
2. `generateBriefAssistantReply({ stage, summary, clientMessage })`

Contrato:

1. Usa `GEMINI_API_KEY` solo server-side.
2. Modelo: `gemini-2.5-flash`.
3. Devuelve `null` si falla o si no hay API key (para activar fallback en actions).
4. No debe exponer errores raw al cliente.

### 5.2 Integracion en acciones del chat cliente

Modificar `sendClientMessageAction(...)` en `Bridge/app/cliente/brief/[projectId]/actions.ts`:

1. Mantener guardado de mensaje del cliente e inferencia/persistencia de resumen.
2. Sustituir `buildAssistantGuidance(...)` como respuesta primaria por llamada a `generateBriefAssistantReply(...)`.
3. Si IA responde texto util, persistir ese texto como mensaje `assistant`.
4. Si IA devuelve `null`, persistir fallback de `buildAssistantGuidance(...)`.
5. Mantener `revalidatePath` de rutas legacy y canonica.

### 5.3 Cobertura de pruebas

Extender `Bridge/lib/briefing.test.ts` con pruebas minimas de contrato para la capa IA:

1. Cuando no hay `GEMINI_API_KEY`, `generateBriefAssistantReply` devuelve `null`.
2. Cuando Gemini responde texto, la funcion devuelve ese texto.
3. Cuando Gemini lanza error, la funcion devuelve `null`.

## 6. Archivos exactos a crear o modificar

1. `Bridge/lib/briefing-assistant-ai.ts` — CREAR
2. `Bridge/app/cliente/brief/[projectId]/actions.ts` — MODIFICAR
3. `Bridge/lib/briefing.test.ts` — MODIFICAR

Maximo permitido: 3 archivos.

## 7. Cambio exacto esperado

1. El chat cliente deja de depender exclusivamente de respuestas predefinidas.
2. La respuesta del asistente se adapta con IA real al contexto y mensaje actual.
3. El sistema conserva estabilidad mediante fallback determinista si IA no esta disponible.

## 8. Restricciones de alcance

1. No redisenar UI del chat cliente en este slice.
2. No mover rutas ni cambiar contratos de URL.
3. No tocar `Bridge/components/designer-chat-panel.tsx`.
4. No crear nuevas env vars; reutilizar `GEMINI_API_KEY` ya existente.
5. No agregar dependencias nuevas.

## 9. Validacion minima obligatoria

1. `cd Bridge && npm run build`

## 10. Criterios de aceptacion verificables

1. `sendClientMessageAction` ya no usa `buildAssistantGuidance` como unica ruta principal de respuesta.
2. Existe llamada IA real en servidor para componer respuesta del asistente cliente.
3. Ante error de IA o ausencia de key, el flujo continua con fallback y no rompe la conversacion.
4. Build completo termina sin errores.

## 11. Contrato de ejecucion para Sofia

**Archivo ancla inicial:** `Bridge/app/cliente/brief/[projectId]/actions.ts`

**Datos existentes a reutilizar:**
1. `inferBriefSummaryPatchFromClientMessage`
2. `updateBriefSummary`
3. `appendBriefMessage`
4. `buildAssistantGuidance` (solo fallback)

**Datos faltantes a crear:**
1. `Bridge/lib/briefing-assistant-ai.ts` con llamada Gemini y prompt por etapa

**Archivos exactos a tocar:**
1. `Bridge/lib/briefing-assistant-ai.ts`
2. `Bridge/app/cliente/brief/[projectId]/actions.ts`
3. `Bridge/lib/briefing.test.ts`

**Validacion exacta esperada:**
1. `cd Bridge && npm run build`

**Condicion de detencion si falta contexto:**
1. Si para implementar hay que modificar mas de 3 archivos, devolver `BLOQUEO DE CONTEXTO`.
2. Si aparece dependencia no prevista del modelo de datos del brief, devolver `BLOQUEO DE CONTEXTO`.

## 12. Fuera de alcance explicito

1. Cambio de UX visual del chat.
2. Ajustes de scroll, estilos o layout.
3. Persistir historiales IA fuera del flujo actual de `brief_messages`.
4. Integracion multimodal (imagenes) en chat cliente.

## 13. Definicion de terminado

Slice terminado cuando la respuesta del asistente cliente se genere primariamente con Gemini en server-side, persista en el hilo actual, tenga fallback estable y compile sin regresiones.