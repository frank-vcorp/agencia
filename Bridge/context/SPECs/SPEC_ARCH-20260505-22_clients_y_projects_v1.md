# SPEC ARCH-20260505-22

## Titulo

Clients y projects V1 como contenedor operativo del brief y base para cotizaciones y activos

## Estado

Planificado

## Fecha

2026-05-05

## Objetivo

Implementar la capa mínima de `clients` y `projects` en Bridge para que el briefing persistido y las siguientes cotizaciones ya no operen como objetos sueltos del tenant, sino como parte de una unidad comercial y operativa clara.

## Problema que Resuelve

Bridge ya puede:

1. persistir briefs,
2. manejar etapas y revisión humana,
3. registrar identidad mínima.

Pero todavía no puede organizar esos objetos dentro de una relación cliente-proyecto real.

## Decisión Arquitectónica

El siguiente corte debe introducir:

1. `clients`,
2. `projects`,
3. vínculo mínimo de briefs con `client_id` y `project_id`.

## Alcance del Corte

### Persistencia mínima

1. crear tablas `clients` y `projects`,
2. sembrar un client demo y un project demo para `vectoria`,
3. permitir owner por membership en projects,
4. mantener multitenancy real en ambas entidades.

### Integración mínima con briefs

1. el brief actual debe poder asociarse al client demo del tenant,
2. el brief actual debe poder asociarse al project demo del tenant,
3. la UI de briefs debe mostrar ese contenedor mínimo,
4. no forzar todavía una gestión completa de múltiples proyectos por cliente.

### UI mínima

1. mostrar client y project activos en el workspace de briefs,
2. permitir crear o vincular el contenedor demo inicial del piloto,
3. no construir todavía un módulo completo independiente de clientes/proyectos.

## Criterios de Aceptación

1. Existen tablas y seed mínima de `clients` y `projects`.
2. El tenant `vectoria` tiene un client demo y un project demo reales.
3. El módulo de briefs puede mostrar a qué client y project pertenece el caso activo.
4. El modelo queda listo para que cotizaciones y activos cuelguen del mismo project.
5. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. panel completo de gestión de clientes,
2. múltiples vistas por pipeline de proyectos,
3. dashboards por project,
4. cotizaciones completas,
5. activos completos.

## Orden de Implementación Recomendado

1. migración y seed de clients/projects,
2. capa server-side de lectura del contenedor activo,
3. integración con el workspace de briefs,
4. validación y checkpoint.