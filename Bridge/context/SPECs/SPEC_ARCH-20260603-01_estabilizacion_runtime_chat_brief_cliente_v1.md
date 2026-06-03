# SPEC ARCH-20260603-01: Estabilizacion del runtime del chat brief cliente — V1

**ID:** ARCH-20260603-01
**Agente autor:** INTEGRA - Arquitecto
**Fecha:** 2026-06-03
**Estado:** Autorizada — lista para SOFIA
**Prioridad:** Alta
**Issue Jira:** SIN-ISSUE
**Respaldo de diagnostico:** Investigacion de runtime realizada por Integra sobre el brief `7d56fb24-e794-4782-80de-1adf7e458a17`.

---

## 1. Objetivo unico y medible

Estabilizar el chat del brief cliente para que deje de interrumpir turnos y de perder contexto, conservando el "thinking" natural de Gemini. Al terminar:

1. El chat deja de devolver el mensaje "Se interrumpio este turno..." en conversaciones normales de mas de 3 mensajes.
2. El historial deja de contaminarse con respuestas de recuperacion.
3. La pantalla del proyecto deja de crear briefs nuevos vacios cuando ya existe uno.

## 2. Problema exacto que resuelve

### 2.1 Interrupcion de turno por agotamiento de tokens
`gemini-2.5-flash` tiene "thinking" activado por defecto y esos tokens cuentan contra `maxOutputTokens`. Hoy ese tope esta fijado por nosotros en 1024 para el chat visible (y 700 para el JSON de cierre). Cuando crece el historial, el thinking agota el presupuesto, `finishReason` regresa `MAX_TOKENS` con texto vacio o truncado, el gate de aceptacion lo rechaza y el runtime degrada al recovery reply.

### 2.2 Contaminacion del historial
El recovery reply se persiste como mensaje del asistente, entra al historial de los turnos siguientes y degrada la conversacion (sensacion de "repite las mismas preguntas").

### 2.3 Posible perdida de contexto por creacion no idempotente
`createBriefForProject` siempre hace INSERT de un brief+version nuevos sin verificar si ya existe. Se invoca desde el render del proyecto con el patron `getBriefByProjectId(...) ?? createBriefForProject(...)`. Ante una condicion de carrera o una lectura que no retorna el brief existente, se crea un brief nuevo vacio que, por orden `updated_at.desc`, pasa a ser el activo y borra el hilo previo.

## 3. Decision arquitectonica cerrada

1. **Thinking natural, sin estrangular la salida visible.** No se agrega `thinkingConfig`. Se eleva `maxOutputTokens` a un valor generoso (`8192`) en todas las llamadas a Gemini del brief, de modo que el thinking corra libre y el texto visible nunca compita por presupuesto. No se paga por tokens no producidos, solo se sube el techo.
2. **Reintento unico antes de degradar.** `generateBriefChatReply` intenta una segunda vez antes de devolver el recovery reply.
3. **No persistir el recovery reply.** Si el turno degrada al recovery reply, no se escribe como mensaje del asistente en el historial.
4. **Creacion idempotente del brief.** Se introduce `getOrCreateBriefForProject` que reverifica antes y despues de crear, eliminando el `??` directo del render.
5. **Relajacion del gate de truncado.** Se elimina el rechazo por `OPEN_REPLY_ENDING_PATTERN` (pensado para detectar truncados que ya no ocurriran con presupuesto amplio) y se conserva `DANGLING_REPLY_ENDING_PATTERN` y el chequeo de `finishReason`.

## 4. Datos existentes a reutilizar

1. `requestGeminiContent(...)` en `Bridge/lib/briefing-assistant-ai.ts`.
2. `generateBriefChatReply(...)` y `generateBriefFinalJson(...)` en el mismo archivo.
3. `isAcceptableAssistantVisibleReply(...)` y `BRIEF_CHAT_RECOVERY_REPLY`.
4. `getBriefByProjectId(...)` y `createBriefForProject(...)` en `Bridge/lib/briefing.ts`.
5. Pruebas existentes en `Bridge/lib/briefing.test.ts`.

## 5. Datos faltantes a crear

1. `getOrCreateBriefForProject(projectId, tenantSlug?)` en `Bridge/lib/briefing.ts`.
2. Logica de reintento unico dentro de `generateBriefChatReply`.
3. Bandera de retorno o deteccion en la action para no persistir el recovery reply.

## 6. Archivos exactos a modificar (maximo 5)

1. `Bridge/lib/briefing-assistant-ai.ts`
2. `Bridge/app/cliente/brief/[projectId]/actions.ts`
3. `Bridge/lib/briefing.ts`
4. `Bridge/app/cliente/proyecto/[projectId]/page.tsx`
5. `Bridge/lib/briefing.test.ts` (solo si hace falta ajustar/expandir pruebas)

