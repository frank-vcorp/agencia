# SPEC ARCH-20260528-01

## Titulo

Papelera de reciclaje MCP: soft-delete de clients y leads, delete_client seguro, fix de brief huérfano y restore

## Estado

Planificado

## Fecha

2026-05-28

## Objetivo

Eliminar la necesidad de hacer bypass directo a Supabase para borrar clientes, leads o briefs huérfanos. Toda operación de eliminación debe poder ejecutarse desde las tools MCP de Bridge, con el mismo patrón preview/execute ya establecido para projects, assets, quotations y briefs-con-proyecto.

Agregar una papelera de reciclaje de 30 días para clients y leads, con posibilidad de restaurar antes del vencimiento.

## Problema que Resuelve

1. `bridge_delete_client` no existe — hay que ir directo a Supabase REST para borrar clientes.
2. `bridge_delete_lead` no existe — idem para leads del CRM.
3. `bridge_delete_brief` requiere `projectId` en la ruta. Un brief huérfano (sin `project_id`) no puede borrarse vía MCP.
4. Sin papelera, cualquier eliminación es irreversible. El operador no tiene red de seguridad.

## Decision Arquitectonica

### Soft-delete solo para clients, leads y briefs

Los clients y leads reciben `deleted_at TIMESTAMPTZ DEFAULT NULL`. En modo execute, la eliminación es `PATCH SET deleted_at = NOW()` — no `DELETE` físico. Los briefs reciben la misma columna para el caso huérfano; los briefs con proyecto siguen usando el hard-delete existente.

### Projects, assets, quotations: no cambian

Esas entidades ya tienen preview/execute con hard delete. No se toca su comportamiento.

### Retención: 30 días

Las entidades con `deleted_at IS NOT NULL` quedan visibles en la papelera durante 30 días. Pasado ese período, `bridge_list_trash` las marca como `purga_pendiente`. No hay purga automática en V1 — el operador la ejecuta manualmente si lo desea.

### Fix de brief huérfano

Se agrega la ruta `POST /api/v1/briefs/[id]/delete` (sin `projectId` en la ruta). Esta ruta usa `previewDeleteBriefOrphan` / `executeDeleteBriefOrphan` — funciones nuevas en `entity-delete.ts` que leen el brief por `tenant_id + brief_id` sin requerir `project_id`.

### Filtrado en queries existentes

Todas las funciones que listan o leen clients, leads y briefs deben ignorar registros con `deleted_at IS NOT NULL`. Esto se implementa agregando el filtro `deleted_at=is.null` a los `URLSearchParams` de cada query.

## Migration

Archivo: `supabase/migrations/20260528000000_soft_delete_clients_leads_briefs_v1.sql`

```sql
-- Papelera de reciclaje: soft-delete para clients, leads y briefs
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.leads   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.briefs  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Índices de papelera (para listar trash eficientemente)
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON public.clients(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_deleted_at   ON public.leads(deleted_at)   WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_briefs_deleted_at  ON public.briefs(deleted_at)  WHERE deleted_at IS NOT NULL;
```

## Archivos a Crear

| Archivo | Tipo | Descripcion |
|---------|------|-------------|
| `supabase/migrations/20260528000000_soft_delete_clients_leads_briefs_v1.sql` | Migration | Agrega columna `deleted_at` a clients, leads y briefs |
| `app/api/v1/clients/[id]/delete/route.ts` | API route | POST — soft-delete de cliente (solo si no tiene proyectos activos) |
| `app/api/v1/leads/[id]/delete/route.ts` | API route | POST — soft-delete de lead con preview/execute |
| `app/api/v1/briefs/[id]/delete/route.ts` | API route | POST — hard-delete de brief huérfano sin requerir projectId |
| `app/api/v1/trash/route.ts` | API route | GET — lista papelera: clients + leads + briefs soft-deleted del tenant |
| `app/api/v1/trash/restore/route.ts` | API route | POST `{ entityType, entityId }` — restaura entidad (deleted_at = NULL) |
| `mcp/src/tools/delete-client.ts` | MCP tool | bridge_delete_client — soft-delete de cliente con bloqueo si tiene proyectos |
| `mcp/src/tools/delete-lead.ts` | MCP tool | bridge_delete_lead — soft-delete de lead con preview/execute |
| `mcp/src/tools/list-trash.ts` | MCP tool | bridge_list_trash — lista papelera con días restantes por entidad |
| `mcp/src/tools/restore-entity.ts` | MCP tool | bridge_restore_entity — restaura desde papelera |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `lib/entity-delete.ts` | Agregar `softDeleteClient`, `executeRestoreClient`, `softDeleteLead`, `executeRestoreLead`, `previewDeleteBriefOrphan`, `executeDeleteBriefOrphan`, `listTrashItems` |
| `lib/assets.ts` | Agregar `deleted_at=is.null` a: `getClientsByTenant`, `getClientById`, `getProjectsByTenant`, `getBriefsByTenant` |
| `lib/crm.ts` | Agregar `deleted_at=is.null` a: `getLeadsByTenant`, `getLeadsForDefaultTenant`, `getLeadWorkspace` |
| `lib/client-portal.ts` | Agregar `deleted_at=is.null` a `fetchRecentLeads` |
| `mcp/src/bridge-client.ts` | Agregar `deleteClient`, `deleteLead`, `listTrash`, `restoreEntity` |
| `mcp/src/index.ts` | Registrar las 4 tools nuevas en `ListToolsRequestSchema` y `CallToolRequestSchema` |

