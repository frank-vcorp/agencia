# SPEC ARCH-20260602-01: Brief cliente con conversacion primero y procesado unico al cierre — V1

**ID:** ARCH-20260602-01  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-06-02  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Issue Jira:** SIN-ISSUE  
**Respaldo:** `Bridge/context/SPECs/SPEC_ARCH-20260529-07_chat_brief_adaptativo_y_etapas_background_v1.md`

---

## 1. Objetivo unico y medible

Redefinir el brief cliente para que durante la conversación solo exista una responsabilidad visible: conversar bien. La estructuración del brief debe ocurrir una sola vez al cierre, consumiendo el historial completo del chat en lugar de procesar cada turno.

## 2. Problema exacto que resuelve

El runtime actual del brief cliente procesa demasiado en cada mensaje:

1. genera respuesta visible;
2. intenta extraer `summaryPatch`;
3. persiste estructura parcial;
4. recalcula suficiencia por etapa;
5. condiciona transiciones y cierre.

Eso vuelve el chat más caro, más frágil y menos natural que otros chats conversacionales ya probados.

## 3. Decision arquitectonica cerrada

La arquitectura correcta queda así:

### 3.1 Capa A — Conversacion viva

1. Vika conversa en lenguaje natural.
2. Cada turno visible solo debe devolver texto para el cliente.
3. Durante la conversación no se debe generar ni parsear `summaryPatch` por turno.
4. Durante la conversación no se debe intentar cerrar etapas internas por mensaje.
5. La fuente primaria durante el chat es el historial en `brief_messages`.

### 3.2 Capa B — Guia interna por prompt

1. Vika sigue una agenda interna de cobertura definida en prompt.
2. Esa agenda incluye los temas que debe cubrir en la conversación:
   - objetivo del proyecto;
   - oferta principal;
   - motivo del pedido;
   - contexto del negocio;
   - audiencia;
   - plataforma o canal;
   - entregable esperado;
   - CTA;
   - encaje comercial suficiente para propuesta.
3. Esa agenda nunca se expone al cliente como checklist técnico.
4. La conversación se guía por historial + agenda interna, no por un resumen estructurado persistido en cada turno.

### 3.3 Capa C — Procesamiento unico al cierre

1. El procesamiento estructurado ocurre solo al cierre del brief.
2. Ese cierre consume el historial completo de mensajes ya persistidos.
3. De ese procesamiento único salen:
   - el resumen estructurado final;
   - el JSON final interno para Bridge;
   - la decisión de envío a revisión.
4. Si el procesamiento final detecta huecos, no debe reabrir automáticamente un ciclo de repreguntas por turno.
5. Esos huecos deben quedar como nota interna para operador o en el JSON final, no como una nueva dependencia conversacional en caliente.

## 4. Regla principal de producto

Durante el chat, el sistema no debe intentar “estructurar mientras conversa”.

Durante el chat, el sistema solo debe:

1. guardar mensajes;
2. responder con naturalidad;
3. mantener el foco comercial usando prompt;
4. conservar una salida robusta incluso si el proveedor IA falla de forma intermitente.

La estructuración formal sucede después.

## 5. Flujo exacto esperado

### 5.1 Envio de mensaje del cliente

Al llegar un mensaje cliente:

1. se persiste en `brief_messages`;
2. se llama a IA una sola vez para producir la respuesta visible de Vika;
3. se persiste esa respuesta visible;
4. no se actualiza `StructuredBriefSummary` en ese turno;
5. no se genera JSON final en ese turno.

### 5.2 Cierre del brief

El cierre debe apoyarse en el mecanismo ya existente de envío a revisión del brief, sin agregar una experiencia nueva obligatoria.

Al cerrar:

1. se toma el historial completo del brief;
2. se ejecuta una sola llamada de procesamiento estructurado;
3. se genera el `StructuredBriefSummary` final;
4. se genera el JSON final interno;
5. se persiste el resultado;
6. se envía el brief a revisión.

### 5.3 Si el procesamiento final encuentra faltantes

1. no se reabre automáticamente el chat con nuevas repreguntas técnicas;
2. no se vuelve al esquema de procesar cada turno;
3. el sistema persiste una nota interna de faltantes para revisión humana o seguimiento posterior.

## 6. Datos existentes a reutilizar

1. `brief_messages` como fuente primaria.
2. `generateBriefFinalJson(...)` como base del procesamiento final.
3. `submitBriefForOperatorReview(...)` como mecanismo de cierre operativo.
4. `operatorReviewNote` como destino válido para persistir el JSON final o faltantes internos.
5. UI actual del portal cliente y estado `pending_operator_review`.

## 7. Datos faltantes a crear o redefinir

1. un contrato de turno visible que devuelva solo texto natural para cliente;
2. un prompt de Vika guiado por agenda interna de cobertura y por historial, no por `summaryPatch` por turno;
3. un procesador único al cierre que convierta conversación completa en resumen estructurado final;
4. una política clara para faltantes finales: nota interna, no repregunta automática.

