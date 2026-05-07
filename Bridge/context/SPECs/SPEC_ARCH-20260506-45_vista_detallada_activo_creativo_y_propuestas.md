# SPEC ARCH-20260506-45

## Titulo

Vista detallada del activo creativo y propuestas versionadas

## Estado

Planificado

## Fecha

2026-05-06

## Objetivo

Convertir el activo individual en la unidad real de trabajo creativo dentro de Bridge, reuniendo en una sola vista el prompt fuente, el contexto operativo, el flujo Bridge -> estacion Adobe -> Bridge, las propuestas devueltas por el disenador y la preparacion para revision o aprobacion.

## Problema que Resuelve

Bridge ya tiene:

1. radar del operador,
2. workspace del disenador,
3. modulo de activos con lista operable,
4. prompts vigentes por activo,
5. flujo creativo Adobe definido a nivel de producto.

Pero todavia falta la ficha central del activo como objeto detallado.

Hoy el disenador puede saber que hacer, pero al entrar al activo todavia no encuentra una vista dedicada que concentre:

1. el prompt origen,
2. el brief relacionado,
3. las referencias,
4. las propuestas candidatas,
5. la comparacion entre propuestas,
6. los comentarios y decisiones,
7. el estado real de revision o aprobacion.

Sin esa vista, el flujo creativo sigue repartido entre el workspace y la lista general de activos.

## Decision Arquitectonica

El siguiente corte debe convertir el activo en un centro creativo detallado, no solo en una fila de listado.

La vista debe responder a dos necesidades al mismo tiempo:

1. permitir al disenador trabajar y devolver propuestas,
2. permitir al operador revisar el mismo activo sin perder trazabilidad.

El activo sigue siendo gobernado por Bridge, aunque parte de la produccion ocurra fuera, en la estacion Adobe.

## Alcance del Corte

### 1. Vista detallada del activo

Debe existir una vista dedicada por activo que exponga al menos:

1. titulo y clasificacion de la pieza,
2. cliente y proyecto vinculados,
3. estado del activo,
4. prompt vigente y version,
5. brief y contexto relacionados,
6. herramienta creativa sugerida,
7. comentarios o conversacion del activo,
8. zona de propuestas candidatas.

### 2. Zona de propuestas versionadas

La vista debe permitir representar con honestidad al menos:

1. propuesta 1,
2. propuesta 2 si existe,
3. diferencia corta entre propuestas,
4. referencia al prompt origen,
5. herramienta principal usada,
6. estado de cada propuesta para revision.

Si todavia no existe persistencia dedicada de propuestas, debe declararlo como vacio V1 y degradar sin inventar datos.

### 3. Flujo Bridge -> Adobe -> Bridge visible

La vista debe hacer visible el flujo creativo:

1. Bridge entrega el prompt,
2. el disenador produce en Firefly, Express o Photoshop,
3. la propuesta vuelve a Bridge,
4. el operador revisa o aprueba desde Bridge.

### 4. Preparacion para decision

La vista debe dejar claro si el activo esta:

1. listo para producir,
2. en produccion,
3. listo para revision,
4. aprobado,
5. bloqueado por falta de contexto.

## Principios del Corte

1. el activo detallado debe reunir contexto, no dispersarlo,
2. la propuesta devuelta no equivale a aprobacion final,
3. la aprobacion sigue gobernada por Bridge,
4. si un dato no existe, la vista debe decirlo de forma explicita,
5. el flujo Adobe debe quedar visible sin depender de integracion automatica aun.

## Contrato Minimo Esperado

La capa reusable de la vista detallada debe exponer al menos:

1. `assetDetail`,
2. `assetContext`,
3. `promptVersion`,
4. `creativeToolSuggestion`,
5. `proposalDrafts`,
6. `reviewState`,
7. `conversationThread`,
8. `sourceRefs`,
9. `gaps`.

## Criterios de Aceptacion

1. Existe una vista detallada del activo separada de la lista general.
2. La vista concentra prompt, contexto y estado del activo en un solo lugar.
3. La vista representa propuestas candidatas con trazabilidad al prompt origen.
4. El flujo Bridge -> Adobe -> Bridge queda visible dentro del activo.
5. Los vacios V1 de propuestas o persistencia se muestran con honestidad.
6. La UI no inventa archivos ni integraciones inexistentes.
7. Build y tests pasan cuando se implemente.

## Fuera de Alcance de Este Corte

1. integracion automatica con APIs de Adobe,
2. comparador visual avanzado de imagenes,
3. carga binaria definitiva de archivos,
4. aprobacion cliente final dentro de esta misma ficha,
5. historial largo de analytics por activo.

## Dependencias

1. SPEC 40 para el modelo de ejecucion del disenador,
2. SPEC 41 para el workspace guiado,
3. modulo de activos actual como base,
4. flujo Adobe ya explicitado en arquitectura y workspace.

## Orden de Implementacion Recomendado

1. crear capa reusable `asset detail`,
2. conectar la lista de activos y el workspace a esa vista,
3. representar propuestas versionadas con vacios honestos si faltan tablas,
4. hacer visible el flujo Bridge -> Adobe -> Bridge,
5. validar navegacion desde Disenador y Activos.
