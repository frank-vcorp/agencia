# SPEC ARCH-20260529-05: Hardening de respuesta truncada en chat brief cliente — V1

**ID:** ARCH-20260529-05  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-29  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Issue Jira:** SIN-ISSUE  
**Respaldo:** `Bridge/context/SPECs/SPEC_ARCH-20260529-03_brief_cliente_chat_separado_y_json_post_cierre_v1.md`

---

## 1. Objetivo unico y medible

Evitar que el chat cliente persista y muestre respuestas incompletas o truncadas de Vika, especialmente salidas que terminan a media frase como `Entendido. Para entender mejor`.

## 2. Problema exacto que resuelve

Hoy el runtime del chat acepta la primera salida visible de Gemini si no esta vacia y no contiene fugas tecnicas. Eso deja pasar respuestas semanticamente incompletas cuando el modelo corta por longitud, finishReason o salida parcial. El resultado visible degrada la experiencia y hace parecer que el chat esta roto aunque la UI renderice correctamente.

## 3. Raiz tecnica confirmada

La raiz del problema esta en `Bridge/lib/briefing-assistant-ai.ts`:

1. `generateBriefChatReply(...)` acepta el primer `candidateText` como valido si `sanitizeAssistantReply(...)` no lo vacia.
2. No se evalua `finishReason` del candidato de Gemini.
3. No existe una validacion de completitud semantica antes de persistir la respuesta.
4. `maxOutputTokens` esta acotado y puede empeorar cortes prematuros.

El frontend no es la causa primaria del corte visible.

## 4. Decision arquitectonica cerrada

La correccion debe hacerse en el runtime del brief cliente, no en el componente visual.

1. La respuesta visible del modelo solo se acepta si pasa validacion de seguridad tecnica y validacion de completitud minima.
2. Si Gemini devuelve una salida incompleta, truncada o cerrada por una razon no segura, el sistema debe caer a fallback natural en vez de mostrar el texto roto.
3. El hardening debe ser deterministico y testeado.
4. El ajuste no debe cambiar el contrato de persistencia ni el flujo general del brief.

## 5. Datos existentes a reutilizar

1. `generateBriefChatReply(...)` en `Bridge/lib/briefing-assistant-ai.ts`.
2. `sanitizeAssistantReply(...)` en `Bridge/lib/briefing-assistant-ai.ts`.
3. `buildBriefChatFallbackReply(...)` en `Bridge/lib/briefing-assistant-ai.ts`.
4. Suite de `Bridge/lib/briefing.test.ts`.

## 6. Datos faltantes a crear

### 6.1 Contrato de respuesta Gemini endurecido

Extender el tipado local de la respuesta Gemini para contemplar `finishReason` en cada candidato.

### 6.2 Validador de completitud visible

Crear una validacion explicita para decidir si una respuesta visible es aceptable. Debe rechazar como minimo:

1. texto vacio luego de sanitizar;
2. texto claramente truncado a media idea;
3. respuestas que terminan en conectores abiertos o frases incompletas como `para entender mejor`, `para seguir`, `necesito entender`, `ahora necesito`, `con esto`, cuando no cierran una idea;
4. respuestas cuyo `finishReason` indique corte no confiable para mostrarse como respuesta final.

### 6.3 Politica de degradacion segura

Si la respuesta del modelo falla la validacion anterior:

1. no se persiste el texto truncado;
2. se usa `buildBriefChatFallbackReply(...)` como salida visible;
3. el flujo mantiene continuidad sin romper la experiencia.

### 6.4 Ajuste prudente de longitud

Se puede aumentar moderadamente `maxOutputTokens` solo si ayuda a reducir cortes sin cambiar el estilo de respuesta. El ajuste debe ser conservador y respaldado por tests.

## 7. Archivos exactos a modificar

1. `Bridge/lib/briefing-assistant-ai.ts` — MODIFICAR
2. `Bridge/lib/briefing.test.ts` — MODIFICAR

Maximo permitido: 2 archivos.

## 8. Cambio exacto esperado

1. El sistema no debe mostrar respuestas parciales o a media frase provenientes de Gemini.
2. Si Gemini devuelve una salida incompleta, el usuario debe ver un fallback natural completo.
3. El hardening debe quedar cubierto por pruebas unitarias especificas.
4. El comportamiento actual valido no debe degradarse para respuestas completas.

## 9. Restricciones de alcance

1. No tocar `Bridge/components/client-brief-chat.tsx`.
2. No tocar `Bridge/app/cliente/brief/[projectId]/actions.ts` salvo bloqueo real de implementacion.
3. No cambiar schema ni persistencia.
4. No introducir dependencias nuevas.

## 10. Validacion minima obligatoria

1. `cd Bridge && npm run build`

## 11. Criterios de aceptacion verificables

1. Una respuesta tipo `Entendido. Para entender mejor` no se muestra al cliente; se reemplaza por fallback natural.
2. Una respuesta completa y natural de Gemini sigue mostrandose normalmente.
3. La suite de tests cubre al menos:
   - rechazo por `finishReason` no confiable;
   - rechazo por frase semanticamente incompleta;
   - aceptacion de respuesta natural completa.
4. La compilacion sigue limpia.

## 12. Contrato de ejecucion para Sofia

**Archivo ancla inicial:** `Bridge/lib/briefing-assistant-ai.ts`

**Datos existentes a reutilizar:**
1. `generateBriefChatReply(...)`
2. `sanitizeAssistantReply(...)`
3. `buildBriefChatFallbackReply(...)`

**Datos faltantes a crear:**
1. lectura de `finishReason`;
2. helper de completitud de respuesta visible;
3. cobertura unitaria para respuesta truncada.

**Archivos exactos a tocar:**
1. `Bridge/lib/briefing-assistant-ai.ts`
2. `Bridge/lib/briefing.test.ts`

**Validacion exacta esperada:**
1. `cd Bridge && npm run build`

**Condicion de detencion si falta contexto:**
1. Si requiere tocar mas de 2 archivos, devolver `BLOQUEO DE CONTEXTO`.
2. Si requiere cambiar flujo de persistencia o schema, devolver `BLOQUEO DE CONTEXTO`.

## 13. Definicion de terminado

Slice terminado cuando el chat cliente deje de mostrar respuestas truncadas de Vika, degrade de forma segura a fallback natural cuando Gemini no cierre bien una respuesta y mantenga build limpio con tests actualizados.