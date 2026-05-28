# SPEC: Brand Kit del Cliente en Bridge V1

**ID:** ARCH-20260528-02  
**Proyecto:** Bridge  
**Fecha:** 2026-05-28  
**Estado:** Listo para implementación  
**Respaldo:** `context/FLUJO_BRANDKIT_ADOBE_V1.md`

---

## Objetivo

Agregar soporte de Brand Kit por cliente en Bridge. Un cliente tiene exactamente un Brand Kit (uno o ninguno). El Brand Kit almacena logos en Supabase Storage y metadatos de identidad visual (colores, tipografías, estilo, tono) en un campo `brand_kit jsonb` de la tabla `clients`. Bridge es la fuente de verdad — Adobe Firefly y otros productores consultan desde aquí.

---

## Estructura de datos definitiva

### Campo en DB

```sql
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS brand_kit jsonb DEFAULT NULL;
```

### Tipo TypeScript `BrandKit`

```ts
export type BrandKitLogo = {
  nombre: string;          // "Principal" | "Dark" | "Horizontal" | custom
  storage_path: string;    // path en Supabase Storage: "brand-kits/{tenantId}/{clientId}/{filename}"
  url: string;             // URL pública generada por Supabase Storage
};

export type BrandKitColor = {
  nombre: string;   // ej: "Primario", "Secundario", "Texto", "Fondo"
  hex: string;      // ej: "#1A2E4A"
  uso: string;      // ej: "CTA, fondos principales"
};

export type BrandKitTipografia = {
  nombre: string;   // ej: "Título", "Cuerpo"
  familia: string;  // ej: "Montserrat Bold"
  uso: string;      // ej: "Headlines, títulos"
};

export type BrandKit = {
  logos: BrandKitLogo[];
  colores: BrandKitColor[];
  tipografias: BrandKitTipografia[];
  estilo_visual: string;
  tono_marca: string[];
  carpeta_compartida: string | null;  // URL externa: Drive, Dropbox, etc.
  notas: string | null;
};
```

### Supabase Storage

- **Bucket:** `brand-kits`
- **Path por archivo:** `{tenantId}/{clientId}/{filename}`
- **Acceso escritura:** solo service role (desde rutas API con auth de agente)
- **Acceso lectura:** público (para que Firefly y otros productores puedan acceder directamente a la URL)

---

## Archivos a crear (5)

| Archivo | Descripción |
|---------|-------------|
| `supabase/migrations/20260528010000_brand_kit_clients_v1.sql` | ADD COLUMN brand_kit jsonb + crear bucket brand-kits |
| `app/api/v1/clients/[id]/brand-kit/route.ts` | `GET` retorna brand_kit del cliente; `PATCH` actualiza metadatos del brand kit |
| `app/api/v1/clients/[id]/brand-kit/upload/route.ts` | `POST` sube archivo de logo a Supabase Storage, devuelve `storage_path` y `url` |
| `mcp/src/tools/get-brand-kit.ts` | Tool MCP `bridge_get_brand_kit` |
| `mcp/src/tools/update-brand-kit.ts` | Tool MCP `bridge_update_brand_kit` |

## Archivos a modificar (3)

| Archivo | Cambio |
|---------|--------|
| `lib/assets.ts` | Agregar tipos `BrandKit*`; agregar `brand_kit` a return de `getClientById`; agregar función `updateClientBrandKit(tenantId, clientId, brandKit)` |
| `mcp/src/bridge-client.ts` | Agregar métodos `getBrandKit(clientId)` y `updateBrandKit(clientId, brandKit)` |
| `mcp/src/index.ts` | Registrar `bridge_get_brand_kit` y `bridge_update_brand_kit` en ListTools y CallTool |

**Total: 8 archivos (5 nuevos + 3 modificados)**

---

## Contratos de cada archivo

### `supabase/migrations/20260528010000_brand_kit_clients_v1.sql`

```sql
-- IMPL-ARCH-20260528-02
alter table public.clients
  add column if not exists brand_kit jsonb default null;

-- Bucket brand-kits (lectura pública, escritura solo service role)
insert into storage.buckets (id, name, public)
values ('brand-kits', 'brand-kits', true)
on conflict (id) do nothing;

-- RLS: cualquiera puede leer (archivos son públicos por URL)
create policy if not exists "Public read brand-kits"
on storage.objects for select
using (bucket_id = 'brand-kits');

-- RLS: solo service role puede escribir (las rutas API usan service role key)
create policy if not exists "Service role write brand-kits"
on storage.objects for insert
with check (bucket_id = 'brand-kits');

create policy if not exists "Service role delete brand-kits"
on storage.objects for delete
using (bucket_id = 'brand-kits');
```

---

### `app/api/v1/clients/[id]/brand-kit/route.ts`

**GET** — retorna el campo `brand_kit` del cliente. Si es null, retorna `{ brand_kit: null }`.  
**PATCH** — recibe body `{ brand_kit: BrandKit }`, valida que `brand_kit` sea objeto, hace PATCH en Supabase REST a `clients?id=eq.{id}&tenant_id=eq.{tenantId}` con `{ brand_kit }`. Retorna `{ ok: true }`.

Auth: `verifyAgentToken(req)` desde `lib/agent-auth.ts` — si retorna NextResponse, devolverlo inmediatamente.  
Tenant: `getTenantSlug(req)` + `getTenantIdBySlug(slug)` desde `lib/assets.ts` — si tenantId es null, retornar 404.

---

### `app/api/v1/clients/[id]/brand-kit/upload/route.ts`

**POST** — recibe `multipart/form-data` con campo `file` (imagen) y campo `nombre` (nombre del logo, ej: "Principal").

