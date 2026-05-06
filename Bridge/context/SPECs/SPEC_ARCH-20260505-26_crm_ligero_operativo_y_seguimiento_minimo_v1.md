# SPEC ARCH-20260505-26

## Titulo

CRM ligero operativo y seguimiento minimo V1

## Estado

Planificado

## Fecha

2026-05-05

## Objetivo

Implementar una capa minima de CRM en Bridge para que el operador pueda registrar leads reales del tenant activo, moverlos por estados basicos y dejar seguimiento comercial minimo sin depender de chats dispersos.

## Problema que Resuelve

Bridge ya puede:

1. persistir briefs,
2. resolver identidad minima,
3. operar `client-project`,
4. mantener cotizaciones versionadas,
5. registrar activos operables,
6. mostrar un dashboard accionable con siguiente accion.

Pero todavia no tiene una unidad comercial minima para capturar oportunidad, seguimiento y estado operativo del pipeline.

## Decision Arquitectonica

Antes de abrir chat contextual real, Bridge debe introducir un CRM ligero anclado a entidades persistidas.

El objetivo no es crear un CRM amplio ni conversacional, sino una base comercial minima que permita:

1. registrar leads,
2. seguir su estado,
3. vincularlos con cliente y proyecto cuando aplique,
4. dejar una nota corta de seguimiento,
5. reemplazar la metrica fake de CRM en el shell.

## Alcance del Corte

### Persistencia minima

1. crear entidad `leads`,
2. crear entidad minima de seguimiento o nota corta por lead,
3. vincular lead con `tenant`, y opcionalmente con `client` y `project`,
4. soportar al menos tres estados operativos.

### UI minima

1. `/crm` muestra lista real de leads del tenant activo,
2. permite crear lead nuevo con campos minimos,
3. permite cambiar estado del lead,
4. permite registrar un seguimiento corto,
5. muestra relación con cliente o proyecto cuando exista,
6. muestra estado vacio honesto cuando no existan leads.

### Integracion minima con shell

1. reemplazar metrica fake de CRM por conteo real o estado vacio,
2. mantener navegacion actual sin romper dashboard ni modulos ya cerrados.

## Campos Minimos Sugeridos

### lead

1. id,
2. tenant_id,
3. client_id nullable,
4. project_id nullable,
5. name,
6. source_channel,
7. requested_service,
8. status,
9. next_follow_up_at nullable,
10. updated_at,
11. created_at.

### lead_note

1. id,
2. tenant_id,
3. lead_id,
4. note_text,
5. created_at.

## Criterios de Aceptacion

1. El operador puede abrir `/crm` y ver leads reales o estado vacio honesto.
2. El operador puede crear un lead minimo y verlo persistido al recargar.
3. El operador puede mover un lead entre al menos tres estados.
4. El operador puede registrar una nota corta de seguimiento por lead.
5. Si el lead se vincula a cliente o proyecto existente, la relación es visible.
6. El shell deja de mostrar la metrica fake de CRM.
7. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. chat contextual real,
2. comentarios generales multi-entidad,
3. scoring o automatizacion comercial,
4. embudos complejos,
5. IA conversacional sobre CRM.

## Riesgo que Evita

Este corte evita que el seguimiento comercial vuelva a repartirse en chats libres sin entidad fuente, y prepara el terreno para que un chat contextual posterior nazca anclado a objetos persistidos.

## Orden de Implementacion Recomendado

1. migracion y seed minima de leads,
2. capa server-side de CRM,
3. UI minima en `/crm`,
4. integracion de metrica real en shell,
5. validacion, build, tests y checkpoint.