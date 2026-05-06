# SPEC ARCH-20260505-27

## Titulo

Vinculacion explicita `lead -> client/project` en CRM V1

## Estado

Cerrado

## Fecha

2026-05-05

## Objetivo

Permitir que el operador vincule un lead desde el alta a un `client` y un `project` existentes, usando defaults seguros del contenedor activo cuando existan, para que el pipeline comercial deje de depender de vínculos implícitos o posteriores.

## Problema que Resuelve

El slice 26 dejó CRM operativo, pero el formulario de alta todavía solo captura:

1. nombre,
2. canal de origen,
3. servicio solicitado.

La entidad `leads` ya soporta `client_id` y `project_id`, pero la UI no expone esos campos y la acción server-side no los persiste. Eso deja una brecha entre el CRM real y el contenedor comercial que ya usa Bridge en briefs, cotizaciones y activos.

## Decision Arquitectonica

Antes de abrir chat contextual real, cada lead debe poder nacer anclado a entidades persistidas.

La regla es:

1. si existe un contenedor activo, el operador puede usarlo como default,
2. si hay multiples opciones, el operador puede elegir cliente y proyecto de forma explicita,
3. el vínculo debe persistirse desde la creación, no como paso posterior escondido.

## Alcance del Corte

### UI de CRM

1. extender el formulario de alta en `/crm`,
2. mostrar selector de cliente cuando existan clientes disponibles,
3. mostrar selector de proyecto filtrado por cliente o por contenedor activo,
4. precargar cliente y proyecto activos cuando exista un contenedor claro,
5. mostrar de forma visible el vínculo elegido antes de enviar.

### Server-side

1. ampliar `CreateLeadInput` con `clientId` y `projectId` nullable,
2. persistir ambos campos en `createLeadForDefaultTenant`,
3. validar consistencia minima entre `project` y `client` cuando ambos existan,
4. mantener el mismo patrón server-side y RLS ya usado por CRM.

### Lectura y presentación

1. mantener visible en la tarjeta del lead el cliente y proyecto ligados,
2. evitar copiar nombres “quemados”; resolver etiquetas desde entidades reales,
3. conservar estado vacio honesto cuando no existan leads o no existan clientes/proyectos.

## Criterios de Aceptacion

1. El operador puede crear un lead y elegir cliente y proyecto desde `/crm`.
2. Si existe contenedor activo, el formulario propone esa relación por defecto.
3. El lead persiste `client_id` y `project_id` al recargar la página.
4. La tarjeta del lead muestra claramente el vínculo comercial real.
5. Si no hay datos suficientes para vincular, el formulario sigue permitiendo alta mínima sin romperse.
6. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. edición posterior del vínculo desde una pantalla aparte,
2. creación de clientes o proyectos desde CRM,
3. chat contextual real,
4. scoring comercial o automatización.

## Riesgo que Evita

Evita abrir un chat contextual sobre leads huérfanos o con vínculo implícito, y mantiene una única fuente de verdad para el contenedor comercial operativo.

## Orden de Implementacion Recomendado

1. exponer lectura mínima de clientes y proyectos reutilizable por CRM,
2. ampliar tipos y creación server-side de lead,
3. extender formulario de `/crm` con defaults y filtros simples,
4. validar build, tests y publicación,
5. generar checkpoint del corte.