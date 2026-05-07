# SPEC ARCH-20260506-38

## Titulo

Superficies guiadas por IA en tres capas por rol

## Estado

Planificado

## Fecha

2026-05-06

## Objetivo

Definir una arquitectura comun para las tres superficies de Bridge, donde Operador, Disenador y Cliente comparten la misma senal viva del sistema, pero reciben una experiencia distinta segun su rol a traves de tres capas: radar, ejecucion y seguimiento.

## Problema que Resuelve

Ya quedo definida la necesidad de un copiloto operativo vivo, pero falta aterrizar como se organiza esa inteligencia en la experiencia real del producto.

Si no se define ahora, hay dos riesgos:

1. convertir cada dashboard en una coleccion aislada de cajas y recomendaciones,
2. mezclar control, ejecucion y seguimiento en la misma pantalla hasta volverla pesada y confusa.

## Tesis de Producto

Bridge no debe tener tres dashboards independientes.

Debe tener un solo motor de lectura operativa y una sola senal viva, traducidos de forma distinta por rol.

La experiencia correcta se ordena en tres capas:

1. radar,
2. ejecucion,
3. seguimiento.

No todos los roles usan las tres con la misma intensidad.

## Arquitectura Base

### Capa 1. Radar

Responde:

1. que conviene atender primero,
2. que cambio importa,
3. que proyecto o cliente esta subiendo de riesgo,
4. que accion deberia moverse hoy,
5. que actor esta bloqueando el flujo.

Es la capa de priorizacion.

### Capa 2. Ejecucion

Responde:

1. que tarea concreta puedo empezar ahora,
2. con que contexto minimo,
3. en que estado esta,
4. como la marco en curso, bloqueada o terminada,
5. cual es la siguiente tarea sugerida al cerrar la actual.

Es la capa de trabajo dentro del sistema.

### Capa 3. Seguimiento

Responde:

1. que se hizo hoy,
2. cuanto tiempo tomo,
3. donde se atoro la operacion,
4. que throughput real hubo por rol o proyecto,
5. que tendencias conviene corregir.

Es la capa de lectura historica corta y mejora operativa.

## Regla de Distribucion por Rol

La misma arquitectura aplica a las tres superficies, pero con pesos distintos.

### Operador

1. radar fuerte,
2. ejecucion media,
3. seguimiento fuerte.

El operador necesita decidir, destrabar y vigilar el flujo completo.

### Disenador

1. radar medio,
2. ejecucion fuerte,
3. seguimiento medio.

El disenador necesita foco diario, contexto suficiente y control simple del trabajo en curso.

### Cliente

1. radar ligero,
2. ejecucion ligera,
3. seguimiento ligero.

El cliente no necesita cabina interna. Necesita claridad, aprobaciones y siguiente paso.

## Definicion por Superficie

### Operador

#### Radar del operador

Debe mostrar una cartera priorizada de proyectos o clientes, ordenada por conveniencia operativa.

Cada item debe responder:

1. quien requiere atencion,
2. cual es la alerta principal,
3. cual es la siguiente mejor accion,
4. desde cuando existe el problema,
5. que modulo conviene abrir.

#### Ejecucion del operador

No es una ejecucion de produccion creativa.

Es una ejecucion de decisiones:

1. contactar cliente,
2. consolidar brief,
3. actualizar cotizacion,
4. aprobar paso a diseno,
5. cerrar un bloqueo comercial.

#### Seguimiento del operador

Debe mostrar salud operativa del dia o semana corta:

1. proyectos destrabados,
2. aprobaciones pendientes,
3. tiempo medio entre brief y cotizacion,
4. tiempo medio sin movimiento,
5. cuellos de botella recurrentes.

### Disenador

#### Radar del disenador

Debe mostrar la cola priorizada por IA con contexto suficiente para entender que conviene producir primero.

No debe saturar con negocio. Debe enfocarse en producibilidad.

#### Ejecucion del disenador

Debe ser la capa mas fuerte de esta superficie.

La ejecucion creativa del disenador debe asumirse como un flujo hibrido gobernado por Bridge sobre una estacion Adobe.

Puertas de trabajo previstas:

