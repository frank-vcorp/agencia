# Identidad y Memberships V1

**ID:** ARCH-20260505-21  
**Proyecto:** Bridge  
**Fecha:** 2026-05-05  
**Estado:** Regla operativa cerrada para implementación

## Objetivo

Definir la capa mínima de identidad operativa de Bridge V1 para que toda acción relevante quede asociada a un tenant, un usuario o agente técnico, un actor efectivo y una membresía válida.

## Problema

Bridge ya tiene tenancy inicial y briefing persistido.

Pero todavía no existe una capa mínima ejecutable de identidad para responder estas preguntas:

1. quién actúa realmente,
2. bajo qué tenant actúa,
3. con qué rol actúa,
4. cuándo actúa un agente técnico en nombre de alguien,
5. cuándo una acción debe detenerse por falta de membresía o actor efectivo.

Sin esta capa, los objetos ya persistidos siguen existiendo, pero sin gobernanza suficiente para escalar briefs, cotizaciones, revisión humana y operabilidad por agentes.

## Principio Rector

En Bridge V1 no existe acción operativa relevante sin contexto de identidad.

Toda acción debe quedar anclada, como mínimo, a:

1. tenant objetivo,
2. actor técnico,
3. actor efectivo,
4. membership activa cuando aplique,
5. tipo de permiso o decisión usada.

## Entidades Mínimas

### users

Representa usuarios humanos autenticables.

Campos mínimos:

1. id,
2. auth_user_id,
3. display_name,
4. email,
5. user_type,
6. status,
7. created_at,
8. updated_at.

Valores mínimos sugeridos para `user_type`:

1. `operator`,
2. `designer`,
3. `client`,
4. `internal_admin`.

### tenant_memberships

Relaciona un usuario humano con un tenant y define su rol visible dentro del sistema.

Campos mínimos:

1. id,
2. tenant_id,
3. user_id,
4. role,
5. status,
6. created_at,
7. updated_at.

Valores mínimos sugeridos para `role`:

1. `operator`,
2. `designer`,
3. `client_admin`,
4. `client_viewer`.

Estados mínimos sugeridos para `status`:

1. `active`,
2. `invited`,
3. `disabled`.

### service_agents

Representa identidades técnicas no humanas.

Campos mínimos:

1. id,
2. tenant_id nullable,
3. name,
4. agent_type,
5. auth_mode,
6. status,
7. created_at,
8. updated_at.

Valores mínimos sugeridos para `agent_type`:

1. `vscode_operator_agent`,
2. `briefing_agent`,
3. `integration_agent`,
4. `automation_agent`.

### agent_scopes

Declara el alcance permitido para un agente técnico.

Campos mínimos:

1. id,
2. service_agent_id,
3. tenant_id,
4. resource_type,
5. operation,
6. approval_required,
7. created_at.

## Regla de Actor Técnico y Actor Efectivo

Bridge V1 debe separar claramente estas dos identidades:

1. actor técnico: quién ejecuta la acción en el sistema,
2. actor efectivo: en nombre de quién se considera realizada esa acción.

Ejemplos:

1. si el operador usa la UI directamente, actor técnico y actor efectivo pueden coincidir,
2. si un agente desde VS Code crea o actualiza un brief, el actor técnico es el agente y el actor efectivo es el operador o usuario delegado,
3. si el cliente responde briefing autenticado, actor técnico y actor efectivo son el propio cliente.

## Regla de Membership Activa

Toda acción humana dentro de un tenant requiere una membership activa válida para ese tenant.

Eso implica:

1. un usuario puede existir globalmente y no pertenecer todavía al tenant,
2. la pertenencia al tenant no se infiere por email ni por tipo de usuario,
3. el rol operativo visible siempre sale de la membership, no del `user_type` global.

## Regla de Roles Mínimos de V1

Roles que deben existir en este corte:

1. `operator`,
2. `designer`,
3. `client_admin`,
4. `client_viewer`.

Capacidades mínimas esperadas:

### operator

1. crear y revisar briefs,
2. aprobar o devolver briefs,
3. ver y operar todos los objetos del tenant piloto,
4. actuar como actor efectivo para agentes autorizados.

### designer

1. consultar briefs y contexto relevante,
2. dejar observaciones operativas,
3. no aprobar cierres comerciales.

### client_admin

1. responder briefing,
2. revisar resúmenes y estado visible,
3. aprobar acciones visibles al cliente cuando aplique.

### client_viewer

1. consultar estado y contexto permitido,
2. no consolidar ni aprobar objetos sensibles.

## Regla de Permisos Mínimos para el Corte

Este corte no necesita una matriz exhaustiva por recurso.

Sí necesita una regla mínima ejecutable:

1. solo `operator` puede aprobar o devolver briefs,
2. `client_admin` puede responder briefing pero no bloquear versiones,
3. `designer` puede consultar, pero no revisar comercialmente,
4. cualquier operación técnica de agente debe registrar actor técnico y actor efectivo.

## Regla de Seed Inicial

Para V1 debe existir un seed inicial controlado, suficiente para operar el piloto:

1. un usuario operador,
2. un usuario diseñador,
3. un usuario cliente demo,
4. memberships activas para el tenant `vectoria`,
5. un agente técnico de tipo `vscode_operator_agent`,
6. al menos un scope inicial para operaciones de briefing.

Los nombres visibles pueden ser demo controlada en este corte.

## Regla de Auditoría Mínima

Toda acción que cambie estado o contenido relevante debe poder dejar huella de:

1. actor_user_id nullable,
2. actor_agent_id nullable,
3. effective_user_id nullable,
4. tenant_id,
5. recurso afectado,
6. timestamp.

En V1 no es obligatorio construir un motor complejo de auditoría visual, pero sí debe quedar trazabilidad suficiente para briefs y review events.

## Regla de Integración con Briefs

El siguiente corte de identidad debe integrarse con briefing persistido así:

1. el brief deja de usar actor demo implícito cuando exista membership real,
2. los mensajes y review events deben poder guardar relación con user o agente técnico,
3. la revisión humana del operador debe usar membership operator activa,
4. el encaje por tenant debe salir de membership o scope, no solo de variable por defecto.

## Fuera de Alcance de Este Corte

1. login final pulido para cliente,
2. gestión avanzada de invitaciones,
3. recuperación de contraseña,
4. políticas RLS exhaustivas por cada objeto de dominio,
5. impersonación compleja con aprobaciones multinivel.

## Resultado Esperado

Al terminar este corte, Bridge debe poder decir con claridad:

1. quién es el operador del tenant,
2. quién es el diseñador,
3. quién es el cliente visible,
4. qué agente técnico está operando,
5. en nombre de quién actúa ese agente,
6. qué acciones mínimas se permiten por rol dentro del piloto.