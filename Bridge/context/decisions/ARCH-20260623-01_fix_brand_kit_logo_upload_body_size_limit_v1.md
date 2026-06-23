# ARCH-20260623-01 — Fix upload logo brand kit (413/400 por bodySizeLimit)

**Fecha:** 2026-06-23
**Tipo:** FIX (bug producción)
**Reporta:** Frank
**Reportado en producción:** https://vectoria-zeta.vercel.app/cliente/d1d8a4ae-cb5b-486e-a94d-5181874dbf59
**Síntoma:** `POST /cliente/[id] 400 → An unexpected response was received from the server`

## Contexto

El operador sube un logo de cliente desde `/cliente/[id]` y la página se rompe con un 400 reportado por el cliente RSC de Next. La consola del navegador muestra:

```
Failed to load resource: the server responded with a status of 400 ()
Uncaught Error: An unexpected response was received from the server.
    at M (8476-f658dc61e6ae5187.js:1:162102)
```

## Reproducción

He reproducido el bug en producción con Playwright (sesión operador) sobre el cliente `d1d8a4ae-cb5b-486e-a94d-5181874dbf59`:

| Archivo simulado | Tamaño | HTTP real | Reportado por Next |
|---|---|---|---|
| PNG 73 bytes | 73 B | 200 OK | (éxito) |
| PNG 5MB con espacios en nombre | 5.24 MB | **413** | **400** (truncado por RSC channel) |

## Causa raíz

`Bridge/next.config.ts` no configura `experimental.serverActions.bodySizeLimit`, por lo que hereda el default de Next 15.5 = **1 MB**.

Sin embargo `Bridge/lib/client-brand-kit.ts:32` declara:

```ts
export const BRAND_KIT_LOGO_MAX_BYTES = 5 * 1024 * 1024; // 5MB
```

Y la SPEC `SPEC_ARCH-20260528-02_brand_kit_cliente_bridge_v1.md` promete 5 MB. Resultado: logos reales (>1 MB) son rechazados por Vercel/Next **antes** de que la validación del backend corra, y el cliente RSC de Next muestra el 413 como "400 unexpected".

## Decisión

1. Subir el límite de server actions a **6 MB** (`bodySizeLimit: '6mb'`) para cubrir el validador de 5 MB con margen.
2. Añadir **validación de tamaño en el cliente** (`components/brand-kit-logo-uploader.tsx`) que muestre el error sin invocar la action, evitando el viaje inútil al servidor.
3. Cubrir el límite con tests unitarios en `lib/client-brand-kit.test.ts`.

## Consecuencias

- ✅ Logos de hasta 5 MB se suben sin error.
- ✅ Logos > 5 MB muestran mensaje claro (`Error al subir: El logo excede 5 MB.`) sin generar 413/400 ruidoso.
- ⚠️ El límite real efectivo depende del plan de Vercel: Pro permite 6 MB body en server actions; Hobby lo deja en ~4.5 MB. Si se detecta que el plan es Hobby en deploy, reducir `bodySizeLimit` a `'4mb'` y `BRAND_KIT_LOGO_MAX_BYTES` a `4 * 1024 * 1024`.
- ⚠️ NO se cambia la ruta REST `/api/v1/clients/[id]/brand-kit/upload` (sigue siendo opción para futuros casos >5 MB).