## 7. Cambio exacto esperado por archivo

### 7.1 `Bridge/lib/briefing-assistant-ai.ts`
1. En `requestGeminiContent`: elevar `maxOutputTokens` a `8192` para el chat visible. Para el branch `application/json` usar tambien un presupuesto generoso (`8192`). No agregar `thinkingConfig`.
2. En la llamada inline de `generateBriefFinalJson`: elevar `maxOutputTokens` de `700` a `8192`.
3. En `generateBriefChatReply`: si el primer intento lanza o produce respuesta no aceptable, reintentar una vez la llamada a Gemini antes de devolver `BRIEF_CHAT_RECOVERY_REPLY`. Marcar de algun modo verificable (p. ej. exponer una bandera `degraded: boolean` en `BriefChatReply`) que el turno degrado al recovery reply.
4. En `isAcceptableAssistantVisibleReply`: eliminar el rechazo por `OPEN_REPLY_ENDING_PATTERN`. Conservar `DANGLING_REPLY_ENDING_PATTERN` y `RELIABLE_VISIBLE_FINISH_REASONS`.

### 7.2 `Bridge/app/cliente/brief/[projectId]/actions.ts`
1. En `sendClientMessageAction`: si `aiReply` indica que degrado al recovery reply (bandera `degraded`), NO persistir el mensaje del asistente. El mensaje del cliente si se persiste siempre.

### 7.3 `Bridge/lib/briefing.ts`
1. Crear `getOrCreateBriefForProject(projectId, tenantSlug = supabaseEnv.defaultTenant): Promise<BriefRecord>` que:
   - lea con `getBriefByProjectId`;
   - si existe, lo retorne;
   - si no existe, intente `createBriefForProject`; ante error, reverifique con `getBriefByProjectId` y retorne el existente si aparecio (proteccion ante carrera);
   - si sigue sin existir, propague el error.

### 7.4 `Bridge/app/cliente/proyecto/[projectId]/page.tsx`
1. Reemplazar `getBriefByProjectId(projectId) ?? createBriefForProject(projectId)` por `getOrCreateBriefForProject(projectId)`.

### 7.5 `Bridge/lib/briefing.test.ts`
1. Ajustar pruebas afectadas por la eliminacion de `OPEN_REPLY_ENDING_PATTERN` si existieran.
2. Mantener verde el resto de la suite.

## 8. Restricciones de alcance

1. Maximo 5 archivos.
2. No migrar base de datos. La constraint unica `(tenant_id, project_id)` en `briefs` queda como recomendacion de hardening posterior, fuera de este slice.
3. No rediseniar prompts ni el flujo de etapas.
4. No tocar componentes visuales del chat salvo que sea estrictamente necesario para compilar.
5. No cambiar el contrato del JSON final de cierre.

## 9. Validacion minima obligatoria

```bash
cd Bridge && npm run build && npm test
```

Ambos deben terminar en verde.

## 10. Criterios de aceptacion verificables

1. `npm run build` compila sin errores.
2. `npm test` pasa completo.
3. `requestGeminiContent` y `generateBriefFinalJson` ya no usan topes de 1024/700; usan `8192`.
4. Existe reintento unico en `generateBriefChatReply` y bandera de degradado en `BriefChatReply`.
5. `sendClientMessageAction` no persiste el recovery reply cuando el turno degrada.
6. Existe `getOrCreateBriefForProject` y la pagina del proyecto la consume en lugar del `??`.
7. `OPEN_REPLY_ENDING_PATTERN` ya no rechaza respuestas en `isAcceptableAssistantVisibleReply`.

## 11. Contrato de ejecucion para Sofia

**Archivo ancla inicial:** `Bridge/lib/briefing-assistant-ai.ts` (leer `requestGeminiContent`, `generateBriefChatReply`, `isAcceptableAssistantVisibleReply`, `generateBriefFinalJson`).

**Datos existentes a reutilizar:** los listados en seccion 4.

**Datos faltantes a crear:** los listados en seccion 5.

**Archivos exactos a tocar:** los de seccion 6 (maximo 5).

**Validacion exacta esperada:** `cd Bridge && npm run build && npm test` en verde.

## 12. Definicion de terminado

Slice terminado cuando el chat brief cliente conserve thinking natural, deje de interrumpir turnos por agotamiento de tokens, no contamine el historial con el recovery reply, no cree briefs duplicados desde el render, y mantenga build y tests en verde sin exceder 5 archivos.
