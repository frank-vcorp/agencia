# PROYECTO

**Proyecto:** Bridge  
**ID activo:** ARCH-20260510-11  
**Fecha de actualizacion:** 2026-05-28  
**Estado general:** Bridge mantiene `ARCH-20260510-11` como corte paraguas de refinamiento operativo. Los slices `ARCH-20260513-01`, `ARCH-20260513-02`, `ARCH-20260513-03`, `ARCH-20260513-04`, `ARCH-20260513-05`, `ARCH-20260513-15` y `ARCH-20260513-16` ya quedaron implementados. La migración de contacto estructurado y la migración de configuración SendGrid ya fueron aplicadas en producción. El siguiente slice técnico recomendado ahora es **ARCH-20260513-19**, enfocado en limpieza técnica antes del refinamiento UX/UI final del piloto. `ARCH-20260513-06` queda absorbido por `ARCH-20260513-15` y no debe ejecutarse por separado.

## MICRO-SPRINT COMPLETADO (MCP + MCT + Caso Demostración)

### IMPLEMENTACIÓN: Servidor MCP Bridge + Módulo de Comunicación + Caso Superman ✓

**Fecha:** 2026-05-10  
**Proyecto:** Bridge  
**Estado:** Completado — MCP operativo con 8 tools, MCT implementado, Superman end-to-end creado

### Entregables

#### 1. Servidor MCP Bridge (ARCH-20260510-08 / IMPL-20260510-08)
- **8 herramientas operativas:**
  - `bridge_list_assets` — Lista todos los activos del tenant
  - `bridge_get_asset_context` — Contexto completo del activo (metadatos + brief + spec activa)
  - `bridge_write_production_spec` — Escribe/actualiza especificación de producción
  - `bridge_get_brief` — Lee brief consolidado + copia local automática
  - `bridge_write_quotation` — Crea/actualiza cotización con estructura comercial
  - `bridge_create_client` — Crea cliente en Bridge
  - `bridge_create_project` — Crea proyecto asociado a cliente
  - `bridge_create_asset` — Crea activo asociado a proyecto
- **Configuración MCP operativa actual (IMPL-20260527-01 / respaldo: `context/SPECs/SPEC_ARCH-20260527-01_unificacion_config_mcp_workspace_bridge.md`):** al abrir el workspace padre `agencia`, la fuente de verdad es `agencia/.vscode/mcp.json`, apuntando a `Bridge/mcp/dist/index.js` con `BRIDGE_WORKSPACE_ROOT=/home/frank/proyectos/agencia/Bridge`.
- **Configuración global:** `~/.config/Code/User/mcp.json` queda como respaldo histórico, no como fuente operativa principal para el workspace `agencia`.
- **Configuración anidada en Bridge:** `Bridge/.vscode/mcp.json` se conserva como referencia para abrir solo la subcarpeta `Bridge`, pero no gobierna la sesión cuando el workspace activo es `agencia`.
- **Endpoints API REST creados:** `/api/v1/clients`, `/api/v1/projects`, `/api/v1/assets` (POST), `/api/v1/projects/[id]/quotation`, `/api/v1/projects/[id]/brief`, `/api/v1/assets/[id]/context`, `/api/v1/assets/[id]/prompts`
- **Correcciones críticas:** Eliminación de FK `created_by_agent_id` que causaba errores 500
- **Build:** 346 tests pasando
- **Checkpoint:** `context/checkpoints/CHECKPOINT_IMPL-20260510-08.md`

#### 2. Módulo de Comunicación Transaccional - MCT (ARCH-20260510-09 / IMPL-20260510-09)
- **Servicio:** `Bridge/lib/notifications.ts`
- **3 canales implementados:**
  1. Email automático al cliente (Resend)
  2. Google Chat automático al operador (Incoming Webhook)
  3. WhatsApp Click-to-Send (generación de URL wa.me)
- **4 plantillas React Email:** `client-created.tsx`, `quotation-active.tsx`, `asset-delivered.tsx`
- **4 eventos cubiertos:** cliente creado, brief completado, cotización vigente, activo entregado
- **Estado:** Código implementado, pendiente integración con disparadores reales y configuración de env vars en producción
- **Checkpoint:** Incluido en `CHECKPOINT_IMPL-20260510-10.md`

#### 3. Caso Superman — Demostración End-to-End
- **Cliente:** Superman (ID: 92efc927-44aa-43cd-b73d-2871ad4a4b35)
- **Proyecto:** Propuesta Superman - Lanzamiento Inicial (ID: 60abed85-3e44-4e36-aca4-9b3e9d74928f)
- **Brief completo:** `Bridge/context/clientes/superman/brief.md` — objetivos, audiencia, tono, alcance, criterios de éxito
- **5 activos con especificaciones publicadas:**
  1. Hero de Lanzamiento (Instagram Feed 1:1) — spec v1
  2. Reel de Credibilidad (Instagram Reel 9:16) — spec v1
  3. Carousel de Beneficios (Instagram Carousel 1:1) — spec v1
  4. Portada Facebook (Facebook 16:9) — spec v1
  5. Stories Diarias Pack 3 (Instagram Story 9:16) — spec v1
