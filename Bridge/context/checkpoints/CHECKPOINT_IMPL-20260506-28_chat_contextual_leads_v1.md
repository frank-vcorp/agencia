# Checkpoint — IMPL-20260506-28

**ID de intervención:** IMPL-20260506-28  
**Fecha:** 2026-05-06  
**Agente:** SOFIA - Builder  
**SPEC de respaldo:** `context/SPECs/SPEC_ARCH-20260505-28_chat_contextual_por_entidad_v1.md`  
**Commit:** `d6a5123` en `main`

---

## Objetivo del corte

Abrir el primer chat contextual real en Bridge, anclado a una entidad primaria (`lead`), sin bandeja global y sin IA automática. El chat nace como capacidad por entidad, con trazabilidad de actor y timestamps.

---

## Cambios implementados

### 1. Migración SQL — `conversation_threads` + `conversation_messages`

**Archivo:** `supabase/migrations/20260506050000_conversation_threads_v1.sql`

- Tabla `conversation_threads`: clave única `(tenant_id, entity_type, entity_id)` — asegura que una conversación pertenece a una sola entidad primaria.
- Tabla `conversation_messages`: referencia obligatoria a `thread_id` — los mensajes no pueden existir sin thread.
- `entity_type` restringido a `('lead', 'brief', 'quotation', 'asset')`.
- `actor_role` restringido a `('operator', 'designer', 'client', 'agent')`.
- **RLS:**  
  - Lectura pública para tenant activo (patrón idéntico al CRM).  
  - Escritura restringida a `service_role` (server-side via SUPABASE_SERVICE_ROLE_KEY).
- Migración aplicada en remoto: `supabase db push --linked --include-all`.

### 2. Módulo `lib/chat.ts`

**Nuevo archivo, desacoplado del dominio briefing.**

- Constantes: `ENTITY_TYPES`, `ACTOR_ROLES`.
- Tipos: `ConversationThread`, `ConversationMessage`, `LeadChat`, `EntityType`, `ActorRole`.
- Funciones puras (testeables):
  - `isValidEntityType(value)` — type guard.
  - `isValidActorRole(value)` — type guard.
  - `actorRoleLabel(role)` — etiqueta en español.
  - `formatMessageTimestamp(isoString)` — locale `es-MX`.
- Funciones de persistencia (patrón `postgrest()` idéntico a `crm.ts`):
  - `getThreadForEntity(tenantId, entityType, entityId)` — lectura, null si no existe.
  - `getMessagesByThread(threadId)` — ordenados `created_at asc`.
  - `getOrCreateThread(tenantId, entityType, entityId)` — crea si no existe.
  - `appendMessage(input)` — escribe vía `service_role`.
  - `getLeadChat(leadId)` — interface pública: thread + mensajes para un lead.
  - `appendLeadMessage(leadId, tenantId, messageText)` — publica mensaje como `operator`.

### 3. Tests — `lib/chat.test.ts`

**28 tests nuevos. 112 tests totales pasan.**

- `chat — constantes de dominio`: 4 tipos de entidad, 4 roles de actor.
- `chat — isValidEntityType`: acepta válidos, rechaza inválidos y edge cases.
- `chat — isValidActorRole`: ídem para roles.
- `chat — actorRoleLabel`: mapeo completo operator/designer/client/agent.
- `chat — formatMessageTimestamp`: string no vacío con dígitos de hora.

### 4. Integración en `/crm` — `app/crm/page.tsx`

- Carga paralela de chats por lead en `chatsByLeadId` (via `Promise.all`).
- Server action `addLeadChatMessageAction` — pasa leadId + tenantId + messageText a `appendLeadMessage`.
- Panel de chat contextual en cada tarjeta de lead:
  - **Resumen contextual** (nombre del lead, estado, servicio, cliente vinculado) encima del hilo.
  - **Vacío honesto** cuando no hay mensajes.
  - **Hilo cronológico**: rol del actor en acento, timestamp, texto del mensaje.
  - **Formulario de publicación**: campo de texto + botón "Enviar".

---

## Archivos tocados

| Archivo | Tipo de cambio |
|---------|---------------|
| `supabase/migrations/20260506050000_conversation_threads_v1.sql` | Nuevo |
| `lib/chat.ts` | Nuevo |
| `lib/chat.test.ts` | Nuevo |
| `app/crm/page.tsx` | Modificado (importaciones + server action + panel UI) |

---

## Soft Gates

| Gate | Estado | Detalle |
|------|--------|---------|
| ✅ Gate 1 — Compilación | Passed | `npm run build` limpio, 13 rutas sin warnings |
| ✅ Gate 2 — Testing | Passed | 112/112 tests; 28 nuevos en `chat.test.ts` |
| ✅ Gate 3 — Revisión | Passed | Cero errores TS en archivos tocados; build verifica tipos en producción |
| ✅ Gate 4 — Documentación | Passed | JSDoc con ID en módulo; checkpoint generado; commit en español con ID |

---

## Decisiones de diseño

1. **Sin acoplamiento al dominio briefing**: `lib/chat.ts` es totalmente independiente. Reutiliza el patrón `postgrest()` sin importar de `briefing.ts`.
2. **Thread on-demand**: el thread se crea solo cuando se publica el primer mensaje (`getOrCreateThread`). La tarjeta del lead muestra el panel aunque no haya thread previo.
3. **Actor fijo "Operador" en este corte**: la SPEC indica trazabilidad de actor; en V1 el rol se resuelve como `operator` / `actorLabel: "Operador"`. La estructura ya soporta todos los roles para cortes futuros.
4. **Segunda entidad preparada pero no activada**: el módulo soporta `brief`, `quotation` y `asset` — solo falta la integración UI en sus páginas respectivas. Se prioriza `lead` bien cerrado según instrucción de la SPEC.

---

## Riesgos y observaciones

- La carga de chats es `Promise.all` sobre todos los leads — si la lista de leads crece, puede generar muchas queries en paralelo. Para el volumen actual (CRM ligero) es aceptable. Para escalar: refactorizar a un JOIN o query por batch.
- La segunda entidad operativa (`brief`) está lista a nivel de esquema y módulo. Solo requiere integrar en `app/briefs/page.tsx` siguiendo el mismo patrón.

---

## Estado en PROYECTO.md

Tarea **ARCH-20260505-28** → marcar como `[✓] Completado`.