## 8. Archivos exactos a modificar

1. `Bridge/lib/briefing-assistant-ai.ts` — MODIFICAR
2. `Bridge/app/cliente/brief/[projectId]/actions.ts` — MODIFICAR
3. `Bridge/components/client-brief-chat.tsx` — MODIFICAR
4. `Bridge/lib/briefing.ts` — MODIFICAR
5. `Bridge/lib/briefing.test.ts` — MODIFICAR

Maximo permitido: 5 archivos.

## 9. Cambio exacto esperado por archivo

### 9.1 `Bridge/lib/briefing-assistant-ai.ts`

1. `generateBriefChatReply(...)` debe devolver solo conversación visible.
2. Debe dejar de pedir o retornar `summaryPatch` por turno.
3. El prompt debe apoyarse en historial + agenda interna de cobertura.
4. Debe existir una función separada para procesar el brief al cierre usando el historial completo.

### 9.2 `Bridge/app/cliente/brief/[projectId]/actions.ts`

1. `sendClientMessageAction(...)` debe dejar de actualizar summary por turno.
2. Debe persistir mensaje cliente + respuesta visible y nada más.
3. `submitBriefAction(...)` debe concentrar el procesamiento estructurado único al cierre.
4. El cierre debe persistir JSON final y resumen final antes de enviar a revisión.

### 9.3 `Bridge/components/client-brief-chat.tsx`

1. Debe eliminar copy que prometa estructuración continua en segundo plano si eso deja de ser cierto.
2. Debe mantener una experiencia de chat simple, directa y enfocada en conversación.
3. Puede seguir ocultando la conversación una vez que el brief entre a revisión.

### 9.4 `Bridge/lib/briefing.ts`

1. Debe exponer helpers mínimos para persistir el resultado final del procesamiento único, si hacen falta.
2. No debe seguir siendo requisito para inferir estructura por turno.

### 9.5 `Bridge/lib/briefing.test.ts`

1. Debe cubrir que el turno visible ya no depende de `summaryPatch` por mensaje.
2. Debe cubrir que el procesamiento estructurado ocurre al cierre.
3. Debe cubrir que un fallo del procesador final no rompe la conversación previa ya guardada.

## 10. Restricciones de alcance

1. No cambiar schema ni crear migraciones.
2. No agregar dependencias nuevas.
3. No cambiar rutas del portal cliente.
4. No introducir un segundo flujo de repreguntas automáticas post-cierre.
5. Si para completar el slice hace falta tocar más de 5 archivos, devolver `BLOQUEO DE CONTEXTO`.

## 11. Validacion minima obligatoria

1. `cd Bridge && npm run build`

## 12. Criterios de aceptacion verificables

1. Cada mensaje del cliente produce como máximo una llamada IA visible por turno, no una conversación + estructuración por turno.
2. El chat cliente sigue funcionando aunque falle la estructuración final, porque esa estructuración ya no ocurre en caliente.
3. El historial completo del brief queda persistido como fuente primaria.
4. El resumen estructurado y el JSON final se generan solo al cierre del brief.
5. El cliente no ve labels internos ni checklist técnicos durante la conversación.
6. El build queda limpio.

## 13. Contrato de ejecucion para Sofia

**Archivo ancla inicial:** `Bridge/app/cliente/brief/[projectId]/actions.ts`

**Datos existentes a reutilizar:**
1. `brief_messages`
2. `generateBriefFinalJson(...)`
3. `submitBriefForOperatorReview(...)`
4. `operatorReviewNote`

**Datos faltantes a crear o redefinir:**
1. contrato de respuesta visible pura por turno;
2. agenda interna de cobertura vía prompt;
3. procesamiento estructurado único al cierre;
4. nota interna de faltantes sin repregunta automática.

**Archivos exactos a tocar:**
1. `Bridge/lib/briefing-assistant-ai.ts`
2. `Bridge/app/cliente/brief/[projectId]/actions.ts`
3. `Bridge/components/client-brief-chat.tsx`
4. `Bridge/lib/briefing.ts`
5. `Bridge/lib/briefing.test.ts`

**Validacion exacta esperada:**
1. `cd Bridge && npm run build`

**Condicion de detencion si falta contexto:**
1. Si requiere más de 5 archivos, devolver `BLOQUEO DE CONTEXTO`.
2. Si requiere schema nuevo o migración, devolver `BLOQUEO DE CONTEXTO`.

## 14. Definicion de terminado

Slice terminado cuando el brief cliente opere como conversación guiada por prompt, con persistencia exclusiva de mensajes durante el chat y con un único procesamiento estructurado al cierre, sin extracción estructural mensaje por mensaje ni repreguntas automáticas adicionales post-cierre.
