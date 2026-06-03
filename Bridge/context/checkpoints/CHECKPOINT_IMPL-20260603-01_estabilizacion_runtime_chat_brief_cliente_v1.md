# CHECKPOINT IMPL-20260603-01

- Fecha: 2026-06-03
- SPEC: Bridge/context/SPECs/SPEC_ARCH-20260603-01_estabilizacion_runtime_chat_brief_cliente_v1.md
- Estado: Implementacion completada en alcance (5 archivos)

## Archivos modificados
1. Bridge/lib/briefing-assistant-ai.ts
2. Bridge/app/cliente/brief/[projectId]/actions.ts
3. Bridge/lib/briefing.ts
4. Bridge/app/cliente/proyecto/[projectId]/page.tsx
5. Bridge/lib/briefing.test.ts

## Cambios aplicados
- `requestGeminiContent`: `maxOutputTokens` elevado a `8192` para branch visible y branch `application/json`.
- `generateBriefFinalJson`: `maxOutputTokens` inline elevado de `700` a `8192`.
- `generateBriefChatReply`: agregado reintento unico antes de recovery; tipo `BriefChatReply` expone `degraded: boolean`.
- `isAcceptableAssistantVisibleReply`: eliminado rechazo por `OPEN_REPLY_ENDING_PATTERN`; se conserva rechazo por `DANGLING_REPLY_ENDING_PATTERN` y `RELIABLE_VISIBLE_FINISH_REASONS`.
- `sendClientMessageAction`: si `aiReply.degraded === true`, no persiste mensaje del asistente.
- `getOrCreateBriefForProject`: agregado flujo idempotente con re-verificacion post-error de creacion.
- `ClientProjectPage`: reemplazo de `getBriefByProjectId(...) ?? createBriefForProject(...)` por `getOrCreateBriefForProject(projectId)`.
- Prueba ajustada por cambio de criterio de aceptacion visible (eliminacion de OPEN_REPLY_ENDING_PATTERN).

## Marca de agua
Se agrego comentario de respaldo con ID `IMPL-20260603-01` y ruta de la SPEC en cada archivo modificado.

## Validacion ejecutada (obligatoria)
Comando:

```bash
cd Bridge && npm run build && npm test
```

Resultado:
- `npm run build`: ✅ verde.
- `npm test`: ❌ no verde por 3 fallos existentes fuera del alcance de esta SPEC:
  - `lib/bridge-data.test.ts` → `mantiene visibles los cinco modulos P0 del shell`
  - `lib/designer-workspace.test.ts` → `tarea ready_for_review obtiene 45 puntos con prompt`
  - `lib/designer-workspace.test.ts` → `tarea ready_to_start con prompt obtiene 35 puntos`

Nota:
- El fallo originalmente introducido por la eliminacion de `OPEN_REPLY_ENDING_PATTERN` en `lib/briefing.test.ts` fue corregido y quedo en verde.
