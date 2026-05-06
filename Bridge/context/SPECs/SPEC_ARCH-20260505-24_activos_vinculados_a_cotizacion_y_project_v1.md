# SPEC ARCH-20260505-24

## Titulo

Activos operables V1 ligados a cotización y `project` activo

## Estado

Planificado

## Fecha

2026-05-05

## Objetivo

Implementar la capa mínima de activos operables en Bridge para que operador, diseñador y agentes puedan trabajar sobre piezas reales ligadas a la cotización vigente y al `project` activo, usando catálogo guiado y un prompt operativo inicial.

## Problema que Resuelve

Bridge ya puede:

1. persistir briefs,
2. resolver identidad mínima,
3. operar `client-project`,
4. mantener cotizaciones versionadas.

Pero todavía no puede aterrizar esa continuidad comercial en piezas rastreables de producción.

## Decisión Arquitectónica

El siguiente corte debe introducir:

1. `assets`,
2. `asset_prompt_versions`,
3. vínculo con `tenant`, `client`, `project`, `quotation` y `brief`,
4. UI mínima en `/activos` para crear y visualizar activos del proyecto demo.

## Alcance del Corte

### Persistencia mínima

1. crear tablas `assets` y `asset_prompt_versions`,
2. usar códigos de catálogo para aplicativo, tipo de pieza, placement y formato,
3. sembrar activo demo para `vectoria`,
4. dejar un prompt inicial demo ligado al activo.

### Integración mínima con el contenedor actual

1. el activo cuelga del `project` activo,
2. puede referenciar cotización vigente y brief origen,
3. la capa server-side resuelve listado de activos y prompt vigente,
4. la UI de `/activos` deja visible el activo demo y permite crear uno nuevo.

### UI mínima

1. mostrar lista de activos del proyecto,
2. mostrar clasificación de catálogo,
3. mostrar estado,
4. permitir crear activo desde selección guiada,
5. permitir registrar un prompt inicial.

## Criterios de Aceptación

1. Existen tablas y seed mínima de activos.
2. El tenant `vectoria` tiene un activo demo ligado al `project` demo.
3. `/activos` muestra el activo demo con su clasificación y estado.
4. El operador puede crear un activo nuevo con selección guiada de catálogo.
5. El modelo queda listo para que diseñador y agentes trabajen sobre el mismo activo.
6. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. subida real de archivos binarios,
2. integración con Firefly,
3. aprobación creativa completa,
4. versionado completo de artefactos finales,
5. flujos avanzados de asignación.

## Orden de Implementación Recomendado

1. migración y seed de `assets` y `asset_prompt_versions`,
2. capa server-side para listar activos y crear activo base,
3. integración mínima de `/activos`,
4. validación y checkpoint.
