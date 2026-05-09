# PROYECTO

**Proyecto:** Bridge  
**ID activo:** ARCH-20260508-21 — Cliente PWA con resultados y leads planificado
**Fecha de actualizacion:** 2026-05-08  
**Estado general:** Bridge ya tiene una base V1 operativa y publicada con briefing persistido, identidad minima operativa, contenedor real client-project, activos operables, dashboard accionable, CRM ligero, contexto derivado, handoffs remotos, contratos externos endurecidos, continuidad conversacional por entidad, consumo remoto tenant-aware y estadisticas resumidas derivadas visibles sobre Supabase y Vercel. Operador, Disenador y la ficha del activo ya quedaron fuertes; el siguiente corte planificado abre `/cliente` como PWA ligera para revisiones, resultados por canal y leads resumidos.

## MICRO-SPRINT ACTIVO

### MICRO-SPRINT: Cliente PWA con resultados y leads

**Fecha:** 2026-05-08  
**Proyecto:** Bridge  
**Duracion estimada:** 2-4 horas

### Entregable Demostrable

> Bridge convierte `/cliente` en una PWA ligera e instalable, con siguiente paso, revisiones, resultados por canal y leads resumidos desde el mini CRM.

### Como se Demuestra

1. abrir `/cliente`,
2. confirmar que el bloque principal indica que debe hacer ahora el cliente,
3. validar que puede aprobar, rechazar o pedir cambios sin entrar a operacion interna,
4. revisar resultados resumidos para Facebook, Google Ads y WhatsApp,
5. comprobar que los leads muestran canal, nombre completo, asunto, etiquetas y fecha/hora,
6. validar que la experiencia movil e instalable sigue siendo simple y no abrumadora.

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

### [~] En curso

1. El paquete guiado por IA sigue activo sobre el marco ya definido por `ARCH-20260506-37` y `ARCH-20260506-38`.
2. `ARCH-20260508-21` queda como siguiente corte para abrir el cliente PWA con resultados y leads.

### [ ] Pendiente

1. No hay pendientes obligatorios dentro de V1.

## Ultimo Corte Cerrado

1. `ARCH-20260506-52 / IMPL-20260506-52` queda cerrado como corte completado y validado con compilación, tests, revisión, documentación y migración remota aplicada.
2. `/disenador` ya opera como mesa real de trabajo con sesiones persistidas, bloqueos, reanudación, cierre de jornada y continuidad con el activo.
3. El checkpoint canónico del cierre es `context/checkpoints/CHECKPOINT_IMPL-20260506-52_disenador_sesiones_reales.md`.
4. El siguiente corte recomendado es `ARCH-20260508-21` para abrir `/cliente` como PWA ligera con revisiones, resultados y leads.

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

### [~] Planificado para el siguiente corte

1. Implementar cliente PWA con resultados y leads.

### [ ] Posterior

1. Implementar handoffs remotos completos para agentes.
2. Evaluar una API final cuando el contrato remoto esté más estable.
3. Consolidar documentación de cierre V1 si el endurecimiento contractual es suficiente.
4. Reservar analytics históricos para una fase posterior.

## Riesgos Abiertos

1. sobrecargar la V1 con demasiados objetos antes de cerrar uno bien,
2. no aterrizar cotizaciones y activos sobre el contenedor client-project a tiempo,
3. mantener placeholders visibles demasiado tiempo en superficies clave,
4. abrir integraciones de agentes antes de cerrar bien autorizacion y evidencias,
5. crecer el modelo de datos sin una secuencia clara por objeto de negocio.

## Siguiente Paso Recomendado

Con Operador, Disenador y la ficha del activo ya fuertes, el siguiente paso recomendado es abrir `/cliente` como una PWA ligera de seguimiento comercial:

1. implementar `ARCH-20260508-21` para siguiente paso, revisiones, resultados por canal y leads resumidos,
2. mantener la experiencia mobile-first, instalable y no abrumadora,
3. reutilizar briefs, activos, cotizaciones, resultados y mini CRM sin convertir Cliente en backoffice.