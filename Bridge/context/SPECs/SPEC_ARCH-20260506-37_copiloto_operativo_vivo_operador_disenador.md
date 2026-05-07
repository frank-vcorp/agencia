# SPEC ARCH-20260506-37

## Titulo

Copiloto operativo vivo para operador y disenador

## Estado

Planificado

## Fecha

2026-05-06

## Objetivo

Convertir las superficies de operador y disenador en dashboards vivos que combinen datos reales del tenant con lectura priorizada por IA, para que cada cambio relevante se traduzca en una senal operativa clara, explicable y accionable dentro del mismo dia.

## Problema que Resuelve

Bridge ya tiene datos reales por modulo y una capa derivada utilizable por agentes, pero las superficies de operador y disenador todavia muestran una shell estatica. Eso obliga a entrar modulo por modulo para responder preguntas que deberian estar resueltas al abrir la cabina:

1. que cambio desde la ultima revision,
2. que requiere atencion hoy,
3. que bloqueo existe entre brief, cotizacion, activo y CRM,
4. que actor debe actuar primero,
5. que piezas o decisiones estan listas y cuales estan atrasando la operacion.

Sin esta capa, el sistema tiene datos pero no convierte esos datos en foco operativo diario.

## Porque y Para Que

La meta no es agregar "mas cajas" ni un dashboard decorativo.

La meta es que Bridge haga de copiloto operativo:

1. detecta cambios reales en los objetos compartidos,
2. resume el impacto de esos cambios,
3. prioriza la siguiente decision,
4. reduce lectura manual dispersa,
5. ayuda a operador y disenador a trabajar con menos friccion todos los dias.

## Decision Arquitectonica

La solucion debe construirse sobre la cadena derivada ya existente y separarse en dos capas complementarias.

### Capa A. Senal viva deterministica

Resume en tiempo casi real el estado verdadero de briefs, cotizaciones, activos y leads del tenant activo.

Debe derivarse sin depender del JSX y sin crear una nueva fuente de verdad.

### Capa B. Lectura priorizada por IA

Interpreta la senal viva y genera recomendaciones operativas compactas por rol.

Debe responder preguntas como:

1. que cambio importa,
2. por que importa,
3. que deberia hacer hoy este rol,
4. que riesgo o bloqueo se esta formando,
5. que modulo conviene abrir primero.

La IA no reemplaza los estados fuente ni toma decisiones finales por si sola.

Su funcion es priorizar, explicar y enfocar.

## Principios del Corte

1. datos reales primero,
2. interpretacion IA despues,
3. toda recomendacion debe ser trazable a objetos fuente,
4. las cajas visibles deben decir la verdad del sistema,
5. no se permiten placeholders con apariencia de dato real,
6. una recomendacion IA sin justificacion visible no es aceptable.

## Alcance del Corte

### 1. Nueva capa reusable de senal operativa viva

Debe existir una capa server-side reusable que derive para el tenant activo:

1. conteos vivos por estado relevante,
2. cambios recientes significativos,
3. bloqueos cruzados entre modulos,
4. cola priorizada por rol,
5. disponibilidad real para handoff entre operador y disenador.

### 2. Nueva capa reusable de insights IA por rol

Debe existir una capa que produzca para cada rol una lectura compacta con:

1. prioridad del dia,
2. razon de la prioridad,
3. siguiente accion recomendada,
4. riesgo principal,
5. resumen corto de cambios detectados,
6. enlaces sugeridos a modulos concretos.

### 3. Integracion visible en Operador

La superficie del operador debe dejar de depender de textos fijos y mostrar:

1. metricas vivas del flujo comercial y operativo,
2. prioridad del dia derivada de datos reales,
3. alertas de desalineacion entre brief, cotizacion, activos y CRM,
4. recomendaciones IA orientadas a decision y aprobacion,
5. cola real de trabajo con estado verificable.

### 4. Integracion visible en Disenador

La superficie del disenador debe mostrar:

1. solicitudes realmente listas para producir,
2. activos bloqueados por falta de contexto o aprobacion,
3. versiones candidatas que requieren accion,
4. prioridad creativa del dia,
5. recomendaciones IA orientadas a produccion y entrega limpia.

