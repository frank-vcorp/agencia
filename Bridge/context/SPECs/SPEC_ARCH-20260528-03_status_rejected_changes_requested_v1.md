# SPEC: Estados faltantes — `rejected` en cotizaciones y `changes_requested` en activos

**ID:** ARCH-20260528-03  
**Proyecto:** Bridge  
**Fecha:** 2026-05-28  
**Estado:** Listo para implementación  
**Autor:** Integra - Arquitecto

---

## Objetivo

Agregar dos estados faltantes que cierran los huecos detectados en el flujo operativo de Bridge:

1. `"rejected"` en `QuotationStatus` — cotización rechazada por el cliente → permite renegociar o cerrar el proyecto.
2. `"changes_requested"` en `AssetStatus` — activo en revisión con cambios solicitados → vuelve al diseñador sin perder el histórico.

---

## Contexto técnico (estado actual)

### QuotationStatus — `Bridge/lib/quotations.ts` línea 10
```ts
export type QuotationStatus = "draft" | "sent" | "approved" | "invoiced" | "paid";
// ❌ Falta: "rejected"
```
Labels en `quotationStatusLabels` línea 87 — objeto con 5 keys.

CHECK constraint en DB (`20260506000000_quotations_versionadas_v1.sql` línea 13):
```sql
check (status in ('draft', 'sent', 'approved', 'invoiced', 'paid'))
```

MCP tool `Bridge/mcp/src/tools/update-quotation-status.ts` línea 14 — enum en inputSchema:
```ts
enum: ["draft", "sent", "approved", "invoiced", "paid"]
```

### AssetStatus — `Bridge/lib/assets.ts` línea 125
```ts
export type AssetStatus = "draft" | "in_progress" | "in_review" | "approved" | "delivered" | "archived";
// ❌ Falta: "changes_requested"
```
Labels en `assetStatusLabels` línea 232 — objeto con 6 keys.

CHECK constraint en DB (`20260506020000_assets_and_prompt_versions_v1.sql` línea 22):
```sql
check (status in ('draft', 'in_progress', 'in_review', 'approved', 'delivered', 'archived'))
```

MCP tool `Bridge/mcp/src/tools/update-asset.ts` línea 15 — enum en inputSchema:
```ts
enum: ["draft", "in_progress", "in_review", "approved", "delivered", "archived"]
```

---

## Archivos a crear o modificar

| # | Archivo | Operación |
|---|---------|-----------|
| 1 | `supabase/migrations/20260528020000_status_rejected_changes_requested_v1.sql` | **CREAR** |
| 2 | `lib/quotations.ts` | Modificar líneas 10 y 87-93 |
| 3 | `lib/assets.ts` | Modificar líneas 125 y 232-241 |
| 4 | `mcp/src/tools/update-quotation-status.ts` | Modificar línea 14 (enum) |
| 5 | `mcp/src/tools/update-asset.ts` | Modificar línea 15 (enum) |

**Total: 5 archivos. Máximo permitido: 7.**

---

## Implementación exacta

### Archivo 1 — Migración SQL (CREAR)

Ruta: `Bridge/supabase/migrations/20260528020000_status_rejected_changes_requested_v1.sql`

```sql
/**
 * ARCH-20260528-03
 * Agrega estados faltantes detectados en revisión del flujo operativo:
 * - 'rejected' en quotations.status → cotización rechazada por el cliente
 * - 'changes_requested' en assets.status → activo con cambios solicitados por el cliente
 */

-- Ampliar constraint de estado en cotizaciones
alter table public.quotations
  drop constraint if exists quotations_status_check;

alter table public.quotations
  add constraint quotations_status_check
  check (status in ('draft', 'sent', 'approved', 'invoiced', 'paid', 'rejected'));

-- Ampliar constraint de estado en activos
alter table public.assets
  drop constraint if exists assets_status_check;

alter table public.assets
  add constraint assets_status_check
  check (status in ('draft', 'in_progress', 'in_review', 'approved', 'delivered', 'archived', 'changes_requested'));
```

