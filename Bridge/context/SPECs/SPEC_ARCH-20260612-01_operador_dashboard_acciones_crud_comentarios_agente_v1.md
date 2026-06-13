# SPEC ARCH-20260612-01

## Título
Dashboard Operador V2 — Acciones CRUD, Comentarios Contextuales e Integración con Agente Remoto

## Estado
Planificado

## Fecha
2026-06-12

## ID de Decisión
ARCH-20260612-01

## Objetivo
Evolucionar el radar actual (solo lectura) a una **Cabina de Control operativa completa** que permita al operador estratégico:
1. Ejecutar acciones CRUD sobre entidades clave (briefs, cotizaciones, activos, proyectos, clientes)
2. Dejar comentarios contextuales anclados a entidades
3. Recibir y validar propuestas estructuradas del agente remoto (VS Code)
4. Disparar acciones operables por agente sobre entidades de Bridge
5. Mantener visibilidad de radar priorizado como capa base

## Contexto y Problema
El dashboard actual (`/operador` → `OperatorRadarView`) es **solo visualización**. La SPEC base (ARCH-20260504-04, líneas 367-385, 738-746) exige que el operador pueda:
- "crear y editar clientes, proyectos, briefs, cotizaciones y activos"
- "aprobar entregables"
- "dejar instrucciones globales"
- "recibir propuestas estructuradas del agente para crear activos con cajas ya preseleccionadas"
- "disparar acciones operables por agente sobre entidades de Bridge"

Ninguno de estos mecanismos existe hoy.

## Principios de UX — No Negociables

### 1. Radar como Capa Base, No Pantalla Completa
El radar priorizado **no desaparece**. Se convierte en el panel izquierdo (cola de proyectos) y el canvas central muestra el detalle accionable del proyecto seleccionado.

### 2. Densidad de Información Alta, Sin Ruido
El operador gestiona múltiples proyectos. Cada pixel debe servir para decisión. Nada de cards decorativas sin acción.

### 3. Acciones Primarias a un Click
Crear brief, editar cotización, aprobar activo, comentar → todo accesible sin navegar a rutas separadas salvo edición compleja.

### 4. Comentarios Anclados, No Flotantes
Cada comentario vive en la entidad a la que pertenece (brief, cotización, activo, proyecto, lead). Visibles en el detalle, no en feed global.

### 5. Integración Agente = Propuestas Estructuradas + Acciones Disparables
- **Entrada**: Agente envía payload estructurado (asset spec, brief draft, quotation draft) → Operador valida/ajusta/confirma
- **Salida**: Operador dispara acción (sync_to_vscode, regenerate_context, create_asset_from_catalog) → Agente ejecuta