- **Cotización comercial estructurada:** Versión 2 vigente, $42,400 MXN, 2 fases (estrategia + implementación), copia en `Bridge/context/clientes/superman/propuesta.md`
- **Resultado:** Flujo completo demostrado — cliente → proyecto → brief → cotización → activos con prompts listos para diseñador

### Hallazgos y Correcciones

1. **FK created_by_agent_id:** Campo en `asset_prompt_versions` y `quotation_versions` causaba error 500 al insertar desde MCP (referencia a tabla `service_agents` que requiere UUID válido). Solución: omitir campo en INSERTs (se permite NULL).
2. **tsconfig.json:** Next.js intentaba compilar código del MCP server. Solución: agregar `"mcp"` al array `exclude`.
3. **commercial_summary_json:** Faltaba en endpoint de quotation. Solución: agregar helper `buildCommercialSummaryJson` y field en INSERT.
4. **Degradación silenciosa en MCT:** Si faltan env vars (RESEND_API_KEY, GOOGLE_CHAT_WEBHOOK_URL), el módulo registra warning pero no rompe la ejecución.

## MICRO-SPRINT PREVIO (Auditoría del Activo)

### AUDITORÍA: Ciclo completo del Activo creativo ✓

**Fecha:** 2026-05-10  
**Proyecto:** Bridge  
**Estado:** Ya estaba completado (sesión 6-may-2026)

### Hallazgos

La implementación del ciclo completo del activo ya estaba cerrada:
1. Vista detallada `/activos/[id]` con 10 secciones operativas
2. Propuestas con persistencia real en DB (`asset_proposals`)
3. Evidencias reales con upload a Storage + signed URLs + miniaturas
4. Comparación visual lado a lado de propuestas  
5. Aprobación del cliente con registro operativo
6. Analytics por activo (días hasta aprobación)
7. Build y 304 tests pasando
8. Checkpoint de auditoría: `CHECKPOINT_IMPL-20260510-01`

## ESTADO COMPROBABLE ACTUAL

### [x] Completado

