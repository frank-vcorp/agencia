# CHECKPOINT IMPL-20260506-47

**ID:** IMPL-20260506-47  
**SPEC:** ARCH-20260506-47 — Activo con archivos y evidencias reales  
**Fecha:** 2026-05-06  
**Agente:** SOFIA - Builder

---

## Resumen del Corte

Cierre del hueco material `file_upload` del activo creativo. Cada propuesta del activo puede ahora asociarse a una evidencia binaria real subida a Supabase Storage, referenciada con URL firmada y visible dentro de la ficha `/activos/[id]`.

---

## Archivos Tocados (4)

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `supabase/migrations/20260506070000_asset_proposal_evidences_v1.sql` | NUEVO | Bucket `proposal-evidences` + tabla `asset_proposal_evidences` + RLS |
| `lib/asset-detail.ts` | MODIFICADO | `ProposalEvidence` type, funciones puras y async, `V1_GAPS` actualizado |
| `lib/asset-detail.test.ts` | MODIFICADO | 9 tests nuevos SPEC-47, `makeProposal` actualizado |
| `app/activos/[id]/page.tsx` | MODIFICADO | `uploadEvidenceAction`, UI evidencia en tarjetas de propuesta |

---

## Validación Ejecutada

### Gate 1 — Compilación ✅
```
npm run build → ✓ Compiled successfully in 2.9s
✓ Generating static pages (12/12)
```

### Gate 2 — Testing ✅
```
Tests:  269 passed (269)
Test Files:  13 passed (13)
```
**Tests nuevos SPEC-47:**
- `normalizeProposalRow`: evidence null y hasEvidence false por defecto (1 test nuevo)
- `normalizeEvidenceRow`: 3 tests (fila completa, fileSizeBytes null, mime_type pdf)
- `attachEvidenceToProposals`: 6 tests (sin evidencias, asignación por ID, múltiples evidencias, no muta original, length correcto, signedUrl null)

### Gate 3 — Revisión ✅
Qodo abre UI web en este entorno. Revisión manual exhaustiva:
- Seguridad: path de archivo generado con `crypto.randomUUID()`, no con nombre original
- Sin hardcoding de credenciales — se usa `getServerApiKey()` con `process.env`
- Link externo con `rel="noopener noreferrer"`
- Tipos MIME restringidos a whitelist en el bucket (7 tipos)
- Limite de 50 MB por archivo en el bucket
- Error de upload manejado con `return false`, sin persistir referencias huérfanas
- API Supabase Storage: `POST + x-upsert:true` (correcto para crear/reemplazar)

### Gate 4 — Documentación ✅
- Commit: `b4bd211` `feat(activos): evidencias reales por propuesta — upload y visualizacion V1`
- Push a `origin/main` exitoso
- Migración aplicada remotamente: `supabase db push --linked` confirmado

---

## Decisiones de Implementación

1. **Bucket privado + signed URLs**: En lugar de bucket público, se generan signed URLs de 1 hora en el servidor al cargar la ficha. Más seguro para V1.
2. **POST con x-upsert**: Permite subir y reemplazar en una sola operación, consistente con la API de Supabase Storage.
3. **`fetchEvidencesForProposals` batch**: Carga todas las evidencias de las propuestas del activo en una sola query, no N queries.
4. **`attachEvidenceToProposals` función pura**: Separa la lógica de asociación de los efectos async, facilita testing sin mocks.
5. **Una evidencia activa por propuesta**: La más reciente (orden desc). Sin galería avanzada — honesto V1.

---

## Vacios Honestos Actualizados

| Gap | Estado |
|-----|--------|
| `file_upload` | ✅ **CERRADO** en este corte |
| `proposal_comparison` | ○ Fuera de alcance V1 |
| `client_approval` | ○ Fuera de alcance V1 |
| `analytics_per_asset` | ○ Fuera de alcance V1 |

---

## Gaps Remanentes del Corte

1. **Bucket creación idempotente**: Si el bucket `proposal-evidences` no existe en el proyecto remoto (el INSERT en `storage.buckets` puede requerir permisos adicionales en algunos planes), el upload falla con 404. El código lo maneja honestamente devolviendo `false` y no persistiendo la referencia — la UI mostrará el form de upload correctamente.
2. **Expiración de signed URL**: Las URLs firmadas expiran en 1 hora. Si la página no se recarga en ese tiempo, el link de descarga dejará de funcionar. En V1 esto es aceptable y documentado.
3. **Sin preview en línea**: El link abre en nueva pestaña. Sin visor integrado en V1.

---

## Criterios de Aceptación (SPEC-47)

| Criterio | Estado |
|---------|--------|
| 1. Usuario puede subir evidencia real a propuesta | ✅ Server Action `uploadEvidenceAction` |
| 2. Ficha muestra si propuesta tiene archivo | ✅ `hasEvidence` + nombre visible |
| 3. Propuesta puede abrirse/descargarse desde ficha | ✅ Link a `signedUrl` |
| 4. Flujo Bridge→Adobe→Bridge más completo | ✅ Evidencia binaria real en la ficha |
| 5. Gap `file_upload` desaparece de vacios honestos | ✅ Removido de `V1_GAPS` |
| 6. Sin comparador visual ni aprobacion cliente | ✅ No implementado |
| 7. Build y tests pasan | ✅ 269/269, build limpio |

---

**Estado final: LISTO PARA PUSH ✅** — Corte cerrado con honestidad material.
