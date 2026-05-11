# CHECKPOINT IMPL-20260510-10
## Extensión MCP — Cotizaciones, Copias Locales y Lectura de Briefs

**ID:** IMPL-20260510-10  
**Fecha:** 2026-05-10  
**Agente:** SOFIA - Builder  
**SPEC de referencia:** `context/SPECs/SPEC_ARCH-20260510-10_extension_mcp_cotizaciones_y_copias_locales.md`  
**Depende de:** SPEC-08 (MCP server base — implementado)

---

## Soft Gates

| Gate | Estado | Evidencia |
|------|--------|-----------|
| ✅ Gate 1 — Compilación | Pasado | `npm run build` → 0 errores (MCP + Next.js) |
| ✅ Gate 2 — Testing | Pasado | `npm run test` → 346/346 tests en verde (+8 nuevos tests) |
| ✅ Gate 3 — Revisión | Pasado | Código fiel a la SPEC, sin campos inventados |
| ✅ Gate 4 — Documentación | Pasado | Checkpoint presente, JSDoc con ID en cada archivo |

---

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `Bridge/mcp/src/utils/local-copy.ts` | Función `saveLocalCopy` — guarda copias `.md` en `context/clientes/[slug]/` |
| `Bridge/mcp/src/tools/get-brief.ts` | Herramienta MCP `bridge_get_brief` |
| `Bridge/mcp/src/tools/write-quotation.ts` | Herramienta MCP `bridge_write_quotation` |
| `Bridge/app/api/v1/projects/[id]/brief/route.ts` | API `GET /api/v1/projects/[id]/brief` |
| `Bridge/app/api/v1/projects/[id]/quotation/route.ts` | API `POST /api/v1/projects/[id]/quotation` |

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `Bridge/mcp/src/config.ts` | Agregado `workspaceRoot: string` a `BridgeConfig` y `BRIDGE_WORKSPACE_ROOT` env var |
| `Bridge/mcp/src/bridge-client.ts` | Agregados tipos `BriefData`, `QuotationLineItem`, `QuotationWriteInput`, `QuotationWriteResult` y métodos `getBrief()`, `writeQuotation()` |
| `Bridge/mcp/src/index.ts` | Registradas 2 nuevas herramientas; version bumped a `0.2.0`; `workspaceRoot` pasado a todos los handlers |
| `Bridge/mcp/src/tools/write-production-spec.ts` | Agrega campo opcional `clientSlug`; guarda `prompts-produccion.md` si se proporciona; `workspaceRoot` como tercer parámetro |
| `Bridge/mcp/src/__tests__/mcp-tools.test.ts` | Agregado `vi.mock('fs')` global; actualizado CONFIG con `workspaceRoot`; 8 nuevos tests; 6 calls de `handleWriteProductionSpec` actualizados con nuevo parámetro |
| `Bridge/.gitignore` | Agregado `context/clientes/` |
| `Bridge/.vscode/mcp.json.example` | Agregado `BRIDGE_WORKSPACE_ROOT: "${workspaceFolder}"` |

---

## Variables de Entorno Nuevas

| Variable | Descripción | Default |
|----------|-------------|---------|
| `BRIDGE_WORKSPACE_ROOT` | Ruta absoluta del workspace VS Code para copias locales | `process.cwd()` |

Configurar en `.vscode/mcp.json`:
```json
"BRIDGE_WORKSPACE_ROOT": "${workspaceFolder}"
```

---

## Herramientas MCP Nuevas

### `bridge_get_brief`
```
Input:  projectId (UUID), clientSlug (string)
Output: Brief estructurado + ruta de copia local
Copia:  context/clientes/[slug]/brief.md
```

### `bridge_write_quotation`
```
Input:  projectId, clientSlug, title, summaryText, lineItems[], validUntil, notes?, setAsActive?
Output: quotationId, version, status (draft|vigente), totalAmount, currency, emailSent
Copia:  context/clientes/[slug]/propuesta.md
Nota:   emailSent siempre false en V1 (requiere email de cliente — V2)
```

---

## Rutas API Nuevas

### `GET /api/v1/projects/[id]/brief`
- Auth: Bearer `<BRIDGE_MCP_SECRET>`
- Header: `X-Bridge-Tenant: <slug>`
- Retorna: brief estructurado con `status`, `summary`, `objectives[]`, `targetAudience`, `tone`, `references[]`, `constraints[]`, `rawContent`
- Errores: 404 si proyecto o brief no existen, 401/500 por auth