1. Arquitectura base de Bridge V1 cerrada.
2. SPEC principal, arquitectura, roadmap, contratos y catalogo P0 documentados.
3. App base en Next.js construida con pantallas por rol y dashboard inicial.
4. Despliegue productivo en Vercel operativo.
5. Supabase vinculado al proyecto real `vectoria`.
6. Migracion inicial de `tenants` y `tenant_runtime_settings` aplicada remotamente.
7. Dashboard principal conectado a lectura server-side del tenant real.
8. Validacion tecnica completada con build y tests verdes en el corte inicial.
9. Briefing persistido con revision humana implementado.
10. Identidad minima operativa con users, memberships, actor tecnico y actor efectivo implementada.
11. Clients y projects implementados como contenedor operativo del brief.
12. Migracion remota `20260505235500_clients_projects_brief_container_v1.sql` aplicada en Supabase.
13. Produccion en Vercel ya sirve el contenedor operativo en `/briefs`.
14. Corte `ARCH-20260505-22 / IMPL-20260505-22` publicado en `main` mediante commit `d7e7059`.
15. Cotizaciones versionadas implementadas, con creación de versiones y cambio de vigente funcionando en producción.
16. Activos operables implementados con migracion, seed demo, UI de `/activos` y relación visible con `project` y cotización.
17. Produccion en `vectoria-zeta.vercel.app/activos` ya sirve el activo demo, el prompt vigente y la creación guiada del slice `ARCH-20260505-24 / IMPL-20260505-24`.
18. Dashboard principal implementado con resumen operativo real, siguiente accion trazable y datos vivos en produccion para el slice `ARCH-20260505-25 / IMPL-20260505-25`.
19. CRM ligero operativo implementado con leads persistidos, notas de seguimiento, estados comerciales y shell con metrica real para el slice `ARCH-20260505-26 / IMPL-20260505-26`.
20. Migracion correctiva de RLS para CRM aplicada remotamente con escritura restringida a `service_role`.
21. Produccion en `vectoria-zeta.vercel.app/crm` ya sirve el pipeline real de leads del tenant `vectoria`.
22. El corte `ARCH-20260505-27 / IMPL-20260505-27` ya permite crear leads vinculados explicitamente a cliente y proyecto desde `/crm`.
23. El corte `ARCH-20260505-29 / IMPL-20260505-29` ya valida de forma cruzada la consistencia `clientId/projectId` antes de persistir leads en CRM.
24. El corte `ARCH-20260505-28 / IMPL-20260506-28` ya publica chat contextual real sobre `lead` en CRM con persistencia mínima de threads y mensajes.
25. El corte `ARCH-20260505-30 / IMPL-20260506-30` ya publica en `/contexto-agentes` un snapshot derivado y trazable sobre brief, cotizacion, activos y CRM del tenant activo.
26. Produccion en `vectoria-zeta.vercel.app/contexto-agentes` ya sirve contexto derivado vivo con `snapshotAt`, `source` y siguiente accion recomendada.
27. El corte `ARCH-20260506-31 / IMPL-20260506-31` ya publica handoffs remotos compactos por `brief`, `lead`, `quotation` y `asset` sobre la misma superficie `/contexto-agentes`.
28. El corte `ARCH-20260506-32 / IMPL-20260506-32` ya publica contratos externos mínimos `v1.0` por `brief`, `lead`, `quotation` y `asset` en `/contexto-agentes`.
29. El corte `ARCH-20260506-33 / IMPL-20260506-33` ya publica continuidad conversacional mínima sobre `brief`, `quotation` y `asset` reutilizando el patrón ya validado en `lead`.
30. El corte `ARCH-20260506-34 / IMPL-20260506-34` ya publica una capa reusable de consumo remoto tenant-aware con trazabilidad explícita desde `/contexto-agentes`.
31. El corte `ARCH-20260506-35 / IMPL-20260506-36` ya publica estadísticas resumidas derivadas del snapshot con lectura compacta y reusable desde `/contexto-agentes`.
32. El corte `ARCH-20260506-36 / IMPL-20260506-37` ya endurece `externalContracts` con referencias y versión canónicas, dejando la capa contractual lista para cierre de V1.
33. El corte `ARCH-20260506-39 / IMPL-20260506-39` ya implementa el radar priorizado del operador por proyecto en `/operador`, con scoring trazable, vacio honesto y validación completa por build y tests.
34. El corte `ARCH-20260506-40-41 / IMPL-20260506-44` ya implementa el workspace real del disenador en `/disenador`, con capa de datos reusable, cola guiada, flujo Bridge -> Adobe -> Bridge y validacion completa por build y tests.
35. El corte `ARCH-20260506-52 / IMPL-20260506-52` ya cierra `/disenador` con sesiones reales, bloqueos, reanudacion, cierre de jornada util, build y tests verdes, publicacion en `main` y migracion remota `20260506090000_work_sessions_v1.sql` aplicada en Supabase.
36. El corte `ARCH-20260508-21 / IMPL-20260508-21` ya implementa `/cliente` como PWA ligera con queSigue, estadoDelProyecto, revisiones, resultadosPorCanal y leadsYSeguimiento, con ajustes responsive (IMPL-20260509-01) y optimizacion de densidad publicados en produccion.
37. El ciclo completo del Activo creativo ya fue implementado en la sesión del 6-may-2026 con los cortes `IMPL-20260506-45` (vista detallada), `IMPL-20260506-46` (propuestas persistentes), `IMPL-20260506-47` (evidencias reales), `IMPL-20260506-49` (miniaturas) e `IMPL-20260506-51` (comparación visual, aprobación cliente, analytics).
38. **Servidor MCP Bridge operativo** (`ARCH-20260510-08 / IMPL-20260510-08`) con 8 herramientas conectadas a producción: list_assets, get_asset_context, write_production_spec, get_brief, write_quotation, create_client, create_project, create_asset. Configuración global en VS Code funcionando.
39. **Módulo de Comunicación Transaccional (MCT)** (`ARCH-20260510-09 / IMPL-20260510-09`) implementado con servicio `lib/notifications.ts`, 4 plantillas React Email y 3 canales (SendGrid, Google Chat, WhatsApp wa.me).
40. **Caso Superman completo** como demostración end-to-end: cliente, proyecto, brief, 5 activos con especificaciones publicadas, cotización comercial estructurada en 2 fases ($42,400 MXN). Flujo completo validado desde MCP.
41. **Contacto estructurado del cliente** (`ARCH-20260513-01 / IMPL-20260513-01`) implementado con `primary_contact_email` y `primary_contact_whatsapp`, API/MCP actualizados y 356 tests en verde.
42. **Integración MCT con eventos reales** (`ARCH-20260513-02 / IMPL-20260513-02`) implementada para `client.created` y `quotation.active`, con `emailSent` real, `whatsAppLink` opcional y 362 tests en verde sin regresiones.
43. **PDF de cotizaciones y propuestas** (`ARCH-20260513-03 / IMPL-20260513-03`) implementado con endpoint `GET /api/v1/projects/[id]/quotation/pdf`, plantilla basada en `@react-pdf/renderer`, CTA en `/cotizaciones`, 370 tests en verde y checkpoint `CHECKPOINT_IMPL-20260513-03_pdf_cotizaciones_v1.md`.
44. **Migración remota de contacto estructurado aplicada** en producción sobre `public.clients` para `primary_contact_email` y `primary_contact_whatsapp` mediante `supabase db push` sobre el proyecto `vectoria` (`vrboviomvfizqnsvhlew`).
45. **Migración del MCT a SendGrid** (`ARCH-20260513-04 / IMPL-20260513-04`) implementada con reemplazo de Resend por `@sendgrid/mail`, contratos `client.created`, `quotation.active` y `asset.delivered` preservados, 370 tests en verde y checkpoint `CHECKPOINT_IMPL-20260513-04.md`.
46. **Configuración segura de SendGrid desde Bridge** (`ARCH-20260513-05 / IMPL-20260513-05`) implementada con ruta `/configuracion`, edición UI de parámetros no secretos del remitente, lectura del estado runtime de SendGrid, fallback a env vars en el MCT y checkpoint `CHECKPOINT_IMPL-20260513-05_configuracion_sendgrid_segura.md`.
47. **Migración remota de configuración SendGrid aplicada** en producción sobre `tenant_runtime_settings` mediante `supabase db push` con la migración `20260513100000_sendgrid_config_tenant_runtime_v1.sql`.
48. **Vika como agente operadora de Bridge** (`ARCH-20260513-15 / IMPL-20260513-15`) implementada en el root del workspace con 4 skills técnicas, definición MCP-first y checkpoint `CHECKPOINT_IMPL-20260513-15_vika_agente_v1.md`.
49. **MCP Vika para sincronización local** (`ARCH-20260513-16 / IMPL-20260513-16`) implementado con soporte `project-folders` en `bridge_get_brief`, nueva tool `bridge_download_asset_files`, ruta `GET /api/v1/assets/[id]/files`, endurecimiento contra traversal y validación completa en `Bridge/mcp` con 33 tests verdes y build limpio.
50. **Visibilidad operativa ligera Captura/Produccion** (`IMPL-20260513-17`) implementada en `/disenador`, `/activos` y `/activos/[id]` como etiqueta derivada sin cambiar modelo de datos, con build limpio y checkpoint conjunto `CHECKPOINT_IMPL-20260513-16_17_vika_mcp_y_visibilidad_operativa.md`.

