# SPEC ARCH-20260612-05

## Título
Gestión completa de clientes (CRUD) y vista de detalle con acceso a entidades relacionadas (briefs, cotizaciones, activos, CRM, leads)

## Estado
Planificado

## Fecha
2026-06-12

## ID de Decisión
ARCH-20260612-05

## Objetivo
Ampliar el módulo de clientes para que el operador pueda:
- Ver un listado de clientes con acciones de crear, editar y eliminar.
- Acceder a una vista de detalle del cliente que muestre información básica (nombre, estado, contacto, fecha de creación) y pestañas con sus entidades relacionadas: briefs, cotizaciones, activos, CRM/leads y resultados.
- Desde la vista de detalle, crear, editar y eliminar entidades relacionadas (según permisos) y navegar directamente a su gestión.
- Mantener los permisos existentes: el operador tiene acceso total; el cliente solo ve su propio cliente y no puede crear/editar/eliminar nada.
- No afectar la funcionalidad existente de los dashboards de operador, diseñador y cliente; se añaden nuevas rutas y componentes bajo `/clientes` y `/cliente/[id]`.

## Contexto y Problema
Actualmente, el módulo de clientes (`/clientes`) solo muestra un listado sencillo con métricas y estado, sin posibilidad de interactuar con él ni de ver sus entidades relacionadas. Desde el listado no se puede acceder a briefs, cotizaciones, activos ni CRM de un cliente concreto, lo que obliga al operador a navegar por rutas aisladas y perder el contexto del cliente. Además, no existen acciones de creación, edición o eliminación de clientes desde la UI, limitando la autonomía del operador para gestionar su cartera.

Esta limitación contradice el principio de la SPEC base (ARCH-20260504-04) de que el módulo de clientes debe ser un “directorio del tenant con contacto estructurado por cliente” y que el operador debe poder “ver todo, crear y editar clientes, proyectos, briefs, cotizaciones y activos”. La presente SPEC cubre ese vacío.

## Principios de UX — No Negociables
1. **Visibilidad controlada**: El cliente solo ve su propio cliente y no tiene acceso a acciones de creación/edición/eliminación ni a entidades de otros clientes.
2. **Consistencia de navegación**: Desde el listado de clientes, hacer clic en un cliente lleva a su vista de detalle (`/cliente/[id]`). Desde el detalle, las pestañas llevan a las entidades relacionadas manteniendo el contexto del cliente (p.ej., `/cliente/[id]/briefs`).
3. **Acciones CRUD claras**: Botones de crear, editar y eliminar están disponibles solo para el operador y están ubicados en lugares esperados (header del listado, barra de acciones del detalle).
4. **Feedback inmediato**: Después de crear/editar/eliminar, se muestra toast de éxito/error y la lista se actualiza sin recarga completa.
5. **Responsive**: Layout adaptable a móvil (lista en columna, detalle en pestañas horizontales colapsables) y escritorio (lista lateral + detalle principal).
6. **Tipos reutilizados**: Se usan los tipos ya existentes en `lib/clients.ts`, `lib/briefing.ts`, `lib/quotations.ts`, `lib/assets.ts`, `lib/crm.ts`.

## Detalles de Implementación

### 1. Rutas nuevas
- `GET /clientes` – lista de clientes (protegida, operador ve todos; cliente ve solo su propio).
- `GET /clientes/nuevo` – formulario de creación (solo operador).
- `GET /clientes/[id]/editar` – formulario de edición (solo operador).
- `GET /cliente/[id]` – vista de detalle del cliente (operador ve su cliente; cliente ve solo el suyo).
- `GET /cliente/[id]/briefs` – lista de briefs del cliente.
- `GET /cliente/[id]/cotizaciones` – lista de cotizaciones del cliente.
- `GET /cliente/[id]/activos` – lista de activos del cliente.
- `GET /cliente/[id]/crm` – lista de leads/CRM del cliente.
- `GET /cliente/[id]/resultados` – vista de resultados por canal (reutiliza la existente de cliente portal).

Las rutas pueden ser implementadas como páginas Next.js bajo `app/clientes/` y `app/cliente/[id]/...`.

### 2. Componentes principales
- `ClientListPage` (server) → delega a `ClientListView` (client) con tabla de clientes y botón **Nuevo cliente**.
- `ClientCard` dentro de la lista muestra: nombre, estado, contacto principal, fecha de creación, y acciones **Ver detalle**, **Editar**, **Eliminar** (estas últimas solo para operador).
- `ClientDetailPage` (server) obtiene el cliente mediante `getClientById` y delega a `ClientDetailView`.
- `ClientDetailView` layout:
  - Header: nombre del cliente, badge de estado, fecha de creación, información de contacto.
  - Acciones superiores: **Editar cliente** (operador), **Eliminar cliente** (operador) con modales de confirmación.
  - Tabs inferior: Briefs, Cotizaciones, Activos, CRM, Resultados.
  - Cada tab reutiliza los listados existentes (ej. `BriefList`, `QuotationList`, `AssetList`, `CRMList`, `ClientResults`) pero filtrados por `clientId`.
  - Dentro de cada tab, botón **Nuevo [Entidad]** (solo operador) que abre un modal o redirige a la ruta de creación correspondiente pre‑filtrada por el cliente.
- Los modales de creación/edición usan los formularios existentes (por ejemplo, `BriefForm`, `QuotationForm`, etc.) añadiendo un campo oculto `clientId` o pasando el cliente como parámetro de ruta.

