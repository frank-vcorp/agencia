# CHECKPOINT IMPL-20260616-01 — Listado de briefs en /briefs con cliente, proyecto, fecha y acciones

**Fecha:** 2026-06-16
**Micro-Sprint:** IMPL-20260616-01
**Respaldo:** ARCH-20260616-01
**Descripción:** Añadir un listado en formato tabla ARRIBA del detalle actual en `/briefs`, con TODOS los briefs del tenant y columnas Cliente, ID del cliente, Proyecto, Fecha de creación, Estado, vN, Canal y Acciones (Editar / Eliminar). El operador puede editar o eliminar cualquier brief sin tener que entrar por el cliente.

## ✅ Acciones completadas

### 1. Helper de enriquecimiento en `lib/briefing.ts`
- **Archivo modificado:** `Bridge/lib/briefing.ts`
- **Cambios clave:**
  - Se exporta el tipo `BriefListItem` (shape compartido de fila de brief).
  - Se exporta el tipo `EnrichedBriefListItem` que extiende `BriefListItem` con `clientName: string | null` y `projectName: string | null`.
  - Se exporta la función `getBriefsByTenantEnriched(tenantId)` que:
    1. Llama a `getBriefsByTenant(tenantId)` (helper ya existente).
    2. Recolecta los `client_id` y `project_id` únicos no nulos.
    3. Hace UNA query a `clients?select=id,name&id=in.(...)` y UNA a `projects?select=id,name&id=in.(...)` (sin N+1).
    4. Si las queries de join fallan (Supabase no configurado), devuelve `[]` y los nombres quedan `null` sin romper el listado.
    5. Devuelve el array de briefs con `clientName` y `projectName` resueltos (o `null` si no hay join).

### 2. Nuevo componente cliente `components/briefs-list-table.tsx`
- **Archivo creado:** `Bridge/components/briefs-list-table.tsx`
- **Cambios clave:**
  - Componente `"use client"` con props `briefs: EnrichedBriefListItem[]`, `activeBriefId?: string`, `deleteAction: (formData: FormData) => void | Promise<void>`.
  - Renderiza un `<section className="panel rounded-[30px]">` con encabezado "Briefs del tenant" y contador `N briefs disponibles`.
  - Tabla `<table>` con `<thead>` y `<tbody>` dentro de `overflow-x-auto` para responsividad.
  - 8 columnas en el orden exacto de la SPEC: Cliente · ID del cliente · Proyecto · Fecha de creacion · Estado · Version · Canal · Acciones.
  - Fila activa resaltada con `bg-[color:var(--accent-soft)] ring-1 ring-inset ring-[color:rgba(200,93,39,0.25)]` (mismo estilo que `BriefsListSection`).
  - Acciones: botón **Editar** (Link a `/briefs?id=<uuid>#edicion-resumen`) y botón **Eliminar** (form con hidden inputs idénticos a `BriefsListSection`: `tenantId`, `briefId`, `confirmationText=ELIMINAR BRIEF ${id}`, `requestedByLabel=operador`, `approvedByLabel=operador`, `reason=otro`, y `window.confirm()` antes de submit).
  - Empty state idéntico a `BriefsListSection`: "El tenant aun no tiene briefs registrados."
  - Sin emojis, sin archivos de documentación adicionales.

### 3. Modificación de `app/briefs/page.tsx`
- **Archivo modificado:** `Bridge/app/briefs/page.tsx`
- **Cambios clave:**
  - Se reemplaza el import de `getBriefsByTenant` por `getBriefsByTenantEnriched` desde `@/lib/briefing`.
  - Se importa el nuevo `BriefsListTable` desde `@/components/briefs-list-table`.
  - Se reemplaza `briefsList` por `enrichedBriefs = await getBriefsByTenantEnriched(tenantId).catch(() => [])`.
  - El componente `BriefsListTable` se inserta como PRIMER `<section>` del `<div className="space-y-6">` en AMBAS rutas de retorno (la del "no brief" y la del brief principal), preservando intacto todo el detalle del brief actual.
  - Se pasa `activeBriefId={brief.id}` para resaltar la fila activa.
  - Se reutiliza el `deleteBriefAction` ya existente en el archivo (marcado con `"use server"`, ya llama a `executeDeleteBrief` y hace `revalidatePath("/briefs")` + `revalidatePath('/briefs?id=${briefId}')`).

## 📁 Archivos creados / modificados

| Tipo | Ruta |
|------|------|
| Modificado | `/home/frank/proyectos/agencia/Bridge/lib/briefing.ts` |
| Modificado | `/home/frank/proyectos/agencia/Bridge/app/briefs/page.tsx` |
| Creado    | `/home/frank/proyectos/agencia/Bridge/components/briefs-list-table.tsx` |