### [/] En Progreso

1. Corte paraguas: `ARCH-20260510-11` — fase de cierre operativo final para piloto real.
2. Secuencia tecnica `ARCH-20260526-06`, `ARCH-20260526-07`, `ARCH-20260526-08` y `ARCH-20260526-09` cerrada tecnicamente (QA APROBADO en `CHECKPOINT_VAL-20260526-01_qa_cierre_tecnico_arch_20260526_06_09.md`).
3. SendGrid en produccion verificado operativo por INFRA.
4. Configuracion MCP del workspace raiz `agencia` alineada para validacion manual en VS Code tras recarga de ventana; comprobar visibilidad de `bridge_list_projects`, `bridge_get_project` y `bridge_list_clients`.

### [~] Planificado

1. Cierre operativo final del corte `ARCH-20260510-11`: corrida e2e final de punta a punta y trazabilidad Jira del cierre tecnico `20260526-06..09`.
2. Slices posteriores del corte paraguas `ARCH-20260510-11`, una vez liberado el bloqueador operativo.
3. `ARCH-20260528-07` autorizado: portal cliente por proyecto con brief conversacional como entrada principal; la capa informativa posterior al brief queda fuera de alcance y se tratara en un slice independiente.
4. `ARCH-20260528-08` autorizado: brief cliente en capa IA real (Gemini) con fallback determinista y alcance tecnico acotado a 3 archivos.
5. `ARCH-20260528-09` autorizado: hardening del prompt del asistente de brief por etapas con alcance acotado a 2 archivos.
6. `ARCH-20260529-01` autorizado: brief cliente en doble capa conversacional, con respuesta natural visible y estructuracion invisible para Bridge, manteniendo alcance tecnico acotado a 3 archivos.

### [ ] Pendiente

1. Bloqueador unico operativo: completar e2e final y registrar issue Jira vinculado al cierre (`estado actual: SIN-ISSUE`), con evidencia de QA e INFRA.
2. Ejecutar refinamiento UX/UI final del piloto al cerrar el bloqueador operativo de e2e/Jira.

## Ultimo Corte Cerrado

**ARCH-20260526-04 / IMPL-20260526-01 + IMPL-20260526-02**

1. **Contrato MCP CRUD logico por entidad** completado para `clients`, `projects`, `briefs`, `quotations` y `assets` en list/get/update, manteniendo eliminaciones seguras con `preview/execute`.
2. **Registro y despacho MCP ampliado** en `mcp/src/index.ts` con tools nuevas de consulta y actualizacion por entidad.
3. **Endpoints API por ID** implementados para `GET/PATCH` en `/api/v1/clients/[id]`, `/api/v1/projects/[id]`, `/api/v1/briefs/[id]`, `/api/v1/quotations/[id]` y `/api/v1/assets/[id]`.
4. **Hardening TypeScript en delete tools** para evitar coerciones de `unknown` y mantener contratos estrictos en `bridge_delete_project`, `bridge_delete_asset`, `bridge_delete_brief`, `bridge_delete_quotation`.
5. **Validación:** `cd Bridge && npm run build` limpio; `cd Bridge/mcp && npm run build` limpio.
6. **Checkpoint:** `context/checkpoints/CHECKPOINT_IMPL-20260526-02_cierre_arch_20260526_04_mcp_crud_entidades.md`.

## Siguiente Paso Recomendado

Continuar ejecutando por slices el corte paraguas `ARCH-20260510-11` para dejar Bridge listo para piloto real.

