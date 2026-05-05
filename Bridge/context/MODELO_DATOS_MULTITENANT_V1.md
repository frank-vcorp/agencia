# Modelo de Datos Multitenant V1

**ID:** ARCH-20260504-15  
**Proyecto:** Bridge  
**Fecha:** 2026-05-04  
**Estado:** Diseño base para implementación

## Objetivo

Definir el modelo de datos base de Bridge V1 para soportar multitenancy, operación humana, operación por agentes y conocimiento derivado.

## Principios del Modelo

1. toda entidad operativa pertenece a un tenant,
2. toda acción registrable conserva actor técnico y actor efectivo,
3. la fuente de verdad vive en entidades primarias,
4. el conocimiento derivado es regenerable,
5. ningún flujo sensible depende de texto libre sin estructura.

## Núcleo de Tenancy e Identidad

### tenants

Campos mínimos:

1. id,
2. slug,
3. name,
4. status,
5. created_at,
6. updated_at.

### users

Campos mínimos:

1. id,
2. auth_user_id,
3. display_name,
4. email,
5. user_type,
6. status,
7. created_at,
8. updated_at.

Valores sugeridos de user_type:

1. operator,
2. designer,
3. client,
4. internal_admin.

### tenant_memberships

Relaciona usuario humano con tenant y rol.

Campos mínimos:

1. id,
2. tenant_id,
3. user_id,
4. role,
5. status,
6. created_at,
7. updated_at.

Valores sugeridos de role:

1. operator,
2. designer,
3. client_admin,
4. client_viewer.

### service_agents

Representa agentes técnicos remotos.

Campos mínimos:

1. id,
2. tenant_id nullable,
3. name,
4. agent_type,
5. auth_mode,
6. status,
7. created_at,
8. updated_at.

Valores sugeridos de agent_type:

1. vscode_operator_agent,
2. briefing_agent,
3. integration_agent,
4. automation_agent.

### agent_scopes

Declara alcance permitido para un agente.

Campos mínimos:

1. id,
2. service_agent_id,
3. tenant_id,
4. resource_type,
5. operation,
6. approval_required,
7. created_at.

## Núcleo Comercial y Operativo

### clients

Entidad comercial visible.

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

### projects

Unidad activa de trabajo.

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

Valores sugeridos de project_type:

1. lanzamiento,
2. presencia,
3. contenido,
4. campana,
5. interno.

### briefs

Documento vivo de descubrimiento.

Campos mínimos:

1. id,
2. tenant_id,
3. client_id,
4. project_id nullable,
5. status,
6. source_channel,
7. current_version,
8. consolidated_by nullable,
9. created_at,
10. updated_at.

Valores sugeridos de status:

1. draft,
2. collecting,
3. structured,
4. consolidated,
5. archived.

### brief_messages

Historial conversacional del briefing.

Campos mínimos:

1. id,
2. tenant_id,
3. brief_id,
4. author_type,
5. author_user_id nullable,
6. author_agent_id nullable,
7. message_text,
8. created_at.

### brief_structured_fields

Campos estructurados extraídos por Claude o editados por humano.

Campos mínimos:

1. id,
2. tenant_id,
3. brief_id,
4. field_key,
5. field_value_json,
6. source,
7. version,
8. created_at,
9. updated_at.

## Cotizaciones

### quotations

Contenedor lógico.

Campos mínimos:

1. id,
2. tenant_id,
3. client_id,
4. project_id nullable,
5. status,
6. active_version_id nullable,
7. created_at,
8. updated_at.

### quotation_versions

Versiones del documento.

Campos mínimos:

1. id,
2. tenant_id,
3. quotation_id,
4. version_number,
5. title,
6. body_markdown,
7. commercial_summary_json,
8. admin_status,
9. created_by_user_id nullable,
10. created_by_agent_id nullable,
11. created_at.

Valores sugeridos de admin_status:

1. draft,
2. sent,
3. approved,
4. invoiced,
5. paid.

## Catálogo y Activos

### catalog_applications

1. id,
2. code,
3. label,
4. active,
5. sort_order.

### catalog_piece_types

1. id,
2. code,
3. label,
4. family,
5. active,
6. sort_order.

### catalog_usages

1. id,
2. code,
3. label,
4. active,
5. sort_order.

### catalog_formats

1. id,
2. code,
3. label,
4. aspect_ratio nullable,
5. width nullable,
6. height nullable,
7. active,
8. sort_order.

### catalog_asset_combinations

Contrato ejecutable de combinaciones válidas.

Campos mínimos:

