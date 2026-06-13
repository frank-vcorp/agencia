# SPEC ARCH-20260612-02

## Título
Dashboard Diseñador V2 — Estación Creativa Refinada: Densidad Óptima, Mecanismos Completos y Flujo Firefly Integrado

## Estado
Planificado

## Fecha
2026-06-12

## ID de Decisión
ARCH-20260612-02

## Objetivo
Validar y refinar la **Estación Creativa** actual (`/disenador` → `DesignerWorkspaceView`) para garantizar:
1. **Densidad de información óptima** — Sin espacio desperdiciado, sin scroll innecesario
2. **Mecanismos completos** — Todos los flujos SPEC base cubiertos con UI dedicada
3. **Integración Firefly real** — No solo referencias, sino workflow de ida/vuelta
4. **Versionado legible** — Evidencia intermedia vs candidata vs final bien diferenciada
5. **Handoffs limpios** — Salidas claras a Operador, Cliente y Agente

## Contexto y Problema
La implementación actual (`components/designer-workspace.tsx`, `app/disenador/page.tsx`) es **sólida y avanzada** (layout 3 zonas, cola priorizada, canvas enfocado, rail derecho con contexto + chat). Sin embargo, la verificación contra SPEC base (ARCH-20260504-04, líneas 226-238, 387-400, 748-763) revela:

| Requisito SPEC | Estado Actual | Gap |
|----------------|---------------|-----|
| Recibir briefs y prompts | ✅ | — |
| Cargar referencias visuales | ⚠️ | Solo texto en `projectContext`, no gallery/upload |
| Trabajar con Firefly | ⚠️ | Solo `suggestedTool` label, sin enlace/integración real |
| Revisar/aprobar bocetos IA | ✅ | `proposalDrafts` con `reviewDecision` |
| Subir versiones y entregables | ⚠️ | `proposalDrafts` existe pero sin upload de archivos binarios |
| Dejar comentarios decisiones/bloqueos | ✅ | `draft.note` + `task.suggestedAction` |
| **No editar cotizaciones** | ✅ | Respetado (no expuesto) |
| **No ver info financiera** | ✅ | Respetado |
| **No modificar config global** | ✅ | Respetado |

**Gaps críticos**: Referencias visuales (gallery/upload), Integración Firefly real (deep link + callback), Upload de archivos binarios para versiones.

## Principios de UX — No Negociables

### 1. Canvas Central = Mesa de Trabajo, No Dashboard
El 70% del tiempo del diseñador está en el activo enfocado. Cero ruido, cero métricas decorativas. Solo: Brief → Prompt → Formato → Propuestas → Acción.

### 2. Cola Izquierda = Navegación, No Lista Pasiva
Cada item en cola debe mostrar **estado accionable** y permitir **cambio de estado inline** (ej: `ready_to_start` → `in_progress` con un click).

### 3. Rail Derecho = Contexto Just-in-Time + Asistente
Contexto del proyecto solo lo necesario para el activo actual. Asistente de producción (Vika) contextualizado al activo enfocado.

### 4. Versionado Visual Explícito
Tres niveles visualmente distintos:
- **Evidencia/Exploración** (gris, sin decisión)
- **Candidata** (amarillo, `reviewDecision: "pending"`)
- **Aprobada por Diseño** (verde, `reviewDecision: "approved_designer"`)
- **Aprobada Final** (azul, `status: "approved_final"`)

### 5. Firefly = Enlace Profundo + Retorno Estructurado
No "abrir Firefly en pestaña nueva". Debe ser: `[Abrir en Firefly]` → deep link con prompt + referencias → Usuario trabaja → `[Enviar a Bridge]` → Callback recibe asset + metadata → Crea `ProposalDraft` automáticamente.

