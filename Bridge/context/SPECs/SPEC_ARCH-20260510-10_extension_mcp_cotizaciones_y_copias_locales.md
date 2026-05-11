# SPEC ARCH-20260510-10: Extensión MCP — Cotizaciones, Copias Locales y Lectura de Briefs

**ID:** ARCH-20260510-10
**Agente autor:** INTEGRA - Arquitecto
**Fecha:** 2026-05-10
**Estado:** Autorizada — lista para SOFIA (implementar después de SPEC-08)
**Prioridad:** Alta — completa el flujo de propuesta desde VS Code
**Puntaje de prioridad:** (Valor 9 × 3) + (Urgencia 8 × 2) - (Complejidad 5 × 0.5) = 40.5
**Depende de:** SPEC-08 (MCP server base)

---

## 1. Contexto y Motivación

La SPEC-08 estableció el MCP server base con 3 herramientas enfocadas en activos creativos y specs de producción. El flujo operativo de Frank tiene un segmento anterior que aún no está cubierto:

**El ciclo de propuesta desde VS Code:**

1. Frank le pide a su agente que lea el brief del cliente → necesita `bridge_get_brief`
2. El agente trabaja localmente con el brief y genera la propuesta/cotización
3. El agente escribe la cotización en Bridge → necesita `bridge_write_quotation`
4. El agente guarda copias `.md` locales de brief + propuesta para consulta offline

Sin estas 3 capacidades, el agente debe abrir Bridge manualmente para leer el brief y no puede escribir cotizaciones desde VS Code.

**Decisión de diseño — Copias locales `.md`:**

Frank necesita tener copias legibles en VS Code de los documentos operativos clave (brief, propuesta, prompts de producción). Esto no reemplaza a Bridge como fuente de verdad — es un artefacto de trabajo local que el agente genera automáticamente junto con cada operación MCP. Frank puede consultarlos en cualquier momento sin invocar al agente ni conectarse a Bridge.

---

## 2. Objetivo

Extender el MCP server (SPEC-08) con:
1. Nueva herramienta `bridge_get_brief` — leer el brief consolidado de un proyecto.
2. Nueva herramienta `bridge_write_quotation` — escribir/actualizar la cotización de un proyecto.
3. Capacidad de guardado automático de copias `.md` locales en `context/clientes/[slug]/`.

---

## 3. Alcance de esta SPEC

### Incluye

1. 2 nuevas herramientas MCP: `bridge_get_brief` y `bridge_write_quotation`.
2. 2 nuevas rutas API en Bridge: `GET /api/v1/projects/[id]/brief` y `POST /api/v1/projects/[id]/quotation`.
3. Función `saveLocalCopy(type, slug, content)` en el MCP server que escribe `.md` en `context/clientes/`.
4. Lógica de guardado automático integrada en todas las herramientas MCP que leen o escriben datos de cliente.
5. Tests unitarios de las nuevas herramientas (mock de Bridge API y mock de `fs`).

### Excluye

- Sincronización bidireccional — el `.md` local es solo lectura para Frank, la fuente de verdad es Bridge.
- Herramientas MCP para proyectos o clientes (crear/listar clientes ya está en los endpoints V1, puede agregarse en SPEC futura).
- Generación automática de PDFs de cotización (V2).

---

## 4. Estructura de Copias Locales

El agente crea y mantiene esta estructura automáticamente en el workspace de VS Code:

```
Bridge/
└── context/
    └── clientes/
        └── [client-slug]/          ← Slug del cliente (ej: techcorp)
            ├── brief.md            ← Copia del brief consolidado
            ├── propuesta.md        ← Copia de la cotización activa
            └── prompts-produccion.md  ← Copia de los prompts de activos (de SPEC-08)
```

**Reglas:**
- Se crea el directorio si no existe.
- Si el archivo ya existe, se sobreescribe (la copia siempre refleja el estado más reciente leído/escrito).
- El encabezado del `.md` incluye: `# [Tipo] — [Nombre cliente] — [Proyecto]`, la fecha de sincronización y la fuente (`Bridge/Supabase`).
- `context/clientes/` debe agregarse a `.gitignore` (son copias de trabajo, no parte del repositorio).

---

## 5. Nueva Herramienta: `bridge_get_brief`

### Descripción

Lee el brief consolidado de un proyecto desde Bridge y guarda copia local.

### Input

```typescript
{
  projectId: string    // UUID del proyecto en Bridge
  clientSlug: string   // Slug del cliente (para nombrar la copia local)
}
```

### Output

```typescript
{
  projectId: string
  projectName: string
  clientName: string
  status: 'draft' | 'in_progress' | 'completed'
  summary: string          // Resumen ejecutivo del brief
  objectives: string[]     // Objetivos del proyecto
  targetAudience: string   // Público objetivo
  tone: string             // Tono de comunicación
  references: string[]     // Referencias visuales o de marca
  constraints: string[]    // Restricciones o restricciones
  rawContent: string       // Contenido completo del brief en markdown
  localCopyPath: string    // Ruta donde se guardó la copia local
}
```

