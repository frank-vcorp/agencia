# SPEC ARCH-20260527-03: Normalizacion de slug dinamico en rutas delete de projects

**ID:** ARCH-20260527-03  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-27  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Critica  
**Puntaje de prioridad:** (Valor 10 x 3) + (Urgencia 10 x 2) - (Complejidad 2 x 0.5) = 49  
**Depende de:** ARCH-20260526-01, ARCH-20260526-04, FIX-20260527-04  
**Origen:** Incidente productivo por timeout y logs Vercel

---

## 1. Contexto

Produccion en Vercel muestra errores 504 y `FUNCTION_INVOCATION_TIMEOUT` en endpoints como:

1. `/api/v1/projects`
2. `/api/v1/assets`
3. `/api/v1/clients`
4. `/api/v1/briefs`
5. `/api/v1/quotations`

La causa raiz ya esta identificada en logs de runtime de Next:

`You cannot use different slug names for the same dynamic path ('id' !== 'projectId').`

En el arbol de rutas de `projects` conviven:

1. `app/api/v1/projects/[id]/...`
2. `app/api/v1/projects/[projectId]/...`

Las dos rutas conflictivas confirmadas son:

1. `app/api/v1/projects/[projectId]/brief/[id]/delete/route.ts`
2. `app/api/v1/projects/[projectId]/quotation/[id]/delete/route.ts`

El resto del arbol ya usa `[id]` como slug del proyecto:

1. `app/api/v1/projects/[id]/route.ts`
2. `app/api/v1/projects/[id]/brief/route.ts`
3. `app/api/v1/projects/[id]/quotation/route.ts`
4. `app/api/v1/projects/[id]/quotation/pdf/route.ts`
5. `app/api/v1/projects/[id]/delete/route.ts`

Por lo tanto el fix correcto es normalizar esas dos rutas hijas al mismo slug `[id]` del proyecto, evitando introducir un segundo nombre dinamico para el mismo segmento.

---

## 2. Objetivo

Eliminar el conflicto de slugs dinamicos en el arbol API de `projects` para que Next pueda cargar las rutas sin colision y produccion vuelva a responder.

---

## 3. Resultado esperado

Al cerrar este slice:

1. no existe ningun segmento `projects/[projectId]` en `app/api/v1/projects/`,
2. todo el arbol usa `projects/[id]` como slug canonico del proyecto,
3. `next build` deja de reportar conflicto de slugs dinamicos,
4. el deploy resultante deja de caer con el error `('id' !== 'projectId')`.

---

## 4. Alcance

### Incluye

1. renombrar la ruta de delete de brief bajo `projects` para usar `[id]` como slug del proyecto,
2. renombrar la ruta de delete de quotation bajo `projects` para usar `[id]` como slug del proyecto,
3. ajustar la extraccion de params dentro de ambas rutas para seguir distinguiendo correctamente `projectId` operativo y `briefId` o `quotationId`,
4. validar con build.

### Excluye

1. cambios en MCP client URLs, porque la URL publica sigue siendo la misma forma logica,
2. cambios de negocio en delete,
3. cambios en lib/entity-delete,
4. cambios en endpoints fuera de `projects`.

---

## 5. Datos existentes a reutilizar

1. el slug canonico de proyecto ya establecido en `app/api/v1/projects/[id]/route.ts`,
2. la logica interna de ambos handlers de delete,
3. el cliente MCP ya llama a URLs logicas tipo `/api/v1/projects/${projectId}/brief/${briefId}/delete` y `/api/v1/projects/${projectId}/quotation/${quotationId}/delete`, que no cambian externamente.

---

## 6. Datos faltantes a crear

No hay nuevos tipos ni contratos. Solo se requiere normalizar las rutas fisicas y sus params internos.

---

## 7. Archivos exactos a crear o modificar

1. Mover y ajustar `app/api/v1/projects/[projectId]/brief/[id]/delete/route.ts` a la ruta equivalente bajo `app/api/v1/projects/[id]/brief/[id]/delete/route.ts`.
2. Mover y ajustar `app/api/v1/projects/[projectId]/quotation/[id]/delete/route.ts` a la ruta equivalente bajo `app/api/v1/projects/[id]/quotation/[id]/delete/route.ts`.

No tocar ningun otro archivo. Maximo permitido: 2 archivos de codigo movidos y ajustados.

---

## 8. Reglas de implementacion

1. El slug del proyecto en params debe quedar tipado como `id` para que Next no choque con el resto del arbol.
2. Dentro del handler se puede seguir asignando `const { id: projectId } = await params` o equivalente claro, siempre que no se pierda el `briefId` o `quotationId` hijo.
3. No cambiar los nombres de las entidades hijas ni la forma del endpoint publico.
4. No modificar el cliente MCP ni documentacion en este corte.

---

## 9. Validacion exacta esperada

1. ejecutar `npm run build` en `Bridge`,
2. confirmar que desaparece el error `You cannot use different slug names for the same dynamic path ('id' !== 'projectId')`,
3. dejar listo para redeploy.

---

## 10. Archivo ancla inicial

`app/api/v1/projects/[projectId]/brief/[id]/delete/route.ts`

---

## 11. Condicion de detencion si falta contexto

Detenerse y devolver `BLOQUEO DE CONTEXTO` solo si aparece otra colision de slug distinta fuera de estas dos rutas y con evidencia exacta del archivo.

---

## 12. Handoff operativo para SOFIA

### archivo ancla inicial

`app/api/v1/projects/[projectId]/brief/[id]/delete/route.ts`

### datos existentes a reutilizar

1. slug canonico `projects/[id]` ya usado en el resto del arbol,
2. logica de delete ya implementada.

### datos faltantes a crear

Ninguno.

### archivos exactos a crear o modificar

1. `app/api/v1/projects/[id]/brief/[id]/delete/route.ts`
2. `app/api/v1/projects/[id]/quotation/[id]/delete/route.ts`

### maximo de archivos permitidos

2 archivos de codigo.

### validacion exacta esperada

`npm run build` en `Bridge` sin el error de slug dinamico.

### condicion de detencion

Si aparece otra colision de slug distinta, devolver `BLOQUEO DE CONTEXTO` con el archivo conflictivo exacto.