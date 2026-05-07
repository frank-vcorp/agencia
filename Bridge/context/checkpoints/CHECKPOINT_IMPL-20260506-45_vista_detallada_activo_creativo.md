# CHECKPOINT IMPL-20260506-45
## Vista detallada del activo creativo y propuestas

**ID:** IMPL-20260506-45  
**Fecha:** 2026-05-06  
**SPEC origen:** ARCH-20260506-45  
**Rama:** main

---

## Resumen del corte

Se convirtió el activo individual en la unidad real de trabajo creativo dentro de Bridge.
Se creó una vista detallada dedicada accesible desde `/activos/[id]` y vinculada desde `/activos` y `/disenador`.

---

## Archivos tocados

| Archivo | Operación | Descripción |
|---------|-----------|-------------|
| `lib/asset-detail.ts` | **NUEVO** | Capa reusable server-side con tipos, funciones puras y `getFullAssetDetail()` |
| `lib/asset-detail.test.ts` | **NUEVO** | Tests de funciones puras (33 tests) |
| `app/activos/[id]/page.tsx` | **NUEVO** | Vista detallada del activo con todas las secciones SPEC-45 |
| `app/activos/page.tsx` | **MODIFICADO** | Añadido link "Ver ficha →" por activo + import `Link` + watermark IMPL-45 |
| `components/designer-workspace.tsx` | **MODIFICADO** | Links "Ver activo" ahora apuntan a `/activos/${task.assetId}` |

---

## Contrato expuesto (lib/asset-detail.ts)

```ts
// Tipos exportados
ReviewState, ProposalDraft, SourceRef, AssetDetailFull

// Funciones puras (testeables)
resolveReviewState(status: AssetStatus): ReviewState
buildV1ProposalDrafts(): ProposalDraft[]
buildSourceRefs(prompt: AssetPromptVersion | null): SourceRef[]
buildCreativeToolSuggestion(pieceTypeCode: string): { tool, label, description }

// Función async
getFullAssetDetail(assetId: string): Promise<AssetDetailFull | null>
```

---

## Soft Gates

### Gate 1 — Compilación ✓
```
✓ Compiled successfully in 3.2s
✓ Linting and checking validity of types
✓ /activos/[id] presente en build output (ruta dinámica ƒ)
```

### Gate 2 — Testing ✓
```
Test Files: 13 passed (13)
Tests:      247 passed (247)
```
Nuevos tests en `lib/asset-detail.test.ts`: 33 casos cubriendo:
- `resolveReviewState` — 7 tests (todos los estados + V1 isBlocked siempre false)
- `buildV1ProposalDrafts` — 2 tests (vacío honesto)
- `buildSourceRefs` — 5 tests (null, sin refs, extracción, omisión nulls, conversión)
- `buildCreativeToolSuggestion` — 10 tests (por tipo de pieza + labels definidos)

### Gate 3 — Revisión ✓
- Código fiel a SPEC-45 sin inventar datos ni integraciones
- Vacios V1 declarados con honestidad en 5 puntos explícitos
- Flujo Bridge → Adobe → Bridge visible en UI sin depender de API Adobe
- `revalidatePath` correcto en el server action de la ficha detallada
- Links del diseñador actualizados para navegar a la ficha específica

### Gate 4 — Documentación ✓
- Watermark IMPL-20260506-45 en todos los archivos nuevos y modificados
- JSDoc en funciones públicas
- Vacios V1 documentados en comentarios de tipo y en la constante `V1_GAPS`

---

## Secciones de la vista detallada (/activos/[id])

1. **Cabecera** — título, clasificación completa, badge de estado, nota operativa, accesos rápidos
2. **Prompt vigente** — texto completo del prompt activo, historial de versiones, referencias de contexto
3. **Flujo creativo** — diagrama Bridge → Adobe → Bridge con herramienta sugerida resaltada
4. **Propuestas candidatas** — vacío honesto V1 con explicación (tabla asset_proposals no existe)
5. **Conversación del activo** — hilo de mensajes + form para agregar comentarios
6. **Vacios honestos V1** — lista de 5 gaps documentados

---

## Vacios honestos V1 documentados

| Gap | Razón |
|-----|-------|
| `asset_proposals` | Tabla no existe — propuestas siempre vacías |
| `proposal_comparison` | Sin comparador visual entre propuestas |
| `file_upload` | Carga binaria de archivos no implementada |
| `client_approval` | Aprobación final del cliente fuera de esta ficha |
| `analytics_per_asset` | Historial de métricas por activo no disponible |

---

## Navegación desde Diseñador

Los dos links "Ver activo" del workspace del diseñador ahora apuntan a `/activos/${task.assetId}`:
- `ActiveTaskCard` → "→ Ver ficha"
- `QueueTaskCard` → "Ver ficha →"

Los botones de control de sesión y el link "Ir a Activos" de estado vacío mantienen `/activos` (lista general, comportamiento correcto).

---

## Estado final

`[✓] IMPL-20260506-45 — Vista detallada del activo creativo — COMPLETADO`

**Siguiente corte sugerido:** Implementar tabla `asset_proposals` para persistir propuestas candidatas y cerrar el gap principal de V1.