## Layout Refinado (3 Zonas — Optimizado)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HEADER MINIMAL: Proyecto activo | Sesión | Notificaciones (operador)       │
├──────────────┬──────────────────────────────────────┬──────────────────────┤
│              │                                      │                      │
│  ZONA IZQ    │         ZONA CENTRAL (CANVAS)        │    ZONA DER          │
│  (260px)     │         (flex-1, min-w-0)            │    (300px)           │
│              │                                      │                      │
│  ┌────────┐  │  ┌────────────────────────────────┐  │  ┌────────────────┐  │
│  │ JORNADA│  │  │ CABECERA ACTIVO                │  │  │ CONTEXTO       │  │
│  │ + ESTADO│  │  │ [Cliente·Proyecto] [Kind] [St] │  │  │ PROYECTO       │  │
│  ├────────┤  │  ├────────────────────────────────┤  │  │ [Solo lo       │  │
│  │        │  │  │ ACCIÓN SUGERIDA (prominente)   │  │  │  necesario     │  │
│  │ COLA   │  │  ├────────────────────────────────┤  │  │  para ESTE     │  │
│  │ PRIORI-│  │  │ BRIEF OPERATIVO (colapsable)   │  │  │  activo)]      │  │
│  │ TIZADA │  │  ├────────────────────────────────┤  │  ├────────────────┤  │
│  │        │  │  │ PROMPT VIGENTE (editable inline)│  │  │ ASISTENTE      │  │
│  │ [Items │  │  ├────────────────────────────────┤  │  │ PRODUCCIÓN     │  │
│  │  con   │  │  │ ESPEC TÉCNICA (chips)          │  │  │ (Vika Chat)    │  │
│  │  estado│  │  ├────────────────────────────────┤  │  │ [Contextual    │  │
│  │  inline│  │  │ REFERENCIAS VISUALES (GALLERY) │  │  │  al activo]    │  │
│  │  +     │  │  │ [Upload] [Firefly Deep Link]   │  │  │                │  │
│  │  acción│  │  ├────────────────────────────────┤  │  ├────────────────┤  │
│  │  1-clic]│  │  │ PROPUESTAS (versionado visual) │  │  │ ACCIONES       │  │
│  │        │  │  │ [Exploración] [Candidata] [✓]  │  │  │ [Marcar ✓]     │  │
│  └────────┘  │  │  │  [Enviar a Operador]         │  │  │ [Subir Archivo]│  │
│              │  │  │                                │  │  │ [Abrir Firefly]│  │
│              │  └────────────────────────────────┘  │  └────────────────┘  │
└──────────────┴──────────────────────────────────────┴──────────────────────┘
```

### Cambios Clave vs Actual
| Actual | Refinado | Razón |
|--------|----------|-------|
| Cola: solo navegación | Cola: **estado inline + acción 1-clic** | Reduce clicks, acelera flujo |
| Referencias: solo texto en `projectContext` | **Gallery visual + Upload** en canvas | SPEC exige "cargar referencias visuales" |
| Firefly: solo label `suggestedTool` | **Deep link + Callback automático** | SPEC exige "trabajar con Firefly" real |
| Propuestas: lista plana | **Versionado visual 3 niveles** | SPEC: "distinguir evidencia, candidata, final" |
| Rail derecho: contexto completo | **Contexto filtrado por activo** | Densidad: solo lo relevante |
| Sin upload binarios | **Upload drag-drop en referencias y propuestas** | SPEC: "subir versiones y entregables" |

## Especificación por Componente

### 1. LeftRail — Cola Priorizada Accionable (`LeftRailActionable`)

**Jornada Header** (existente, mantener):
- Fecha, totales (en cola, completadas, bloqueadas), minutos efectivos, timestamp

**Sesión Activa** (existente, mantener):
- Estado (activa/bloqueada), minutos transcurridos, razón bloqueo

**Cola de Producción** — Cada `LeftRailTaskItem` gana:
```tsx
// NUEVO: Acciones inline en hover/focus
<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
  {task.status === "ready_to_start" && (
    <Button size="xs" onClick={() => startTask(task.assetId)}>▶ Iniciar</Button>
  )}
  {task.status === "in_progress" && (
    <Button size="xs" variant="outline" onClick={() => blockTask(task.assetId)}>⏸ Bloquear</Button>
  )}
  {task.status === "in_progress" && (
    <Button size="xs" onClick={() => openFireflyDeepLink(task)}>🔥 Firefly</Button>
  )}
  {task.status === "ready_for_review" && (
    <Button size="xs" onClick={() => markCandidate(task.assetId)}>✓ Candidata</Button>
  )}
