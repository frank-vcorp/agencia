# SPEC_ARCH-20260510-14 — MCP: Crear Cliente, Proyecto y Activo desde VS Code

**ID:** ARCH-20260510-14  
**Fecha:** 2026-05-10  
**Agente:** INTEGRA → SOFIA  
**Estado:** Autorizada para implementación  
**Prioridad:** Alta (Puntaje = (9×3) + (8×2) − (4×0.5) = 41)

---

## Objetivo

Ampliar el MCP server de Bridge con 3 nuevas herramientas que permitan al agente en VS Code **crear entidades directamente en Bridge producción** (Vercel + Supabase), sin necesidad de acceder a la UI ni a Supabase directamente.

Las herramientas existentes solo leen o escriben sobre datos ya creados. Esta SPEC cierra el ciclo permitiendo la creación completa de la jerarquía: Cliente → Proyecto → Activo.

---

## Herramientas MCP a agregar

| Herramienta | Descripción |
|---|---|
| `bridge_create_client` | Crea un nuevo cliente en el tenant activo |
| `bridge_create_project` | Crea un proyecto ligado a un cliente existente |
| `bridge_create_asset` | Crea un activo creativo ligado a un proyecto |

---

## Contratos de entrada y salida

### 1. `bridge_create_client`
**Input:**
```ts
{
  name: string            // requerido — nombre único del cliente en el tenant
  legalName?: string      // nombre legal (opcional)
  status?: 'active' | 'prospect' | 'inactive'  // default: 'active'
  primaryContactName?: string
  primaryContactChannel?: string  // ej: "WhatsApp: +52 55 1234 5678"
  notes?: string
}
```
**Output (éxito):**
```ts
{
  ok: true
  clientId: string       // UUID del cliente creado
  name: string
  status: string
  message: string
}
```
**Output (error):**
```ts
{ ok: false; error: 'name_conflict' | 'tenant_not_found' | string }
```

---

### 2. `bridge_create_project`
**Input:**
```ts
{
  clientId: string        // requerido — UUID del cliente
  name: string            // requerido — nombre único (por tenant+client)
  projectType: 'lanzamiento' | 'presencia' | 'contenido' | 'campana' | 'interno'  // requerido
  objective?: string
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived'  // default: 'draft'
  startDate?: string      // ISO date ej: "2026-05-15"
  endDate?: string        // ISO date
}
```
**Output (éxito):**
```ts
{
  ok: true
  projectId: string       // UUID del proyecto creado
  name: string
  projectType: string
  status: string
  clientId: string
  message: string
}
```
**Output (error):**
```ts
{ ok: false; error: 'client_not_found' | 'name_conflict' | 'tenant_not_found' | string }
```

---

### 3. `bridge_create_asset`
**Input:**
```ts
{
  projectId: string       // requerido — UUID del proyecto
  title: string           // requerido
  applicationCode: string // requerido — ej: 'instagram', 'facebook', 'whatsapp'
  pieceTypeCode: string   // requerido — ej: 'imagen', 'video', 'carousel'
  placementCode: string   // requerido — ej: 'feed', 'story', 'reel'
  formatCode: string      // requerido — ej: 'cuadrado_1_1', 'vertical_9_16'
  status?: string         // default: 'draft'
}
```
Los valores válidos de applicationCode, pieceTypeCode, placementCode y formatCode están definidos en `Bridge/lib/assets.ts` como constantes exportadas.

**Output (éxito):**
```ts
{
  ok: true
  assetId: string         // UUID del activo creado
  title: string
  applicationCode: string
  pieceTypeCode: string
  status: string
  projectId: string
  message: string
}
```
**Output (error):**
```ts
{ ok: false; error: 'project_not_found' | 'tenant_not_found' | string }
```

---

## Archivos a crear o modificar

### Nuevos endpoints (3 archivos)

**`Bridge/app/api/v1/clients/route.ts`** — Agregar método POST  
> El archivo ya tiene GET. Agregar `POST` en el mismo archivo.

**`Bridge/app/api/v1/projects/route.ts`** — Agregar método POST  
> El archivo ya tiene GET. Agregar `POST` en el mismo archivo.

> **Nota sobre assets:** `Bridge/app/api/v1/assets/route.ts` ya existe con GET. Agregar `POST` en el mismo archivo.

