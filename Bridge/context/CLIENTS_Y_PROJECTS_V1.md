# Clients y Projects V1

**ID:** ARCH-20260505-22  
**Proyecto:** Bridge  
**Fecha:** 2026-05-05  
**Estado:** Regla operativa cerrada para implementación

## Objetivo

Definir la capa mínima de `clients` y `projects` para que los briefs, las siguientes cotizaciones y los futuros activos dejen de vivir sueltos a nivel tenant y pasen a operar dentro de un contenedor comercial y operativo coherente.

## Problema

Bridge ya tiene:

1. tenancy inicial,
2. briefing persistido,
3. identidad mínima operativa.

Pero todavía no tiene resuelto dónde vive formalmente el trabajo.

Sin `clients` y `projects`:

1. el brief queda colgando directo del tenant,
2. no existe una unidad clara para agrupar contexto, decisiones y outputs,
3. las cotizaciones nacerían sin contenedor comercial estable,
4. el diseñador y los agentes no tendrían un proyecto canónico al que referirse,
5. el sistema no podría crecer sin empezar a mezclar casos dentro del mismo tenant.

## Principio Rector

En Bridge V1 el tenant no reemplaza al cliente ni al proyecto.

El tenant es el contenedor de aislamiento.

El cliente es la entidad comercial visible.

El proyecto es la unidad activa de trabajo.

## Entidades Mínimas

### clients

Representa la entidad comercial visible con la que se relaciona el servicio.

Campos mínimos:

1. id,
2. tenant_id,
3. name,
4. legal_name nullable,
5. status,
6. primary_contact_name nullable,
7. primary_contact_channel nullable,
8. notes nullable,
9. created_at,
10. updated_at.

Estados mínimos sugeridos:

1. `active`,
2. `prospect`,
3. `inactive`.

### projects

Representa la unidad activa de trabajo dentro de un cliente.

Campos mínimos:

1. id,
2. tenant_id,
3. client_id,
4. project_type,
5. name,
6. objective,
7. status,
8. owner_membership_id nullable,
9. start_date nullable,
10. end_date nullable,
11. created_at,
12. updated_at.

Valores sugeridos para `project_type`:

1. `lanzamiento`,
2. `presencia`,
3. `contenido`,
4. `campana`,
5. `interno`.

Estados mínimos sugeridos para `status`:

1. `draft`,
2. `active`,
3. `paused`,
4. `completed`,
5. `archived`.

## Regla de Relación

La relación mínima del sistema debe quedar así:

1. un tenant tiene muchos clients,
2. un client tiene muchos projects,
3. un project puede tener muchos briefs,
4. un brief puede vivir temporalmente sin `project_id` solo si todavía está en calificación inicial,
5. en cuanto el caso pasa a operación real, el brief debe quedar ligado a un `client` y, cuando exista claridad suficiente, a un `project`.

## Regla de Creación Mínima

En V1 el flujo puede ser flexible, pero no ambiguo.

Orden recomendado:

1. crear o seleccionar client,
2. crear o seleccionar project,
3. iniciar o vincular brief,
4. usar ese mismo project como contenedor posterior para cotizaciones y activos.

## Regla de Propiedad Operativa

Cada `project` puede tener un `owner_membership_id`.

En este corte no es obligatorio construir asignación compleja, pero sí conviene que el sistema ya pueda decir quién es el operador responsable principal del proyecto.

## Regla de Briefs

El módulo de briefing debe evolucionar para que:

1. el brief ya no nazca solo con `tenant_id`,
2. pueda asociarse a un `client_id`,
3. pueda asociarse a `project_id` cuando exista,
4. conserve la posibilidad de calificación inicial antes de fijar proyecto si el caso todavía está difuso.

## Regla Comercial

`clients` y `projects` no existen solo para ordenar tablas.

Existen para sostener la continuidad del trabajo.

Eso implica:

1. un brief pertenece a una relación comercial concreta,
2. una cotización debe poder apuntar al mismo `client` y `project`,
3. los activos futuros deben heredar ese contexto,
4. el operador, diseñador y cliente deben poder entender para qué proyecto están trabajando.

## Seed Inicial del Corte

Debe existir seed mínima controlada para `vectoria` con:

1. un `client` demo inicial,
2. un `project` demo inicial asociado,
3. capacidad de vincular el brief inicial a ese contenedor.

Los nombres pueden seguir siendo de demo controlada en esta fase.

## Permisos Mínimos del Corte

1. `operator` puede crear y actualizar clients y projects,
2. `designer` puede consultar projects relevantes,
3. `client_admin` puede ver su project visible, pero no reestructurarlo,
4. agentes técnicos autorizados pueden crear o prellenar clients/projects solo si registran actor técnico y actor efectivo.

## Resultado Esperado

Al terminar este corte, Bridge debe poder responder con claridad:

1. para qué cliente es este brief,
2. dentro de qué proyecto vive,
3. quién es el responsable principal del proyecto,
4. qué objetos futuros deberán colgar de ese mismo contenedor.