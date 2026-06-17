# SPEC ARCH-20260616-01 — Listado global de briefs en `/briefs` (tabla con acciones de edición y eliminación)

**ID:** ARCH-20260616-01
**Fecha:** 2026-06-16
**Autor:** INTEGRA
**Estado:** Implementado
**Implementación:** IMPL-20260616-01
**Checkpoint:** `context/checkpoints/CHECKPOINT_IMPL-20260616-01_listado_briefs_tabla_global_v1.md`

---

## 1. Contexto y Problema

La página `/briefs` solo mostraba el **detalle de un único brief** a la vez, seleccionado por `?id=<uuid>` o, en su defecto, el más reciente del tenant activo. El resto de los briefs del tenant existían en base de datos, pero el operador:

- No tenía **visibilidad global** del inventario de briefs en una sola vista.
- No podía **editar** un brief que no fuera el activo sin entrar primero a su cliente, luego al proyecto, y solo entonces encontrar la ruta al brief.
- No podía **eliminar** un brief desde la cabina: tenía que navegar al cliente o al proyecto contenedor y disparar el borrado desde otra superficie.

En la practica, esto producía friccion operativa real:

| Problema | Impacto en produccion |
|---|---|
| Decenas de briefs por tenant sin visión agregada | El operador tiene que abrir `/briefs` y confiar en que el `?id=` resuelto o el más reciente es el que le interesa |
| Briefs cancelados o duplicados se acumulan | No hay forma rápida de identificarlos y eliminarlos desde la cabina |
| Briefs en estado `draft` o `rework` requieren edición | El operador tiene que reconstruir la ruta cliente → proyecto → brief manualmente |
| Auditoría mínima del tenant | No existe una "tabla maestra" de briefs con su cliente, proyecto, estado y versión |

La filosofía correcta para la cabina de operador es:

> **Toda la colección de entidades operativas de un tipo debe ser visible en una sola tabla, con acciones inline, antes (o junto a) del detalle de la entidad activa.**

---

## 2. Decisión Arquitectónica

### 2.1 Renderizar tabla ARRIBA del detalle en `/briefs`

La página `app/briefs/page.tsx` mantiene su flujo actual (carga del brief activo + render del detalle), pero ahora **inserta como primer `<section>` del contenedor `<div className="space-y-6">`** un nuevo componente cliente que lista todos los briefs del tenant en formato tabla. La tabla precede al detalle y se renderiza aunque no haya `?id=` (el operador puede aterrizar en `/briefs` y ver primero la colección).

### 2.2 Helper `getBriefsByTenantEnriched(tenantId)` anti N+1

Se agrega en `lib/briefing.ts` un helper que:

1. Llama a la consulta base de briefs del tenant (ya existente) y obtiene `BriefListItem[]`.
2. Extrae los IDs únicos de `clientId` y `projectId` referenciados.
3. Hace **una sola** consulta a `clients` con `select=id,name&id=in.(<csv>)` y otra a `projects` con el mismo patrón.
4. Devuelve `EnrichedBriefListItem[]` donde `clientName` y `projectName` se resuelven desde los mapas en memoria. Si la consulta a `clients` o `projects` falla (Supabase no configurado, RLS, etc.), los nombres quedan `null` sin romper el render — la tabla sigue mostrando "Sin cliente" / "Sin proyecto".

Esta forma evita el clásico N+1 (un roundtrip por brief) y mantiene el contrato de errores tolerante.

### 2.3 Tabla con 8 columnas, en este orden

| # | Columna | Origen | Notas |
|---|---|---|---|
| 1 | Cliente | `clients.name` (join) | Fallback "Sin cliente" si `null` |
| 2 | ID del cliente | `brief.clientId` | Truncado o monoespaciado para legibilidad |
| 3 | Proyecto | `projects.name` (join) | Fallback "Sin proyecto" si `null` |
| 4 | Fecha de creación | `brief.createdAt` | Formateada localmente |
| 5 | Estado | `brief.status` | Texto del estado del brief |
| 6 | vN | Versión actual del brief | Numero entero + sufijo "v" |
| 7 | Canal | `brief.sourceChannel` | Canal de origen (whatsapp, manual, etc.) |
| 8 | Acciones | — | Editar + Eliminar (ver 2.4) |

