# SPEC ARCH-20260526-08: Hardening de parsing de argumentos en tools MCP CRUD V1

**ID:** ARCH-20260526-08  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-26  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Media  
**Depende de:** ARCH-20260526-07

---

## 1. Objetivo unico y medible

Eliminar casts inseguros de `unknown` en tools MCP CRUD prioritarias y normalizar validacion de entrada por handler sin cambiar nombres de tools ni schemas publicados.

## 2. Archivo ancla

- `Bridge/mcp/src/tools/update-project.ts`

## 3. Datos existentes a reutilizar

1. `inputSchema` actual de cada tool.
2. Mensajes de error vigentes por campos requeridos.
3. Cliente MCP ya operativo en `Bridge/mcp/src/bridge-client.ts`.

## 4. Datos faltantes a crear

1. Funciones locales de parseo seguro en cada tool objetivo.
2. Tipos internos acotados para argumentos validados.

## 5. Archivos exactos a tocar

1. `Bridge/mcp/src/tools/get-client.ts`
2. `Bridge/mcp/src/tools/get-project.ts`
3. `Bridge/mcp/src/tools/get-quotation.ts`
4. `Bridge/mcp/src/tools/update-client.ts`
5. `Bridge/mcp/src/tools/update-project.ts`

## 6. Restricciones de alcance

1. No cambiar nombres de tool ni keys de `inputSchema`.
2. No modificar `Bridge/mcp/src/index.ts` salvo ajuste mínimo por imports tipados si fuera indispensable.
3. No tocar rutas API ni lib de dominio en este slice.

## 7. Validacion minima obligatoria

1. `cd Bridge/mcp && npm run build`
2. `cd Bridge/mcp && npm test`

## 8. Criterios de aceptacion verificables

1. No queda cast directo de `unknown` en los cinco handlers objetivo.
2. Errores de entrada siguen legibles y equivalentes.
3. Build y tests MCP verdes.

## 9. Definicion de terminado

Slice terminado cuando parsing seguro queda aplicado en tools objetivo y MCP mantiene contrato funcional y textual.

## 10. Riesgos y no tocar

1. Riesgo: cambiar validaciones y afectar prompts/herramientas consumidoras.
2. No tocar: tools delete con `preview/execute`.