1. Firefly para generacion,
2. Adobe Express para adaptacion y variantes rapidas,
3. Photoshop para ajuste fino cuando haga falta.

Cada pendiente debe poder pasar por estados operativos claros:

1. listo para iniciar,
2. en curso,
3. bloqueado,
4. terminado,
5. listo para revision.

La superficie debe permitir al menos:

1. iniciar,
2. pausar o bloquear,
3. retomar,
4. terminar,
5. abrir contexto.

El cierre de esta capa debe devolver propuestas versionadas a Bridge para aprobacion.

#### Seguimiento del disenador

Debe permitir leer la jornada con una vista corta y util:

1. tareas completadas,
2. tiempo efectivo,
3. tiempo en bloqueo,
4. tiempo promedio por pieza,
5. causas mas comunes de retrabajo.

### Cliente

#### Radar del cliente

Debe responder solo:

1. que tiene pendiente,
2. que debe revisar,
3. que cambio hubo,
4. cual es su siguiente paso.

#### Ejecucion del cliente

Debe ser minima y de baja friccion:

1. completar brief,
2. comentar,
3. aprobar o rechazar,
4. subir aclaracion si aplica.

#### Seguimiento del cliente

Debe ser muy simple:

1. estado del proyecto,
2. ultimos cambios,
3. entregables visibles,
4. proximos hitos.

## Regla de Unidad Operativa

La unidad principal del radar no debe ser solo el cliente.

Debe ser `client + project`, porque ese es el contenedor real de brief, cotizacion, activos y decisiones.

El cliente puede servir como agrupador superior si tiene varios proyectos abiertos.

## Contrato Común de la Arquitectura

Las tres superficies deben consumir una base comun con estos elementos:

1. `portfolioItems`,
2. `priorityScore`,
3. `primaryAlert`,
4. `recommendedNextStep`,
5. `objectRecommendations`,
6. `taskQueue`,
7. `workSessions`,
8. `dailyStats`,
9. `roleView`,
10. `sourceRefs`.

## Regla de IA por Capa

### En Radar

La IA ordena, resume y eleva prioridad.

### En Ejecucion

La IA sugiere el siguiente pendiente y explica por que conviene tomarlo, pero no marca estados por si sola.

### En Seguimiento

La IA detecta patrones, tiempos muertos y cuellos de botella.

## Reglas de Tiempo y Trazabilidad

Para soportar la capa de seguimiento, toda ejecucion relevante debe poder registrar al menos:

1. hora de inicio,
2. hora de pausa o bloqueo,
3. hora de cierre,
4. actor,
5. proyecto,
6. objeto asociado,
7. motivo de bloqueo si existe.

## Criterios de Aceptacion

1. Queda definida una arquitectura comun para Operador, Disenador y Cliente basada en tres capas.
2. La arquitectura deja claro que las tres superficies comparten una sola senal viva y una sola logica de recomendacion.
3. Operador queda definido como rol de priorizacion y control.
4. Disenador queda definido como rol de ejecucion guiada y medicion de jornada.
5. Cliente queda definido como rol de claridad y siguiente paso, con menor densidad operativa.
6. La unidad operativa principal queda definida como `client + project`.
7. La arquitectura permite evolucionar de dashboard a sistema de trabajo sin romper la base actual.

## Fuera de Alcance de Este Corte

1. definir el diseño visual final de cada pantalla,
2. modelar analytics historicos avanzados,
3. construir automatizaciones autonomas multiagente,
4. cerrar el modelo final de autenticacion por rol,
5. resolver notificaciones push externas.

## Secuencia Recomendada

1. implementar primero la capa radar del operador,
2. extender radar y lectura viva al disenador,
3. agregar ejecucion guiada del disenador con estados y sesiones,
4. abrir seguimiento corto de jornada,
5. adaptar una version simplificada para cliente,
6. consolidar luego metricas historicas posteriores.

## Relacion con la SPEC 37

La SPEC 37 define el copiloto operativo vivo.

Esta SPEC 38 define como se organiza ese copiloto dentro del producto, por capas y por rol.

La 37 responde que debe pensar y detectar el sistema.

La 38 responde donde vive cada capacidad y como se usa en la experiencia diaria.
