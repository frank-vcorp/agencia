# SPEC ARCH-20260612-03

## Título
Portal Cliente V2 — Briefing Conversacional con File Upload, Estados Claros y Visibilidad Controlada

## Estado
Planificado

## Fecha
2026-06-12

## ID de Decisión
ARCH-20260612-03

## Objetivo
Completar el **Portal del Cliente** (`/cliente` + `/cliente/proyecto/[id]`) para cubrir al 100% la SPEC base (ARCH-20260504-04, líneas 239-250, 401-413, 765-781) añadiendo:
1. **File Upload en Briefing Conversacional** — Imágenes, PDFs, documentos de contexto
2. **Estados Visuales Claros** — Cada documento/entregable muestra estado inequívoco
3. **Visibilidad Controlada** — Solo lo autorizado, sin ruido interno
4. **Mecanismos Completos** — Responder, aprobar, revisar, consultar, participar

## Contexto y Problema
La implementación actual tiene dos partes:

| Ruta | Componente | Estado |
|------|------------|--------|
| `/cliente` | `ClientPage` → `getClientPortal()` | **Completo**: Dashboard con 5 bloques (qué sigue, estado proyecto, revisiones, resultados por canal, leads) |
| `/cliente/proyecto/[id]` | `ClientProjectPage` → `ClientBriefChatView` | **Parcial**: Chat conversacional con Vika **SIN file upload** |

**Gap crítico identificado**: SPEC base línea 246: *"subir imágenes o archivos de contexto"*. El chat actual (`components/client-brief-chat.tsx`) solo acepta texto. No hay mecanismo para adjuntar archivos durante el briefing.

**Otras observaciones**:
- Estados de documentos (brief, cotización, activos) son claros en `ClientPortal` pero **no en el chat de briefing**
- El chat muestra "En revisión / Brief aprobado" pero no integra los `reviewItems` (cotizaciones/activos) dentro de la conversación
- Falta indicador visual de "acción requerida" persistente en header

## Principios de UX — No Negociables

### 1. Briefing = Conversación + Archivos, No Solo Texto
El cliente debe poder **arrastrar/soltar imágenes, PDFs, docs** en cualquier momento del chat. Vika (agente) debe poder referenciarlos en sus preguntas.

### 2. Estados Inequívocos, Lenguaje de Cliente
No "pending_operator_review". Sí: *"Nuestro equipo está revisando tu información"*.
No "approved_locked". Sí: *"Brief confirmado — Preparando tu propuesta"*.

### 3. Una Sola Pantalla por Proyecto
El cliente **no navega entre tabs**. Todo vive en `/cliente/proyecto/[id]`:
- Chat de briefing (con archivos)
- Cotización vigente (accionable)
- Activos para revisar (accionables)
- Leads/resultados (solo lectura)
- Historial de comentarios (thread único)

### 4. Cero Ruido Interno
Nunca mostrar: notas internas, pipeline CRM, estados técnicos, comentarios privados operador↔diseñador.

### 5. Progreso Visible Siempre
Header persistente con: **Etapa actual** + **Próxima acción** + **Indicador de completitud**.

