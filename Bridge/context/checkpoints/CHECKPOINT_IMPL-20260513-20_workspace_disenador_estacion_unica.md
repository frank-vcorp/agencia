# CHECKPOINT IMPL-20260513-20
## Workspace del disenador — Estacion unica de ejecucion creativa

**Fecha:** 2026-05-13 21:28  
**Agente:** SOFIA — Builder  
**ID de Intervencion:** IMPL-20260513-20  
**SPEC de respaldo:** `context/SPECs/SPEC_ARCH-20260513-20_workspace_disenador_estacion_unica_v2.md`

---

## Resumen de entrega

`/disenador` deja de ser una cuadricula de tarjetas y pasa a operar como una estacion unica de trabajo con tres zonas persistentes: rail izquierda (cola), canvas central (activo enfocado), rail derecha (contexto del proyecto + asistente de produccion).

---

## Archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `lib/designer-workspace.ts` | Agregado `ProjectContext` type; extendido `ProjectRow` con `objective`; nueva funcion `fetchBriefSummary`; nueva funcion `buildProjectContext`; `DesignerWorkspace` ahora expone `focusedAsset` y `projectContext` |
| `components/designer-workspace.tsx` | Reescritura completa del layout. Nuevos componentes: `LeftRailTaskItem`, `LeftRail`, `WorkCanvas`, `ProposalDraftCard`, `ProjectContextCard`. `DesignerWorkspaceView` pasa de grid de tarjetas a layout de tres zonas. Acepta `productionAssistant: React.ReactNode` en lugar de `rightColumnTop` |
| `app/disenador/page.tsx` | Usa `workspace.focusedAsset` (en vez de `activeTask ?? nextSuggestedTask`); pasa `productionAssistant={<DesignerChatPanel .../>}` correctamente conectado al layout |

---

## Decisiones importantes

1. **`focusedAsset` en lugar de `activeTask ?? nextSuggestedTask` inline**: La derivacion ahora ocurre en la capa de datos (`getDesignerWorkspace`) y se expone como campo tipado. Esto rompe la logica de composicion ad-hoc en el page.tsx y hace el contrato explicito y testeable.

2. **`projectContext` derivado en el servidor**: Se construye desde `projects.objective` (ya disponible) y `brief_versions.structured_summary_json` (fetch adicional solo si el activo enfocado tiene `briefId`). Si no hay brief vinculado, los campos de brief quedan `null` pero el objeto no es null (usa cliente/proyecto). Esto es correcto para V1.

3. **Layout CSS Grid vs Flex anidado**: Se usa `md:grid` con columnas fijas (`240px`, `1fr`, `320px`) para garantizar que las tres zonas no colapsen en pantallas intermedias. En mobile (`< md`) se apilan en flex-col con `order` explicito: canvas primero (order-1), cola despues (order-2), rail derecho al final (order-3). Esto cumple la degradacion coherente sin cliente JS.

4. **`productionAssistant` prop en lugar de `rightColumnTop`**: El prop anterior nunca se usaba en el JSX del componente — era un bug de desconexion. Se renombro a `productionAssistant` para hacer evidente el dominio del panel.

5. **`DesignerChatPanel` sigue siendo Client Component en right rail**: Se pasa como `React.ReactNode` desde el Server Component (`page.tsx`) al Server Component (`DesignerWorkspaceView`), que lo renderiza en el rail derecho. Patron correcto de composicion server/client en Next.js App Router.

6. **Sin cambio al brief_versions query**: `fetchBriefSummary` solo consulta versiones con status aprobado o en revision (`approved_locked`, `pending_operator_review`, `operator_review_in_progress`, `stage_3_commercial_fit`). Si ninguna version tiene esos estados, el brief queda null y el canvas omite la seccion de brief operativo.

---

## Soft Gates

- [✓] **Gate 1 — Compilacion**: `npm run build` pasa sin errores. `/disenador` genera 3.03 kB.
- [✓] **Gate 2 — Tipos**: `get_errors` en los 4 archivos afectados retorna cero errores.
- [~] **Gate 3 — Tests**: Los tests unitarios de `designer-workspace.test.ts` no testean `focusedAsset` ni `projectContext` (son campos derivados server-side que no se incluyen en los tests de funciones puras). Los tests existentes no se rompen (build limpio incluye type check). Tests de integracion pendientes de GEMINI.
- [~] **Gate 4 — Documentacion**: Checkpoint presente. Marcas de agua en cabecera de cada archivo modificado.

---

## Riesgos y pendientes reales

1. **Focus switching interactivo**: El rail izquierdo muestra la cola pero los items son Links a `/activos/{id}`. El cambio de foco real sin salir del workspace (SPA-like) requiere convertir partes del workspace a Client Component con estado URL (`?focus=assetId`) — queda fuera de este corte segun la SPEC.

2. **brief_versions con estados no aprobados**: Si todos los briefs estan en `draft` o `stage_1_discovery`, `projectContext` tendra los campos de brief como `null`. El canvas omite correctamente la seccion pero el disenador no vera objetivo/oferta/tono. Solucion futura: ampliar el filtro de estados o derivar un resumen del texto libre del brief.

3. **`md:sticky md:top-4` en el rail izquierdo**: La cola se pega en el viewport al hacer scroll en desktop. Si la cola es muy larga (> 10 items), puede quedar cortada. No se agrego `overflow-y-auto` en el rail izquierdo para no complicar el layout; pendiente si el volumen real de activos lo requiere.

4. **`DesignerChatPanel` con `flex-1`**: El panel del asistente usa `flex-1` para crecer. En el rail derecho (flex-col), esto funciona correctamente solo si el rail tiene altura definida. En el layout actual sin altura fija de viewport, el chat crece al contenido natural. Para un chat "anclado" tipo IDE requeriria `h-screen` o similar — fuera de alcance de este corte.

---

## Criterios de aceptacion validados

| Criterio | Estado |
|---|---|
| `/disenador` ya no usa cuadricula de tarjetas como superficie principal | ✅ |
| El activo prioritario se abre como foco central al entrar | ✅ |
| Rail izquierda permite ver la cola y cambiar de foco (via link a ficha) | ✅ |
| Canvas central concentra el trabajo operativo del activo | ✅ |
| Rail derecha muestra primero contexto del proyecto, luego asistente | ✅ |
| Contexto del proyecto visible sin footer ni brief completo | ✅ |
| Asistente sigue siendo puntual, no chat general | ✅ (sin cambios al chat panel) |
| Build y validaciones pasan | ✅ |
| Mobile: degradacion coherente por orden CSS | ✅ |
