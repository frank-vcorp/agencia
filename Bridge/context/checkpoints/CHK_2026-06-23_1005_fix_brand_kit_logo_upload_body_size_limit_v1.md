# CHK_2026-06-23_1005_fix_brand_kit_logo_upload_body_size_limit_v1

**Fecha:** 2026-06-23 10:05
**ID:** FIX-20260623-01
**Respaldo:** `context/decisions/ARCH-20260623-01_fix_brand_kit_logo_upload_body_size_limit_v1.md`
**Tipo:** FIX (bug producción)
**Síntoma reportado:** `POST /cliente/[id] 400 → "An unexpected response was received from the server"` al subir un logo >1MB al brand kit de un cliente.

## Causa raíz
`Bridge/next.config.ts` no configuraba `experimental.serverActions.bodySizeLimit`. Default de Next 15.5 = **1 MB**.
`Bridge/lib/client-brand-kit.ts:32` declara `BRAND_KIT_LOGO_MAX_BYTES = 5 * 1024 * 1024` que nunca se alcanzaba en producción.
Resultado: logos reales (>1MB) eran rechazados por Vercel con **413** antes de que la validación del backend corriera, y el cliente RSC de Next lo reportaba como 400.

## Reproducción confirmada
Playwright sobre `https://vectoria-zeta.vercel.app/cliente/d1d8a4ae-cb5b-486e-a94d-5181874dbf59` (sesión operador):
- PNG 73B → HTTP 200 (éxito)
- PNG 5.24MB con espacios en nombre → HTTP **413** (reportado como 400 por RSC channel)

## Cambios aplicados

| Archivo | Cambio |
|---|---|
| `Bridge/next.config.ts` | `experimental.serverActions.bodySizeLimit: "6mb"` (margen sobre 5MB del validador) |
| `Bridge/components/brand-kit-logo-uploader.tsx` | Guard de tamaño en cliente (línea ~63): si `file.size > 5MB` mostrar error sin invocar la action |
| `Bridge/lib/client-brand-kit.test.ts` | 2 tests nuevos: borde 5MB+1 (rechaza) y 5MB exacto (acepta, límite inclusivo) |

## Validaciones

- `tsc --noEmit`: 0 errores nuevos. Los 6 errores existentes en `briefing.test.ts` y `briefing-closure.test.ts` son **pre-existentes en main** (verificado con `git stash`).
- `vitest run lib/client-brand-kit.test.ts`: **14/14 pasando** (incluyendo los 2 nuevos FIX-20260623-01).
- `vitest run` (suite completa): 15 tests fallidos **pre-existentes en main** (mismo conteo con y sin el fix). El fix no introduce regresiones.

## Pendiente validar en producción
- Subir logo de 2-4MB → HTTP 200 (antes fallaba con 413)
- Subir logo de 6MB → mensaje del guard cliente, sin 413
- Verificar plan de Vercel: si es Hobby, `bodySizeLimit: "6mb"` queda limitado a ~4.5MB por Vercel; el guard cliente cubre el resto

## Riesgos
- Cambio aplica **globalmente** a todas las server actions (briefing file upload, preregistro, etc.). Es el comportamiento deseado: el límite sube de 1MB a 6MB para todas.
- Si Vercel plan = Hobby: el límite efectivo de body en server actions es ~4.5MB. Logos entre 4.5-5MB seguirán cayendo en 413, pero el guard cliente los rechazará con mensaje claro.
