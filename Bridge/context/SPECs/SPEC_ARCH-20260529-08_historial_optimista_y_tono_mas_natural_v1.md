# SPEC ARCH-20260529-08: Historial optimista y tono conversacional más natural — V1

**ID:** ARCH-20260529-08  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-29  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Issue Jira:** SIN-ISSUE  
**Respaldo:** `Bridge/context/SPECs/SPEC_ARCH-20260529-07_chat_brief_adaptativo_y_etapas_background_v1.md`

---

## 1. Objetivo unico y medible

Mejorar dos aspectos del brief cliente sin reabrir el rediseño general del runtime:

1. que el mensaje del cliente aparezca de inmediato en el historial al enviarse;
2. que la respuesta visible de Vika suene menos robótica y menos plantillada.

## 2. Problema exacto que resuelve

### 2.1 Latencia perceptual del historial

Hoy el mensaje del cliente no se refleja de forma optimista en la UI. El historial visible depende del roundtrip completo del server action, incluyendo inferencia, respuesta IA y revalidate. Eso hace que el cliente perciba retraso y, en algunos casos, sienta que la IA responde antes de que su propio mensaje aparezca en pantalla.

### 2.2 Tono conversacional todavía rígido

Aunque el flujo ya mejoró, la conversación visible sigue heredando una parte de rigidez por:

1. preguntas visibles determinísticas demasiado limpias y uniformes;
2. fallback y aclaraciones con construcción repetitiva;
3. poca variación en transiciones y confirmaciones breves.

## 3. Causa raíz local confirmada

### 3.1 Historial sin optimismo local

En `Bridge/components/client-brief-chat.tsx`, `handleSendMessage()` espera a que termine `sendClientMessageAction(...)` antes de que el historial visible cambie. No existe una capa optimista local para el mensaje del cliente.

### 3.2 Respuesta visible demasiado reglada

En `Bridge/lib/briefing.ts` y `Bridge/lib/briefing-assistant-ai.ts`, la conversación visible sigue dependiendo de preguntas y aclaraciones demasiado determinísticas. El prompt ya guía mejor, pero todavía recibe una superficie visible con poco rango expresivo.

## 4. Decision arquitectonica cerrada

1. Se autoriza una mejora acotada de UX conversacional, sin tocar schema ni el contrato estructural de etapas en background.
2. El historial del cliente debe tener render optimista local.
3. La respuesta visible de Vika debe conservar foco comercial, pero con lenguaje más humano, menos uniforme y menos formulaico.

## 5. Datos existentes a reutilizar

1. `ClientBriefChatView` en `Bridge/components/client-brief-chat.tsx`.
2. `sendClientMessageAction(...)` en `Bridge/app/cliente/brief/[projectId]/actions.ts`.
3. `getCurrentVisibleStageQuestion(...)` y `buildAssistantGuidance(...)` en `Bridge/lib/briefing.ts`.
4. `buildBriefChatSystemPrompt(...)` y `buildBriefChatFallbackReply(...)` en `Bridge/lib/briefing-assistant-ai.ts`.
5. pruebas actuales en `Bridge/lib/briefing.test.ts`.

## 6. Datos faltantes a crear o ajustar

### 6.1 Historial optimista local

Crear una capa optimista local para el mensaje del cliente:

1. al enviar, el mensaje debe aparecer inmediatamente en el historial;
2. mientras el turno server-side termina, ese mensaje puede mostrarse como pendiente si hace falta;
3. al llegar la revalidación real, la UI debe reconciliar sin duplicar mensajes.

### 6.2 Tono menos robótico

Refinar la capa visible para que:

1. las preguntas no suenen siempre con la misma estructura;
2. las aclaraciones puedan sonar más conversacionales y menos de formulario;
3. las transiciones entre frentes de conversación tengan más naturalidad;
4. las confirmaciones breves no parezcan plantilla repetida.

Importante: no se pide humor ni marketing florido. Se pide naturalidad comercial sobria.

## 7. Archivos exactos a modificar

1. `Bridge/components/client-brief-chat.tsx` — MODIFICAR
2. `Bridge/lib/briefing.ts` — MODIFICAR
3. `Bridge/lib/briefing-assistant-ai.ts` — MODIFICAR
4. `Bridge/lib/briefing.test.ts` — MODIFICAR

Maximo permitido: 4 archivos.

## 8. Cambio exacto esperado

1. El mensaje del cliente aparece de inmediato en el historial al enviarse.
2. La percepción de retraso baja claramente en el chat.
3. Vika mantiene foco, pero suena menos rígida y menos repetitiva.
4. La conversación visible conserva naturalidad sin volver a labels internas ni reglas visibles.

## 9. Restricciones de alcance

1. No cambiar schema ni migraciones.
2. No tocar rutas del portal.
3. No agregar dependencias nuevas.
4. No reabrir el rediseño de etapas en background fuera de estos 4 archivos.

## 10. Validacion minima obligatoria

1. `cd Bridge && npm run build`

## 11. Criterios de aceptacion verificables

1. Al enviar un mensaje, este aparece inmediatamente en el historial antes de que termine la respuesta del servidor.
2. No se generan duplicados cuando llega la revalidación real.
3. Las respuestas visibles de Vika suenan más naturales y menos formulaicas en al menos discovery y precision.
4. El flujo compila sin errores.

## 12. Contrato de ejecucion para Sofia

**Archivo ancla inicial:** `Bridge/components/client-brief-chat.tsx`

**Datos existentes a reutilizar:**
1. `sendClientMessageAction(...)`
2. `getCurrentVisibleStageQuestion(...)`
3. `buildBriefChatFallbackReply(...)`

**Datos faltantes a crear o ajustar:**
1. historial optimista local del cliente;
2. reconciliación sin duplicados;
3. refinamiento del tono visible de Vika.

**Archivos exactos a tocar:**
1. `Bridge/components/client-brief-chat.tsx`
2. `Bridge/lib/briefing.ts`
3. `Bridge/lib/briefing-assistant-ai.ts`
4. `Bridge/lib/briefing.test.ts`

**Validacion exacta esperada:**
1. `cd Bridge && npm run build`

**Condicion de detencion si falta contexto:**
1. Si requiere tocar más de 4 archivos, devolver `BLOQUEO DE CONTEXTO`.
2. Si requiere cambios de schema o migraciones, devolver `BLOQUEO DE CONTEXTO`.

## 13. Definicion de terminado

Slice terminado cuando el historial del cliente tenga comportamiento optimista inmediato y Vika responda con un tono más natural, manteniendo el flujo actual de etapas en background y build limpio.