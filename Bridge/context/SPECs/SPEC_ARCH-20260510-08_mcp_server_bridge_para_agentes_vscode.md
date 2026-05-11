# SPEC ARCH-20260510-08: MCP Server de Bridge para Agentes VS Code

**ID:** ARCH-20260510-08  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-10  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Crítica — bloquea el flujo operativo real de Frank  
**Puntaje de prioridad:** (Valor 10 × 3) + (Urgencia 10 × 2) - (Complejidad 6 × 0.5) = 47

---

## 1. Contexto y Motivación

Frank (operador) trabaja primariamente desde VS Code con agentes de IA (GitHub Copilot en modo SOFIA, INTEGRA, etc.). Su flujo operativo real es:

1. Abre VS Code con el proyecto de un cliente.
2. Trabaja con sus agentes para definir especificaciones de producción creativa para cada activo.
3. **Necesita empujar esas especificaciones a Bridge** sin abrir el navegador.
4. El diseñador abre Bridge, ve la especificación en su workspace, y produce el activo creativo.
5. El diseñador registra el resultado en Bridge. El operador aprueba.

Sin el MCP server, Frank debe copiar manualmente el contenido entre VS Code y Bridge. Esto rompe el flujo y convierte Bridge en un sistema pasivo que no se integra con su entorno de trabajo real.

El MCP (Model Context Protocol) es el estándar de VS Code para que agentes llamen herramientas externas. Bridge debe exponer un MCP server que los agentes de Frank puedan consumir directamente desde el chat.

---

## 2. Objetivo

Implementar un **MCP server stdio** que permita a los agentes de VS Code leer contexto desde Bridge y escribir especificaciones de producción para activos, sin salir del editor.

---

## 3. Alcance de esta SPEC

### Incluye

1. MCP server en `Bridge/mcp/` — paquete Node.js standalone con transpilación TypeScript.
2. Tres rutas API de Bridge (`/api/v1/...`) protegidas por token de agente.
3. Configuración VS Code en `.vscode/mcp.json`.
4. Función `createOrUpdateAssetPrompt` en `lib/assets.ts` para superseder prompts anteriores.
5. Tests unitarios del servidor MCP (mock de Bridge API).

### Excluye

- Implementación completa de todos los endpoints de `CONTRATOS_AGENTES_Y_VSCODE_V1.md` (eso es ARCH-20260504-15, trabajo futuro).
- UI de diseñador para ver specs (ya existe: `designer-workspace.tsx` muestra `activePrompt`).
- Autenticación OAuth o JWTs complejos — V1 usa shared secret.
- Multi-tenant dinámico — V1 asume el tenant del env de Bridge.

---

## 4. Flujo de Usuario (Happy Path)

```
Frank en VS Code:
  > @bridge bridge_list_assets
  Bridge MCP: [lista de activos con sus estados]

  > @bridge bridge_get_asset_context assetId="uuid-del-activo"
  Bridge MCP: [contexto: título, aplicación, formato, brief asociado, prompt actual]

  > @bridge bridge_write_production_spec assetId="uuid" specContent="# Spec de producción\n\n## Objetivo\n..."
  Bridge MCP: { ok: true, promptVersionId: "...", versionNumber: 2, message: "Spec publicada. El diseñador la verá en su workspace." }
```

El diseñador abre Bridge en `/disenador` y ve el activo con el nuevo prompt activo.

---

## 5. Arquitectura del MCP Server

### 5.1 Ubicación y estructura

```
Bridge/
  mcp/
    package.json          ← paquete independiente con "@modelcontextprotocol/sdk"
    tsconfig.json
    src/
      index.ts            ← entry point: stdio server
      tools/
        list-assets.ts
        get-asset-context.ts
        write-production-spec.ts
      bridge-client.ts    ← wrapper de fetch hacia Bridge API
      config.ts           ← lee env vars: BRIDGE_URL, BRIDGE_MCP_SECRET, BRIDGE_TENANT_SLUG
    dist/                 ← output compilado (gitignored)
```

### 5.2 Protocolo

- **Transport:** `StdioServerTransport` (estándar MCP para VS Code).
- **SDK:** `@modelcontextprotocol/sdk` (paquete oficial).
- **Node version:** ≥ 18 (usa `fetch` nativo).