1. id,
2. application_id,
3. piece_type_id,
4. usage_id,
5. format_id,
6. p0_enabled,
7. required_fields_json,
8. notes nullable,
9. active.

### assets

Entidad principal del activo.

Campos mínimos:

1. id,
2. tenant_id,
3. client_id,
4. project_id,
5. brief_id nullable,
6. combination_id,
7. title,
8. objective,
9. status,
10. current_prompt_version_id nullable,
11. current_asset_version_id nullable,
12. created_at,
13. updated_at.

Valores sugeridos de status:

1. draft,
2. ready_for_prompt,
3. in_production,
4. candidate,
5. approved_by_designer,
6. approved_final,
7. delivered,
8. archived.

### asset_fields

Valores guiados específicos del activo.

Campos mínimos:

1. id,
2. tenant_id,
3. asset_id,
4. field_key,
5. field_value_json,
6. created_at,
7. updated_at.

### prompt_versions

Campos mínimos:

1. id,
2. tenant_id,
3. asset_id,
4. version_number,
5. prompt_text,
6. prompt_structure_json,
7. status,
8. created_by_user_id nullable,
9. created_by_agent_id nullable,
10. created_at.

Valores sugeridos de status:

1. draft,
2. candidate,
3. approved,
4. superseded.

### asset_versions

Representa resultados creativos o entregables.

Campos mínimos:

1. id,
2. tenant_id,
3. asset_id,
4. version_number,
5. evidence_type,
6. storage_kind,
7. storage_url,
8. status,
9. approved_by_designer_at nullable,
10. approved_final_at nullable,
11. created_at.

Valores sugeridos de evidence_type:

1. intermediate,
2. candidate,
3. designer_approved,
4. final,
5. delivered.

Valores sugeridos de storage_kind:

1. supabase_storage,
2. google_drive,
3. external_link.

## Colaboración, CRM y Estadística

### comments

Campos mínimos:

1. id,
2. tenant_id,
3. entity_type,
4. entity_id,
5. visibility,
6. body,
7. created_by_user_id nullable,
8. created_by_agent_id nullable,
9. created_at,
10. updated_at.

### leads

Campos mínimos:

1. id,
2. tenant_id,
3. client_id,
4. project_id nullable,
5. prospect_name,
6. contact_channel,
7. requested_operation,
8. status,
9. notes nullable,
10. created_at,
11. updated_at.

Valores sugeridos de status:

1. new,
2. contacted,
3. won,
4. lost.

### stats_snapshots

Campos mínimos:

1. id,
2. tenant_id,
3. client_id,
4. project_id nullable,
5. metric_scope,
6. payload_json,
7. source_name,
8. generated_at.

## Trazabilidad, Aprobaciones y Conocimiento

### approvals

Campos mínimos:

1. id,
2. tenant_id,
3. entity_type,
4. entity_id,
5. approval_type,
6. status,
7. requested_by_user_id nullable,
8. requested_by_agent_id nullable,
9. approved_by_user_id nullable,
10. approved_at nullable,
11. comment nullable,
12. created_at.

### activity_log

Campos mínimos:

1. id,
2. tenant_id,
3. actor_type,
4. actor_user_id nullable,
5. actor_agent_id nullable,
6. effective_user_id nullable,
7. entity_type,
8. entity_id,
9. action,
10. payload_json nullable,
11. approval_required,
12. created_at.

### knowledge_snapshots

Campos mínimos:

1. id,
2. tenant_id,
3. context_type,
4. context_entity_id,
5. source_version_hash,
6. summary_json,
7. generated_by,
8. generated_at,
9. stale_after,
10. status.

Valores sugeridos de context_type:

1. client,
2. project,
3. asset,
4. commercial.

## Relaciones Críticas

1. tenant tiene muchos memberships, clients, projects y assets.
2. client pertenece a tenant y tiene muchos projects, briefs, quotations y leads.
3. project pertenece a client y agrupa briefs, assets, leads y stats.
4. asset pertenece a una combinación válida de catálogo.
5. prompt_version y asset_version pertenecen a asset.
6. knowledge_snapshot resume una entidad operativa y nunca la sustituye.

## Reglas de Implementación

1. ninguna tabla operativa debe carecer de tenant_id salvo catálogos globales,
2. las tablas de catálogo deben poder filtrar P0 o P1,
3. las RLS deben evaluarse contra tenant_memberships y agent_scopes,
4. activity_log debe registrar toda escritura remota,
5. approvals debe usarse para cambios sensibles sobre cotización, activo y conocimiento derivado.