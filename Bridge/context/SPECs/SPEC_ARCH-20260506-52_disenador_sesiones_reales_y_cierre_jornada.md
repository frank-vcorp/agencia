# SPEC ARCH-20260506-52

## Titulo

Disenador con sesiones reales y cierre de jornada util

## Estado

Cerrado

## Fecha

2026-05-06

## Objetivo

Volver a `/disenador` para cerrar el principal hueco operativo que sigue abierto: que el workspace deje de ser solo una mesa guiada y pase a registrar sesiones reales de trabajo, bloqueos y cierre de jornada con datos de hoy.

## Problema que Resuelve

El workspace del disenador ya resuelve bien:

1. tarea activa,
2. cola priorizada,
3. prompt y contexto,
4. estacion Adobe,
5. regreso al activo.

Pero sus controles de sesion siguen degradados en V1:

1. iniciar, bloquear, retomar y terminar no persisten una sesion real,
2. `blocked` no se sostiene con un modelo propio,
3. el cierre de jornada no distingue hoy contra historico,
4. el workspace todavia depende demasiado del activo para ejecutar y registrar trabajo.

Mientras ese gap siga abierto, `/disenador` se siente muy bien orientado, pero aun no completamente util como mesa de produccion diaria.

## Decision Arquitectonica

Antes de pasar a Cliente, Bridge debe volver a `/disenador` para cerrar la capa de ejecucion real.

El objetivo no es rehacer la pantalla, sino convertir sus controles en acciones verdaderas con persistencia minima y lectura diaria confiable.

La solucion debe concentrarse en:

1. sesiones reales de trabajo,
2. bloqueos y reanudaciones,
3. resumen de jornada basado en datos de hoy,
4. mejor continuidad entre `/disenador` y `/activos/[id]`.

## Alcance del Corte

### 1. Persistencia minima de sesiones

Agregar soporte real para sesiones del disenador con al menos:

1. `asset_id`,
2. `started_at`,
3. `ended_at`,
4. `status` de sesion,
5. motivo de bloqueo opcional,
6. marca temporal de ultima actualizacion.

### 2. Controles reales en `/disenador`

Los controles del workspace deben dejar de redirigir sin efecto y pasar a ejecutar acciones reales:

1. iniciar,
2. bloquear,
3. retomar,
4. terminar,
5. marcar lista para revision.

### 3. Cierre de jornada util

El bloque de jornada debe derivar datos reales del dia actual, al menos:

1. tareas completadas hoy,
2. tiempo efectivo hoy,
3. tiempo bloqueado hoy,
4. ultima sesion,
5. sugerencia IA basada en señales reales.

### 4. Mejor continuidad con el activo

El workspace debe seguir enviando al activo como ficha central, pero ahora con mejor continuidad:

1. si una tarea esta en progreso, `/disenador` debe reflejarlo de inmediato,
2. si una tarea se marca lista para revision, debe verse consistente con el activo,
3. el contexto de la tarea debe quedar mas alineado con la sesion vigente.

## Contrato Minimo Esperado

La capa reusable de `/disenador` debe exponer o enriquecer al menos:

1. `activeSession`,
2. `sessionControls` reales,
3. `blockedReason`,
4. `dailyStats` filtrado al dia actual,
5. `completionSummary` con base en sesiones reales,
6. `gaps` actualizado.

## Criterios de Aceptacion

1. Los botones del workspace ejecutan acciones reales y persistidas.
2. El disenador puede iniciar, bloquear, retomar y terminar desde `/disenador`.
3. El resumen diario refleja hoy y no acumulado historico.
4. El workspace sigue conectado al activo sin duplicar responsabilidad.
5. Se reducen o eliminan los vacios V1 principales de `/disenador`.
6. Build y tests pasan al implementarse.

## Fuera de Alcance de Este Corte

1. colaboracion multiusuario simultanea,
2. tracking avanzado por usuario autenticado final,
3. cronometro en vivo segundo a segundo,
4. modo offline,
5. surface Cliente.

## Dependencias

1. SPEC 40 para el modelo de ejecucion,
2. SPEC 41 para el workspace guiado,
3. activo ya cerrado como ficha central en `/activos/[id]`.

## Orden de Implementacion Recomendado

1. introducir persistencia minima de `work_sessions`,
2. convertir los controles de `/disenador` en server actions reales,
3. filtrar y derivar `dailyStats` para el dia actual,
4. ajustar lenguaje y gaps del workspace,
5. validar continuidad con `/activos/[id]`.