### Nueva ruta API requerida en Bridge

```
GET /api/v1/projects/[id]/brief
Authorization: Bearer <BRIDGE_MCP_SECRET>
X-Bridge-Tenant: <tenant-slug>

Response 200:
{
  "project": { "id": "...", "name": "..." },
  "brief": {
    "status": "completed",
    "summary": "...",
    "objectives": ["..."],
    "targetAudience": "...",
    "tone": "...",
    "references": ["..."],
    "constraints": ["..."],
    "rawContent": "..."
  }
}
```

### Comportamiento del MCP

1. Llama a `GET /api/v1/projects/[id]/brief`.
2. Construye el contenido markdown del brief.
3. Llama a `saveLocalCopy('brief', clientSlug, markdownContent)`.
4. Retorna los datos estructurados + la ruta de la copia local.

---

## 6. Nueva Herramienta: `bridge_write_quotation`

### Descripción

Escribe o actualiza la cotización de un proyecto en Bridge desde VS Code. Guarda copia local de la propuesta.

### Input

```typescript
{
  projectId: string           // UUID del proyecto en Bridge
  clientSlug: string          // Slug del cliente (para copia local)
  title: string               // Título de la cotización (ej: "Propuesta Mayo 2026")
  summaryText: string         // Descripción ejecutiva de la propuesta
  lineItems: Array<{
    description: string       // Descripción del ítem
    quantity: number          // Cantidad
    unitPrice: number         // Precio unitario
    currency: 'MXN' | 'USD'  // Moneda
  }>
  validUntil: string          // Fecha ISO de vencimiento (ej: "2026-06-10")
  notes?: string              // Notas adicionales opcionales
  setAsActive?: boolean       // Si true, cambia estado a 'vigente' y dispara MCT
}
```

### Output

```typescript
{
  quotationId: string
  version: number
  status: 'draft' | 'vigente'
  totalAmount: number
  currency: string
  localCopyPath: string
  emailSent: boolean           // true si setAsActive=true y MCT fue disparado
}
```

### Nueva ruta API requerida en Bridge

```
POST /api/v1/projects/[id]/quotation
Authorization: Bearer <BRIDGE_MCP_SECRET>
X-Bridge-Tenant: <tenant-slug>
Content-Type: application/json

Body: {
  "title": "...",
  "summaryText": "...",
  "lineItems": [...],
  "validUntil": "2026-06-10",
  "notes": "...",
  "setAsActive": true
}

Response 201: {
  "quotationId": "uuid",
  "version": 1,
  "status": "vigente",
  "totalAmount": 15000,
  "currency": "MXN"
}
```

**Comportamiento del handler en Bridge:**
- Crea una nueva cotización versionada en Supabase.
- Si `setAsActive: true`, actualiza estado a `vigente` y dispara `sendTransactionalEmail('quotation.active', ...)` (SPEC-09).
- Retorna el estado final.

### Comportamiento del MCP

1. Valida el input.
2. Llama a `POST /api/v1/projects/[id]/quotation`.
3. Construye el markdown de la propuesta con los line items y totales.
4. Llama a `saveLocalCopy('propuesta', clientSlug, markdownContent)`.
5. Retorna resultado + ruta de copia local.

---

## 7. Función `saveLocalCopy`

```typescript
// Bridge/mcp/src/utils/local-copy.ts

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, resolve } from 'path'

export type LocalCopyType = 'brief' | 'propuesta' | 'prompts-produccion'

/**
 * Guarda una copia .md en context/clientes/[slug]/[type].md
 * Relativo al workspace raíz (donde está el mcp configurado)
 */
export function saveLocalCopy(
  type: LocalCopyType,
  clientSlug: string,
  content: string,
  workspaceRoot: string
): string {
  const dir = resolve(workspaceRoot, 'context', 'clientes', clientSlug)
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  
  const filename = `${type}.md`
  const filepath = join(dir, filename)
  
  const header = `<!-- Copia local generada por Bridge MCP — ${new Date().toISOString()} -->\n<!-- Fuente de verdad: Bridge/Supabase. No editar manualmente. -->\n\n`
  
  writeFileSync(filepath, header + content, 'utf-8')
  
  return filepath
}
```

**`workspaceRoot`** se pasa desde la configuración del MCP server (variable de entorno `BRIDGE_WORKSPACE_ROOT` o inferido del `cwd` al iniciar el servidor).

---

## 8. Actualización al MCP server (SPEC-08)

La función `saveLocalCopy` también debe integrarse en la herramienta `bridge_write_production_spec` de la SPEC-08, para que al escribir una spec de producción también se actualice `context/clientes/[slug]/prompts-produccion.md`.

**Modificación en `Bridge/mcp/src/tools/write-production-spec.ts`:**
```typescript
// Agregar al final del handler, después de escribir en Bridge
const localPath = saveLocalCopy('prompts-produccion', clientSlug, promptsMarkdown, workspaceRoot)
return { ..., localCopyPath: localPath }
```

---

