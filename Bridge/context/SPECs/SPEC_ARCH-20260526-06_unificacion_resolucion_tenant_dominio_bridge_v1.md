# SPEC ARCH-20260526-06: Unificacion de resolucion de tenant en dominio Bridge V1

**ID:** ARCH-20260526-06  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-26  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Depende de:** ARCH-20260526-04

---

## 1. Objetivo unico y medible

Dejar una sola implementacion canonica para resolver `tenantId` por `slug` en la capa de dominio, eliminando duplicacion en `assets`, `briefing` y `quotations` sin cambiar contratos externos.

## 2. Archivo ancla

- `Bridge/lib/assets.ts`

## 3. Datos existentes a reutilizar

1. Firmas actuales exportadas de resolucion de tenant usadas por rutas API.
2. Cliente Supabase y patrones de consulta tenant-aware ya presentes en dominio.
3. Comportamiento actual de error cuando el tenant no existe.

## 4. Datos faltantes a crear

1. Modulo canonico `Bridge/lib/tenant.ts` con la funcion de resolucion centralizada.
2. Wrappers de compatibilidad en modulos existentes para evitar romper imports durante esta fase.

## 5. Archivos exactos a tocar

1. `Bridge/lib/tenant.ts` (nuevo)
2. `Bridge/lib/assets.ts`
3. `Bridge/lib/briefing.ts`
4. `Bridge/lib/quotations.ts`

## 6. Restricciones de alcance

1. No cambiar payloads ni rutas API.
2. No tocar auth ni headers MCP.
3. No agregar migraciones ni cambios de esquema.
4. No reestructurar modulos fuera de tenant resolution.

## 7. Validacion minima obligatoria

1. `cd Bridge && npm run build`
2. Ejecutar test puntual tenant/auth existente:
- `cd Bridge && npm test -- agent-auth.test.ts`

## 8. Criterios de aceptacion verificables

1. La logica de resolucion de tenant existe en un solo punto canonico.
2. `assets`, `briefing` y `quotations` consumen la funcion centralizada o wrapper de compatibilidad.
3. La compilacion de app queda limpia.
4. El contrato observable de rutas no cambia.

## 9. Definicion de terminado

Slice terminado cuando la duplicacion de resolucion de tenant queda retirada en los tres modulos objetivo, build verde y sin regresiones funcionales visibles.

## 10. Riesgos y no tocar

1. Riesgo: romper imports indirectos en rutas API.
2. No tocar: endpoints delete `preview/execute` ni contratos MCP.
