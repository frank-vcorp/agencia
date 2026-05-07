# SPEC ARCH-20260506-42

## Titulo

Cliente ligero guiado por IA

## Estado

Planificado

## Fecha

2026-05-06

## Objetivo

Definir una evolucion ligera del portal del cliente para que deje de ser solo una puerta de entrada a modulos y se convierta en una superficie clara de pendientes, aprobaciones, cambios recientes y siguiente paso, sin exponer complejidad interna de la operacion.

## Problema que Resuelve

El cliente no necesita la densidad operativa de Operador ni la ejecucion del Disenador, pero si necesita una guia simple para saber:

1. que debe hacer ahora,
2. que cambio en su proyecto,
3. que debe revisar,
4. que ya esta listo,
5. que aprobacion o respuesta falta.

Hoy el portal del cliente esta limpio, pero todavia actua mas como launcher que como espacio guiado.

## Decision Arquitectonica

La superficie del cliente debe ser deliberadamente ligera.

Debe reutilizar la misma senal viva, pero traducida a lenguaje simple, no tecnico y no interno.

La prioridad aqui no es control operativo, sino claridad y baja friccion.

## Secciones Obligatorias

### 1. Siguiente paso

Bloque principal que responda:

1. que debe hacer el cliente ahora,
2. por que,
3. antes de cuando,
4. a donde entrar.

### 2. Pendientes visibles

Lista corta de pendientes como:

1. completar brief,
2. revisar cotizacion,
3. aprobar pieza,
4. responder comentario,
5. aclarar informacion faltante.

### 3. Cambios recientes

Resumen amigable de lo ultimo que cambio en el proyecto:

1. brief actualizado,
2. nueva cotizacion,
3. pieza lista para revision,
4. comentario del equipo,
5. aprobacion registrada.

### 4. Estado general del proyecto

Lectura corta de:

1. en que fase va,
2. que esta esperando del cliente,
3. que esta trabajando el equipo,
4. cual es el siguiente hito.

## Regla de Lenguaje

La IA en esta superficie debe:

1. evitar lenguaje interno de agencia,
2. evitar terminos tecnicos del flujo,
3. evitar mostrar conflictos internos innecesarios,
4. explicar en lenguaje claro y corto,
5. orientar a una accion concreta.

## Regla de Densidad

El cliente no debe ver una cola extensa ni scores de prioridad internos.

Debe ver solo:

1. lo urgente para el,
2. lo nuevo,
3. lo aprobable,
4. lo entregable.

## Contrato Minimo Esperado

1. `nextClientAction`,
2. `clientPendingItems`,
3. `recentProjectChanges`,
4. `projectStatusSummary`,
5. `visibleDeliverables`,
6. `sourceRefs`.

## Criterios de Aceptacion

1. El cliente deja de ver solo enlaces y recibe una guia clara.
2. La superficie mantiene baja friccion y baja densidad.
3. La recomendacion principal apunta a una accion concreta.
4. Los cambios recientes se entienden sin lenguaje interno de agencia.
5. La superficie reusa la senal viva comun sin exponer complejidad innecesaria.

## Fuera de Alcance de Este Corte

1. login final,
2. notificaciones externas,
3. historial largo por proyecto,
4. analitica detallada para cliente,
5. chat completo cliente-equipo.

## Dependencias

1. SPEC 38 para la arquitectura comun por rol,
2. SPEC 37 para la senal viva y recomendaciones,
3. el portal cliente simplificado ya existente como punto de partida.

## Orden de Implementacion Recomendado

1. definir `nextClientAction`,
2. agregar pendientes visibles y cambios recientes,
3. mantener accesos directos a modulos clave,
4. validar lenguaje y densidad con foco en claridad.