Prioridad recomendada:

1. Correr e2e final end-to-end en entorno objetivo de cierre.
2. Crear o vincular issue Jira del cierre tecnico `20260526-06..09` y adjuntar checkpoint QA + dictamen INFRA.
3. Solicitar transicion/comentario Jira con `Jira - Especialista` y reflejar resultado en PROYECTO.md.
4. Emitir checkpoint final de cierre operativo y marcar el corte como completado.
5. Ejecutar refinamiento UX/UI final.

**Estado del V1 técnico:** arquitectura cerrada; pendiente operacionalización final.

## Artefactos Clave

1. context/00_ARQUITECTURA.md
2. context/SPECs/SPEC_ARCH-20260504-04_bridge_v1_roles_base_y_flujos.md
3. context/CATALOGO_ACTIVOS_V1.md
4. context/AGENTES_Y_CONOCIMIENTO_V1.md
5. context/ROADMAP_Y_MICROSPRINTS_V1.md
6. context/MODELO_DATOS_MULTITENANT_V1.md
7. context/CONTRATOS_AGENTES_Y_VSCODE_V1.md
8. context/BRIEFING_ESTRUCTURADO_CLAUDE_V1.md
9. context/MATRIZ_COMBINACIONES_ACTIVOS_P0.md
10. context/checkpoints/CHECKPOINT_IMPL-20260505-02.md
11. supabase/migrations/20260505180500_init_tenants_and_runtime_settings.sql
12. context/SPECs/SPEC_ARCH-20260505-19_agente_briefing_persistido_y_revision_humana.md
13. context/IDENTIDAD_Y_MEMBERSHIPS_V1.md
14. context/SPECs/SPEC_ARCH-20260505-21_memberships_users_y_actor_efectivo_v1.md
15. context/CLIENTS_Y_PROJECTS_V1.md
16. context/SPECs/SPEC_ARCH-20260505-22_clients_y_projects_v1.md
16. context/COTIZACIONES_VERSIONADAS_V1.md
17. context/SPECs/SPEC_ARCH-20260505-23_cotizaciones_versionadas_v1.md
18. context/ACTIVOS_OPERABLES_V1.md
19. context/SPECs/SPEC_ARCH-20260505-24_activos_vinculados_a_cotizacion_y_project_v1.md
20. context/SPECs/SPEC_ARCH-20260505-25_cabina_operador_accionable_resumenes_reales_v1.md
21. context/SPECs/SPEC_ARCH-20260505-26_crm_ligero_operativo_y_seguimiento_minimo_v1.md
22. context/SPECs/SPEC_ARCH-20260505-27_vinculacion_explicita_lead_client_project_v1.md
23. context/SPECs/SPEC_ARCH-20260505-28_chat_contextual_por_entidad_v1.md
24. context/SPECs/SPEC_ARCH-20260505-29_hardening_validacion_cruzada_crm_v1.md
25. context/SPECs/SPEC_ARCH-20260505-30_conocimiento_derivado_agentes_v1.md
26. context/checkpoints/CHECKPOINT_IMPL-20260505-21.md
27. context/checkpoints/CHECKPOINT_IMPL-20260505-22.md
28. context/checkpoints/CHECKPOINT_IMPL-20260505-23.md
29. context/checkpoints/CHECKPOINT_IMPL-20260505-24.md
30. context/checkpoints/CHECKPOINT_IMPL-20260505-25_cabina_operador_accionable.md
31. context/checkpoints/CHECKPOINT_IMPL-20260505-26_crm_ligero_operativo.md
32. context/checkpoints/CHECKPOINT_IMPL-20260505-27.md
33. context/checkpoints/CHECKPOINT_IMPL-20260505-29.md
34. context/checkpoints/CHECKPOINT_IMPL-20260506-28_chat_contextual_leads_v1.md
35. context/checkpoints/CHECKPOINT_IMPL-20260506-30_conocimiento_derivado_agentes_v1.md
36. context/checkpoints/CHECKPOINT_IMPL-20260506-31_handoffs_remotos_endurecidos_v1.md
37. context/checkpoints/CHECKPOINT_IMPL-20260506-32_contratos_externos_minimos_v1.md
38. context/checkpoints/CHECKPOINT_IMPL-20260506-33.md
39. supabase/migrations/20260505223000_identity_memberships_actor_context_v1.sql
40. supabase/migrations/20260505235500_clients_projects_brief_container_v1.sql
41. supabase/migrations/20260506000000_quotations_versionadas_v1.sql
42. supabase/migrations/20260506020000_assets_and_prompt_versions_v1.sql
43. supabase/migrations/20260506030000_crm_leads_v1.sql
44. supabase/migrations/20260506032000_crm_rls_service_role_fix.sql
45. supabase/migrations/20260506050000_conversation_threads_v1.sql
46. context/SPECs/SPEC_ARCH-20260506-31_handoffs_remotos_endurecidos_por_entidad_v1.md
47. context/SPECs/SPEC_ARCH-20260506-32_contratos_externos_minimos_objetos_vivos_v1.md
48. context/SPECs/SPEC_ARCH-20260506-33_continuidad_conversacional_entidades_restantes_v1.md
49. context/SPECs/SPEC_ARCH-20260506-34_consumo_remoto_tenancy_reforzado_v1.md
50. context/checkpoints/CHECKPOINT_IMPL-20260506-34.md
51. context/SPECs/SPEC_ARCH-20260506-35_estadisticas_resumidas_datos_reales_v1.md
52. context/checkpoints/CHECKPOINT_IMPL-20260506-36_estadisticas_resumidas_v1.md
53. context/SPECs/SPEC_ARCH-20260506-36_endurecimiento_contratos_externos_v1.md
54. context/checkpoints/CHECKPOINT_IMPL-20260506-37_endurecimiento_contratos_externos.md
55. context/SPECs/SPEC_ARCH-20260506-37_copiloto_operativo_vivo_operador_disenador.md
56. context/SPECs/SPEC_ARCH-20260506-38_superficies_guiadas_por_ia_tres_capas.md
57. context/SPECs/SPEC_ARCH-20260506-39_radar_priorizado_operador_por_proyecto.md
58. context/SPECs/SPEC_ARCH-20260506-40_modelo_ejecucion_disenador_sesiones_y_estados.md
59. context/SPECs/SPEC_ARCH-20260506-41_workspace_disenador_guiado.md
60. context/SPECs/SPEC_ARCH-20260506-42_cliente_ligero_guiado.md
61. context/checkpoints/CHECKPOINT_IMPL-20260506-39_radar_priorizado_operador.md
62. context/checkpoints/CHECKPOINT_IMPL-20260506-44_workspace_disenador_guiado.md
63. context/SPECs/SPEC_ARCH-20260506-45_vista_detallada_activo_creativo_y_propuestas.md
64. context/SPECs/SPEC_ARCH-20260506-52_disenador_sesiones_reales_y_cierre_jornada.md
65. context/checkpoints/CHECKPOINT_IMPL-20260506-52_disenador_sesiones_reales.md
66. context/SPECs/SPEC_ARCH-20260508-21_cliente_pwa_resultados_y_leads_v1.md
67. context/checkpoints/CHECKPOINT_IMPL-20260510-01_ficha_activo_auditoria_estado.md
68. context/SPECs/SPEC_ARCH-20260510-08_mcp_server_bridge_para_agentes_vscode.md
69. context/checkpoints/CHECKPOINT_IMPL-20260510-08.md
70. context/SPECs/SPEC_ARCH-20260510-09_modulo_comunicacion_transaccional_mct_v1.md
71. context/SPECs/SPEC_ARCH-20260510-10_extension_mcp_cotizaciones_y_copias_locales.md
72. context/SPECs/SPEC_ARCH-20260510-11_refinamiento_operativo_piloto_real_bridge.md
73. context/SPECs/SPEC_ARCH-20260513-01_contacto_cliente_estructurado_email_whatsapp_v1.md
74. context/SPECs/SPEC_ARCH-20260513-02_integracion_mct_eventos_reales_v1.md
75. context/SPECs/SPEC_ARCH-20260513-03_pdf_cotizaciones_y_propuestas_v1.md
76. context/SPECs/SPEC_ARCH-20260513-04_sendgrid_proveedor_email_mct_v1.md
77. context/checkpoints/CHECKPOINT_IMPL-20260510-10.md
76. context/checkpoints/CHECKPOINT_IMPL-20260513-01.md
77. Bridge/mcp/ — Servidor MCP con 8 tools y cliente HTTP bridge-client.ts
78. Bridge/lib/notifications.ts — Módulo MCT (Resend, Google Chat, WhatsApp)
79. Bridge/emails/ — Plantillas React Email (client-created, quotation-active, asset-delivered)
80. Bridge/context/clientes/superman/ — Caso demostración completo (brief.md, propuesta.md, prompts)
81. context/SPECs/SPEC_ARCH-20260513-20_workspace_disenador_estacion_unica_v2.md