## Arquitectura del Portal por Proyecto (Single Page)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HEADER PERSISTENTE (sticky top)                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [Logo]  Proyecto: "Lanzamiento Verano"  │  Etapa: 2/3 Definimos    │   │
│  │                                    │  los detalles      ▼          │   │
│  │  Próxima acción: "Revisar propuesta"  │  [●●○] 66% completado     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CHAT DE BRIEFING (Vika)                          │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ Vika: "¿Cuál es tu producto estrella?"                      │   │   │
│  │  │ ─────────────────────────────────────────────────────────  │   │   │
│  │  │ 📎 [Imagen: producto.jpg]  Tú: "Este es nuestro café..."   │   │   │
│  │  │ ─────────────────────────────────────────────────────────  │   │   │
│  │  │ Vika: "Perfecto. ¿Tienes logo o referencias visuales?"     │   │   │
│  │  │ ─────────────────────────────────────────────────────────  │   │   │
│  │  │ 📎 [PDF: brand-guidelines.pdf]  Tú: "Aquí están..."        │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ [📎 Adjuntar]  [Escribe tu mensaje...]          [Enviar]   │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DOCUMENTOS Y ENTREGABLES                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │  │ 📄 COTIZACIÓN   │  │ 🖼️ ACTIVOS      │  │ 📊 RESULTADOS   │     │   │
│  │  │ Vigente v2      │  │ 3 para revisar  │  │ Facebook: 12    │     │   │
│  │  │ 🟡 Pendiente    │  │ 🟢 1 aprobado   │  │ WhatsApp: 5     │     │   │
│  │  │  [Revisar]      │  │  [Ver todos]    │  │  [Ver detalle]  │     │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CONTACTOS Y SEGUIMIENTO                          │   │
│  │  [Lista leads visibles: nombre, canal, estado, fecha]              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Responsive
- **Mobile (<640px)**: Stack vertical, chat colapsable, cards apiladas, header compacto
- **Tablet (640-1023px)**: Chat 60% + sidebar 40% (documentos/resultados/leads)
- **Desktop (≥1024px)**: Layout arriba, chat max-w-3xl centrado, sidebar derecha fija

## Especificación por Componente

### 1. Header Persistente — `ClientProjectHeader`

```tsx
interface ClientProjectHeaderProps {
  projectName: string;
  currentStage: { key: "discovery" | "precision" | "commercial_fit"; label: string; status: ProjectStageStatus; active: boolean }[];
  nextAction: NextClientAction; // { type, label, detail, href, requiresAction }
  completionPct: number; // 0-100
}

function ClientProjectHeader({ projectName, currentStage, nextAction, completionPct }) {
  const activeStage = currentStage.find(s => s.active) ?? currentStage[0];
  
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-line px-4 py-3 md:px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-soft flex items-center justify-center">
            <LogoIcon className="w-5 h-5 text-accent-deep" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Proyecto activo</p>
            <h1 className="font-heading text-lg font-bold truncate">{projectName}</h1>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
          {/* Etapa + Progreso */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted">
                Etapa {currentStage.findIndex(s => s.active) + 1}/3: {activeStage.label}
              </p>
              <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all" style={{ width: `${completionPct}%` }} />
              </div>
            </div>
            <div className="text-right md:hidden">
              <p className="text-xs text-muted">{completionPct}% completado</p>
            </div>
          </div>
          
          {/* Próxima Acción — Prominente si requiresAction */}
          {nextAction.requiresAction && (
            <a
              href={nextAction.href ?? "#"}
              className="inline-flex items-center gap-2 px-3 py-2 bg-accent-soft text-accent-deep rounded-xl text-sm font-medium hover:bg-accent-deep hover:text-white transition"
            >
              <AlertCircleIcon className="w-4 h-4" />
              <span>{nextAction.label}</span>
              <ChevronRightIcon className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
```

**Estados de Etapa (derivados de `deriveBriefStages`)**:
| Stage Key | Label Cliente | Status Mapping |
|-----------|---------------|----------------|
| `discovery` | "Entendimos tu necesidad" | `completado` → ✅ Verde, `en_revision` → 🟡 Amarillo, `pendiente` → ⚪ Gris |
| `precision` | "Definimos los detalles" | Same |
| `commercial_fit` | "Validamos la solución" | Same |

### 2. Chat de Briefing con File Upload — `ClientBriefChatViewV2`

**Extiende `ClientBriefChatView` actual** añadiendo:

#### 2.1 Tipos de Mensaje Ampliados
```typescript
type ClientMessageContent = 
  | { type: "text"; text: string }
  | { type: "file"; file: ClientUploadedFile; caption?: string }
  | { type: "mixed"; text: string; files: ClientUploadedFile[] };

interface ClientUploadedFile {
  id: string; // UUID temporal
  name: string;
  mimeType: string;
  size: number;
  url: string; // Blob URL temporal → luego Supabase Storage
  previewUrl?: string; // Para imágenes/video
  uploadedAt: string;
  status: "uploading" | "ready" | "error";
}
```

#### 2.2 Composer con Adjuntos
```tsx
function ClientComposer({ onSend, disabled, isPending }) {
  const [files, setFiles] = useState<ClientUploadedFile[]>([]);
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []).map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      mimeType: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      previewUrl: file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : undefined,
      uploadedAt: new Date().toISOString(),
      status: "ready" as const,
    }));
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = "";
  };
  
  const handleSend = () => {
    const content: ClientMessageContent = files.length > 0
      ? text.trim() ? { type: "mixed", text: text.trim(), files } : { type: "file", file: files[0], caption: text.trim() }
      : { type: "text", text: text.trim() };
    
    if (content.type === "text" && !content.text) return;
    
    onSend(content, files);
    setText("");
    setFiles([]);
  };
  
  return (
    <div className="border-t border-line p-3 bg-white">
      {/* Preview adjuntos */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg ring-1 ring-line">
              {f.previewUrl && <img src={f.previewUrl} className="w-8 h-8 rounded object-cover" />}
              <span className="text-xs truncate max-w-[150px]">{f.name}</span>
              <span className="text-[10px] text-muted">({formatBytes(f.size)})</span>
              <button onClick={() => setFiles(prev => prev.filter(x => x.id !== f.id))} className="text-muted hover:text-red-500">×</button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-end gap-2">
        <label className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition cursor-pointer">
          <input type="file" ref={fileInputRef} multiple accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFileSelect} className="hidden" />
          <PaperclipIcon className="w-5 h-5 text-muted" />
        </label>
        
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
          placeholder="Escribe tu mensaje o adjunta archivos..."
          rows={1}
          className="flex-1 min-h-[44px] max-h-[120px] px-3 py-2 text-sm border border-line rounded-xl resize-none outline-none focus:border-accent"
          disabled={disabled || isPending}
          inputMode="text"
          enterKeyHint="send"
        />
        
        <button
          onClick={handleSend}
          disabled={disabled || isPending || (!text.trim() && files.length === 0)}
          className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
```

#### 2.3 Render de Mensajes con Archivos
```tsx
function ClientMessageBubble({ message, isOptimistic }) {
  const content = message.content as ClientMessageContent; // Asumiendo migración de messageText
  
  return (
    <article className={`max-w-[85%] ${message.authorRole === "client" ? "ml-auto" : "mr-auto"} ${isOptimistic ? "opacity-75" : ""}`}>
      <div className={`rounded-2xl p-3 ${message.authorRole === "client" 
        ? "rounded-br-none bg-green-100 text-stone-900" 
        : message.authorRole === "operator" 
          ? "rounded-bl-none bg-sky-100 text-sky-950" 
          : "rounded-bl-none bg-white text-stone-800"
      }`}>
        <div className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wide opacity-60 mb-1">
          <span>{messageAuthor(message.authorRole)}</span>
          <span>{formatShortDateTime(message.createdAt)}</span>
        </div>
        
        {content.type === "text" && <p className="whitespace-pre-wrap">{content.text}</p>}
        
        {content.type === "file" && (
          <FileAttachmentView file={content.file} caption={content.caption} />
        )}
        
        {content.type === "mixed" && (
          <>
            {content.text && <p className="whitespace-pre-wrap">{content.text}</p>}
            <div className="flex flex-wrap gap-2 mt-1">
              {content.files.map(f => <FileAttachmentView key={f.id} file={f} />)}
            </div>
          </>
        )}
        
        {isOptimistic && <p className="mt-1 text-[10px] text-amber-600">Enviando...</p>}
      </article>
    </article>
  );
}

function FileAttachmentView({ file, caption }) {
  const isImage = file.mimeType.startsWith("image/");
  const isVideo = file.mimeType.startsWith("video/");
  const isPDF = file.mimeType === "application/pdf";
  
  return (
    <div className="group relative rounded-lg overflow-hidden ring-1 ring-line bg-white">
      {file.previewUrl && (
        <a href={file.url} target="_blank" rel="noopener" className="block">
          {isImage && <img src={file.previewUrl} className="w-full aspect-square object-cover" />}
          {isVideo && <video src={file.previewUrl} className="w-full aspect-square object-cover" muted />}
          {isPDF && (
            <div className="w-full aspect-square flex items-center justify-center bg-red-50">
              <FileTextIcon className="w-12 h-12 text-red-500" />
            </div>
          )}
        </a>
      )}
      {!file.previewUrl && (
        <div className="w-full aspect-square flex items-center justify-center bg-slate-50">
          <FileIcon className="w-12 h-12 text-slate-400" />
        </div>
      )}
      {caption && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/70 text-white text-xs">
          {caption}
        </div>
      )}
      <a href={file.url} target="_blank" rel="noopener" className="absolute inset-0" aria-label={`Descargar ${file.name}`} />
    </div>
  );
}
```