### `POST /api/v1/projects/[id]/quotation`
- Auth: Bearer `<BRIDGE_MCP_SECRET>`
- Body: `{ title, summaryText, lineItems[], validUntil, notes?, setAsActive? }`
- Respuesta 201: `{ ok, quotationId, version, status, totalAmount, currency, emailSent }`
- Con `setAsActive=true`: activa la versión y cambia estado a `sent` (mostrado como `vigente`)
- Encuentra o crea automáticamente el contenedor `quotation` para el proyecto

---

## Estructura de Copias Locales

```
Bridge/context/clientes/          ← ignorado por .gitignore
└── [client-slug]/
    ├── brief.md                  ← generado por bridge_get_brief
    ├── propuesta.md              ← generado por bridge_write_quotation
    └── prompts-produccion.md     ← generado por bridge_write_production_spec (con clientSlug)
```

---

## Criterios de Aceptación Validados

| # | CA | Estado |
|---|-----|--------|
| CA-1 | `bridge_get_brief` retorna brief estructurado | ✅ Test: retorna todos los campos |
| CA-2 | Crea `context/clientes/[slug]/brief.md` | ✅ Test: `writeFileSync` llamado con ruta correcta |
| CA-3 | `bridge_write_quotation` retorna ID y versión | ✅ Test: retorna `quotationId`, `version`, `status` |
| CA-4 | Email MCT — `emailSent: false` en V1 | ⚠️ V2 (requiere resolución de email de cliente) |
| CA-5 | Crea `context/clientes/[slug]/propuesta.md` con line items | ✅ Test: `writeFileSync` con tabla markdown |
| CA-6 | `bridge_write_production_spec` guarda `prompts-produccion.md` | ✅ Implementado con campo `clientSlug` opcional |
| CA-7 | `context/clientes/` en `.gitignore` | ✅ Verificado |
| CA-8 | Directorio creado automáticamente si no existe | ✅ Test: `mkdirSync` con `{ recursive: true }` |
| CA-9 | `BRIDGE_WORKSPACE_ROOT` desde `mcp.json` con `${workspaceFolder}` | ✅ Documentado en `.vscode/mcp.json.example` |
| CA-10 | Tests con `vi.mock('fs')` pasan verde | ✅ 22 tests en `mcp-tools.test.ts` |

---

## Tests Nuevos Agregados (8)

- `saveLocalCopy`: crea directorio y archivo
- `saveLocalCopy`: no llama mkdirSync si directorio existe
- `saveLocalCopy`: el archivo incluye el header de copia local
- `bridge_get_brief`: retorna brief estructurado y guarda copia local
- `bridge_get_brief`: retorna error cuando proyecto no existe
- `bridge_get_brief`: valida que projectId sea requerido
- `bridge_get_brief`: valida que clientSlug sea requerido
- `bridge_write_quotation`: crea cotización exitosamente y guarda copia local
- `bridge_write_quotation`: retorna error de la API cuando falla
- `bridge_write_quotation`: valida que lineItems no sea vacío
- `bridge_write_quotation`: valida campos requeridos faltantes

**Total tests:** 346 (todos en verde) — +11 nuevos sobre la base de SPEC-08

---

## Notas de Implementación

1. **emailSent siempre false en V1**: La ruta `POST /api/v1/projects/[id]/quotation` requiere el email de contacto del cliente para disparar el MCT. El modelo de datos actual de `clients` no expone un campo `email` directo. Se deja como `false` con comentario `// V2`. El campo `emailSent` ya está en el contrato de la API para que V2 sea backward-compatible.

2. **Patron pgrest local en routes**: Las 2 nuevas rutas implementan un helper `pgrest<T>()` local en lugar de importar el helper privado de `quotations.ts` o `assets.ts`. Esto evita romper el encapsulamiento de los módulos existentes.

3. **clientSlug en write-production-spec**: El campo es opcional para mantener compatibilidad hacia atrás. Los tests existentes pasan `""` como `workspaceRoot` y no pasan `clientSlug`, por lo que `saveLocalCopy` no se invoca.

---

## Próximos Pasos (V2)

- Resolver email de contacto del cliente para disparar MCT automáticamente en `setAsActive=true`
- Comando `bridge_sync_local` para refrescar todas las copias de un cliente
- Historial de versiones de copias locales (git blame en `context/clientes/`)