## 🧪 Validación

### `pnpm tsc --noEmit`
- Errores en mis archivos: **0** (`components/briefs-list-table.tsx`, `lib/briefing.ts`, `app/briefs/page.tsx`).
- Errores preexistentes NO relacionados: 5 errores en `lib/briefing-closure.test.ts` y `lib/briefing.test.ts` (sobre `narrativeQuestionAsked: null` y `VIKA_NARRATIVE_QUESTION` duplicado). Confirmado por `git stash` + re-ejecución: estos errores ya existían antes de mi intervención y no fueron introducidos por IMPL-20260616-01.

### `pnpm lint`
- `next lint` falla de forma interactiva porque el proyecto no tiene `.eslintrc` configurado. Falla idéntica antes de mi intervención (confirmado por `git stash` + re-ejecución). No es regresión.

### `pnpm test`
- 15 tests fallidos preexistentes (en `clients.test.ts`, `designer-workspace.test.ts`, `briefing-closure.test.ts`, `briefing.test.ts`). Mismo conteo antes y después de mi cambio. Mi cambio no introduce nuevos fallos.
- 539 tests pasan (vs 525 sin mi cambio); el delta viene de otros archivos no comiteados en el working tree (intervenciones paralelas), no de mi código.

### Verificación visual con Playwright
- Servidor `pnpm dev` levantado en `http://localhost:3000`.
- Navegación a `http://localhost:3000/briefs` → la tabla aparece como PRIMER elemento del main, antes de "Brief actual v1".
- **46 briefs** renderizados en la tabla (contador "46 briefs disponibles" en el encabezado).
- Columnas verificadas: Cliente (resuelto por join — ej. "Alfredo rios", "Antonio Bolaños"), ID del cliente (truncado a 8 chars con `…`, ej. `7c038622…`), Proyecto (nombre resuelto o literal "Sin proyecto" para briefs sin `project_id`), Fecha de creacion (formato `es-ES`, ej. `16/6/2026, 9:15:08`), Estado (guiones bajos a espacios, ej. `pending operator review`), Version (con prefijo `v`, ej. `v1`), Canal (`bridge_web`), Acciones (Editar / Eliminar).
- **Click en Editar** del primer row → URL cambia a `http://localhost:3000/briefs?id=dff5de71-599e-4dd1-891c-017212180525#edicion-resumen` y el detalle se recarga con el nuevo brief (29 mensajes, cierre con `[SYS_ACTION: LOCK_SUCCESS]`).
- **Fila activa resaltada** verificada por `getElementsByClassName`: la fila del brief activo tiene `bg-[color:var(--accent-soft)] ring-1 ring-inset ring-[color:rgba(200,93,39,0.25)]` (mismo patrón que `BriefsListSection`).
- **Form Eliminar** verificado por inspección DOM: contiene todos los hidden inputs requeridos — `tenantId`, `briefId`, `confirmationText=ELIMINAR BRIEF <uuid>`, `requestedByLabel=operador`, `approvedByLabel=operador`, `reason=otro` — más el `$ACTION_ID_*` de Next.js para la server action.
- Botón Eliminar **NO probado interactivamente** según indicación de la SPEC (acción destructiva).
- Captura visual: `/home/frank/proyectos/agencia/.playwright-mcp/briefs-table.png` (190 KB).

## ⚠️ Desviaciones respecto a la SPEC

Ninguna. La implementación sigue fielmente:
- Columnas en el orden exacto especificado.
- Fila activa con el mismo estilo de `BriefsListSection`.
- Empty state idéntico.
- Mismos hidden fields y `window.confirm()` para Eliminar.
- Helper `getBriefsByTenantEnriched` con la firma y el comportamiento pedidos (una sola query a `clients` y una a `projects`, fallback a `null` en caso de fallo).
- Tipo `EnrichedBriefListItem` exportado extendiendo `BriefListItem` con `clientName` y `projectName` anulables.
- Inserción como PRIMER `<section>` del `<div className="space-y-6">` (también en la rama "no brief" para mantener la tabla visible incluso cuando no hay detalle).

## 🎯 Entregable demostrable
1. Ir a `http://localhost:3000/briefs` con sesión de operador activa.
2. Ver tabla con todos los briefs del tenant, contador de disponibles, y fila del brief actual resaltada en naranja.
3. Click en "Editar" de cualquier fila → la URL cambia a `/briefs?id=<uuid>#edicion-resumen` y el detalle del brief se recarga.
4. Click en "Eliminar" de cualquier fila → pide confirmación nativa del navegador; si se confirma, ejecuta `deleteBriefAction` que llama a `executeDeleteBrief` y revalida `/briefs`.
5. Si no hay briefs, se muestra el empty state "El tenant aun no tiene briefs registrados."
