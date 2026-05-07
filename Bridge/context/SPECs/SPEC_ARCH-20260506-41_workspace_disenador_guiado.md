# SPEC ARCH-20260506-41

## Titulo

Workspace del disenador guiado por IA

## Estado

Planificado

## Fecha

2026-05-06

## Objetivo

Definir la superficie concreta del disenador como un workspace de trabajo diario, donde el usuario vea su cola priorizada, pueda ejecutar el pendiente actual con un clic y cierre la jornada con lectura clara de avance y bloqueos.

## Problema que Resuelve

Con el modelo de ejecucion definido, falta aterrizar como se ve y se usa.

El riesgo es crear otra pantalla de resumen en lugar de una mesa de trabajo real.

La superficie debe ayudar al disenador a producir, no solo a leer.

## Decision Arquitectonica

El workspace del disenador debe ser la primera superficie donde conviven las tres capas dentro de una misma experiencia:

1. radar ligero,
2. ejecucion fuerte,
3. seguimiento corto.

No debe comportarse como un panel corporativo. Debe sentirse como un escritorio de trabajo.

Ese escritorio debe gobernar un flujo hibrido donde Bridge entrega el prompt y el contexto, el disenador salta a la estacion Adobe para producir, y luego regresa propuestas a Bridge para revision y aprobacion.

## Secciones Obligatorias

### 1. Pendiente principal

Bloque superior con:

1. tarea sugerida por IA,
2. razon de prioridad,
3. contexto minimo listo,
4. accion principal para iniciar o retomar,
5. advertencias si algo falta.

### 2. Cola priorizada

Lista breve de pendientes disponibles con:

1. titulo,
2. proyecto,
3. tipo de pieza,
4. estado de ejecucion,
5. bloqueo o no,
6. recomendacion corta.

### 3. Contexto de trabajo

Panel con acceso directo a:

1. brief relevante,
2. referencias,
3. prompt vigente,
4. restricciones,
5. comentarios recientes,
6. aprobaciones necesarias.

Tambien debe dejar visible:

1. prompt fuente entregado por operador,
2. version del prompt vigente,
3. herramienta creativa sugerida,
4. referencias para regresar propuestas al activo correcto.

### 4. Estacion creativa

Bloque que explique o acompañe el salto de trabajo externo:

1. Firefly para generacion base,
2. Adobe Express para variaciones o adaptaciones,
3. Photoshop para pulido final,
4. estado de regreso de propuestas a Bridge.

### 5. Control de sesion

Bloque para manejar la tarea actual:

1. iniciar,
2. bloquear,
3. retomar,
4. terminar,
5. marcar lista para revision.

### 6. Propuestas del activo

Bloque para regresar al menos:

1. propuesta 1,
2. propuesta 2 si existe,
3. nota corta de diferencias,
4. herramienta principal usada,
5. referencia al prompt origen.

Estas propuestas no sustituyen el activo final aprobado; quedan como candidatas para decision posterior.

### 7. Cierre de jornada

Bloque compacto con:

1. tareas completadas hoy,
2. tiempo efectivo,
3. tiempo bloqueado,
4. principal causa de retrabajo,
5. sugerencia IA para mejorar la siguiente jornada.

## Regla de Foco

La pantalla no debe competir con el radar del operador.

Debe responder una sola pregunta dominante:

1. que hago yo ahora,
2. con que contexto,
3. y que sigue cuando termine.

## Regla de IA en Esta Superficie

La IA del disenador debe hablar en lenguaje de producibilidad.

Debe evitar:

1. exceso de lenguaje comercial,
2. explicaciones largas,
3. multiples prioridades empatadas,
4. recomendaciones sin contexto verificable.

Debe privilegiar:

1. siguiente pendiente claro,
2. riesgo creativo o de retrabajo,
3. faltantes concretos,
4. razon de orden,
5. claridad sobre que propuesta conviene devolver primero.

## Contrato Minimo Esperado

1. `activeTask`,
2. `nextSuggestedTask`,
3. `taskQueue`,
4. `taskContext`,
5. `sessionControls`,
6. `creativeStation`,
7. `proposalDrafts`,
8. `dailyStats`,
9. `completionSummary`,
10. `sourceRefs`.

## Criterios de Aceptacion

1. El workspace del disenador queda definido como superficie de trabajo y no solo de lectura.
2. La tarea principal del dia se entiende sin abrir tres modulos extra.
3. El usuario puede iniciar y cerrar trabajo desde la misma superficie.
4. La cola secundaria queda visible y ordenada.
5. El cierre de jornada puede leerse en la misma pantalla.
6. La IA ayuda a producir y no solo a resumir.
7. El flujo Bridge -> estacion Adobe -> Bridge queda explicitado dentro del workspace.

## Fuera de Alcance de Este Corte

1. produccion real de archivos binarios dentro de Bridge,
2. revision visual avanzada de piezas,
3. colaboracion multiusuario simultanea,
4. modo offline,
5. version cliente de este mismo workspace.

## Dependencias

1. SPEC 37 para copiloto vivo,
2. SPEC 38 para la arquitectura por capas,
3. SPEC 40 para estados y sesiones del disenador.

## Orden de Implementacion Recomendado

1. conectar `activeTask` y `taskQueue`,
2. montar el bloque de contexto inmediato,
3. agregar controles de sesion,
4. montar el cierre de jornada,
5. afinar despues el lenguaje IA y vacios.
