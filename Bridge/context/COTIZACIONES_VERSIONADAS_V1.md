# Cotizaciones Versionadas V1

**ID:** ARCH-20260505-23  
**Proyecto:** Bridge  
**Fecha:** 2026-05-05  
**Estado:** Regla operativa cerrada para implementación

## Objetivo

Definir la capa mínima de `cotizaciones` para que Bridge pueda operar una propuesta comercial real dentro del contenedor `tenant -> client -> project`, conservando historial interno para operador y mostrando al cliente solo la versión vigente.

## Problema

Bridge ya tiene:

1. briefing persistido con revisión humana,
2. identidad mínima operativa,
3. `clients` y `projects` como contenedor comercial visible.

Pero todavía no tiene un objeto comercial ejecutable que traduzca ese contexto en una propuesta operable.

Sin cotizaciones versionadas:

1. el operador no tiene una unidad formal para cotizar,
2. el cliente no puede ver una propuesta vigente dentro del sistema,
3. no existe historial controlado de cambios comerciales,
4. activos y siguientes aprobaciones nacerían sin referencia económica clara,
5. el `project` queda como contenedor sin continuidad comercial real.

## Principio Rector

En Bridge V1 una cotización no es solo un documento.

Es el contrato comercial operativo mínimo entre el contexto del brief y la ejecución futura del proyecto.

## Entidades Mínimas

### quotations

Representa el contenedor lógico de una cotización dentro de un `project`.

Campos mínimos:

1. id,
2. tenant_id,
3. client_id,
4. project_id,
5. status,
6. active_version_id nullable,
7. created_at,
8. updated_at.

Estados mínimos sugeridos:

1. `draft`,
2. `sent`,
3. `approved`,
4. `invoiced`,
5. `paid`.

### quotation_versions

Representa las versiones editables de la propuesta.

Campos mínimos:

1. id,
2. tenant_id,
3. quotation_id,
4. version_number,
5. title,
6. body_markdown,
7. commercial_summary_json,
8. admin_status,
9. internal_note nullable,
10. created_by_user_id nullable,
11. created_by_agent_id nullable,
12. created_at.

## Regla de Relación

La relación mínima debe quedar así:

1. un `project` puede tener muchas cotizaciones,
2. una cotización puede tener muchas versiones,
3. una sola versión puede quedar marcada como vigente,
4. la versión vigente es la única visible para el cliente en V1,
5. el historial completo queda visible para el operador.

## Regla de Nacimiento

En V1 la cotización debe nacer desde contexto ya estabilizado, no desde una conversación cruda.

Orden recomendado:

1. tener un brief persistido y visible,
2. tener `client` y `project` resueltos,
3. crear la cotización sobre ese `project`,
4. crear versión inicial borrador,
5. marcar versión vigente cuando ya exista una propuesta presentable.

## Regla de Visibilidad

La visibilidad mínima debe ser asimétrica.

1. `operator` ve historial, estado administrativo y notas internas,
2. `client_admin` ve solo la versión vigente y su estado visible,
3. `designer` puede consultar la cotización vigente como contexto si el proyecto lo requiere,
4. agentes técnicos autorizados pueden crear borradores o versiones si dejan trazabilidad de actor técnico y actor efectivo.

## Regla de Versionado

La V1 debe permitir:

1. múltiples versiones por cotización,
2. incremento secuencial de `version_number`,
3. cambio explícito de versión vigente,
4. conservación del historial anterior,
5. resumen comercial utilizable por UI y por agentes.

## Regla de Estado Administrativo

El estado administrativo debe pertenecer a la versión vigente operativa y reflejar el momento comercial actual.

Estados mínimos:

1. `draft`,
2. `sent`,
3. `approved`,
4. `invoiced`,
5. `paid`.

En este corte no se requiere facturación real ni pagos automáticos. Solo la continuidad administrativa mínima.

## Regla de Brief a Cotización

La cotización debe poder apuntar explícitamente al brief que la originó o la justifica.

No es obligatorio automatizar la generación desde el brief en este corte, pero sí debe quedar preparado el vínculo contextual para:

1. leer resumen comercial,
2. mostrar origen del caso,
3. reutilizar datos del `project`,
4. sostener activos y decisiones posteriores.

## UI Mínima del Corte

La superficie `/cotizaciones` debe poder:

1. mostrar la cotización activa del `project` demo,
2. mostrar estado administrativo visible,
3. mostrar versión vigente,
4. mostrar historial corto de versiones,
5. permitir al operador crear una nueva versión,
6. permitir al operador marcar una versión como vigente.

## Seed Inicial del Corte

Debe existir seed mínima controlada para `vectoria` con:

1. una cotización demo inicial ligada al `project` demo,
2. una versión `v1` inicial,
3. un resumen comercial demo visible en la UI.

## Resultado Esperado

Al terminar este corte, Bridge debe poder responder con claridad:

1. cuál es la cotización vigente del proyecto,
2. qué historial comercial existe,
3. qué estado administrativo tiene la propuesta,
4. qué versión ve el cliente,
5. desde qué contenedor comercial nació esa cotización.
