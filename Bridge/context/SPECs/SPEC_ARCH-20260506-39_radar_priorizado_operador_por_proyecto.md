# SPEC ARCH-20260506-39

## Titulo

Radar priorizado del operador por proyecto

## Estado

Planificado

## Fecha

2026-05-06

## Objetivo

Definir la primera superficie realmente accionable del nuevo modelo guiado por IA: un radar del operador que ordene proyectos por conveniencia operativa, eleve la alerta principal de cada uno y proponga la siguiente mejor accion sin obligar a revisar todos los modulos manualmente.

## Problema que Resuelve

Hoy el operador puede entrar a varios modulos con datos reales, pero todavia no tiene una bandeja central que responda de forma inmediata:

1. que proyecto requiere atencion primero,
2. por que lo requiere,
3. que esta bloqueando el flujo,
4. que accion mueve mas el sistema hoy,
5. a que modulo conviene entrar.

Sin este radar, la operacion depende de memoria humana y de lectura dispersa.

## Decision Arquitectonica

La primera implementacion visible del copiloto debe vivir en Operador y debe enfocarse en priorizacion, no en ejecucion creativa.

La unidad de trabajo del radar debe ser `client + project`.

El cliente puede verse como agrupador, pero el score y la alerta principal deben evaluarse por proyecto.

## Alcance del Corte

### Radar obligatorio

Cada proyecto visible debe exponer:

1. cliente,
2. proyecto,
3. puntaje de prioridad,
4. alerta principal,
5. siguiente mejor accion,
6. modulo sugerido,
7. tiempo desde el ultimo avance,
8. estado general del flujo.

### Lectura IA obligatoria

La IA debe traducir senales reales en una lectura compacta para el operador:

1. por que este proyecto subio de prioridad,
2. que riesgo esta creciendo,
3. que actor deberia actuar,
4. que accion destraba mas rapido,
5. que no conviene hacer todavia.

### Navegacion obligatoria

Desde el radar el operador debe poder entrar a:

1. brief,
2. cotizacion,
3. activos,
4. CRM,
5. vista detallada del proyecto cuando exista.

## Reglas Minimas de Priorizacion

El score inicial debe poder componerse desde reglas explicables como:

1. tiempo sin movimiento,
2. brief incompleto o no consolidado,
3. cotizacion desalineada respecto al brief,
4. ausencia de activos despues de una ventana esperada,
5. aprobaciones pendientes,
6. bloqueos entre operador y disenador,
7. respuesta reciente del cliente que cambia prioridad.

No hace falta un modelo predictivo complejo en este corte.

## Ejemplos de Alertas Esperadas

1. cliente TAL no ha completado el brief en 14 horas,
2. proyecto B sigue sin activos iniciados despues de tener cotizacion vigente,
3. el brief cambio y la cotizacion vigente quedo desactualizada,
4. hay una pieza lista para aprobacion final que sigue detenida,
5. el cliente respondio y el operador todavia no incorporo ese cambio al flujo.

## Contrato Minimo Esperado

La capa reusable del radar debe exponer al menos:

1. `portfolioItems`,
2. `priorityScore`,
3. `priorityReason`,
4. `primaryAlert`,
5. `suggestedAction`,
6. `suggestedModule`,
7. `lastMovementAt`,
8. `idleHours`,
9. `riskLevel`,
10. `sourceRefs`.

## Criterios de Aceptacion

1. Operador puede ver una lista priorizada por proyecto y no solo bloques sueltos.
2. Cada fila visible explica por que se ordena asi.
3. Cada recomendacion apunta a un modulo concreto.
4. El score se calcula desde reglas trazables y no desde placeholders.
5. La UI no inventa estados cuando faltan datos; declara vacios honestos.
6. Build y tests pasan cuando se implemente.

## Fuera de Alcance de Este Corte

1. ejecucion detallada del disenador,
2. tracking de tiempo de sesiones,
3. cliente ligero final,
4. analytics historicos,
5. notificaciones push externas.

## Dependencias

1. SPEC 37 para la senal viva y recomendaciones por rol,
2. SPEC 38 para la arquitectura de radar, ejecucion y seguimiento,
3. entidades `client + project`, brief, cotizacion, activos y CRM ya existentes.

## Orden de Implementacion Recomendado

1. definir el contrato de `portfolioItems`,
2. calcular score y alerta principal por proyecto,
3. construir la lista priorizada del operador,
4. agregar explicacion IA y accesos a modulos,
5. validar reglas de vacio y ordenamiento.