### 3. Accesos de datos
- Se añaden funciones en `lib/clients.ts`:
  - `getClientById(id: string): Promise<ClientSummary | null>`.
  - `createClient(data: Omit<ClientSummary, 'id' | 'createdAt'>): Promise<string>` (devuelve id creado).
  - `updateClient(id: string, data: Partial<ClientSummary>): Promise<void>`.
  - `deleteClient(id: string): Promise<void>`.
- En `lib/assets.ts` (u otros) se garantiza que las funciones de listado de briefs, cotizaciones, activos y CRM acepten un parámetro opcional `clientId` para filtrar.
- Todas las mutaciones usan Supabase con RLS; las políticas existentes ya restringen el acceso según rol (operador vs cliente). No se crean nuevas políticas.

### 4. Permisos (refuerzo)
| Acción | Operador | Cliente |
|--------|----------|---------|
| Ver listado de clientes | ✅ (todos) | ✅ (solo propio) |
| Ver detalle de cliente | ✅ | ✅ (solo propio) |
| Crear cliente | ✅ | ❌ |
| Editar cliente | ✅ | ❌ |
| Eliminar cliente | ✅ | ❌ |
| Ver briefs/cotizaciones/activos/CRM del cliente | ✅ | ✅ (solo propio) |
| Crear/editar/eliminar briefs, cotizaciones, activos, leads | ✅ | ❌ |
| Ver propios briefs/cotizaciones/activos/CRM | ✅ | ✅ |
| Crear/editar/eliminar propios briefs, cotizaciones, activos, leads | ❌ | ❌ |

### 5. Flujo de creación de entidad relacionada
Desde la vista de detalle del cliente, al hacer clic en **Nuevo brief**, se abre un modal o se redirige a `/briefs/nuevo?clientId=X`. El formulario de brief ya tiene un campo oculto para `clientId` (o lo toma de query) y lo guarda automáticamente al crear el brief. Lo mismo aplica para cotizaciones, activos y leads.

## Criterios de Aceptación
1. **Listado de clientes**: El operador ve una tabla con todos los clientes del tenant; el cliente ve solo su propio cliente. Cada fila muestra nombre, estado, contacto principal, fecha de creación y botones Ver detalle/Editar/Eliminar (estos últimos solo operador).
2. **Navegación al detalle**: Hacer clic en **Ver detalle** o en el nombre del cliente lleva a `/cliente/[id]` mostrando la información básica del cliente.
3. **Vista de detalle**: Muestra nombre, estado, contacto principal, fecha de creación y pestañas con los conteos de briefs, cotizaciones, activos, leads y resultados.
4. **Pestañas funcionales**: Cada tab lista las entidades relacionadas del cliente y permite crear nueva entidad (botón solo para operador) que guarda automáticamente el `clientId`.
5. **Editar y eliminar cliente**: Operador puede abrir modales de edición y eliminación; al guardar/eliminar, se muestra toast y la lista se actualiza.
6. **Sin acceso del cliente a acciones de CRUD**: El cliente no ve botones de crear/editar/eliminar ni en listado ni en detalle.
7. **Responsive**: En móvil, la lista ocupa el ancho completo y el detalle se muestra en una página con pestañas colapsables; en escritorio, la lista aparece en una barra lateral (280px) y el detalle en el área principal.
8. **Persistence**: Tras crear/editar/eliminar una entidad, los cambios se reflejan inmediatamente al volver a la lista o al detalle sin necesidad de recarga completa.
9. **Testing**: Existen pruebas unitarias que verifican:
   - `getClientById` devuelve datos correctos.
   - `createClient`, `updateClient`, `deleteClient` llaman a Supabase con los parámetros esperados.
   - El filtro por `clientId` funciona en listados de briefs, cotizaciones, activos y CRM.
10. **Build y lint**: `pnpm build` y `pnpm lint` pasan sin errores nuevos.

## Métricas de Validación
- **Compilación**: `pnpm build` sin errores TypeScript.
- **Testing**: Nuevos tests en `lib/clients.test.ts` (o archivo nuevo) que cubren las funciones CRUD y filtrado.
- **Linter**: No introducir warnings nuevos.
- **Revisión humana**: Verificación visual de los flujos descritos en un entorno de desarrollo (`pnpm dev`).

## Referencias
- SPEC Base: ARCH-20260504-04 (módulo de clientes, líneas 604‑623).
- Principios de creación y edición de entidades (líneas 738‑746).
- Módulo de clientes existente: `app/cliente/page.tsx`, `lib/clients.ts`, `lib/client-portal.ts`.
- Implementaciones de listados y formularios existentes para briefs, cotizaciones, activos y CRM (rutas y componentes bajo `/briefs`, `/cotizaciones`, `/activos`, `/crm`).

## Decisión Final
Esta SPEC cubre el vacío de gestión de clientes y su relación con las entidades operativas, permitiendo al operador tener un control total de su cartera desde una única zona de trabajo sin perder el contexto del cliente. La implementación se basa en componentes y rutas ya existentes, reutilizando tipos y formularios, y solo agrega las capas de listado, detalle y acciones de CRUD necesarias. No modifica los dashboards ya completados (Operador V2, Diseñador V2, Cliente V2) salvo por los enlaces de navegación desde el detalle del cliente a esas áreas cuando corresponda.