## Contratos de Tipos Nuevos (entity-delete.ts)

```typescript
// Soft-delete result (no borra físicamente)
export type EntitySoftDeleteResult = {
  ok: true;
  mode: "preview" | "execute";
  entityType: "client" | "lead" | "brief";
  entityId: string;
  entityLabel: string;
  blockedReason?: string;       // presente si preview detecta que no se puede borrar
  deletedAt?: string;           // presente en execute
  purgesAt?: string;            // execute: deletedAt + 30 days
  confirmationText?: string;    // presente en preview
  eventId?: string;             // presente en execute
  message?: string;
};

// Trash item
export type TrashItem = {
  entityType: "client" | "lead" | "brief";
  entityId: string;
  entityLabel: string;
  deletedAt: string;
  purgesAt: string;
  daysRemaining: number;
  canRestore: boolean;          // true si daysRemaining > 0
};

export type ListTrashResult = {
  ok: true;
  items: TrashItem[];
  total: number;
};

// Restore
export type RestoreEntityResult = {
  ok: true;
  entityType: string;
  entityId: string;
  entityLabel: string;
  restoredAt: string;
  message: string;
};
```

## Contrato de bridge_delete_client

```
Inputs requeridos: clientId, mode, requestedByLabel, approvedByLabel, reason
Inputs opcionales en execute: confirmationText

Preview:
- Si el cliente tiene proyectos (status != archived): ok=true con blockedReason="client_has_active_projects", lista de proyectos
- Si no tiene proyectos: ok=true, confirmationText=`MOVER A PAPELERA [NOMBRE CLIENTE]`

Execute:
- Solo si confirmationText coincide
- PATCH clients SET deleted_at = NOW() WHERE id = ? AND tenant_id = ?
- Registrar en entity_delete_events con mode="soft_delete"
- Retornar purgesAt = deletedAt + 30 días
```

## Contrato de bridge_delete_lead

```
Inputs requeridos: leadId, mode, requestedByLabel, approvedByLabel, reason
Inputs opcionales en execute: confirmationText

Preview: muestra nombre, canal, estado, confirmationText=`MOVER A PAPELERA [NOMBRE LEAD]`
Execute: PATCH leads SET deleted_at = NOW() WHERE id = ? AND tenant_id = ?
```

## Contrato de bridge_list_trash

```
Sin inputs. Lee:
  clients WHERE deleted_at IS NOT NULL AND tenant_id = ?
  leads   WHERE deleted_at IS NOT NULL AND tenant_id = ?
  briefs  WHERE deleted_at IS NOT NULL AND tenant_id = ? (solo los que fueron soft-deleted)

Para cada item calcula daysRemaining = 30 - daysSince(deleted_at).
Si daysRemaining <= 0: canRestore = false, indica que está listo para purga permanente.
```

## Contrato de bridge_restore_entity

```
Inputs requeridos: entityType ("client" | "lead" | "brief"), entityId

Valida que deleted_at IS NOT NULL y que daysRemaining > 0.
Si canRestore = false: retorna error "retention_period_expired".
Si ok: PATCH [tabla] SET deleted_at = NULL WHERE id = ? AND tenant_id = ?
```

## Fix bridge_delete_brief para briefs huérfanos

La ruta actual `/api/v1/projects/[id]/brief/[briefId]/delete` no permite briefs sin `project_id`. 