## 9. Variables de Entorno Adicionales (MCP server)

```bash
# .env en Bridge/mcp/ o pasado vía mcp.json
BRIDGE_WORKSPACE_ROOT=/home/frank/proyectos/agencia/Bridge
```

O configurado en `.vscode/mcp.json`:
```json
{
  "servers": {
    "bridge": {
      "command": "node",
      "args": ["./mcp/dist/index.js"],
      "env": {
        "BRIDGE_MCP_SECRET": "${env:BRIDGE_MCP_SECRET}",
        "BRIDGE_API_URL": "https://vectoria-zeta.vercel.app",
        "BRIDGE_TENANT_SLUG": "vectoria",
        "BRIDGE_WORKSPACE_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

El uso de `${workspaceFolder}` de VS Code asegura que la ruta siempre apunte al directorio correcto del workspace.

---

## 10. Ejemplo de uso en chat de VS Code

```
Frank: @bridge bridge_get_brief projectId="uuid-del-proyecto" clientSlug="techcorp"

Agente: ✅ Brief leído correctamente.
Cliente: TechCorp S.A.
Proyecto: Campaña Mayo 2026
Estado: Completado
Resumen: Software contable para PyMEs en LATAM. Tono: profesional pero accesible...
📄 Copia guardada en: context/clientes/techcorp/brief.md

---

Frank: Basándote en ese brief, genera la cotización para el banner de Facebook.
Agente: [genera propuesta con line items]

---

Frank: @bridge bridge_write_quotation projectId="uuid" clientSlug="techcorp" 
       title="Propuesta Mayo 2026" summaryText="..." lineItems=[...] 
       validUntil="2026-06-10" setAsActive=true

Agente: ✅ Cotización #1 publicada como vigente.
Total: $15,000 MXN
📧 Email enviado automáticamente a contacto@techcorp.com
📄 Copia guardada en: context/clientes/techcorp/propuesta.md
```

---

## 11. Criterios de Aceptación

| # | Criterio | Verificación |
|---|----------|-------------|
| CA-1 | `bridge_get_brief` retorna el brief estructurado con todos los campos | Test con mock de Bridge API |
| CA-2 | `bridge_get_brief` crea `context/clientes/[slug]/brief.md` con el contenido | Verificar archivo creado con contenido correcto |
| CA-3 | `bridge_write_quotation` crea la cotización en Bridge y retorna ID y versión | Test con mock + verificar en Bridge UI |
| CA-4 | Con `setAsActive=true`, el email MCT se dispara automáticamente | Verificar log de Resend o mock en tests |
| CA-5 | `bridge_write_quotation` crea `context/clientes/[slug]/propuesta.md` con line items formateados | Verificar archivo con tabla markdown de line items |
| CA-6 | `bridge_write_production_spec` (SPEC-08) también guarda copia en `prompts-produccion.md` | Ejecutar herramienta y verificar archivo |
| CA-7 | `context/clientes/` está en `.gitignore` de Bridge | `git status` no muestra los archivos de clientes |
| CA-8 | Si el directorio no existe, se crea automáticamente | Test con directorio nuevo |
| CA-9 | `BRIDGE_WORKSPACE_ROOT` toma `${workspaceFolder}` de VS Code via `mcp.json` | Verificar ruta generada en copia local |
| CA-10 | Tests unitarios pasan con `vi.mock('fs')` para `writeFileSync` | `npm run test` verde |

---

## 12. Orden de Implementación para SOFIA

> **Prerrequisito:** SPEC-08 implementada y funcionando.

1. Agregar `BRIDGE_WORKSPACE_ROOT` a la configuración del MCP server (`Bridge/mcp/src/config.ts`).
2. Crear `Bridge/mcp/src/utils/local-copy.ts` con la función `saveLocalCopy`.
3. Crear ruta API `GET /api/v1/projects/[id]/brief` en Bridge.
4. Crear herramienta `bridge_get_brief` en `Bridge/mcp/src/tools/get-brief.ts`.
5. Crear ruta API `POST /api/v1/projects/[id]/quotation` en Bridge.
6. Crear herramienta `bridge_write_quotation` en `Bridge/mcp/src/tools/write-quotation.ts`.
7. Registrar las 2 nuevas herramientas en `Bridge/mcp/src/index.ts`.
8. Modificar `write-production-spec.ts` para agregar guardado de copia local.
9. Agregar `context/clientes/` a `Bridge/.gitignore`.
10. Actualizar `.vscode/mcp.json.example` con la variable `BRIDGE_WORKSPACE_ROOT`.
11. Escribir tests para las 2 nuevas herramientas y para `saveLocalCopy`.
12. Verificar `npm run build && npm run test` verde.

---

## 13. Notas para V2

- Sincronización automática inversa: si Frank edita el `.md` local, el agente puede detectar cambios y ofrecerle sincronizar con Bridge.
- Comando MCP `bridge_sync_local` para forzar actualización de todas las copias locales de un cliente.
- Historial de versiones de las copias locales (git blame del directorio `context/clientes/`).
