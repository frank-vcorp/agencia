# SPEC ARCH-20260529-03: Brief cliente con chat separado y JSON post-cierre — V1

**ID:** ARCH-20260529-03  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-29  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Issue Jira:** SIN-ISSUE  
**Respaldo:** `Bridge/context/SPECs/SPEC_ARCH-20260505-19_agente_briefing_persistido_y_revision_humana.md`

---

## 1. Objetivo unico y medible

Separar de forma estricta el brief cliente en dos partes:

1. **Chat visible y persistido:** Vika conversa en natural, el sistema guarda la conversación como texto y usa un itinerario de preguntas para decidir cuándo cerrar.
2. **Procesamiento post-cierre:** un flujo independiente consume la conversación ya cerrada y genera el JSON final interno para Bridge y para consumo posterior por Vika en VS Code.

## 2. Problema exacto que resuelve

El flujo actual mezcla demasiadas responsabilidades en cada turno del chat: respuesta visible, detección semántica, saneado y estructuración. Eso vuelve frágil el comportamiento y deteriora la experiencia conversacional.

## 3. Decision arquitectonica cerrada

La arquitectura correcta queda así:

### 3.1 Capa A — Chat natural persistido

1. El chat solo genera texto natural visible.
2. Toda la conversación se guarda en `brief_messages` como fuente primaria.
3. No se genera ni parsea JSON durante cada turno.
4. El chat se guía por un itinerario de preguntas por etapa, usando los campos faltantes ya conocidos por `StructuredBriefSummary`.
5. El objetivo de Vika en esta capa es mantener foco, reconducir desvíos y obtener la información mínima necesaria.

### 3.2 Capa B — Cierre del chat

1. El cierre no depende de un payload IA por turno.
2. El cierre depende de un mecanismo persistido y determinístico basado en el itinerario cumplido y la suficiencia de la etapa.
3. Cuando el sistema detecta suficiencia, Vika emite una frase de cierre visible al cliente.
4. Esa frase de cierre activa el mecanismo persistido de cierre del chat, saneación y limpieza de la superficie visible.
5. La conversación no se borra: solo deja de mostrarse en la UI del cliente.

### 3.3 Capa C — JSON post-cierre independiente

1. Una vez que el brief ya fue cerrado o enviado a revisión, un flujo IA independiente vuelve a consumir la conversación completa + summary vigente.
2. En ese segundo paso se genera el JSON final interno.
3. Ese JSON no se muestra al cliente.
4. Ese JSON queda listo para que luego Vika en VS Code lo consuma para construir la propuesta.

## 4. Regla de diseño principal

El chat no debe intentar estructurar todo en tiempo real.

El chat solo debe:

1. conversar,
2. guardar mensajes,
3. mantener foco,
4. seguir itinerario,
5. cerrar cuando la información sea suficiente.

La estructuración final ocurre después, en un flujo separado.

## 5. Datos existentes a reutilizar

1. `brief_messages` como fuente primaria persistida.
2. `StructuredBriefSummary` como estructura operativa de faltantes por etapa.
3. `inferBriefSummaryPatchFromClientMessage(...)` en `Bridge/lib/briefing.ts`.
4. `getCriticalMissingFields(...)` y la lógica de etapas ya existente.
5. `submitBriefForOperatorReview(...)` como mecanismo natural de transición al cierre.

## 6. Datos faltantes a crear

### 6.1 En `Bridge/lib/briefing-assistant-ai.ts`

Separar las funciones en este contrato mínimo:

1. `generateBriefChatReply(...)`
   - entrada: etapa, summary, clientMessage;
   - salida: texto natural visible;
   - no genera JSON;
   - no expone estructura técnica.

2. `shouldCloseBriefStage(...)`
   - entrada: etapa, summary;
   - salida: boolean;
   - usa el itinerario de preguntas y la suficiencia mínima de etapa.

3. `generateBriefClosingMessage(...)`
   - entrada: etapa final, summary;
   - salida: frase visible de cierre para el cliente.

4. `generateBriefFinalJson(...)`
   - entrada: conversación completa y summary vigente;
   - salida: JSON interno final.

### 6.2 Itinerario de preguntas

El itinerario debe ser determinístico por etapa:

1. discovery: `projectObjective`, `mainOffer`, `requestReason`, `businessContext`
2. precision: `audience`, `platform`, `deliverable`, `cta`
3. commercial_fit: `recommendedProductSlotKey`, `commercialFitReason`

La suficiencia puede declararse sin perfección absoluta si ya hay contexto suficiente para operar comercialmente.

### 6.3 En `Bridge/app/cliente/brief/[projectId]/actions.ts`

Flujo exacto:

1. Persistir mensaje cliente.
2. Inferir y persistir patch local con `inferBriefSummaryPatchFromClientMessage(...)`.
3. Pedir a IA solo la respuesta natural visible.
4. Evaluar `shouldCloseBriefStage(...)`.
5. Si no se cierra, persistir respuesta natural del asistente.
6. Si se cierra:
   - persistir frase de cierre visible;
   - activar transición persistida a revisión o cierre;
   - disparar `generateBriefFinalJson(...)` como paso posterior independiente dentro del mismo cierre, no dentro de cada turno.

### 6.4 En `Bridge/components/client-brief-chat.tsx`

1. Mientras el brief siga abierto, renderizar conversación normal con un viewport amplio.
2. Cuando el brief se marque como cerrado/revisión, ocultar historial visible y mostrar un estado limpio de cierre.
3. El historial no se elimina de DB.

### 6.5 En `Bridge/lib/briefing.test.ts`

Agregar o ajustar pruebas para:

1. respuesta natural visible sin etiquetas técnicas;
2. cierre por suficiencia de etapa según itinerario;
3. generación de frase de cierre;
4. generación de JSON final solo al cierre;
5. persistencia conversacional intacta.

## 7. Archivos exactos a crear o modificar

1. `Bridge/lib/briefing-assistant-ai.ts` — MODIFICAR
2. `Bridge/app/cliente/brief/[projectId]/actions.ts` — MODIFICAR
3. `Bridge/components/client-brief-chat.tsx` — MODIFICAR
4. `Bridge/lib/briefing.test.ts` — MODIFICAR

Maximo permitido: 4 archivos.

## 8. Cambio exacto esperado

1. El chat visible se simplifica y deja de depender de payloads estructurados por turno.
2. La conversación se conserva completa en `brief_messages`.
3. El cierre se dispara por itinerario cumplido y suficiencia, no por parseo complejo de IA.
4. El JSON final se genera después del cierre y no contamina la conversación visible.

## 9. Restricciones de alcance

1. No cambiar schema ni crear migraciones.
2. No agregar dependencias nuevas.
3. No cambiar rutas del portal.
4. No mostrar JSON final al cliente.

## 10. Validacion minima obligatoria

1. `cd Bridge && npm run build`

## 11. Criterios de aceptacion verificables

1. El cliente solo ve conversación natural.
2. La conversación completa sigue persistida en Bridge.
3. El chat visible se limpia al cierre sin borrar historial interno.
4. El JSON final interno se genera solo al cierre.
5. El flujo compila sin errores.

## 12. Contrato de ejecucion para Sofia

**Archivo ancla inicial:** `Bridge/lib/briefing-assistant-ai.ts`

**Datos existentes a reutilizar:**
1. `brief_messages`
2. `StructuredBriefSummary`
3. `inferBriefSummaryPatchFromClientMessage(...)`
4. `submitBriefForOperatorReview(...)`

**Datos faltantes a crear:**
1. respuesta natural visible por turno
2. cierre por suficiencia determinística
3. JSON final independiente post-cierre

**Archivos exactos a tocar:**
1. `Bridge/lib/briefing-assistant-ai.ts`
2. `Bridge/app/cliente/brief/[projectId]/actions.ts`
3. `Bridge/components/client-brief-chat.tsx`
4. `Bridge/lib/briefing.test.ts`

**Validacion exacta esperada:**
1. `cd Bridge && npm run build`

**Condicion de detencion si falta contexto:**
1. Si requiere tocar más de 4 archivos, devolver `BLOQUEO DE CONTEXTO`.
2. Si requiere schema nuevo o migración, devolver `BLOQUEO DE CONTEXTO`.

## 13. Definicion de terminado

Slice terminado cuando el brief cliente funcione como chat natural persistido, cierre por suficiencia detectada en itinerario y genere JSON final interno únicamente después del cierre.