> **Nota sobre nombres de constraint:** Postgres nombra automáticamente las CHECK constraints como `{tabla}_{columna}_check`. Confirmar nombre real con `\d public.quotations` si falla el DROP. Si el nombre difiere, usar `drop constraint if exists` con el nombre real que devuelva la DB.

### Archivo 2 — `lib/quotations.ts`

**Cambio 1 — tipo `QuotationStatus` (línea 10):**
```ts
// ANTES:
export type QuotationStatus = "draft" | "sent" | "approved" | "invoiced" | "paid";

// DESPUÉS:
export type QuotationStatus = "draft" | "sent" | "approved" | "invoiced" | "paid" | "rejected";
```

**Cambio 2 — objeto `quotationStatusLabels` (línea 87-93):**
```ts
// ANTES:
export const quotationStatusLabels: Record<QuotationStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  approved: "Aprobada",
  invoiced: "Facturada",
  paid: "Pagada"
};

// DESPUÉS:
export const quotationStatusLabels: Record<QuotationStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  approved: "Aprobada",
  invoiced: "Facturada",
  paid: "Pagada",
  rejected: "Rechazada"
};
```

### Archivo 3 — `lib/assets.ts`

**Cambio 1 — tipo `AssetStatus` (línea 125):**
```ts
// ANTES:
export type AssetStatus = "draft" | "in_progress" | "in_review" | "approved" | "delivered" | "archived";

// DESPUÉS:
export type AssetStatus = "draft" | "in_progress" | "in_review" | "approved" | "delivered" | "archived" | "changes_requested";
```

**Cambio 2 — objeto `assetStatusLabels` (línea 232-241):**
```ts
// ANTES:
export const assetStatusLabels: Record<AssetStatus, string> = {
  draft: "Borrador",
  in_progress: "En progreso",
  in_review: "En revisión",
  approved: "Aprobado",
  delivered: "Entregado",
  archived: "Archivado"
};

// DESPUÉS:
export const assetStatusLabels: Record<AssetStatus, string> = {
  draft: "Borrador",
  in_progress: "En progreso",
  in_review: "En revisión",
  approved: "Aprobado",
  delivered: "Entregado",
  archived: "Archivado",
  changes_requested: "Cambios solicitados"
};
```

### Archivo 4 — `mcp/src/tools/update-quotation-status.ts`

**Cambio — enum en inputSchema (línea 14):**
```ts
// ANTES:
status: { type: "string", enum: ["draft", "sent", "approved", "invoiced", "paid"] },

// DESPUÉS:
status: { type: "string", enum: ["draft", "sent", "approved", "invoiced", "paid", "rejected"] },
```

### Archivo 5 — `mcp/src/tools/update-asset.ts`

**Cambio — enum en inputSchema (línea 15):**
```ts
// ANTES:
status: { type: "string", enum: ["draft", "in_progress", "in_review", "approved", "delivered", "archived"] },

// DESPUÉS:
status: { type: "string", enum: ["draft", "in_progress", "in_review", "approved", "delivered", "archived", "changes_requested"] },
```

---

## Contrato de ejecución para Sofia

- **Archivo ancla inicial:** `Bridge/lib/quotations.ts`
- **Datos existentes a reutilizar:** tipos y labels actuales en los 5 archivos listados arriba (líneas exactas indicadas)
- **Datos a crear:** migración SQL nueva (`20260528020000_...`)
- **Archivos exactos a modificar:** los 5 listados en la tabla anterior, sin tocar ningún otro
- **Máximo de archivos:** 5 (1 nuevo + 4 modificaciones)
- **Validación esperada:**
  1. `cd Bridge && npm run build` — sin errores TypeScript
  2. `cd Bridge/mcp && npm run build` — sin errores TypeScript
  3. Confirmar que el archivo de migración existe en `supabase/migrations/`
- **Condición de detención:** Si algún nombre de CHECK constraint no coincide con el nombre real en la DB, detenerse y reportar el nombre encontrado; no adivinar.
- **NO aplicar la migración a Supabase** — solo crear el archivo SQL. La aplicación la hace el operador.

---

## Marca de agua
`ARCH-20260528-03` — Respaldo: `context/SPECs/SPEC_ARCH-20260528-03_status_rejected_changes_requested_v1.md`
