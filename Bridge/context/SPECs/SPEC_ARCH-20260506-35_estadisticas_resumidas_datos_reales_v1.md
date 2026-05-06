# SPEC ARCH-20260506-35

## Titulo

Estadisticas resumidas con datos reales V1

## Estado

Cerrado

## Fecha

2026-05-06

## Objetivo

Agregar una capa compacta de estadisticas resumidas derivadas de los datos operativos reales de Bridge para acelerar lectura humana y futura lectura por agentes, sin crear una fuente paralela ni abrir queries especializadas nuevas.

## Problema que Resuelve

Bridge ya expone snapshot, handoffs, contratos externos, continuidad conversacional y consumo remoto tenant-aware, pero todavía obliga a leer bloque por bloque para entender el estado general del tenant. Falta una lectura resumida que condense señal operativa real sin sustituir la fuente primaria.

## Decision Arquitectonica

La siguiente capa debe derivar metricas compactas sobre la capa ya existente, priorizando reutilizacion, bajo acoplamiento y trazabilidad.

Debe ser:

1. derivada,
2. trazable,
3. basada en datos reales,
4. reusable desde código,
5. complementaria y no sustitutiva.

## Alcance del Corte

### Reforzamiento mínimo

1. derivar estadisticas resumidas desde el snapshot o una capa derivada existente,
2. evitar queries nuevas dedicadas solo a metricas,
3. mantener el tenant y la fuente visibles en la lectura resumida,
4. preparar la base para futuras superficies o integraciones.

### Integración mínima

1. visible o inspeccionable desde `/contexto-agentes`,
2. reusable server-side,
3. sin autenticación distribuida nueva,
4. sin escritura remota.

## Criterios de Aceptacion

1. Existe una capa derivada de estadisticas resumidas con datos reales.
2. La capa resumida no depende del JSX.
3. La UI actual no se rompe.
4. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. analytics históricos,
2. series temporales,
3. dashboards nuevos por rol,
4. APIs públicas finales.

## Riesgo que Evita

Evita que operadores o integraciones futuras dependan de lectura manual dispersa por entidad para entender el estado del tenant, sin caer en una segunda fuente de verdad o en un dashboard redundante.

## Orden de Implementacion Recomendado

1. definir la capa resumida derivada,
2. alimentarla desde la capa existente,
3. exponerla como inspección compacta,
4. validar build y tests,
5. cerrar con checkpoint y publicación.