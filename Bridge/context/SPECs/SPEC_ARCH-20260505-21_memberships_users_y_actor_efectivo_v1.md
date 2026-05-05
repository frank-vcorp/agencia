# SPEC ARCH-20260505-21

## Titulo

Memberships, users y actor efectivo V1 para gobernanza mínima operativa de Bridge

## Estado

Planificado

## Fecha

2026-05-05

## Objetivo

Implementar la capa mínima de identidad operativa de Bridge para que los briefs persistidos y los siguientes objetos del sistema dejen de depender de actores demo implícitos y pasen a operar con users, tenant memberships y actor técnico/actor efectivo trazables.

## Problema que Resuelve

Bridge ya puede persistir briefs, mensajes, etapas y revisión humana.

Pero todavía no puede gobernar correctamente:

1. quién hace cada acción,
2. bajo qué rol se ejecuta,
3. cuándo actúa un agente en nombre del operador,
4. cómo se valida la pertenencia al tenant,
5. cómo se deja trazabilidad mínima real.

## Decisión Arquitectónica

El siguiente corte de Bridge debe introducir una capa mínima de identidad compuesta por:

1. `users`,
2. `tenant_memberships`,
3. `service_agents`,
4. `agent_scopes`.

Y debe integrarla al menos con:

1. briefing persistido,
2. revisión humana del operador,
3. lectura del tenant piloto `vectoria`.

## Tesis de Diseño

No se busca cerrar todavía el sistema final de auth.

Se busca cerrar la mínima gobernanza para que Bridge pase de demo operativa a sistema con identidad real básica.

## Alcance del Corte

### Persistencia mínima

1. crear tablas para users, tenant_memberships, service_agents y agent_scopes,
2. sembrar usuarios y memberships demo controladas para el tenant actual,
3. sembrar un agente técnico base para operación desde VS Code.

### Integración mínima con briefing

1. reemplazar actor demo implícito en revisión de brief por membership operator real,
2. permitir que mensajes y review events guarden referencias básicas de actor cuando sea posible,
3. usar membership activa para autorizar revisión humana.

### UI mínima

1. mostrar en Bridge el operador activo del tenant,
2. mostrar al menos la identidad mínima usada en revisión de briefs,
3. no construir todavía un panel completo de administración de usuarios.

## Entidades Requeridas

### users

Campos mínimos:

1. id,
2. auth_user_id nullable en seed inicial,
3. display_name,
4. email,
5. user_type,
6. status,
7. created_at,
8. updated_at.

### tenant_memberships

Campos mínimos:

1. id,
2. tenant_id,
3. user_id,
4. role,
5. status,
6. created_at,
7. updated_at.

### service_agents

Campos mínimos:

1. id,
2. tenant_id nullable,
3. name,
4. agent_type,
5. auth_mode,
6. status,
7. created_at,
8. updated_at.

### agent_scopes

Campos mínimos:

1. id,
2. service_agent_id,
3. tenant_id,
4. resource_type,
5. operation,
6. approval_required,
7. created_at.

## Reglas Mínimas del Corte

1. Toda revisión humana de brief debe resolverse con membership `operator` activa.
2. Un cliente demo debe existir como user y membership real del tenant, aunque el login final siga pendiente.
3. El diseñador demo debe existir como identity válida del tenant.
4. El sistema debe poder registrar actor técnico y actor efectivo en operaciones clave del brief, aunque sea de forma mínima.
5. Ninguna acción del operador en briefs debe depender ya de un label hardcodeado si existe membership real disponible.

## Seed Inicial Requerido

Para `vectoria` sembrar al menos:

1. usuario operador demo,
2. usuario diseñador demo,
3. usuario cliente demo,
4. membership operator activa,
5. membership designer activa,
6. membership client_admin activa,
7. un `service_agent` base,
8. un `agent_scope` sobre briefing.

## Criterios de Aceptación

1. Existen tablas y seed mínima de users, memberships, agents y scopes.
2. El tenant `vectoria` tiene identities demo reales, no solo texto hardcodeado.
3. El módulo de briefs puede identificar al operador real del tenant piloto.
4. La revisión humana del brief usa membership activa de operator.
5. Existe al menos una noción ejecutable de actor técnico y actor efectivo para el corte actual.
6. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. login final de clientes,
2. onboarding completo de usuarios,
3. panel de administración multiusuario,
4. autorización exhaustiva sobre todos los módulos,
5. automatización compleja de impersonación.

## Orden de Implementación Recomendado

1. migración y seed de identidad mínima,
2. capa server-side para leer membership activa del tenant,
3. integración con review de briefs,
4. exposición básica de identidad en UI,
5. validación y checkpoint.