## Ideas Concretas que Conviene Incluir

### Operador

1. detectar si la cotizacion vigente ya no coincide con el brief consolidado,
2. detectar si hay activos listos sin aprobacion final,
3. detectar si el cliente respondio algo que cambia prioridad comercial,
4. elevar una sola accion recomendada en vez de varias alarmas iguales,
5. mostrar una explicacion breve del tipo "subio el riesgo porque el activo ya esta listo pero la cotizacion sigue en version anterior".

### Disenador

1. detectar piezas listas para ejecutar sin ambiguedad,
2. separar claramente lo producible hoy de lo que sigue incompleto,
3. detectar faltantes de referencia, prompt o aprobacion,
4. resumir que cambio en el brief o contexto desde la ultima intervencion,
5. priorizar lo que mas destraba al operador o al cliente.

## Eventos que Deben Regenerar la Lectura

La senal viva y la lectura IA deben regenerarse cuando cambie algun dato relevante en:

1. brief,
2. cotizacion vigente,
3. activo en estado relevante,
4. lead o nota comercial relevante,
5. aprobacion o rechazo,
6. comentario de decision,
7. cambio de estado del proyecto activo.

## Contrato Minimo Esperado

La capa reusable debe exponer al menos estas piezas por rol:

1. `liveMetrics`,
2. `recentChanges`,
3. `primaryAlert`,
4. `priorityOfDay`,
5. `recommendedActions`,
6. `blockedItems`,
7. `readyItems`,
8. `explanations`,
9. `snapshotAt`,
10. `sourceRefs`.

## Regla de Tiempo Real

"Tiempo real" en este corte significa que la capa visible se refresca cada vez que las entidades relevantes cambian o cuando la pantalla vuelve a abrirse, sin depender de sincronizacion manual del usuario.

No implica todavia streaming fino por websocket si una regeneracion server-side mas simple resuelve el problema con honestidad.

## Regla de IA

Para evitar humo o ruido, la interpretacion IA debe respetar estas reglas:

1. no inventar estados inexistentes,
2. no ocultar incertidumbre,
3. no repetir obviedades que ya se ven en la UI,
4. priorizar una accion clara por encima de listas largas,
5. mantener cada insight corto y verificable.

## Criterios de Aceptacion

1. Operador deja de mostrar metricas fijas y refleja datos reales del tenant activo.
2. Disenador deja de mostrar metricas fijas y refleja datos reales del trabajo creativo activo.
3. Ambos dashboards muestran una prioridad del dia derivada de datos reales.
4. Ambos dashboards muestran una lectura IA explicable y no decorativa.
5. Cada insight visible puede rastrearse a entidades fuente.
6. La UI dirige a modulos concretos para resolver cada accion recomendada.
7. La implementacion reuse la cadena derivada existente y no crea una fuente paralela.
8. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. agente autonomo que ejecute acciones sin aprobacion,
2. analytics historicos por periodos,
3. dashboard del cliente con lectura IA equivalente,
4. API publica final para terceros,
5. automatizaciones multiagente completas,
6. scoring predictivo comercial avanzado,
7. inferencia creativa sobre archivos binarios reales.

## Riesgos que Evita

1. mantener shells bonitas pero mentirosas,
2. obligar al operador a reconstruir la prioridad abriendo cinco modulos,
3. hacer que el disenador produzca con contexto incompleto,
4. introducir una IA vistosa pero no accionable,
5. abrir una nueva capa de datos desconectada de la fuente primaria.

## Orden de Implementacion Recomendado

1. definir el contrato reusable de senal viva por rol,
2. derivar metricas y cambios recientes desde la cadena existente,
3. definir reglas minimas para detectar bloqueos y disponibilidad,
4. agregar la lectura IA compacta por rol con explicaciones trazables,
5. sustituir la shell estatica en `/operador` y `/disenador`,
6. validar vacios, enlaces y prioridad del dia,
7. ejecutar build, tests y checkpoint.

## Handoff Recomendado a SOFIA

Implementar primero la capa reusable y despues conectar ambas superficies.

La prioridad del corte no es embellecer la UI sino hacer que diga la verdad y ayude a operar mejor cada jornada.