### 2.4 Acciones inline por fila

- **Editar**: `<Link href={\`/briefs?id=<uuid>#edicion-resumen\`}>` que apunta a la sección de edición de resumen ya existente en la página. Sin server action, es navegación.
- **Eliminar**: `<form action={deleteBriefAction}>` con confirmación `window.confirm` antes de submit, y los hidden inputs:
  - `tenantId`
  - `briefId`
  - `confirmationText="ELIMINAR BRIEF <id>"`
  - `requestedByLabel="operador"`
  - `approvedByLabel="operador"`
  - `reason="otro"`

La server action `deleteBriefAction` está definida inline en `app/briefs/page.tsx` y reutiliza `executeDeleteBrief` de `@/lib/entity-delete`. Después del borrado, `revalidatePath('/briefs')` para refrescar la tabla y el detalle.

### 2.5 Fila activa resaltada

La fila cuyo `brief.id === activeBriefId` (es decir, el brief cuyo detalle se está renderizando abajo) recibe `bg-accent-soft` y un ring naranja para que el operador identifique visualmente cuál es la entidad activa en la colección.

### 2.6 Empty state

Si el tenant no tiene briefs, la tabla se reemplaza por el mensaje:

> "El tenant aun no tiene briefs registrados."

(redacción literal, mismo idioma y tono del resto de la cabina).

---

## 3. Modelo de Datos

### 3.1 `BriefListItem`

Tipo ya exportado en `lib/briefing.ts` (existente, sin cambios). Representa la fila cruda devuelta por la consulta base de briefs del tenant.

### 3.2 `EnrichedBriefListItem extends BriefListItem`

Nuevo tipo exportado en `lib/briefing.ts`:

```ts
type EnrichedBriefListItem = BriefListItem & {
  clientName: string | null;
  projectName: string | null;
};
```

El `null` (no `undefined`) es intencional: deja claro que la falta de nombre viene de un join fallido, no de un campo ausente en el brief.

### 3.3 Idempotencia del helper

`getBriefsByTenantEnriched` es idempotente en el sentido de que un fallo en la consulta de `clients` o `projects` no aborta la operación completa: los nombres quedan `null` y el resto de la fila se renderiza normal. Esto preserva la disponibilidad de la tabla incluso cuando Supabase no está configurado o el RLS bloquea el join.

---

## 4. Componentes y Rutas

### 4.1 `components/briefs-list-table.tsx` (NUEVO)

Componente cliente (`"use client"`) que recibe `EnrichedBriefListItem[]` + `activeBriefId` y renderiza la tabla. Maneja:

- Render de la fila activa con `bg-accent-soft` + ring.
- `<Link>` para Editar.
- `<form>` para Eliminar con `onSubmit` que ejecuta `window.confirm(...)` antes de permitir el submit.
- Empty state cuando el array viene vacío.

### 4.2 `app/briefs/page.tsx` (MODIFICADO)

- Importa `BriefsListTable` y `getBriefsByTenantEnriched`.
- En el Server Component, después de obtener el brief activo, llama a `getBriefsByTenantEnriched(tenantId)` (en `Promise.all` con las otras cargas para no serializar).
- Inserta `<BriefsListTable items={...} activeBriefId={...} />` como **primer** `<section>` dentro del `<div className="space-y-6">`.
- Define `deleteBriefAction` (server action inline) que valida rol, extrae `FormData`, llama a `executeDeleteBrief(...)` y hace `revalidatePath('/briefs')`.

### 4.3 `lib/briefing.ts` (MODIFICADO)

- Exporta `EnrichedBriefListItem`.
- Exporta `getBriefsByTenantEnriched(tenantId)`.

No se modifica la consulta base de briefs ni el tipo `BriefListItem` existente.

---

## 5. Contratos

