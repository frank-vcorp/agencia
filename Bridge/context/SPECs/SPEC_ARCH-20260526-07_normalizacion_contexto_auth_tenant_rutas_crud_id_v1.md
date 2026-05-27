# SPEC ARCH-20260526-07: Normalizacion de contexto auth y tenant en rutas CRUD por ID V1

**ID:** ARCH-20260526-07  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-26  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Media-alta  
**Depende de:** ARCH-20260526-06

---

## 1. Objetivo unico y medible

Reducir repeticion en handlers `GET/PATCH` por entidad extrayendo el patron comun de `auth + tenant + error` a un helper reusable, manteniendo semantica de respuestas.

## 2. Archivo ancla

- `Bridge/app/api/v1/projects/[id]/route.ts`

## 3. Datos existentes a reutilizar

1. `verifyAgentToken` y `getTenantSlug` en `Bridge/lib/agent-auth.ts`.
2. Patrones repetidos en rutas por id de entities CRUD.
3. Formato actual de errores de autenticacion y tenant no encontrado.

## 4. Datos faltantes a crear

1. Helper de contexto API v1: `Bridge/lib/api-v1-context.ts`.
2. Retorno estandarizado para consumo en rutas por id.

## 5. Archivos exactos a tocar

1. `Bridge/lib/api-v1-context.ts` (nuevo)
2. `Bridge/app/api/v1/clients/[id]/route.ts`
3. `Bridge/app/api/v1/projects/[id]/route.ts`
4. `Bridge/app/api/v1/briefs/[id]/route.ts`
5. `Bridge/app/api/v1/quotations/[id]/route.ts`

## 6. Restricciones de alcance

1. No modificar codigos HTTP actuales.
2. No alterar textos de error ya esperados por MCP.
3. No incluir rutas delete ni endpoint PDF.
4. No tocar capa de dominio (`lib/assets.ts`, `lib/briefing.ts`, `lib/quotations.ts`) en este slice.

## 7. Validacion minima obligatoria

1. `cd Bridge && npm run build`
2. Smoke manual o script de 1 `GET` y 1 `PATCH` en una ruta incluida.

## 8. Criterios de aceptacion verificables

1. Se elimina bloque repetido de auth/tenant en las cuatro rutas.
2. Se preserva contrato de salida para `unauthorized` y `tenant_not_found`.
3. Build de app limpio.

## 9. Definicion de terminado

Slice terminado cuando las rutas objetivo usan helper comun de contexto sin alterar comportamiento externo y con build verde.

## 10. Riesgos y no tocar

1. Riesgo: cambios sutiles en estructura JSON de errores.
2. No tocar: `assets/[id]/route.ts` y rutas de eliminacion.