## Arquitectura de la Cabina (Layout 3 Zonas)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HEADER GLOBAL: Tenant | Usuario | Notificaciones (agente, aprobaciones)    │
├──────────────┬──────────────────────────────────────┬──────────────────────┤
│              │                                      │                      │
│  ZONA IZQ    │         ZONA CENTRAL                 │    ZONA DER          │
│  (280px)     │         (flex-1, min-w-0)            │    (320px)           │
│              │                                      │                      │
│  ┌────────┐  │  ┌────────────────────────────────┐  │  ┌────────────────┐  │
│  │ FILTROS│  │  │ DETALLE PROYECTO SELECCIONADO  │  │  │ ACCIONES RÁPIDAS│ │
│  │ + BUSCA│  │  │                                │  │  │                │  │
│  ├────────┤  │  ├────────────────────────────────┤  │  ├────────────────┤  │
│  │        │  │  │ TABS: Brief | Cotización |     │  │  │ 🤖 AGENTE      │  │
│  │ RADAR  │  │  │ Activos | CRM | Contexto       │  │  │ Propuestas     │  │
│  │ PRIORI-│  │  │                                │  │  │ Pendientes: N  │  │
│  │ TIZADO │  │  │ [Contenido accionable por tab] │  │  │                │  │
│  │        │  │  │                                │  │  ├────────────────┤  │
│  │ [Cards │  │  │                                │  │  │ 💬 COMENTARIOS │  │
│  │  con   │  │  │                                │  │  │ Contexto actual│  │
│  │  score │  │  │                                │  │  │ + Nuevo        │  │
│  │  risk  │  │  │                                │  │  │                │  │
│  │  action│  │  │                                │  │  ├────────────────┤  │
│  │  1-clic]│  │  │                                │  │  │ ⚡ ACCIONES    │  │
│  │        │  │  │                                │  │  │ Disparar agente│  │
│  └────────┘  │  └────────────────────────────────┘  │  └────────────────┘  │
│              │                                      │                      │
└──────────────┴──────────────────────────────────────┴──────────────────────┘
```

### Responsive
- **Mobile (<768px)**: Stack vertical — Radar → Detalle → Acciones/Comentarios (acordeones)
- **Tablet (768-1279px)**: Radar colapsable (drawer) + Detalle + Rail derecho fijo
- **Desktop (≥1280px)**: 3 zonas fijas como arriba

## Especificación por Zona

### ZONA IZQUIERDA — Radar Priorizado Accionable (280px fijo)

**Componente**: `OperatorRadarActionable` (extiende `OperatorRadarView`)

**Cada tarjeta de proyecto (`RadarProjectCardActionable`)** incluye:
- Cliente / Proyecto / Risk Badge / Priority Score (existente)
- **Alerta principal** (existente)
- **Acción primaria 1-clic** (NUEVO): Botón contextual según estado:
  - `brief: "draft"` → "Editar Brief"
  - `quotation: "draft"` → "Editar Cotización"
  - `quotation: "sent"` → "Ver Respuesta Cliente"
  - `asset: "in_review"` → "Aprobar/Devolver"
  - `asset: "approved_designer"` → "Validar Final"
  - `crm: "nuevo"` → "Contactar Lead"
- **Acceso rápido a tabs** (existente, mantener)
- **Indicador de propuestas de agente pendientes** (NUEVO): Badge 🤖 N en tarjeta

**Filtros superiores**:
- Search por cliente/proyecto
- Filter por risk level (critical/high/medium/low)
- Filter por módulo con acción pendiente (briefs/cotizaciones/activos/crm)
- Sort: priorityScore desc / idleHours asc / updatedAt desc

### ZONA CENTRAL — Detalle Accionable por Proyecto (flex-1)

**Componente**: `OperatorProjectDetail` — Vista con tabs accionables

#### Tab 1: Brief (`/operador/[projectId]?tab=briefs`)
- **Estado actual**: Badge (draft/consolidado/pending_review/aprobado)
- **Contenido**: Structured summary editable (campos: objetivo, plataforma, público, oferta, referencias, restricciones, entregable)
- **Acciones**:
  - `[Editar Brief]` → Modal/Inline edit de campos estructurados
  - `[Consolidar]` → Marca brief como `consolidado` + genera snapshot para agente
  - `[Enviar a Cliente]` → Cambia a `pending_client_response` + notifica
  - `[Ver Chat Cliente]` → Link a `/cliente/proyecto/[id]`
  - `[Historial versiones]` → Drawer lateral

#### Tab 2: Cotización (`?tab=cotizaciones`)
- **Versión vigente** visible con diff vs anterior
- **Estados**: borrador / enviada / aprobada / facturada / pagada
- **Acciones**:
  - `[Crear Versión]` → Formulario guiado (line items + validez + notas)
  - `[Marcar Vigente]` → Solo operador (restricción SPEC)
  - `[Enviar a Cliente]` → Status `sent` + notifica
  - `[Ver Comentarios Cliente]` → Thread anclado a versión

#### Tab 3: Activos (`?tab=activos`)
- **Lista tipificada** por catálogo P0 (aplicativo/pieza/placement/formato)
- **Estados**: pendiente / en_exploración / candidato / aprobado_diseñador / aprobado_final / descartado
- **Acciones**:
  - `[Solicitar Activo]` → Abre modal con catálogo P0 preseleccionado → Crea asset en Bridge + notifica diseñador
  - `[Ver Detalle]` → Link a `/activos/[assetId]` (ficha completa)
  - `[Aprobar/Devolver]` → En estados `candidato` / `aprobado_diseñador`
  - `[Comentar]` → Thread anclado al asset

#### Tab 4: CRM (`?tab=crm`)
- **Leads** con estado: nuevo / contactado / propuesta_enviada / ganado / perdido
- **Acciones**:
  - `[Contactar]` → Abre WhatsApp/Email con template
  - `[Mover Etapa]` → Dropdown inline
  - `[Anotar]` → Comentario anclado al lead

#### Tab 5: Contexto Agentes (`?tab=contexto-agentes`)
- **Snapshot actual** (generadoAt, versión origen, frescura)
- **Acciones**:
  - `[Regenerar Snapshot]` → Dispara agente remoto
  - `[Enviar a VS Code]` → Payload estructurado al endpoint agente
  - `[Ver Diff]` → Compara snapshot actual vs anterior

### ZONA DERECHA — Rail de Acciones y Contexto (320px fijo)

#### Sección 1: 🤖 Propuestas del Agente (Prioridad Alta)
```typescript
type AgentProposal = {
  id: string;
  type: "create_asset" | "draft_brief" | "draft_quotation" | "sync_context" | "regenerate_snapshot";
  payload: any; // Estructura según tipo
  status: "pending" | "applied" | "rejected" | "modified";
  receivedAt: string;
  agentId: string;
};
```
- **Lista** de propuestas `pending` ordenadas por `receivedAt`
- **Cada propuesta**: Card con resumen + `[Revisar]` → Abre modal comparativo (actual vs propuesto) + `[Aplicar]` / `[Modificar]` / `[Rechazar]`
- **Badge contador** en header global y en tarjeta radar

#### Sección 2: 💬 Comentarios Contextuales
- **Contexto activo**: Determinado por tab central + entidad seleccionada
- **Thread**: Comentarios anclados a (project, brief, quotation, asset, lead)
- **Nuevo comentario**: Textarea + `@mencion` (operador, diseñador, agente) + `[Publicar]`
- **Visibilidad**: Interno (solo operador/diseñador) vs Cliente (visible en portal)

#### Sección 3: ⚡ Acciones Disparables al Agente
Botones de acción única que envían comando al endpoint remoto:
- `[Sincronizar Contexto]` → `POST /agent/sync-context { projectId }`
- `[Regenerar Snapshot]` → `POST /agent/regenerate-snapshot { projectId }`
- `[Crear Activo desde Catálogo]` → `POST /agent/create-asset { projectId, catalogSelection }`
- `[Prellenar Brief]` → `POST /agent/draft-brief { projectId, signals }`
- `[Prellenar Cotización]` → `POST /agent/draft-quotation { projectId, briefId }`

## Mecanismos de Integración Agente (Contrato Mínimo)

### Endpoint Entrada (Agente → Bridge)
```
POST /api/agent/proposals
Headers: Authorization: Bearer <agent-token>, X-Agent-ID: <id>
Body: AgentProposal (sin id, status, receivedAt)
Response: { proposalId, status: "pending" }
```

### Endpoint Salida (Bridge → Agente)
```
POST /api/agent/actions
Headers: Authorization: Bearer <service-token>
Body: { action: "sync_context" | "regenerate_snapshot" | "create_asset" | "draft_brief" | "draft_quotation", projectId, payload }
Response: { actionId, status: "dispatched" }
```

### Webhook Agente (Opcional V1)
```
POST /api/bridge/webhook/agent-result
Body: { actionId, result: "success" | "error", data, errorMessage }
```

## Permisos (Refuerzo SPEC Base)
| Acción | Permitido |
|--------|-----------|
| Ver todo | ✅ |
| Crear/editar clientes, proyectos, briefs, cotizaciones, activos | ✅ |
| Aprobar entregables (activos, briefs, cotizaciones) | ✅ |
| Revisar CRM y estadísticas completas | ✅ |
| Dejar instrucciones globales y comentarios contextuales | ✅ |
| Marcar cotización vigente | ✅ (solo operador) |
| Aplicar/Rechazar propuestas de agente | ✅ |
| Disparar acciones a agente | ✅ |

## Criterios de Aceptación

1. **Radar accionable**: Al click en "Editar Brief" en tarjeta radar → Abre tab Brief en zona central con formulario precargado
2. **CRUD completo**: Operador puede crear brief desde cero, editar campos estructurados, consolidar, enviar a cliente sin salir de `/operador`
3. **Comentarios anclados**: Comentario escrito en tab Activos → Visible en ficha `/activos/[id]` y en rail derecho con contexto correcto
4. **Propuesta agente**: Agente envía `create_asset` → Badge 🤖 aparece en radar + en rail → Operador revisa diff → Aplica → Asset creado en Bridge con status `pendiente` + notificación a diseñador
5. **Acción disparada**: Operador click `[Sincronizar Contexto]` → Agent recibe payload → Responde webhook → Snapshot actualizado en tab Contexto Agentes
6. **Responsive**: En mobile, radar colapsa a drawer, tabs centrales scrollables, rail derecho en acordeones
7. **Performance**: Carga inicial < 1.5s, tabs lazy-loaded, radar virtualizado si >50 proyectos

## Referencias
- SPEC Base: ARCH-20260504-04 (líneas 214-225, 367-385, 738-746)
- Implementación actual: `app/operador/page.tsx`, `components/operator-radar.tsx`, `lib/operator-radar.ts`
- Catálogo P0: `context/CATALOGO_ACTIVOS_V1.md`, `context/MATRIZ_COMBINACIONES_ACTIVOS_P0.md`
- Integración VS Code: `context/SPECs/SPEC_ARCH-20260527-01_unificacion_config_mcp_workspace_bridge.md`

## Decisión Final
Esta SPEC reemplaza la vista de solo lectura actual por una cabina operativa completa. El radar priorizado se mantiene como capa de navegación y priorización, pero cada tarjeta expone la acción primaria inmediata. La zona central se convierte en workspace accionable por tabs. La zona derecha centraliza la interfaz humano-agente (propuestas entrantes + acciones salientes + comentarios contextuales).