## Decisiones Ya Tomadas

1. Bridge V1 sera multitenant desde el inicio.
2. La integracion con VS Code y agentes sera por internet, no local.
3. El briefing usara Claude para estructurar informacion.
4. Los activos se tipifican por catalogo y cajas de seleccion.
5. La V1 conecta operador, diseñador y cliente en un mismo flujo.
6. Bridge sera operable por agentes y tambien devolvera conocimiento estructurado.
7. La identidad de agentes se separa entre actor tecnico y actor efectivo.
8. La V1 se divide en P0 obligatorio para piloto y P1 diferible.
9. El conocimiento derivado no sustituye a la fuente primaria.
10. La primera prueba de valor debe verse en produccion, no solo en documentos.
11. El agente de briefing madura el brief en 3 etapas obligatorias, usa un catalogo comercial configurable y la aprobacion final siempre pasa por revision humana.
12. La siguiente capa obligatoria es identidad minima operativa con users, memberships, actor tecnico y actor efectivo.
13. El tenant no reemplaza al cliente ni al proyecto; briefs, cotizaciones y activos deben vivir dentro de un contenedor client-project.
14. Los agentes VS Code operan Bridge mediante MCP Server con autenticación por token Bearer y tenant explícito.
15. La comunicación transaccional usa 3 canales: email automático (Resend), notificación operador (Google Chat), click-to-send cliente (WhatsApp wa.me).
16. Las cotizaciones deben poder exportarse como PDF para envío formal al cliente.
17. El modelo del cliente debe incluir email y WhatsApp como campos estructurados; `primary_contact_channel` no basta para automatización.