### 5.3 Herramientas MCP expuestas

#### `bridge_list_assets`

**Descripción:** Lista todos los activos del tenant con su estado y si tienen spec de producción activa.

**Parámetros de entrada:** ninguno (usa el tenant del env).

**Llamada a Bridge:** `GET /api/v1/assets` con header `Authorization: Bearer <BRIDGE_MCP_SECRET>` y `X-Bridge-Tenant: <slug>`.

**Salida:**
```json
{
  "assets": [
    {
      "id": "uuid",
      "title": "Post Instagram lanzamiento",
      "applicationCode": "instagram",
      "pieceTypeCode": "imagen",
      "status": "draft",
      "hasActiveSpec": false,
      "projectId": "uuid",
      "clientId": "uuid"
    }
  ],
  "total": 5
}
```

---

#### `bridge_get_asset_context`

**Descripción:** Obtiene el contexto completo de un activo: metadatos, brief asociado (resumen), spec actual y estado.

**Parámetros de entrada:**
```typescript
{
  assetId: string  // UUID del activo
}
```

**Llamada a Bridge:** `GET /api/v1/assets/:id/context`

**Salida:**
```json
{
  "asset": { "id": "...", "title": "...", "applicationCode": "...", "status": "..." },
  "activeSpec": {
    "versionNumber": 1,
    "promptText": "# Spec actual...",
    "createdAt": "2026-05-10T10:00:00Z"
  },
  "briefSummary": "Cliente quiere imagen de lanzamiento para su nuevo producto...",
  "readyForSpec": true
}
```

---

#### `bridge_write_production_spec`

**Descripción:** Escribe o actualiza la especificación de producción de un activo. Supersede la spec anterior si existe.

**Parámetros de entrada:**
```typescript
{
  assetId: string       // UUID del activo
  specContent: string   // Contenido markdown de la spec de producción
  versionNote?: string  // Nota opcional sobre qué cambió
}
```

**Llamada a Bridge:** `POST /api/v1/assets/:id/prompts`

**Comportamiento en Bridge:**
1. Marca la versión activa anterior como `superseded`.
2. Crea una nueva `asset_prompt_versions` con `status: "active"` y el `prompt_text` recibido.
3. Registra `created_by_agent_id = "vscode-agent"` en la fila.
4. Retorna la nueva versión.

**Salida:**
```json
{
  "ok": true,
  "promptVersionId": "uuid",
  "versionNumber": 2,
  "assetId": "uuid",
  "message": "Especificación publicada. El diseñador la verá en su workspace de Bridge."
}
```

**Error esperado:** Si `assetId` no existe o no pertenece al tenant → `{ "ok": false, "error": "asset_not_found" }`.

---

## 6. Rutas API de Bridge Requeridas

Las siguientes 3 rutas deben crearse en `Bridge/app/api/v1/`:

### 6.1 `GET /api/v1/assets`

**Archivo:** `Bridge/app/api/v1/assets/route.ts`

**Auth:** Header `Authorization: Bearer <BRIDGE_MCP_SECRET>` verificado contra `process.env.BRIDGE_MCP_SECRET`.

**Lógica:**
1. Verificar token.
2. Obtener tenant por `X-Bridge-Tenant` header (o env default).
3. Llamar `getAssetsByTenant(tenantId)` de `lib/assets.ts`.
4. Retornar lista serializada.

**Response 200:**
```json
{
  "ok": true,
  "assets": [...],
  "total": 5
}
```

### 6.2 `GET /api/v1/assets/[id]/context`

**Archivo:** `Bridge/app/api/v1/assets/[id]/context/route.ts`

**Auth:** idem anterior.

**Lógica:**
1. Verificar token + tenant.
2. Obtener asset por `id` perteneciente al tenant.
3. Si tiene `briefId`, obtener resumen del brief (primeras 500 chars de `consolidated_content` o `raw_content`).
4. Obtener prompt activo.
5. Retornar estructura de contexto.

### 6.3 `POST /api/v1/assets/[id]/prompts`

**Archivo:** `Bridge/app/api/v1/assets/[id]/prompts/route.ts`

**Auth:** idem anterior.

**Body:**
```json
{
  "specContent": "# Spec de producción...",
  "versionNote": "Primer borrador"
}
```

