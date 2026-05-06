# SPEC ARCH-20260506-31

## Titulo

Handoffs remotos endurecidos por entidad V1

## Estado

Cerrado

## Fecha

2026-05-06

## Objetivo

Definir y exponer un formato mínimo, compacto y trazable de handoff remoto por entidad para que agentes externos consuman contexto operativo suficiente sin depender de lectura manual de toda la cabina.

## Problema que Resuelve

Bridge ya cuenta con snapshot derivado visible en `/contexto-agentes`, pero todavía no ofrece contratos de handoff más estrictos para consumo remoto por entidad.

Eso deja ambigüedad en:

1. qué campos son obligatorios para un agente externo,
2. cómo distinguir estado resumido versus fuente primaria,
3. qué siguiente acción debe conservarse en cada payload,
4. cómo reutilizar el contexto sin arrastrar ruido visual de la UI.

## Decision Arquitectonica

El handoff remoto debe derivarse del snapshot ya existente y no debe abrir nuevas fuentes de verdad.

Debe ser:

1. compacto,
2. estable,
3. trazable a la fuente primaria,
4. apto para transporte remoto,
5. acotado por entidad y tenant.

## Alcance del Corte

### Contrato remoto mínimo

1. payload por `brief`, `lead`, `quotation` y `asset`,
2. `source`, `snapshotAt` y `entityType` visibles,
3. estado resumido y siguiente acción cuando aplique,
4. referencias mínimas al contenedor `tenant/client/project` cuando existan.

### Integración mínima

1. reutilizable desde `/contexto-agentes`,
2. reusable por futuros agentes remotos,
3. construido desde la capa derivada ya validada,
4. sin abrir automatización generativa ni sincronización externa.

## Criterios de Aceptacion

1. Existe al menos un contrato remoto reusable por cada entidad prioritaria del corte.
2. Cada handoff remoto conserva trazabilidad a la fuente primaria.
3. El formato expone frescura y siguiente acción resumida cuando aplique.
4. La UI actual no se rompe y puede seguir mostrando el contexto humano.
5. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. agentes remotos ejecutando acciones reales,
2. webhooks externos,
3. autenticación distribuida multiagente,
4. continuidad conversacional completa por todas las entidades.

## Riesgo que Evita

Evita que cada integración remota reinterprete de forma distinta el estado operativo y termine operando con payloads inconsistentes o incompletos.

## Orden de Implementacion Recomendado

1. definir contrato remoto por entidad sobre la capa derivada,
2. exponer payloads compactos y trazables,
3. reutilizarlos en `/contexto-agentes`,
4. validar consistencia de campos y frescura,
5. cerrar con tests, checkpoint y publicación.