# Activos Operables V1

**ID:** ARCH-20260505-24  
**Proyecto:** Bridge  
**Fecha:** 2026-05-05  
**Estado:** Regla operativa cerrada para implementación

## Objetivo

Definir la capa mínima de `activos` para que Bridge pueda registrar piezas reales de trabajo ligadas a una cotización, a un `project` y al contexto comercial ya estabilizado, usando catálogo guiado en lugar de texto libre.

## Problema

Bridge ya tiene:

1. briefing persistido,
2. identidad mínima operativa,
3. contenedor `client-project`,
4. cotizaciones versionadas con propuesta vigente.

Pero todavía no tiene una unidad operativa para aterrizar las piezas que realmente se producen.

Sin activos operables:

1. la cotización no aterriza en entregables rastreables,
2. el diseñador sigue trabajando fuera del sistema,
3. los agentes no tienen un objeto estable para devolver prompts, referencias y decisiones,
4. no existe continuidad entre propuesta comercial y producción,
5. el dashboard seguiría mostrando módulos sin objeto real detrás.

## Principio Rector

En Bridge V1 un activo no nace desde texto libre.

Nace desde selección guiada por catálogo y queda ligado al mismo contenedor comercial que originó el trabajo.

## Entidades Mínimas

### assets

Representa el contenedor operativo de una pieza o entregable.

Campos mínimos:

1. id,
2. tenant_id,
3. client_id,
4. project_id,
5. quotation_id nullable,
6. quotation_version_id nullable,
7. brief_id nullable,
8. application_code,
9. piece_type_code,
10. placement_code,
11. format_code,
12. title,
13. status,
14. created_at,
15. updated_at.

Estados mínimos sugeridos:

1. `draft`,
2. `in_progress`,
3. `in_review`,
4. `approved`,
5. `delivered`,
6. `archived`.

### asset_prompt_versions

Versiones del prompt o instrucción operativa del activo.

Campos mínimos:

1. id,
2. tenant_id,
3. asset_id,
4. version_number,
5. prompt_text,
6. references_json nullable,
7. status,
8. created_by_user_id nullable,
9. created_by_agent_id nullable,
10. created_at.

## Regla de Relación

La relación mínima debe quedar así:

1. un `project` puede tener muchos activos,
2. una cotización puede originar muchos activos,
3. un activo puede referenciar al brief y a la versión de cotización que lo justifican,
4. un activo puede tener muchas versiones de prompt,
5. solo una versión de prompt puede quedar considerada vigente para operar el activo.

## Regla de Nacimiento

En V1 el activo debe nacer desde contexto comercial ya definido.

Orden recomendado:

1. tener `project` activo,
2. tener una cotización vigente o al menos una referencia comercial clara,
3. crear activo desde catálogo,
4. asociar prompt inicial o referencia mínima,
5. usar ese activo como unidad de seguimiento para diseño y agentes.

## Regla de Catálogo

El activo no debe aceptar combinaciones arbitrarias.

Debe resolverse desde cuatro selecciones guiadas:

1. aplicativo,
2. tipo de pieza,
3. placement o uso,
4. formato técnico.

La primera implementación debe reutilizar el catálogo ya documentado en `CATALOGO_ACTIVOS_V1.md`.

## Regla de Visibilidad

La visibilidad mínima debe ser:

1. `operator` crea, consulta y cambia estado,
2. `designer` consulta contexto, prompt vigente y registra avance,
3. `client_admin` puede ver activos visibles del proyecto cuando aplique, sin reconfigurar el catálogo,
4. agentes técnicos autorizados pueden proponer prompts o crear borradores con trazabilidad de actor técnico y actor efectivo.

## Regla de Prompt y Referencias

En este corte no se requiere producción creativa completa, pero sí un objeto operativo mínimo para prompt.

Cada activo debe poder guardar:

1. prompt vigente,
2. referencias básicas,
3. estado,
4. historial corto de prompt,
5. vínculo al contexto comercial que lo originó.

## UI Mínima del Corte

La superficie `/activos` debe poder:

1. mostrar activos del `project` demo,
2. mostrar su clasificación de catálogo,
3. mostrar estado,
4. permitir crear un activo desde selección guiada,
5. permitir registrar un prompt inicial,
6. mostrar relación con cotización y `project`.

## Seed Inicial del Corte

Debe existir seed mínima controlada para `vectoria` con:

1. un activo demo ligado al `project` demo,
2. referencia opcional a la cotización vigente demo,
3. un prompt inicial de ejemplo,
4. clasificación de catálogo válida.

## Resultado Esperado

Al terminar este corte, Bridge debe poder responder con claridad:

1. qué activos están ligados al proyecto activo,
2. desde qué cotización o brief nacieron,
3. qué clasificación de catálogo tienen,
4. cuál es su prompt vigente,
5. en qué estado operativo va cada activo.