**Lógica:**
1. Verificar token + tenant.
2. Verificar que el asset existe y pertenece al tenant.
3. Llamar `createOrUpdateAssetPrompt(assetId, tenantId, specContent, agentId)` de `lib/assets.ts`.
4. Retornar nueva versión.

---

## 7. Función nueva en `lib/assets.ts`

```typescript
export async function createOrUpdateAssetPrompt(
  assetId: string,
  tenantId: string,
  promptText: string,
  agentId: string = "vscode-agent"
): Promise<AssetPromptVersion>
```

**Lógica:**
1. Buscar versiones activas para `assetId` + `tenantId`.
2. Marcarlas como `superseded` (PATCH `status = "superseded"` en `asset_prompt_versions`).
3. Calcular siguiente `version_number` (máximo + 1, o 1 si no hay).
4. INSERT nueva fila con `status: "active"`, `prompt_text`, `created_by_agent_id`.
5. Retornar la nueva versión normalizada.

---

## 8. Autenticación del MCP Server

### Variable de entorno

```
# En Bridge/.env.local
BRIDGE_MCP_SECRET=<token-largo-aleatorio-256bit>
```

### VS Code (.vscode/mcp.json)

```json
{
  "servers": {
    "bridge": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/mcp/dist/index.js"],
      "env": {
        "BRIDGE_URL": "http://localhost:3000",
        "BRIDGE_MCP_SECRET": "<mismo-token>",
        "BRIDGE_TENANT_SLUG": "vectoria"
      }
    }
  }
}
```

**Notas de seguridad:**
- `.vscode/mcp.json` debe ir en `.gitignore` porque contiene el secret.
- Proveer `.vscode/mcp.json.example` sin el token para documentar la estructura.
- En producción, `BRIDGE_URL` apunta a `https://vectoria-zeta.vercel.app`.
- El secret debe tener mínimo 32 caracteres aleatorios. Generar con `openssl rand -hex 32`.

---

## 9. Variables de Entorno Requeridas

| Variable | Dónde | Descripción |
|----------|-------|-------------|
| `BRIDGE_MCP_SECRET` | Bridge `.env.local` + VS Code mcp.json | Token compartido para autenticar el MCP |
| `BRIDGE_URL` | VS Code mcp.json | URL base de Bridge (local o producción) |
| `BRIDGE_TENANT_SLUG` | VS Code mcp.json | Slug del tenant activo (ej: `vectoria`) |

---

## 10. Configuración del package MCP

```json
// Bridge/mcp/package.json
{
  "name": "bridge-mcp",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0"
  }
}
```

El script de build debe incluirse en el `postinstall` o instrucciones del README para que SOFIA sepa compilarlo.

---

## 11. Criterios de Aceptación

| # | Criterio | Verificación |
|---|----------|-------------|
| CA-1 | `bridge_list_assets` retorna lista de activos con `hasActiveSpec` correcto | Test unitario + smoke test manual |
| CA-2 | `bridge_get_asset_context` retorna contexto completo incluyendo briefSummary cuando existe | Test unitario |
| CA-3 | `bridge_write_production_spec` crea nueva versión y la anterior queda `superseded` | Test unitario con mock de DB |
| CA-4 | El diseñador ve el nuevo prompt en `/disenador` sin cambios de UI (ya usa `activePrompt`) | Verificación manual en Vercel |
| CA-5 | Las 3 rutas API retornan 401 si el token es incorrecto o falta | Test unitario de middleware |
| CA-6 | El MCP server arranca con `node dist/index.js` sin errores | `npm run build && node dist/index.js` devuelve proceso estable |
| CA-7 | VS Code detecta el server en `.vscode/mcp.json` y muestra las 3 herramientas disponibles | Verificación manual en panel de Copilot Chat |
| CA-8 | `bridge_write_production_spec` con `assetId` inexistente retorna `{ ok: false, error: "asset_not_found" }` | Test unitario |
| CA-9 | El `build` del proyecto Bridge pasa sin errores con las nuevas rutas | `npm run build` verde |
| CA-10 | Los tests nuevos pasan junto con los 313 existentes | `npm test` verde |

---

## 12. Tests a Implementar

### MCP Server (en `Bridge/mcp/src/__tests__/`)

