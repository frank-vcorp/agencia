# Contratos Agentes y VS Code V1

**ID:** ARCH-20260504-15  
**Proyecto:** Bridge  
**Fecha:** 2026-05-04  
**Estado:** Diseño base para implementación

## Objetivo

Definir las operaciones mínimas y el contrato de integración remota entre Bridge, tus agentes en VS Code y futuros agentes remotos.

## Principios del Contrato

1. toda operación ocurre sobre HTTPS,
2. todo request identifica actor técnico y actor efectivo,
3. todo request va acotado a tenant,
4. toda escritura deja rastro en activity_log,
5. las respuestas priorizan estructura útil sobre volcado crudo.

## Encabezados Requeridos

1. Authorization,
2. X-Bridge-Tenant,
3. X-Actor-Type,
4. X-Actor-Id,
5. X-Effective-User-Id cuando aplique,
6. X-Origin.

## Operaciones Mínimas por Entidad

### Clientes

1. crear cliente,
2. obtener cliente,
3. listar clientes,
4. actualizar cliente,
5. obtener contexto de cliente.

### Proyectos

1. crear proyecto,
2. obtener proyecto,
3. listar proyectos por cliente,
4. actualizar proyecto,
5. obtener contexto de proyecto.

### Briefs

1. crear brief,
2. agregar mensaje de briefing,
3. solicitar estructuración,
4. actualizar campos estructurados,
5. consolidar brief,
6. obtener resumen de brief.

### Cotizaciones

1. crear cotización,
2. crear versión,
3. marcar versión vigente,
4. obtener versión vigente,
5. listar historial,
6. obtener resumen comercial.

### Activos

1. crear activo con combinación válida,
2. actualizar campos del activo,
3. crear versión de prompt,
4. registrar versión de activo,
5. cambiar estado del activo,
6. obtener contexto del activo.

### Comentarios

1. crear comentario,
2. listar comentarios por entidad,
3. editar comentario,
4. cambiar visibilidad si el rol lo permite.

### Leads

1. crear lead,
2. actualizar estado,
3. listar leads,
4. obtener resumen comercial.

### Conocimiento

1. obtener contexto cliente,
2. obtener contexto proyecto,
3. obtener contexto activo,
4. obtener contexto comercial,
5. regenerar snapshot cuando el permiso lo permita.

## Payload Base de Escritura

Todo payload de escritura debe incluir:

1. tenant_id,
2. entity_type,
3. entity_id cuando aplique,
4. operation,
5. data,
6. metadata,
7. correlation_id opcional,
8. requested_approval_flow opcional.

## Payload Recomendado para Crear Activo

Campos mínimos:

1. tenant_id,
2. client_id,
3. project_id,
4. brief_id opcional,
5. application_code,
6. piece_type_code,
7. usage_code,
8. format_code,
9. title,
10. objective,
11. guided_fields,
12. prompt_seed opcional,
13. references opcional.

## Payload Recomendado para Estructurar Brief

Campos mínimos:

1. tenant_id,
2. brief_id,
3. messages,
4. extraction_schema,
5. model_hint,
6. missing_fields_policy.

## Payload Recomendado para Marcar Cotización Vigente

Campos mínimos:

1. tenant_id,
2. quotation_id,
3. quotation_version_id,
4. operation set_active_version,
5. approval_comment opcional.

## Respuestas Estructuradas para Agentes

Las respuestas deben incluir al menos:

1. ok,
2. entity,
3. entity_id,
4. tenant_id,
5. status,
6. summary,
7. next_actions,
8. approvals_required,
9. warnings.

## Endpoints Lógicos Mínimos

### Escritura

1. POST /api/v1/clients,
2. POST /api/v1/projects,
3. POST /api/v1/briefs,
4. POST /api/v1/briefs/{id}/messages,
5. POST /api/v1/briefs/{id}/structure,
6. POST /api/v1/quotations,
7. POST /api/v1/quotations/{id}/versions,
8. POST /api/v1/quotations/{id}/set-active,
9. POST /api/v1/assets,
10. POST /api/v1/assets/{id}/prompts,
11. POST /api/v1/assets/{id}/versions,
12. POST /api/v1/comments,
13. POST /api/v1/leads.

### Lectura

1. GET /api/v1/catalog/asset-combinations,
2. GET /api/v1/clients/{id}/context,
3. GET /api/v1/projects/{id}/context,
4. GET /api/v1/briefs/{id}/summary,
5. GET /api/v1/quotations/{id}/active,
6. GET /api/v1/assets/{id}/context,
7. GET /api/v1/commercial/{clientId}/context.

## Reglas de Error

Errores esperables:

1. tenant_missing,
2. actor_missing,
3. scope_denied,
4. approval_required,
5. invalid_catalog_combination,
6. missing_required_fields,
7. stale_context,
8. entity_not_found.

## Regla de Aprobación

Si una operación sensible requiere aprobación, la API no debe fallar silenciosamente.

Debe responder:

1. approval_required true,
2. approval_type,
3. pending_approval_id.