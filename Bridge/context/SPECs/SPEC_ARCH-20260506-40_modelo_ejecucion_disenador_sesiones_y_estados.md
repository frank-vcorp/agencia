# SPEC ARCH-20260506-40

## Titulo

Modelo de ejecucion del disenador con sesiones y estados

## Estado

Planificado

## Fecha

2026-05-06

## Objetivo

Definir el modelo operativo que permitira al disenador trabajar dentro de Bridge con una cola guiada, estados claros y sesiones trazables de trabajo para medir tiempo efectivo, bloqueos y throughput diario.

## Problema que Resuelve

El radar del disenador puede ordenar pendientes, pero eso no alcanza si la superficie no permite ejecutar el trabajo.

Hace falta un modelo comun que responda:

1. cuando una tarea esta lista para empezar,
2. cuando esta en curso,
3. cuando se bloquea,
4. cuando termina,
5. como medir cuanto tiempo llevo realmente.

Sin ese modelo, el disenador ve recomendaciones pero sigue trabajando por fuera del sistema.

## Decision Arquitectonica

La ejecucion del disenador debe modelarse como `taskQueue + workSessions`.

La tarea creativa debe entenderse como un flujo `Bridge -> estacion Adobe -> Bridge`.

Bridge gobierna el pendiente, el prompt, el contexto y la aprobacion.

La estacion Adobe resuelve la generacion y refinamiento de la pieza.

La tarea representa el pendiente operativo.

La sesion representa el tiempo real invertido en esa tarea.

Esto permite separar:

1. estado de negocio del activo,
2. estado de ejecucion de la tarea,
3. medicion temporal de la jornada.

Tambien permite separar:

1. prompt fuente entregado por operador,
2. herramienta creativa usada,
3. propuestas devueltas a Bridge,
4. aprobacion posterior sobre el activo.

## Estacion Creativa Principal

La estacion creativa principal prevista para este flujo es Adobe.

Orden recomendado de uso:

1. Firefly para generar exploraciones iniciales,
2. Adobe Express para adaptar formatos o variaciones rapidas,
3. Photoshop para pulido fino cuando la pieza lo requiera.

El modelo no obliga a usar siempre las tres herramientas en cada tarea.

Solo obliga a que Bridge pueda registrar cual se uso y que propuestas regresaron.

## Estados Minimos Obligatorios

Cada pendiente del disenador debe poder pasar por:

1. `ready_to_start`,
2. `in_progress`,
3. `blocked`,
4. `completed`,
5. `ready_for_review`.

Si hace falta una transicion adicional despues, puede agregarse luego, pero este corte debe mantener el modelo simple.

## Acciones Minimas Obligatorias

La superficie debe permitir al menos:

1. iniciar,
2. bloquear,
3. retomar,
4. terminar,
5. abrir contexto.

Opcional posterior:

1. pausar,
2. delegar,
3. reabrir.

## Regla de Sesion de Trabajo

Cada vez que el disenador inicia o retoma una tarea, Bridge debe abrir una sesion de trabajo.

Cada vez que bloquea o termina, la sesion debe cerrarse o marcarse adecuadamente.

La sesion minima debe registrar:

1. `startedAt`,
2. `endedAt`,
3. `durationMinutes`,
4. `status`,
5. `actorId` o actor equivalente,
6. `projectId`,
7. `assetId` o entidad equivalente,
8. `blockReason` si aplica.

Si la tarea uso una herramienta creativa concreta, debe poder registrar tambien:

1. `creativeTool`,
2. `promptVersionRef`,
3. `proposalCount`.

## Regla de Siguiente Pendiente

Cuando el disenador termina una tarea, la IA debe poder proponer automaticamente el siguiente pendiente sugerido.

La IA no lo inicia sola.

Solo explica:

1. cual sigue,
2. por que sigue,
3. que destraba,
4. que contexto ya esta listo.

## Relacion con el Estado del Activo

El modelo de ejecucion no debe reemplazar el estado del activo fuente.

Debe convivir con el activo real.

Ejemplo:

1. un activo puede seguir en borrador,
2. mientras la tarea del disenador esta `in_progress`,
3. y luego pasar a `ready_for_review` cuando cierre la sesion.

En ese cierre, el disenador debe poder devolver una o varias propuestas al activo, por ejemplo `propuesta_1` y `propuesta_2`, para aprobacion posterior dentro de Bridge.

## Regla de Propuestas

El resultado del trabajo creativo no se considera final al salir de Adobe.

Se considera candidato cuando vuelve a Bridge como propuesta versionada.

Minimo esperado por ciclo:

1. una propuesta,
2. opcionalmente una segunda propuesta alternativa,
3. referencia al prompt fuente,
4. referencia a la herramienta principal usada.

## Contrato Minimo Esperado

1. `taskQueue`,
2. `activeTask`,
3. `nextSuggestedTask`,
4. `workSessions`,
5. `dailyStats`,
6. `taskStatus`,
7. `sessionStatus`,
8. `blockReason`,
9. `proposalDrafts`,
10. `creativeTool`,
11. `promptVersionRef`,
12. `sourceRefs`.

## Criterios de Aceptacion

1. Queda definido un modelo operativo simple para ejecutar pendientes del disenador.
2. El modelo distingue tareas y sesiones.
3. Los estados son claros y accionables.
4. Es posible medir tiempo efectivo y bloqueos a partir del modelo.
5. La IA puede sugerir el siguiente pendiente sin ejecutar acciones por si sola.
6. El modelo no rompe la fuente primaria de activos.
7. El flujo creativo Adobe queda explicitado sin sacar la aprobacion fuera de Bridge.

## Fuera de Alcance de Este Corte

1. UI final del workspace del disenador,
2. analytics historicos avanzados,
3. timers automaticos cross-device,
4. notificaciones push,
5. asignacion multiusuario compleja,
6. integracion automatica directa con APIs de Adobe.

## Dependencias

1. SPEC 37 para recomendaciones guiadas por IA,
2. SPEC 38 para la capa de ejecucion,
3. SPEC 39 para que el operador entregue handoffs mejor priorizados.

## Orden de Implementacion Recomendado

1. definir el shape de `taskQueue` y `workSessions`,
2. definir transiciones validas de estado,
3. definir reglas de apertura y cierre de sesiones,
4. definir `dailyStats` derivables,
5. conectar luego el workspace visual del disenador.