| Caso | Comportamiento esperado |
|---|---|
| Tenant sin briefs | Empty state "El tenant aun no tiene briefs registrados." |
| Fila activa | Resaltada con `bg-accent-soft` + ring naranja |
| Click en Editar | Navega a `/briefs?id=<uuid>#edicion-resumen` y muestra la sección de edición de resumen |
| Click en Eliminar | Muestra `window.confirm` con texto "ELIMINAR BRIEF <id>"; si el operador cancela, no se envía el form; si acepta, server action ejecuta `executeDeleteBrief` y revalida `/briefs` |
| Join a `clients` falla | `clientName: null` → celda muestra "Sin cliente", resto de la fila se renderiza normal |
| Join a `projects` falla | `projectName: null` → celda muestra "Sin proyecto", resto de la fila se renderiza normal |
| Permisos | `deleteBriefAction` requiere rol operador (lo gestiona `executeDeleteBrief` internamente) |

---

## 6. Validación

| Check | Criterio |
|---|---|
| `pnpm tsc --noEmit` | 0 errores en archivos tocados (`components/briefs-list-table.tsx`, `app/briefs/page.tsx`, `lib/briefing.ts`) |
| Playwright: tabla visible | `components/briefs-list-table.tsx` se renderiza arriba del detalle con N filas (verificado con N=46 en staging) |
| Playwright: Editar | Click en "Editar" de una fila navega a `/briefs?id=<uuid>#edicion-resumen` y la sección de edición queda visible |
| Playwright: Fila activa | La fila cuyo id coincide con `activeBriefId` tiene `bg-accent-soft` y ring |
| Playwright: Eliminar | Click en "Eliminar" dispara `window.confirm`; aceptar ejecuta la server action y la fila desaparece tras revalidate |
| Empty state | Con tenant sin briefs, la tabla se reemplaza por el mensaje definido |

> **Fuera de alcance (registrado en ticket separado):** 5 errores preexistentes en `lib/briefing-closure.test.ts` y `lib/briefing.test.ts` no son introducidos ni resueltos por este cambio. Se documentan en el checkpoint para su tratamiento en otra intervención.

---

## 7. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|---|---|
| Joins a `clients` y `projects` con `id=in.(...)` pueden ser muy largos si el tenant tiene cientos de briefs y muchos clientes/proyectos únicos | Deduplicar IDs antes de la query; usar `select=id,name` mínimo (sin columnas pesadas); Supabase acepta hasta ~2000 IDs por query `in.(...)` |
| RLS de Supabase podría bloquear el join | Usar la misma service role del resto del codebase; en caso de fallo, los nombres quedan `null` y la tabla sigue siendo útil |
| Tabla con muchos briefs (>100) degrada el render | Aceptable a corto plazo; paginación diferida (ver Trabajo futuro) |
| `window.confirm` es bloqueante y visualmente inconsistente con el resto de la cabina | Aceptable para v1 (paridad con `executeDeleteBrief`); migrar a modal de UI en una iteracion futura |
| Server action inline en `page.tsx` mezcla capa de presentación con mutación | Aceptable por paridad con el resto de la cabina; aislar a `app/briefs/actions.ts` si la pagina crece |

---

## 8. Rollback

```bash
git revert 32b5969
```

No requiere migración BD. El cambio es 100% en código: nuevo componente, helper nuevo, server action inline, y modificaciones cosméticas al `page.tsx` que solo insertan un `<section>` adicional.

---

## 9. Trabajo Futuro

- Paginar la tabla cuando el tenant tenga > 100 briefs (criterio arbitrario, ajustar según métricas reales).
- Filtros por cliente, proyecto, estado y canal.
- Búsqueda por texto en el resumen del brief.
- Reemplazar `window.confirm` por un modal de confirmación consistente con el resto de la cabina.
- Aislamiento de la server action a `app/briefs/actions.ts` si la página crece en responsabilidades.

---

## 10. Trazabilidad

| Artefacto | Referencia |
|---|---|
| ADR / Decisión arquitectónica | ARCH-20260616-01 (este documento) |
| Implementación | IMPL-20260616-01 |
| Checkpoint enriquecido | `context/checkpoints/CHECKPOINT_IMPL-20260616-01_listado_briefs_tabla_global_v1.md` |
| Commit | `32b5969` |
