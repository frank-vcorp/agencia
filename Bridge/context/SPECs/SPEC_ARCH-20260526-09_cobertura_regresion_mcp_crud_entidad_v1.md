# SPEC ARCH-20260526-09: Cobertura minima de regresion para MCP CRUD entidad V1

**ID:** ARCH-20260526-09  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-26  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Media  
**Depende de:** ARCH-20260526-08

---

## 1. Objetivo unico y medible

Agregar cobertura de regresion sobre tools MCP de `get/update` por entidad para proteger el contrato recien estabilizado.

## 2. Archivo ancla

- `Bridge/mcp/src/__tests__/mcp-tools.test.ts`

## 3. Datos existentes a reutilizar

1. Patrón de mocking `fetch` en tests MCP actuales.
2. Utilidad `makeResponse` de la suite existente.
3. Convenciones de naming/assertions en `Bridge/mcp/src/__tests__`.

## 4. Datos faltantes a crear

1. Nueva suite enfocada: `mcp-crud-entity-tools.test.ts`.
2. Casos de validacion de campos requeridos y respuestas exitosas para tools objetivo.

## 5. Archivos exactos a tocar

1. `Bridge/mcp/src/__tests__/mcp-crud-entity-tools.test.ts` (nuevo)

## 6. Restricciones de alcance

1. No reestructurar suite legacy.
2. No convertir esta suite en integracion E2E con Next.
3. No tocar codigo productivo, solo tests.

## 7. Validacion minima obligatoria

1. `cd Bridge/mcp && npm test -- mcp-crud-entity-tools.test.ts`
2. `cd Bridge/mcp && npm test`
3. `cd Bridge/mcp && npm run build`

## 8. Criterios de aceptacion verificables

1. Al menos 10 casos cubriendo `get/update` de `client`, `project` y `quotation`.
2. Casos explicitos de falta de campos requeridos.
3. Suite estable sin flaky local.

## 9. Definicion de terminado

Slice terminado cuando la nueva suite se ejecuta en verde junto a tests MCP existentes y mejora cobertura del contrato CRUD entidad.

## 10. Riesgos y no tocar

1. Riesgo: mocks inconsistentes con contratos reales.
2. No tocar: app Next, rutas API, migraciones o UX.
