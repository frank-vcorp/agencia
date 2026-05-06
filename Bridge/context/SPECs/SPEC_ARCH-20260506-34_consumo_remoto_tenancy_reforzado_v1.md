# SPEC ARCH-20260506-34

## Titulo

Consumo remoto con tenancy reforzado V1

## Estado

Cerrado

## Fecha

2026-05-06

## Objetivo

Reforzar la capa de consumo remoto de Bridge para que agentes e integraciones lean contratos y contexto derivados con conciencia explícita del tenant activo, sin depender del layout humano ni abrir todavía APIs finales.

## Problema que Resuelve

Bridge ya expone snapshot, handoffs, contratos externos y conversación contextual por entidad, pero el consumo remoto aún depende demasiado de superficies humanas y no enfatiza lo suficiente el contexto de tenancy en cada capa reutilizable.

## Decision Arquitectonica

La siguiente capa debe reforzar el tenant como contexto operativo explícito del consumo remoto sin abrir nuevas fuentes de verdad.

Debe ser:

1. derivada,
2. trazable,
3. multi-tenant aware,
4. reusable desde código,
5. desacoplada de la UI humana.

## Alcance del Corte

### Reforzamiento mínimo

1. endurecer helpers de consumo remoto sobre tenant activo,
2. exponer referencias mínimas y consistentes a tenant, entidad y fuente,
3. preparar la base para futuros bridges o endpoints sin implementarlos aún,
4. reutilizar la capa derivada ya validada.

### Integración mínima

1. visible o inspeccionable desde `/contexto-agentes`,
2. reutilizable server-side,
3. sin autenticación distribuida nueva,
4. sin escritura remota.

## Criterios de Aceptacion

1. El consumo remoto explicita tenant y trazabilidad de forma consistente.
2. La capa reforzada no depende del JSX.
3. La UI actual no se rompe.
4. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. API pública final,
2. webhooks,
3. permisos multiagente distribuidos,
4. acciones remotas con escritura.

## Riesgo que Evita

Evita que futuras integraciones consuman estado derivado sin suficiente contexto de tenant y terminen mezclando entidades o contratos fuera de su contenedor operativo.

## Orden de Implementacion Recomendado

1. reforzar el contrato reutilizable con contexto de tenancy,
2. exponerlo desde la capa derivada existente,
3. hacerlo visible desde `/contexto-agentes`,
4. validar build y tests,
5. cerrar con checkpoint y publicación.