#### 2.4 Persistencia de Archivos
- **Temporal**: Blob URL durante sesión → `message.content.files[].url`
- **Al enviar**: Upload a Supabase Storage (`client-uploads/{projectId}/{messageId}/{fileId}`)
- **Referencia final**: `message.content.files[].url` = URL permanente Storage
- **Límite**: 10 archivos/mensaje, 50MB c/u, tipos: image/*, video/*, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain

### 3. Sección Documentos y Entregables — `ClientProjectDocuments`

```tsx
function ClientProjectDocuments({ reviewItems, activeProjectId }) {
  // reviewItems viene de ClientPortal: quotation (sent) + asset (in_review)
  
  const quotations = reviewItems.filter(r => r.type === "quotation");
  const assets = reviewItems.filter(r => r.type === "asset");
  
  return (
    <section className="px-4 py-3 md:px-6">
      <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Documentos y entregables</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {/* Cotización */}
        {quotations.length > 0 && (
          <ClientDocumentCard
            icon={<FileTextIcon />}
            title={`Cotización ${quotations[0].title}`}
            status={quotations[0].currentDecision ? "decided" : "pending"}
            statusLabel={quotations[0].currentDecision ? `Decidido: ${quotations[0].currentDecision}` : "Pendiente de tu revisión"}
            actionLabel="Revisar propuesta"
            actionHref={`/cliente/cotizacion/${quotations[0].id}`}
            accent="accent"
          />
        )}
        
        {/* Activos */}
        {assets.length > 0 && (
          <ClientDocumentCard
            icon={<ImageIcon />}
            title={`${assets.length} activo${assets.length !== 1 ? "s" : ""} para revisar`}
            status={assets.some(a => a.currentDecision === "approve") ? "partial" : "pending"}
            statusLabel={assets.filter(a => a.currentDecision).length > 0 
              ? `${assets.filter(a => a.currentDecision).length} decidid${assets.filter(a => a.currentDecision).length !== 1 ? "os" : "o"}`
              : "Pendientes de revisión"}
            actionLabel="Ver piezas"
            actionHref={`/cliente/activos?project=${activeProjectId}`}
            accent="emerald"
          />
        )}
        
        {/* Resultados */}
        <ClientDocumentCard
          icon={<BarChartIcon />}
          title="Resultados por canal"
          status="info"
          statusLabel="Estadísticas actualizadas"
          actionLabel="Ver detalle"
          actionHref={`/cliente/resultados?project=${activeProjectId}`}
          accent="sky"
        />
      </div>
    </section>
  );
}