</div>
```
- **Indicador visual de kind**: `captura` (gris) vs `produccion` (naranja) — ya existe `TaskOperationalBadge`
- **Drag-to-reorder** (opcional V2): Reordenar prioridad en cola

### 2. WorkCanvas — Activo Enfocado (Refinado)

#### 2.1 Cabecera Activo (Compacta)
```tsx
<div className="flex items-start justify-between gap-3 p-4 bg-accent-soft rounded-2xl">
  <div className="min-w-0">
    <p className="text-xs uppercase tracking-wide text-muted">{clientName} · {projectName}</p>
    <h2 className="text-xl font-bold truncate">{assetTitle}</h2>
  </div>
  <div className="flex items-center gap-2 shrink-0">
    <TaskOperationalBadge task={task} />
    <TaskStatusBadge status={task.status} />
  </div>
</div>
```

#### 2.2 Acción Sugerida (Prominente, Siempre Visible)
```tsx
<div className="mt-3 p-3 bg-white/80 rounded-xl ring-1 ring-accent-soft/50">
  <p className="text-xs uppercase tracking-wide text-muted">Siguiente paso</p>
  <p className="font-medium">{task.suggestedAction}</p>
  <div className="mt-2 flex flex-wrap gap-2">
    {/* Botones contextuales según status + kind */}
  </div>
</div>
```

#### 2.3 Brief Operativo (Colapsable, Filtrado)
- Solo muestra campos **relevantes para el activo actual**:
  - `projectObjective` → Siempre
  - `offerSummary` → Siempre
  - `toneSummary` → Si `pieceTypeCode` ∈ {copy, text_ad, landing_section}
  - `nonNegotiables` → Siempre (máx 3, "No romper")
  - `audience` → Si `placement` ∈ {conversion, awareness}
- `[Ver brief completo]` → Link a `/briefs`

#### 2.4 Prompt Vigente (Editable Inline)
```tsx
<div className="mt-3 p-3 rounded-xl ring-1 ring-line bg-white">
  <div className="flex items-center justify-between">
    <p className="text-xs uppercase tracking-wide text-muted">Prompt vigente</p>
    <span className="text-xs text-muted">v{promptVersion}</span>
  </div>
  <textarea
    value={task.promptText}
    onChange={(e) => updatePrompt(task.assetId, e.target.value)}
    className="mt-2 w-full min-h-[120px] p-2 text-sm font-mono bg-transparent resize-y"
    placeholder="Sin prompt activo. Solicita al operador que lo defina."
  />
  <div className="mt-2 flex items-center gap-2 text-xs text-muted">
    <span>Herramienta: {TOOL_LABELS[task.suggestedTool]}</span>
    <span>Formato: {task.formatCode}</span>
  </div>
</div>
```
- **Auto-save** con debounce 500ms
- **Historial de prompts** → Drawer lateral (icono reloj)

#### 2.5 Especificación Técnica (Chips Compactos)
```tsx
<div className="flex flex-wrap gap-2">
  <Chip>{task.applicationCode}</Chip>
  <Chip>{task.pieceTypeCode}</Chip>
  <Chip>{task.placementCode}</Chip>
  <Chip>{task.formatCode}</Chip>
</div>
```

#### 2.6 Referencias Visuales — **NUEVO CRÍTICO**
```tsx
<div className="mt-4">
  <div className="flex items-center justify-between mb-2">
    <p className="text-xs uppercase tracking-wide text-muted">Referencias visuales</p>
    <Button size="sm" onClick={openFileUpload}>+ Subir</Button>
  </div>
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
    {task.references.map((ref) => (
      <div key={ref.id} className="relative aspect-square rounded-lg overflow-hidden ring-1 ring-line">
        <Image src={ref.url} alt={ref.name} fill className="object-cover" />
        {ref.isPrimary && <span className="absolute top-1 left-1 badge badge-primary">Principal</span>}
        <button className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded" onClick={() => deleteReference(ref.id)}>×</button>
      </div>
    ))}
    {/* Drop zone */}
    <div className="col-span-full flex items-center justify-center h-32 border-2 border-dashed border-line rounded-lg">
      <input type="file" multiple accept="image/*,video/*" onChange={handleReferenceUpload} className="hidden" ref={fileInputRef} />
      <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>Arrastrar o click para subir referencias</Button>
    </div>
  </div>