Se agrega la ruta nueva `POST /api/v1/briefs/[id]/delete` que:
1. Lee el brief por `tenant_id + brief_id` sin verificar `project_id`
2. Si tiene `project_id`, llama a `previewDeleteBrief` / `executeDeleteBrief` existentes
3. Si es huérfano (`project_id IS NULL`), llama a `previewDeleteBriefOrphan` / `executeDeleteBriefOrphan` nuevas
4. El tool `bridge_delete_brief` sigue teniendo `projectId` como input pero ahora es **opcional**. Si no se provee, usa la ruta nueva.

## Criterios de Aceptacion

1. `bridge_delete_client` en mode=preview retorna `blocked` con lista de proyectos si el cliente tiene proyectos activos.
2. `bridge_delete_client` en mode=execute hace PATCH (no DELETE) sobre `clients` y registra en `entity_delete_events`.
3. `bridge_delete_lead` preview/execute funciona con el mismo patrón.
4. `bridge_delete_brief` funciona sin `projectId` cuando el brief es huérfano.
5. `bridge_list_trash` lista las 3 entidades soft-deleted con `daysRemaining` correcto.
6. `bridge_restore_entity` restaura correctamente; si el período expiró retorna error.
7. `getClientsByTenant`, `getLeadsByTenant`, `getBriefsByTenant` no retornan entidades con `deleted_at IS NOT NULL`.
8. `npm run build` en `/Bridge` y `/Bridge/mcp` sin errores.
9. Tests nuevos cubren: softDeleteClient (blocked + ok), softDeleteLead, listTrash, restoreEntity, filter queries.

## Fuera de Alcance

1. Purga automática programada (cron job o edge function) — queda para SPEC posterior si se necesita.
2. Soft-delete de projects, assets, quotations — mantienen hard delete.
3. UI de papelera en `/operador` — este corte es MCP-only.

## Contrato de Ejecucion para Sofia

**Archivo ancla inicial:** `Bridge/lib/entity-delete.ts`

**Datos existentes a reutilizar:**
- Patrón `previewDelete* / executeDelete*` ya implementado en `lib/entity-delete.ts`
- Helper `postgrest<T>()` en `lib/entity-delete.ts`
- Helper `getTenantId()` en `lib/entity-delete.ts`
- Tabla `entity_delete_events` (migración `20260526000000_entity_delete_events_v1.sql`) para auditoría
- `mcp/src/bridge-client.ts` como punto de entrada para calls HTTP al API
- Todas las rutas delete existentes como modelo (`app/api/v1/projects/[id]/delete/route.ts`)
- `resolveApiV1RequestContext` en `lib/api-v1-context.ts` para todas las rutas nuevas

**Datos a crear:**
- Columna `deleted_at TIMESTAMPTZ DEFAULT NULL` en `clients`, `leads`, `briefs` — vía migration nueva
- Funciones `softDeleteClient`, `softDeleteLead`, `previewDeleteBriefOrphan`, `executeDeleteBriefOrphan`, `restoreEntity`, `listTrashItems` en `lib/entity-delete.ts`
- 5 rutas API nuevas (ver tabla arriba)
- 4 tools MCP nuevas (ver tabla arriba)
- 4 métodos nuevos en `mcp/src/bridge-client.ts`

**Archivos exactos a crear o modificar:** 16 archivos (10 nuevos + 6 modificados, ver tablas arriba)

**Maximo de archivos:** 16

**Orden de implementacion:**
1. Migration SQL
2. Funciones en `lib/entity-delete.ts`
3. Filtros en `lib/assets.ts`, `lib/crm.ts`, `lib/client-portal.ts`
4. Rutas API
5. Métodos en `mcp/src/bridge-client.ts`
6. Tools MCP (`delete-client.ts`, `delete-lead.ts`, `list-trash.ts`, `restore-entity.ts`)
7. Registro en `mcp/src/index.ts`
8. Tests

**Validacion esperada:**
```bash
cd Bridge && npm run build      # 0 errores TypeScript
cd Bridge && npm test           # todos los tests pasan, incluyendo los nuevos
cd Bridge/mcp && npm run build  # 0 errores
```

**Condicion de detencion:** Si la columna `deleted_at` no existe en `clients` o `leads` al momento de modificar los queries, detener e informar que la migración debe aplicarse primero con `supabase db push --project-ref vrboviomvfizqnsvhlew`.