## Backlog Estructural Priorizado

### [x] Cerrado

1. Diseñar modelo de datos multitenant inicial.
2. Diseñar contratos agente a Bridge.
3. Cerrar matriz de identidad y autorizacion a nivel documental.
4. Cerrar matriz de aprobaciones a nivel documental.
5. Diseñar mapa de pantallas por rol.
6. Diseñar motor de briefing estructurado.
7. Diseñar flujo de activos y prompts por catalogo.
8. Diseñar esquema de cotizaciones versionadas.
9. Diseñar capa de conocimiento derivado para agentes.
10. Cerrar politica de archivos y evidencias.
11. Implementar base Next.js y Supabase.
12. Implementar tenancy publica inicial y lectura real del tenant por defecto.
13. Cerrar arquitectura operativa del agente de briefing persistido con revision humana y orientacion comercial.
14. Cerrar arquitectura operativa de identidad minima con memberships, users y actor efectivo.
15. Cerrar arquitectura operativa de clients y projects como contenedor del brief.
16. Implementar identidad minima operativa sobre el flujo de briefing persistido.
17. Implementar clients y projects como contenedor operativo real del brief en produccion.
18. Cerrar arquitectura operativa de cotizaciones versionadas sobre `project` activo.
19. Implementar cotizaciones versionadas sobre `project` activo.
20. Cerrar arquitectura operativa de activos vinculados a cotizacion y `project`.
21. Implementar activos operables colgados de cotizacion y `project`.
22. Implementar cabina del operador con resumenes reales.
23. Implementar vinculacion explicita `lead -> client/project` desde CRM.
24. Implementar hardening de validacion cruzada `clientId/projectId` en CRM.
25. Implementar chat contextual real sobre `lead`.
26. Implementar conocimiento derivado utilizable por agentes.
27. Implementar handoffs remotos endurecidos por entidad.
28. Implementar contratos externos mínimos sobre objetos vivos.
29. Implementar continuidad conversacional en entidades restantes.
30. Implementar consumo remoto con tenancy reforzado.
31. Implementar estadísticas resumidas derivadas del snapshot.
32. Endurecer contratos externos de agentes sobre objetos vivos.
33. Implementar radar priorizado del operador por proyecto.
34. Implementar modelo de ejecucion del disenador con sesiones y estados.
35. Implementar workspace del disenador guiado por IA.
36. Implementar cliente PWA con resultados y leads.
37. Cerrar arquitectura operativa del servidor MCP Bridge para agentes VS Code.
38. Implementar servidor MCP Bridge con 8 herramientas operativas.
39. Cerrar arquitectura del módulo de comunicación transaccional (MCT).
40. Implementar módulo MCT con 3 canales (Resend, Google Chat, WhatsApp wa.me).
41. Crear caso demostración end-to-end completo (Superman).

### [~] Planificado para el siguiente corte

1. Generar PDFs de cotizaciones con identidad visual.
2. ✅ Agentes VS Code operativos — Vika (estratega Bridge + marketing) y Vic (operador rápido Bridge) implementados con skills dedicados (2026-05-28).
3. Cerrar modelo de contacto del cliente con campos explícitos para email y WhatsApp.
4. Integrar disparadores reales de MCT en eventos de negocio.
5. Refinar plantillas de email y PDF con identidad final.
6. Limpieza técnica de código y archivos no utilizados.
7. Refinamiento UX/UI en interfaces operador/diseñador/cliente.
8. Redefinir `/disenador` como estacion unica de ejecucion creativa con contexto persistente y asistente lateral puntual.
9. Cerrar foco intra-workspace del diseñador para cambiar de activo sin salir de `/disenador`.

### [ ] Posterior

1. Implementar handoffs remotos completos para agentes.
2. Evaluar una API final cuando el contrato remoto esté más estable.
3. Consolidar documentación de cierre V1 si el endurecimiento contractual es suficiente.
4. Reservar analytics históricos para una fase posterior.

## Riesgos Abiertos

1. No configurar env vars de producción (RESEND_API_KEY, GOOGLE_CHAT_WEBHOOK_URL) rompe MCT silenciosamente
2. Las cotizaciones sin PDF pueden no ser formales suficiente para clientes corporativos
3. ~~El agente Frank sin skills dedicados puede generar ruido operativo al explorar~~ — **Resuelto:** Vika y Vic cubren los roles de estrategia y operación respectivamente
4. Sin un campo estructurado de email y WhatsApp del cliente, el MCT no puede operar de forma confiable
5. Código no usado acumula deuda técnica y aumenta bundle size
6. UX/UI sin refinar puede generar fricción en adopción real del piloto

