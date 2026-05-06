# SPEC ARCH-20260505-23

## Titulo

Cotizaciones versionadas V1 sobre `project` activo como continuidad comercial del brief

## Estado

Planificado

## Fecha

2026-05-05

## Objetivo

Implementar la capa mínima de cotizaciones versionadas en Bridge para que operador y cliente ya puedan trabajar sobre una propuesta comercial real ligada al `project` activo, con una versión vigente visible y un historial controlado.

## Problema que Resuelve

Bridge ya puede:

1. persistir briefs,
2. resolver identidad mínima,
3. ubicar el caso dentro de `client` y `project`.

Pero todavía no puede convertir ese contexto en una propuesta comercial operable.

## Decisión Arquitectónica

El siguiente corte debe introducir:

1. `quotations`,
2. `quotation_versions`,
3. vínculo mínimo con `tenant`, `client`, `project` y `brief`,
4. UI mínima en `/cotizaciones` para operador y cliente interno del piloto.

## Alcance del Corte

### Persistencia mínima

1. crear tablas `quotations` y `quotation_versions`,
2. soportar `active_version_id`,
3. soportar estado administrativo,
4. sembrar cotización demo para `vectoria` ligada al `project` demo actual.

### Integración mínima con el contenedor actual

1. la cotización cuelga del `project` activo,
2. puede guardar referencia al brief que la originó,
3. la capa server-side resuelve versión vigente e historial corto,
4. la UI de `/cotizaciones` deja visible la propuesta vigente.

### UI mínima

1. mostrar resumen comercial de la versión vigente,
2. mostrar estado administrativo,
3. mostrar historial corto de versiones,
4. permitir crear nueva versión borrador,
5. permitir marcar versión vigente.

## Criterios de Aceptación

1. Existen tablas y seed mínima de cotizaciones versionadas.
2. El tenant `vectoria` tiene una cotización demo real ligada al `project` demo.
3. `/cotizaciones` muestra la versión vigente y el estado administrativo del caso activo.
4. El operador puede crear una nueva versión y marcarla como vigente.
5. El modelo queda listo para que activos y aprobaciones usen la cotización vigente como referencia comercial.
6. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. facturación real,
2. pagos,
3. firma o aceptación jurídica,
4. automatización completa de cotización desde IA,
5. módulo completo de cobranza.

## Orden de Implementación Recomendado

1. migración y seed de `quotations` y `quotation_versions`,
2. capa server-side para resolver cotización activa e historial,
3. integración mínima de `/cotizaciones`,
4. validación y checkpoint.