</div>
```
- **Tipos**: Imagen (jpg/png/webp) + Video (mp4/webm) — max 50MB c/u
- **Principal**: Una marcada como referencia principal para prompt
- **Persistencia**: Supabase Storage → `asset_references` table

#### 2.7 Firefly Deep Link — **NUEVO CRÍTICO**
```tsx
function FireflyDeepLinkButton({ task }: { task: DesignerTask }) {
  const deepLink = buildFireflyDeepLink({
    prompt: task.promptText,
    aspectRatio: parseFormatToAspectRatio(task.formatCode), // "9:16" → 9/16
    referenceImages: task.references.filter(r => r.isPrimary).map(r => r.url),
    contentType: task.pieceTypeCode, // "image" | "video" | "text"
  });

  return (
    <a
      href={deepLink}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:opacity-90 transition"
    >
      <FireIcon className="w-4 h-4" />
      Abrir en Firefly
    </a>
  );
}
```
**Callback de retorno** (implementado en `/api/firefly/callback`):
- Recibe: `assetId`, `generatedImages[]`, `generatedVideo`, `metadata`
- Crea `ProposalDraft` automáticamente con:
  - `toolUsed: "firefly"`
  - `hasEvidence: true`
  - `evidenceUrls: generatedImages`
  - `note: "Generado vía Firefly deep link"`
  - `reviewDecision: "pending"`

#### 2.8 Propuestas — Versionado Visual 3 Niveles
```tsx
{proposalDrafts.map((draft, i) => (
  <ProposalDraftCardV2
    key={draft.id}
    draft={draft}
    level={getDraftLevel(draft, proposalDrafts)} // "exploration" | "candidate" | "approved_designer" | "approved_final"
    onPromote={(id) => promoteDraft(id)}
    onDemote={(id) => demoteDraft(id)}
    onSendToOperator={(id) => sendToOperator(id)}
    onUploadFile={(id, file) => uploadDraftFile(id, file)}
  />
))}

function getDraftLevel(draft, allDrafts) {
  if (draft.reviewDecision === "approved_final") return "approved_final";
  if (draft.reviewDecision === "approved_designer") return "approved_designer";
  if (draft.reviewDecision === "pending" && draft.isPrimary) return "candidate";
  return "exploration";
}
```

**Estilos por nivel**:
| Nivel | Badge | Fondo | Borde | Acción Principal |
|-------|-------|-------|-------|------------------|
| Exploración | `🔬 Exploración` | `bg-slate-50` | `ring-slate-200` | `[Promover a Candidata]` |
| Candidata | `⭐ Candidata` | `bg-amber-50` | `ring-amber-200` | `[Enviar a Operador]` / `[Subir Archivo Final]` |
| Aprobada Diseño | `✅ Aprobada Diseño` | `bg-emerald-50` | `ring-emerald-200` | `[Ver en Activos]` |
| Aprobada Final | `🏁 Entregada` | `bg-blue-50` | `ring-blue-200` | — |

### 3. RightRail — Contexto Filtrado + Asistente (Refinado)

#### 3.1 Contexto del Proyecto (Solo lo Relevante)
```tsx
function ProjectContextFiltered({ context, activeAsset }) {
  // Filtrar según activeAsset.pieceTypeCode y placementCode
  const relevant = {
    objective: context.projectObjective,
    offer: context.offerSummary,
    tone: activeAsset.pieceTypeCode === "copy" ? context.toneSummary : null,
    nonNegotiables: context.nonNegotiables.slice(0, 3),
    audience: activeAsset.placementCode === "conversion" ? context.audience : null,
  };
  // Render solo campos non-null
}
```

#### 3.2 Asistente de Producción (Vika Chat) — Contextualizado
- Recibe `assetContext` del activo enfocado (ya implementado en `app/disenador/page.tsx`)
- **NUEVO**: Acciones rápidas en chat:
  - `[Mejorar Prompt]` → Vika sugiere variaciones
  - `[Revisar Referencias]` → Vika analiza imágenes subidas
  - `[Generar Checklist]` → Checklist técnico por formato/plataforma

#### 3.3 Acciones Rápidas (Sticky Bottom)
```tsx
<div className="sticky bottom-0 p-3 border-t border-line bg-white/95 backdrop-blur">
  <Button className="w-full" onClick={() => markApprovedDesigner(focusedAsset.assetId)}>
    ✅ Marcar Aprobada por Diseño
  </Button>
  <Button variant="outline" className="w-full mt-2" onClick={() => openFileUploadForFinal()}>
    📎 Subir Archivo Final
  </Button>
  <Button variant="ghost" className="w-full mt-2" onClick={() => sendToOperator(focusedAsset.assetId)}>
    ➡️ Enviar a Operador
  </Button>