## ANÁLISIS DE COMPLETITUD — Bridge V1 vs Arquitectura Planeada

**Fecha de análisis:** 2026-05-10  
**Evaluador:** INTEGRA - Arquitecto

### ✅ COMPLETO — Arquitectura Base (100%)

**Todas las 5 capas arquitectónicas están implementadas:**

| Capa | Estado | Cobertura |
|------|--------|-----------|
| **1. Experiencia** | ✅ Completo | Operador (`/operador`), Diseñador (`/disenador`), Cliente (`/cliente` PWA) |
| **2. Aplicación** | ✅ Completo | 13/13 módulos de dominio operativos |
| **3. Integración Agentes** | ✅ Completo | MCP Server con 8 tools + API REST |
| **4. Inteligencia** | ✅ Completo | Claude (briefing), MCP (agentes VS Code) |
| **5. Datos** | ✅ Completo | Supabase Postgres + Storage + RLS multitenant |

**Los 13 módulos de dominio están operativos:**

1. ✅ Tenancy y acceso
2. ✅ Clientes y proyectos
3. ✅ Briefing estructurado
4. ✅ Cotizaciones
5. ✅ Catálogo y activos
6. ✅ Prompts
7. ✅ Comentarios y decisiones (chat contextual)
8. ✅ Mini CRM
9. ✅ Estadísticas
10. ✅ Trazabilidad
11. ✅ Conocimiento derivado (`/contexto-agentes`)
12. ✅ Comunicación Transaccional (MCT) — **código completo**
13. ✅ Capa Local de Contexto (copias .md VS Code)

**Los 7 flujos arquitectónicos críticos funcionan:**

| Flujo | Estado |
|-------|--------|
| A. Brief a estructura | ✅ Operativo |
| B. Instrucción a activo | ✅ Operativo (via MCP) |
| C. Producción creativa | ✅ Operativo (diseñador + propuestas + evidencias) |
| D. Revisión y entrega | ✅ Operativo (aprobación cliente + analytics) |
| E. Seguimiento comercial | ✅ Operativo (mini CRM + leads) |
| F. Onboarding y comunicación | ✅ Implementado (MCT listo, faltan disparadores) |
| G. Copias locales | ✅ Operativo (brief.md, propuesta.md, prompts-produccion.md) |

### ⚠️ REFINAMIENTO PENDIENTE — Operacionalización (5%)

**Lo que falta NO es arquitectónico, es refinamiento operativo:**

| Pendiente | Prioridad | Esfuerzo | Bloqueante Piloto |
|-----------|-----------|----------|-------------------|
| **1. PDFs de cotizaciones** | Alta | 2-3 horas | ⚠️ Sí (formalidad) |
| ~~**2. Agente Frank + skills**~~ | ~~Alta~~ | ✅ Completado | Vika + Vic operativos |
| **3. Email + WhatsApp estructurados del cliente** | Alta | 1-2 horas | ⚠️ Sí (MCT) |
| **4. Disparadores MCT reales** | Media | 1-2 horas | No (degrada silencioso) |
| **5. Plantillas finales** | Media | 2-3 horas | No (estético) |
| **6. Limpieza código** | Baja | 1-2 horas | No (deuda técnica) |
| **7. Refinamiento UX/UI** | Media | 3-5 horas | No (usabilidad) |

**Estimación de completitud técnica:** 95%  
**Estimación de preparación para piloto real:** 90% (falta PDF + MCT disparadores reales)

### 🚀 OPCIONES FUTURAS — Post-Piloto (V2)

**Funcionalidad genuinamente nueva que NO está en la arquitectura V1:**

1. **Copiloto IA** (SPECs 37, 38) — Dashboards que detectan qué cambió y necesita atención
2. **Login cliente público** — Cliente entra con su propia sesión (actualmente vía operador)
3. **Versionado avanzado** — Historial completo de propuestas, comparación, rollback
4. **Notificaciones tiempo real** — WebSockets/SSE para actualizaciones en vivo
5. **WhatsApp Business API** — Envío automático (actualmente click-to-send manual)

### 📊 RESUMEN EJECUTIVO

**Bridge V1 está arquitectónicamente completo.**

- Todas las capas planeadas: ✅ implementadas
- Todos los módulos de dominio: ✅ operativos
- Todos los flujos críticos: ✅ funcionando
- MCP Server: ✅ 8 tools operativos
- MCT: ✅ código completo (falta config producción)
- Caso demostración: ✅ Superman end-to-end

**Lo único pendiente es refinamiento operativo** para usar en piloto real:

- **Crítico:** PDFs de cotizaciones
- **Crítico:** modelo de contacto del cliente con email + WhatsApp reales
- **Recomendado:** Disparadores MCT + plantillas finales
- **Opcional:** Limpieza código + UX/UI

**Tiempo estimado para piloto real:** 8-12 horas de refinamiento.