function ClientDocumentCard({ icon, title, status, statusLabel, actionLabel, actionHref, accent }) {
  const statusStyles = {
    pending: `bg-${accent}-50 text-${accent}-700 ring-${accent}-200`,
    partial: `bg-amber-50 text-amber-700 ring-amber-200`,
    decided: `bg-emerald-50 text-emerald-700 ring-emerald-200`,
    info: `bg-sky-50 text-sky-700 ring-sky-200`,
  };
  
  return (
    <a href={actionHref} className="panel rounded-2xl p-4 ring-1 ring-line hover:ring-accent-soft/50 transition">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center ring-1 ring-line">
          <icon className="w-5 h-5 text-slate-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{title}</h3>
          <p className="mt-1 text-sm text-muted">{statusLabel}</p>
          <span className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide ring-1 {statusStyles[status]}">
            {status === "pending" ? "Pendiente" : status === "partial" ? "Parcial" : status === "decided" ? "Decidido" : "Info"}
          </span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-line flex items-center justify-end">
        <span className="text-sm font-medium text-accent-deep flex items-center gap-1">
          {actionLabel}
          <ChevronRightIcon className="w-4 h-4" />
        </span>
      </div>
    </a>
  );
}
```

### 4. Sección Contactos y Seguimiento — `ClientProjectLeads`

```tsx
function ClientProjectLeads({ crmLeadSummary }) {
  if (crmLeadSummary.totalVisible === 0) return null;
  
  return (
    <section className="px-4 py-3 md:px-6 border-t border-line">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-wide text-muted">Contactos y seguimiento</h2>
        <span className="text-xs text-muted">{crmLeadSummary.totalVisible} contactos visibles</span>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {crmLeadSummary.leads.map(lead => (
          <div key={lead.id} className="panel rounded-xl p-3 ring-1 ring-line">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{lead.nombreCompleto}</p>
                <p className="text-sm text-muted">{lead.asunto}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] uppercase tracking-wide text-muted">{lead.canal}</span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  lead.etiquetas[0] === "Ganado" ? "bg-emerald-100 text-emerald-700" :
                  lead.etiquetas[0] === "No continuó" ? "bg-red-100 text-red-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {lead.etiquetas[0]}
                </span>
                <span className="text-[10px] text-muted">{formatTimestamp(lead.fechaHora)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

### 5. Página Principal — `ClientProjectPageV2`

```tsx
export default async function ClientProjectPageV2({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [portal, brief] = await Promise.all([
    getClientPortal(), // Incluye reviewItems, crmLeadSummary, stages, nextAction
    getOrCreateBriefForProject(projectId),
  ]);
  
  const projectName = portal.projectStatusSummary.projectName ?? "Tu proyecto";
  const stages = portal.projectStatusSummary.stages;
  const nextAction = portal.nextClientAction;
  const completionPct = Math.round(
    (stages.filter(s => s.status === "completado").length / stages.length) * 100
  );
  
  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <ClientProjectHeader
        projectName={projectName}
        currentStage={stages}
        nextAction={nextAction}
        completionPct={completionPct}
      />
      
      <main className="max-w-5xl mx-auto px-4 py-4 md:px-6 md:py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Columna Principal: Chat + Documentos + Leads */}
          <div className="space-y-6">
            <ClientBriefChatViewV2 brief={brief} projectId={projectId} />
            <ClientProjectDocuments 
              reviewItems={portal.reviewItems} 
              activeProjectId={projectId} 
            />
            <ClientProjectLeads crmLeadSummary={portal.crmLeadSummary} />
          </div>
          
          {/* Sidebar Derecho: Resumen Rápido (Opcional Desktop) */}
          <aside className="hidden lg:block sticky top-24 space-y-4">
            <ClientQuickSummary 
              stages={stages} 
              nextAction={nextAction} 
              reviewItems={portal.reviewItems}
              channelResults={portal.channelResultsSummary}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
```

## Mecanismos de Upload (Contrato)

### Endpoint Upload Temporal (Client-Side Direct to Storage)
```typescript
// Usar Supabase Storage signed URLs para upload directo desde cliente
// No pasar por API propio → menor latencia, sin límite body size

async function getUploadSignedUrl(projectId: string, fileName: string, mimeType: string) {
  const response = await fetch(`/api/client/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, fileName, mimeType }),
  });
  return response.json(); // { signedUrl, publicUrl, path }
}
```

### Flujo Completo
1. Usuario selecciona archivo(s) en composer
2. Preview local con Blob URL (inmediato)
3. Click "Enviar" → Para cada archivo: `fetch(signedUrl, { method: "PUT", body: file })`
4. Mensaje enviado a `sendClientMessageAction` con `content.files[].url = publicUrl`
5. Server valida, asocia a brief, notifica operador

## Permisos (Refuerzo SPEC Base)
| Acción | Permitido |
|--------|-----------|
| Ver su proyecto | ✅ |
| Responder briefing (texto + archivos) | ✅ |
| Subir imágenes/archivos de contexto | ✅ |
| Ver cotización vigente | ✅ |
| Revisar activos autorizados | ✅ |
| Ver estadísticas habilitadas | ✅ |
| Participar en comentarios (públicos) | ✅ |
| Ver historial interno completo | ❌ |
| Ver comentarios privados | ❌ |
| Alterar estados operativos internos | ❌ |

## Criterios de Aceptación

1. **File Upload en Chat**: Usuario arrastra 2 imágenes + 1 PDF en composer → Preview inmediato → Click "Enviar" → Upload paralelo a Storage → Mensaje aparece en chat con thumbnails clicables → Operador recibe notificación con archivos
2. **Estados Claros**: Header muestra "Etapa 2/3: Definimos los detalles" + barra 66% + "Próxima acción: Revisar propuesta" (botón prominente) → Click lleva a cotización
3. **Documentos Accionables**: Cards muestran cotización "Pendiente" (amarillo), activos "2 pendientes" (verde), resultados "Info" (azul) → Cada uno con CTA clara
4. **Leads Visibles**: Lista contactos con nombre, canal, estado (badge coloreado), fecha → Sin notas internas, sin scoring, sin pipeline
5. **Cero Ruido Interno**: Inspeccionar DOM → No hay `data-internal`, no hay comentarios operador/diseñador, no hay estados técnicos (pending_operator_review, etc.)
6. **Responsive**: Mobile → Header compacto, chat full-width, cards apiladas, sidebar oculta; Tablet → Chat 60% + sidebar 40%; Desktop → Layout completo
7. **Performance**: Chat load < 1s, upload 10MB imagen < 3s (directo Storage), scroll suave 60fps con 100+ mensajes
8. **Persistencia**: Recargar página → Mensajes con archivos mantienen URLs permanentes → Thumbnails cargan desde Storage

## Referencias
- SPEC Base: ARCH-20260504-04 (líneas 239-250, 401-413, 765-781)
- SPECs relacionadas: ARCH-20260508-21, ARCH-20260528-07, ARCH-20260602-01, ARCH-20260603-02, ARCH-20260611-01
- Implementación actual: `app/cliente/page.tsx`, `app/cliente/proyecto/[projectId]/page.tsx`, `components/client-brief-chat.tsx`, `lib/client-portal.ts`
- Brand Kit: `context/SPECs/SPEC_ARCH-20260528-02_brand_kit_cliente_bridge_v1.md`

## Decisión Final
Esta SPEC **extiende** el portal actual manteniendo `getClientPortal()` como fuente de verdad para datos. El cambio principal es `ClientBriefChatViewV2` con composer de archivos + render de adjuntos, y la página de proyecto unificada (`ClientProjectPageV2`) que compone chat + documentos + leads en una sola vista con header persistente de progreso. El cliente nunca sale de `/cliente/proyecto/[id]` durante todo el ciclo de vida del proyecto.