### Nuevas funciones en lib (1 archivo modificado)

**`Bridge/lib/assets.ts`** — Agregar al final:
```ts
export async function createClient(tenantId: string, data: CreateClientInput): Promise<ClientRow>
export async function createProject(tenantId: string, data: CreateProjectInput): Promise<ProjectRow>
export async function createAsset(tenantId: string, data: CreateAssetInput): Promise<AssetRow>
```
Usar la función `postgrest()` interna existente. Manejar errores de unicidad de Postgres (código `23505`) y devolverlos como `{ ok: false, error: 'name_conflict' }`.

### Nuevas herramientas MCP (3 archivos)

- `Bridge/mcp/src/tools/create-client.ts`
- `Bridge/mcp/src/tools/create-project.ts`
- `Bridge/mcp/src/tools/create-asset.ts`

### Actualizar bridge-client.ts (1 archivo)

Agregar 3 métodos:
```ts
async createClient(data): Promise<ClientCreateResult | BridgeErrorResult>
async createProject(data): Promise<ProjectCreateResult | BridgeErrorResult>
async createAsset(data): Promise<AssetCreateResult | BridgeErrorResult>
```

### Actualizar index.ts del MCP (1 archivo)

Registrar las 3 nuevas herramientas en `ListToolsRequestSchema` y `CallToolRequestSchema`.

---

## Resumen de archivos afectados

| Archivo | Acción |
|---|---|
| `Bridge/app/api/v1/clients/route.ts` | Agregar POST |
| `Bridge/app/api/v1/projects/route.ts` | Agregar POST |
| `Bridge/app/api/v1/assets/route.ts` | Agregar POST |
| `Bridge/lib/assets.ts` | Agregar 3 funciones al final |
| `Bridge/mcp/src/bridge-client.ts` | Agregar 3 métodos |
| `Bridge/mcp/src/tools/create-client.ts` | Crear nuevo |
| `Bridge/mcp/src/tools/create-project.ts` | Crear nuevo |
| `Bridge/mcp/src/tools/create-asset.ts` | Crear nuevo |
| `Bridge/mcp/src/index.ts` | Registrar 3 herramientas |

Total: 9 archivos.

---

## Criterios de aceptación

- [ ] `POST /api/v1/clients` crea un cliente y retorna JSON `{ ok: true, clientId, name, status, message }`
- [ ] `POST /api/v1/projects` crea un proyecto y retorna JSON `{ ok: true, projectId, name, projectType, status, clientId, message }`
- [ ] `POST /api/v1/assets` crea un activo y retorna JSON `{ ok: true, assetId, title, applicationCode, pieceTypeCode, status, projectId, message }`
- [ ] Los 3 endpoints validan el tenant via `X-Bridge-Tenant` y el token via `Authorization: Bearer`
- [ ] Los errores de unicidad Postgres devuelven `{ ok: false, error: 'name_conflict' }` (no 500)
- [ ] Las 3 herramientas MCP aparecen en `bridge_list_assets` no — sino en el servidor al hacer `/list_tools`
- [ ] MCP local rebuildeado: `cd Bridge/mcp && npm run build`
- [ ] Build de Next.js pasa: `cd Bridge && npm run build`
- [ ] Los tests existentes siguen pasando (no romper nada)
- [ ] Commit en español con ID IMPL-20260510-14

---

## Notas técnicas

1. **Auth**: Todos los endpoints usan `verifyAgentToken(req)` + `getTenantSlug(req)` + `getTenantIdBySlug(slug)` — mismo patrón de los endpoints existentes.
2. **FK `clientId` en projects**: Verificar que el `client_id` pertenece al mismo tenant antes de crear.
3. **FK `projectId` en assets**: Verificar que el `project_id` pertenece al mismo tenant. También obtener el `client_id` del proyecto para incluirlo en el INSERT de assets.
4. **Errores Postgres 23505** (unique_violation): Capturar y retornar `{ ok: false, error: 'name_conflict' }`.
5. **MCP rebuild**: Después de modificar `Bridge/mcp/src/`, ejecutar `cd Bridge/mcp && npm run build` para actualizar `dist/`.
6. **No agregar campos que no existen en el schema**: No agregar `slug` a clients ni proyects — el schema no lo tiene.