Flujo:
1. Validar auth con `verifyAgentToken(req)`; si falla retornar el error. Resolver tenantId con `getTenantSlug` + `getTenantIdBySlug`.
2. Leer `file` del FormData.
3. Subir a Supabase Storage con `supabaseAdmin.storage.from('brand-kits').upload('{tenantId}/{clientId}/{filename}', buffer, { contentType, upsert: true })`.
4. Generar URL pública: `supabaseAdmin.storage.from('brand-kits').getPublicUrl(path).data.publicUrl`.
5. Retornar `{ storage_path, url, nombre }`.

El llamador (MCP o UI) es responsable de guardar este resultado en el array `logos` del brand kit via el endpoint PATCH anterior.

---

### `lib/assets.ts` — cambios

1. Agregar tipos `BrandKitLogo`, `BrandKitColor`, `BrandKitTipografia`, `BrandKit` exportados.
2. En `getClientById`: agregar `brand_kit` al tipo de retorno como `brand_kit: BrandKit | null` y al string `select`.
3. Agregar función:

```ts
export async function updateClientBrandKit(
  tenantId: string,
  clientId: string,
  brandKit: BrandKit
): Promise<void>
```

Hace PATCH a `clients?id=eq.{clientId}&tenant_id=eq.{tenantId}` con body `{ brand_kit: brandKit }`.

---

### `mcp/src/bridge-client.ts` — cambios

Agregar métodos:

```ts
async getBrandKit(clientId: string): Promise<BrandKit | null>
// GET /api/v1/clients/{clientId}/brand-kit → retorna brand_kit

async updateBrandKit(clientId: string, brandKit: BrandKitInput): Promise<void>
// PATCH /api/v1/clients/{clientId}/brand-kit con body { brand_kit }
```

`BrandKitInput` = mismo tipo que `BrandKit` pero todos los campos opcionales excepto `logos` que puede ser array vacío.

---

### `mcp/src/tools/get-brand-kit.ts`

Tool: `bridge_get_brand_kit`  
Input: `{ client_id: string }`  
Acción: llama `bridgeClient.getBrandKit(client_id)`  
Output: JSON con el brand kit completo o mensaje `"Sin brand kit registrado para este cliente."`

---

### `mcp/src/tools/update-brand-kit.ts`

Tool: `bridge_update_brand_kit`  
Input:
```ts
{
  client_id: string;
  colores?: BrandKitColor[];
  tipografias?: BrandKitTipografia[];
  estilo_visual?: string;
  tono_marca?: string[];
  carpeta_compartida?: string;
  notas?: string;
}
```
Acción: hace merge con brand kit existente (GET primero, luego PATCH con objeto combinado).  
**Nota:** los logos no se actualizan por aquí — se suben vía el endpoint upload y se pasan como `logos` completo si se quiere actualizar.

---

### `mcp/src/index.ts` — cambios

Registrar en `ListToolsRequestSchema` y en el switch de `CallToolRequestSchema`:
- `bridge_get_brand_kit` → import y despacho a `getBrandKit` tool
- `bridge_update_brand_kit` → import y despacho a `updateBrandKit` tool

---

## Criterios de aceptación

1. `GET /api/v1/clients/[id]/brand-kit` retorna `{ brand_kit: null }` para un cliente sin brand kit.
2. `PATCH /api/v1/clients/[id]/brand-kit` con objeto `BrandKit` válido guarda los datos correctamente.
3. `POST /api/v1/clients/[id]/brand-kit/upload` sube un archivo PNG/SVG y retorna `storage_path` + URL pública accesible.
4. `getClientById` incluye `brand_kit` en el retorno.
5. `bridge_get_brand_kit` via MCP retorna el brand kit o mensaje vacío.
6. `bridge_update_brand_kit` via MCP actualiza metadatos sin pisar los logos existentes.
7. Build Next.js sin errores de TypeScript.
8. Build MCP sin errores.

---

## Contrato de ejecución para Sofia

**Archivo ancla inicial:** `lib/assets.ts` — agregar tipos `BrandKit*` aquí primero.

**Datos existentes a reutilizar:**
- `lib/agent-auth.ts` — `verifyAgentToken(req)`, `getTenantSlug(req)` (ya existen)
- `lib/assets.ts` — `getTenantIdBySlug(slug)` para resolver tenantId desde el slug
- `lib/assets.ts` — función `postgrest<T>()`, `getTenantId()`, patrón de `getClientById` como modelo
- `mcp/src/bridge-client.ts` — patrón de métodos HTTP existentes como modelo
- `mcp/src/index.ts` — patrón de registro de tools ya establecido

**Datos faltantes a crear (en orden):**
1. Tipos `BrandKit*` en `lib/assets.ts`
2. Migration SQL con ADD COLUMN + bucket Storage
3. Rutas API `brand-kit/route.ts` y `brand-kit/upload/route.ts`
4. Función `updateClientBrandKit` en `lib/assets.ts`
5. Métodos en `mcp/src/bridge-client.ts`
6. Tool files `get-brand-kit.ts` y `update-brand-kit.ts`
7. Registros en `mcp/src/index.ts`

**Archivos exactos a crear o modificar:** 8 archivos (listados arriba).  
**Máximo de archivos permitidos:** 10.

**Validación esperada:**
```bash
cd Bridge && npm run build        # debe pasar sin errores TypeScript
cd Bridge/mcp && npm run build    # debe pasar sin errores TypeScript
```

**Condición de detención:** si algún import, tipo o función de `lib/agent-auth.ts`, `lib/assets.ts` o `mcp/src/bridge-client.ts` no existe como se describe aquí, detener y reportar qué falta antes de continuar.