1. `list-assets.test.ts` — mock de fetch hacia Bridge API, verifica serialización.
2. `write-production-spec.test.ts` — mock de fetch, verifica payload enviado.
3. `auth.test.ts` — verifica que sin token o con token incorrecto las tools retornan error.

### Bridge API (en `Bridge/app/api/v1/`)

1. `assets.route.test.ts` — verifica 200 con token válido, 401 sin token.
2. `assets-id-prompts.route.test.ts` — verifica creación y supersesión.

### lib/assets.ts

1. Tests para `createOrUpdateAssetPrompt` verificando que supersede correctamente.

---

## 13. Archivos a Crear / Modificar

### Crear

| Archivo | Descripción |
|---------|-------------|
| `Bridge/mcp/package.json` | Paquete del MCP server |
| `Bridge/mcp/tsconfig.json` | Config TypeScript del MCP |
| `Bridge/mcp/src/index.ts` | Entry point stdio server |
| `Bridge/mcp/src/config.ts` | Lee env vars |
| `Bridge/mcp/src/bridge-client.ts` | Wrapper de fetch hacia Bridge API |
| `Bridge/mcp/src/tools/list-assets.ts` | Tool: listar activos |
| `Bridge/mcp/src/tools/get-asset-context.ts` | Tool: contexto de activo |
| `Bridge/mcp/src/tools/write-production-spec.ts` | Tool: escribir spec |
| `Bridge/app/api/v1/assets/route.ts` | GET /api/v1/assets |
| `Bridge/app/api/v1/assets/[id]/context/route.ts` | GET /api/v1/assets/:id/context |
| `Bridge/app/api/v1/assets/[id]/prompts/route.ts` | POST /api/v1/assets/:id/prompts |
| `Bridge/lib/agent-auth.ts` | Middleware de verificación de token para rutas v1 |
| `.vscode/mcp.json.example` | Template de configuración VS Code |

### Modificar

| Archivo | Cambio |
|---------|--------|
| `Bridge/lib/assets.ts` | Agregar `createOrUpdateAssetPrompt()` |
| `Bridge/.gitignore` | Agregar `.vscode/mcp.json` y `Bridge/mcp/dist/` |
| `Bridge/README.md` o doc equivalente | Sección de setup del MCP |

---

## 14. Orden de Implementación (para SOFIA)

1. **Función base** → `createOrUpdateAssetPrompt` en `lib/assets.ts` + tests.
2. **Auth middleware** → `lib/agent-auth.ts` + tests.
3. **Rutas API** → las 3 rutas en `app/api/v1/` + tests de cada una.
4. **MCP package** → estructura base + `bridge-client.ts` + `config.ts`.
5. **MCP tools** → las 3 tools con tests unitarios (mocks de Bridge API).
6. **MCP entry point** → `index.ts` conectando todo.
7. **VS Code config** → `.vscode/mcp.json.example`.
8. **Verificación** → build verde + tests verdes + smoke test manual.

---

## 15. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| VS Code no detecta el MCP server | Media | Verificar VS Code 1.99+ y formato exacto del `mcp.json` |
| El secret se comitea al repo | Alta sin medida | `.gitignore` en paso 7, nunca remover |
| `supersede` falla parcialmente | Baja | Transacción: si el UPDATE falla, no hacer INSERT |
| Latencia alta hacia Vercel desde VS Code | Media | Aceptable para V1. Caché futura si necesario |
| El diseñador ve spec vieja en cache | Media | Las rutas de designer ya usan `cache: "no-store"` |

---

## 16. Próximos pasos después de esta SPEC

Una vez implementada y validada:

- **ARCH-20260510-09:** Expandir el MCP con tools para briefs (agregar mensaje de briefing, obtener resumen).
- **ARCH-20260510-10:** MCP tool para crear activos nuevos desde VS Code (actualmente se crean desde Bridge UI).
- Considerar convertir el MCP server en un paquete publicado en npm bajo `@vectoria/bridge-mcp`.

---

*Documento generado por INTEGRA - Arquitecto. Intervención ARCH-20260510-08.*  
*Respaldo: `Bridge/context/CONTRATOS_AGENTES_Y_VSCODE_V1.md`, `Bridge/context/00_ARQUITECTURA.md`*
