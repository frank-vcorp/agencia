# CHECKPOINT IMPL-20260513-19 — Limpieza técnica para piloto real de Bridge V1

**ID:** IMPL-20260513-19  
**Agente:** SOFIA - Builder  
**Fecha:** 2026-05-13  
**SPEC de referencia:** `Bridge/context/SPECs/SPEC_ARCH-20260513-19_limpieza_tecnica_piloto_real_v1.md`  
**Estado del slice:** ✅ COMPLETADO — apto para continuar

---

## 1. Residuos eliminados / corregidos

### Fix 1 — Re-exportar `AssetPromptVersion` desde `asset-detail.ts`
- **Archivo:** `Bridge/lib/asset-detail.ts` (línea 17)
- **Problema:** El tipo `AssetPromptVersion` se importaba localmente desde `./assets` y se usaba en firmas de funciones exportadas (`buildSourceRefs`, `AssetDetailFull`), pero no se re-exportaba. El test `asset-detail.test.ts` lo importaba desde `./asset-detail`, generando `TS2459: Module declares 'AssetPromptVersion' locally, but it is not exported`.
- **Corrección:** Añadida línea `export type { AssetPromptVersion };` inmediatamente después del import de `./assets`. Re-exportar es correcto porque el tipo forma parte del contrato público del módulo.
- **Certeza:** Alta — fuente viva en `./assets`, consumidor del test confirmado.

### Fix 2 — Eliminar directiva `@ts-expect-error` obsoleta en `assets.test.ts`
- **Archivo:** `Bridge/lib/assets.test.ts` (línea 148)
- **Problema:** Comentario `// @ts-expect-error - reemplazar fetch global en tests` suprimía un error de TS que ya no existe. TS emitía `TS2578: Unused '@ts-expect-error' directive` porque `vi.spyOn(globalThis, "fetch")` ya es correctamente tipado en la versión de Vitest/TypeScript del proyecto.
- **Corrección:** Eliminado el comentario `@ts-expect-error`.
- **Certeza:** Alta — el error TS lo declaraba explícitamente como unused.

### Fix 3 — Agregar `operationalKind` requerido al fixture `baseTask` en `designer-workspace.test.ts`
- **Archivo:** `Bridge/lib/designer-workspace.test.ts` (línea 20)
- **Problema:** El tipo `DesignerTask` fue actualizado en IMPL-20260513-17 para requerir `operationalKind: AssetOperationalKind` (campo no opcional), pero el helper de fixture `baseTask()` en el test no incluía el campo. Esto generaba `TS2322: Type '... operationalKind?: AssetOperationalKind | undefined ...' is not assignable to type 'DesignerTask'`.
- **Corrección:** Añadido `operationalKind: "produccion"` como valor por defecto en `baseTask`. Se eligió `"produccion"` porque todos los casos de prueba del archivo trabajan con activos de producción (banners, posts), no de captura.
- **Certeza:** Alta — el valor es correcto para los fixtures existentes y no rompe ningún test.

---

## 2. Límites documentados (sin tocar)

### Caso Superman — sin referencia obsoleta identificada en código
- Los IDs de Superman (`92efc927`, `60abed85`) aparecen exclusivamente en archivos de contexto/documentación (`PROYECTO.md`, `context/clientes/superman/brief.md`, checkpoints, dictámenes), no en código fuente ni tests.
- El checkpoint `CHECKPOINT_DOC-20260513-06` valida que esos IDs funcionaron en el entorno real.
- No hay referencia obsoleta en código que reparar. Los documentos de contexto son respaldo de decisiones activas y se conservan.

### `buildV1ProposalDrafts` — `@deprecated` activo en asset-detail.ts
- Marcado `@deprecated` pero consumido por `asset-detail.test.ts` línea 97 (test de compatibilidad SPEC-45 explícitamente comentado). No se eliminó: el test lo cubre y el comentario de deprecación ya documenta la situación correctamente.

---

## 3. Validación ejecutada

| Validación | Resultado |
|-----------|-----------|
| `npx tsc --noEmit` (línea base pre-limpieza) | 3 errores en 3 archivos |
| `npx tsc --noEmit` (post-limpieza) | 0 errores |
| `npx vitest run lib/asset-detail.test.ts lib/assets.test.ts lib/designer-workspace.test.ts` | 128/128 ✅ |
| `npx vitest run` (suite completo — 19 test files) | 389/389 ✅ |

---

## 4. Archivos tocados

| Archivo | Tipo de cambio |
|--------|----------------|
| `Bridge/lib/asset-detail.ts` | Re-export `AssetPromptVersion` |
| `Bridge/lib/assets.test.ts` | Eliminar `@ts-expect-error` obsoleto |
| `Bridge/lib/designer-workspace.test.ts` | Agregar `operationalKind: "produccion"` en fixture |

---

## 5. Riesgos remanentes

| Riesgo | Nivel | Nota |
|--------|-------|------|
| `buildV1ProposalDrafts` deprecada pero aún en uso en tests | Bajo | Bien documentado; no eliminar sin depurar los tests que la consumen |
| Suite de MCP no cubre `bridge_get_brief` ni `bridge_write_quotation` con datos reales | Bajo | Riesgo preexistente, documentado en memoria bridge_mcp.md, fuera del alcance de este slice |
| IDs de Superman en memoria bridge_mcp.md pueden desincronizarse con la DB en el futuro | Bajo | No hay mecanismo de sincronización automática; requiere validación manual si cambia el entorno |

---

## 6. Soft Gates

| Gate | Estado | Evidencia |
|------|--------|-----------|
| Gate 1 — Compilación | ✅ | `npx tsc --noEmit` → 0 errores |
| Gate 2 — Testing | ✅ | 389 tests, 0 fallos |
| Gate 3 — Revisión | ✅ | Cambios acotados, verificados contra SPEC §6 y §8 |
| Gate 4 — Documentación | ✅ | Este checkpoint |
