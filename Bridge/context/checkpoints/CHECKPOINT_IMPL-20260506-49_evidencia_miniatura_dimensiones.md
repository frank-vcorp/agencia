# CHECKPOINT — IMPL-20260506-49
**Fecha:** 2026-05-06  
**Agente:** SOFIA - Builder  
**Tarea:** Miniatura y dimensiones en píxeles para evidencias de imagen en la ficha del activo  
**SPEC de referencia:** ARCH-20260506-49 (inline en la solicitud)

---

## Resumen de implementación

### Objetivo
Enriquecer la vista de evidencia en `/activos/[id]` para que evidencias de imagen muestren:
1. Miniatura visible en la tarjeta de propuesta.
2. Dimensiones en píxeles (ancho × alto).
3. Mantener nombre de archivo y KB existentes.
4. Degradar honestamente para PDFs, videos y otros tipos.

### Solución aplicada (principio del cañón y la mosca)
Se creó un **Client Component** `EvidencePreview` que lee `naturalWidth/naturalHeight` desde el evento `onLoad` del elemento `<img>`. Esto evita:
- Modificar schema de DB (no se persisten width/height).
- Tocar `lib/asset-detail.ts` ni ninguna función de storage.
- Romper el flujo de upload o la expiración de signed URLs.

---

## Archivos tocados

| Archivo | Tipo de cambio |
|---|---|
| `app/activos/[id]/EvidencePreview.tsx` | **Nuevo** — Client Component |
| `app/activos/[id]/page.tsx` | Modificado — import + uso en propuesta principal y alternativa |

---

## Comportamiento por tipo de evidencia

| Tipo MIME | Miniatura | Dimensiones | Pill nombre/KB | Descarga |
|---|---|---|---|---|
| `image/*` | ✅ (max-h-48) | ✅ (onLoad) | ✅ | ✅ |
| `application/pdf` | ❌ (📄 icono) | ❌ | ✅ | ✅ |
| `video/*` | ❌ (🎬 icono) | ❌ | ✅ | ✅ |
| Otro | ❌ (📎 icono) | ❌ | ✅ | ✅ |
| signedUrl null (cualquier tipo) | ❌ | ❌ | ✅ | Aviso temporal |

---

## Soft Gates

| Gate | Estado | Evidencia |
|---|---|---|
| 1 — Compilación | ✅ | `✓ Compiled successfully in 3.2s` — Next.js 15.5.15 |
| 2 — Testing | ✅ | 269 tests en 13 archivos — todos ✓ (vitest run) |
| 3 — Revisión (Qodo) | ✅ | `qodo self-review` ejecutado — sin issues críticos reportados |
| 4 — Documentación | ✅ | Este checkpoint + marca de agua `IMPL-20260506-49` en ambos archivos |

---

## Commit
```
114ff37  feat(activos): miniatura y dimensiones en píxeles para evidencias de imagen
```
Push a `main` ✅

---

## Vacíos honestos
- Las dimensiones se leen client-side en `onLoad`: no están disponibles en SSR (aparecen tras hidratación). Esto es correcto y esperado para este caso de uso.
- Si el navegador bloquea CORS para la signed URL de Supabase, el `onLoad` no disparará; la miniatura no se mostrará pero el resto del componente funciona (pill + descarga). No se registraron problemas CORS en V1 (Supabase Storage con signed URLs es cross-origin permitido por defecto).