</div>
```

## Mecanismos de Integración Firefly (Contrato)

### Deep Link Builder
```typescript
function buildFireflyDeepLink(params: {
  prompt: string;
  aspectRatio: number; // width/height
  referenceImages: string[]; // URLs accesibles públicamente
  contentType: "image" | "video" | "text";
}): string {
  const base = "https://firefly.adobe.com/create";
  const query = new URLSearchParams({
    prompt: params.prompt,
    ar: params.aspectRatio.toFixed(2),
    ...(params.referenceImages.length > 0 && { refs: params.referenceImages.join(",") }),
    mode: params.contentType === "video" ? "video" : "image",
  });
  return `${base}?${query.toString()}`;
}
```

### Callback Endpoint
```
POST /api/firefly/callback
Headers: Authorization: Bearer <service-token>
Body: {
  assetId: string;
  generatedImages: string[]; // URLs temporales Firefly
  generatedVideo?: string;
  metadata: { model, seed, steps, ... };
}
Response: { proposalDraftId: string; status: "created" }
```

### Download + Persistencia
- Job background descarga `generatedImages` a Supabase Storage
- Actualiza `ProposalDraft.evidenceUrls` con URLs permanentes
- Notifica al diseñador (toast + badge en cola)

## Permisos (Refuerzo SPEC Base)
| Acción | Permitido |
|--------|-----------|
| Ver proyectos asignados | ✅ |
| Consultar briefing y contexto | ✅ |
| Subir activos y referencias visuales | ✅ |
| Registrar prompts y decisiones creativas | ✅ |
| Aprobar bocetos a nivel creativo | ✅ |
| Comentar | ✅ |
| Editar cotizaciones finales | ❌ |
| Ver información financiera completa | ❌ |
| Modificar configuración global del cliente | ❌ |

## Criterios de Aceptación

1. **Cola accionable**: Click "▶ Iniciar" en item `ready_to_start` → Status → `in_progress` + session start + toast
2. **Referencias visuales**: Drag-drop 3 imágenes en canvas → Gallery muestra thumbnails + una marcada "Principal" → Prompt actualizado con referencia
3. **Firefly deep link**: Click "🔥 Firefly" → Abre Firefly con prompt + aspect ratio + referencia principal → Usuario genera → Click "Enviar a Bridge" → Callback crea `ProposalDraft` con `toolUsed: "firefly"` + `hasEvidence: true`
4. **Versionado visual**: 3 propuestas en canvas → Una `exploration` (gris), una `candidate` (amarillo, primary), una `approved_designer` (verde) → Diferenciación visual inmediata sin leer texto
5. **Promoción inline**: Click "⭐ Promover a Candidata" en exploración → Sube a candidata, anterior candidata baja a exploración, toast confirmación
6. **Envío a operador**: Click "➡️ Enviar a Operador" en candidata → Status → `ready_for_review` + notificación operador + handoff creado
7. **Upload archivo final**: Click "📎 Subir Archivo Final" → File picker → Upload a Storage → `ProposalDraft` actualizado con `finalFileUrl` + `reviewDecision: "approved_final"`
8. **Contexto filtrado**: Cambio de activo en cola → Rail derecho actualiza solo campos relevantes (tone solo para copy, audience solo para conversion)
9. **Responsive**: Mobile → Cola en drawer, canvas full-width, rail en acordeones; Tablet → Cola 240px fija, rail 280px fija
10. **Performance**: Canvas load < 800ms, referencias lazy-loaded, Firefly deep link generado client-side

## Referencias
- SPEC Base: ARCH-20260504-04 (líneas 226-238, 387-400, 748-763)
- SPECs relacionadas: ARCH-20260506-40, ARCH-20260506-41, ARCH-20260506-52, ARCH-20260513-20, ARCH-20260514-01
- Implementación actual: `app/disenador/page.tsx`, `components/designer-workspace.tsx`, `lib/designer-workspace.ts`
- Catálogo P0: `context/CATALOGO_ACTIVOS_V1.md`, `context/MATRIZ_COMBINACIONES_ACTIVOS_P0.md`

## Decisión Final
Esta SPEC **refina** (no reemplaza) la Estación Creativa actual. Los cambios son quirúrgicos: cola accionable, referencias visuales + upload, Firefly deep link + callback, versionado visual 3 niveles, contexto filtrado por activo. El layout 3 zonas y la arquitectura de `DesignerWorkspaceView` se mantienen como base sólida.