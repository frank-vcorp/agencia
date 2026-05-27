# SPEC ARCH-20260527-02: Timeout fail-fast para cliente HTTP del MCP Bridge

**ID:** ARCH-20260527-02  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-27  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Puntaje de prioridad:** (Valor 9 x 3) + (Urgencia 9 x 2) - (Complejidad 3 x 0.5) = 43.5  
**Depende de:** ARCH-20260510-08, ARCH-20260526-04, FIX-20260527-02  
**Origen:** Incidente operativo FIX-20260527-02

---

## 1. Contexto

El servidor MCP de Bridge arranca correctamente y descubre 25 tools, pero una llamada simple como `bridge_list_assets` queda colgada en VS Code. La causa mas probable ya esta acotada:

1. el cliente MCP usa `fetch` en `Bridge/mcp/src/bridge-client.ts` sin `AbortController` ni timeout,
2. una prueba directa en Node contra `https://vectoria-zeta.vercel.app/api/v1/assets` con los mismos headers aborta despues de 10 segundos cuando se le inyecta timeout,
3. el bloqueo ocurre en la espera de red antes de que el MCP devuelva texto.

Esto vuelve inutil cualquier prueba funcional completa del MCP porque una degradacion del upstream se traduce en tools congeladas en lugar de errores operativos claros.

---

## 2. Objetivo

Hacer que el cliente HTTP del MCP falle rapido ante upstream lento o no disponible, devolviendo un error explicito en vez de dejar la tool colgada indefinidamente.

---

## 3. Resultado esperado

Al cerrar este slice:

1. todas las llamadas HTTP del cliente MCP tienen timeout explicito,
2. el timeout aborta la peticion y devuelve un error operativo consistente,
3. una tool como `bridge_list_assets` deja de quedarse colgada y pasa a responder con mensaje de error controlado cuando el upstream no responde a tiempo,
4. existe cobertura minima de regresion para el nuevo comportamiento.

---

## 4. Alcance

### Incluye

1. refactor minimo del cliente HTTP en `Bridge/mcp/src/bridge-client.ts`,
2. definicion de timeout unico reutilizable para todas las llamadas,
3. mapeo de abort timeout a un error textual estable y operativo,
4. tests minimos de regresion en las suites MCP existentes.

### Excluye

1. cambios en rutas API de Next.js,
2. cambios en Vercel o Supabase,
3. retries automaticos,
4. cambios en la configuracion MCP del workspace,
5. refactor de tool handlers fuera de lo necesario para propagar el nuevo error.

---

## 5. Datos existentes a reutilizar

1. `Bridge/mcp/src/bridge-client.ts` como punto unico de salida HTTP,
2. `Bridge/mcp/src/__tests__/mcp-tools.test.ts`,
3. `Bridge/mcp/src/__tests__/mcp-crud-entity-tools.test.ts`.

---

## 6. Datos faltantes a crear

1. helper interno reutilizable para fetch con timeout o una abstraccion equivalente dentro de `bridge-client.ts`,
2. al menos una prueba que demuestre que el timeout ya no deja colgada la tool y que el error es legible.

---

## 7. Archivos exactos a crear o modificar

1. Modificar `Bridge/mcp/src/bridge-client.ts`.
2. Modificar `Bridge/mcp/src/__tests__/mcp-tools.test.ts`.
3. Modificar `Bridge/mcp/src/__tests__/mcp-crud-entity-tools.test.ts` si hace falta para validar una ruta adicional o compartir el patron de timeout.

Maximo permitido: 3 archivos.

---

## 8. Reglas de implementacion

1. No duplicar logica de timeout en cada metodo; centralizarla en un helper o wrapper local del cliente.
2. El timeout debe aplicar tanto a GET como a POST, PATCH y demas metodos ya existentes.
3. El error resultante debe ser estable y distinguible de `bridge_api_error:<status>:...`.
4. El texto de error debe ser apto para que los handlers existentes lo muestren al usuario sin stack traces.
5. No cambiar firmas publicas de tools MCP salvo que sea estrictamente innecesario.
6. No tocar `dist/`; si el flujo del repo requiere compilacion, Sofia debe dejarlo listo para que el build regenere `dist` o actualizarlo solo si ya es convencion del repo para MCP.

---

## 9. Validacion exacta esperada

1. Ejecutar tests del MCP: `npm test -- src/__tests__` o el comando equivalente definido en `Bridge/mcp/package.json`.
2. Confirmar que existe al menos una prueba donde `fetch` no resuelve y el cliente responde con timeout abortado controlado.
3. Confirmar que los handlers no quedan pendientes indefinidamente cuando el cliente recibe timeout.

Si no se puede simular un fetch colgado en tests con precision, validar al menos que un `AbortError` es traducido a un error operativo estable.

---

## 10. Archivo ancla inicial

`Bridge/mcp/src/bridge-client.ts`

---

## 11. Condicion de detencion si falta contexto

Detenerse y devolver `BLOQUEO DE CONTEXTO` solo si encuentra una restriccion del runtime o del SDK que impida usar `AbortController` en el entorno actual del MCP.

---

## 12. Handoff operativo para SOFIA

### archivo ancla inicial

`Bridge/mcp/src/bridge-client.ts`

### datos existentes a reutilizar

1. `Bridge/mcp/src/bridge-client.ts` centraliza todas las salidas HTTP,
2. las suites `mcp-tools.test.ts` y `mcp-crud-entity-tools.test.ts` ya mockean `fetch`.

### datos faltantes a crear

1. timeout defensivo centralizado,
2. prueba minima de regresion para timeout.

### archivos exactos a crear o modificar

1. `Bridge/mcp/src/bridge-client.ts`
2. `Bridge/mcp/src/__tests__/mcp-tools.test.ts`
3. `Bridge/mcp/src/__tests__/mcp-crud-entity-tools.test.ts` solo si es necesario

### maximo de archivos permitidos

3 archivos.

### validacion exacta esperada

Ejecutar los tests del MCP definidos en `Bridge/mcp/package.json` y dejar evidencia de que el timeout produce error controlado, no cuelgue.

### condicion de detencion

Si `AbortController` no es viable en este runtime del MCP, devolver `BLOQUEO DE CONTEXTO` con evidencia exacta.