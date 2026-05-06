# PROYECTO

**Proyecto:** Bridge  
**ID activo:** ARCH-20260505-26  
**Fecha de actualizacion:** 2026-05-05  
**Estado general:** V1 publicada con briefing persistido, identidad minima operativa, contenedor real client-project, activos operables y dashboard accionable visibles en produccion sobre Supabase y Vercel

## MICRO-SPRINT ACTIVO

### MICRO-SPRINT: CRM ligero operativo y seguimiento minimo

**Fecha:** 2026-05-05  
**Proyecto:** Bridge  
**Duracion estimada:** Sesion de construccion, despliegue y validacion inicial

### Entregable Demostrable

> El operador puede abrir CRM, crear un lead real del tenant activo, cambiar su estado, registrar un seguimiento minimo y ver la relación con cliente o proyecto cuando exista.

### Como se Demuestra

1. abrir la URL productiva de Bridge,
2. ver el dashboard principal cargando correctamente,
3. confirmar tenant real `vectoria`, canal primario y modulos activos,
4. abrir `/crm`,
5. validar lista real de leads o estado vacio honesto,
6. crear un lead minimo y confirmar persistencia,
7. cambiar estado y registrar seguimiento visible.

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

### [~] En curso

1. Convertir CRM en un objeto operativo persistido.
2. Reemplazar la metrica fake de CRM por datos reales del tenant piloto.
3. Conectar seguimiento comercial minimo al contenedor `client-project`.

### [ ] Pendiente

1. Completar chat contextual real y continuidad conversacional sobre briefing persistido.
2. Implementar mini CRM con leads y seguimiento.
3. Implementar conocimiento derivado utilizable por agentes sobre datos vivos.

## Ultimo Corte Cerrado

1. `ARCH-20260505-25 / IMPL-20260505-25` queda cerrado como corte completado y validado en producción.
2. Produccion valida dashboard accionable con cliente activo, proyecto activo, brief, cotización y siguiente acción visibles.
3. El commit feature publicado en `main` es `2559f09`.
4. El siguiente corte activo pasa a ser `ARCH-20260505-26` sobre CRM ligero operativo.

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
22. context/checkpoints/CHECKPOINT_IMPL-20260505-21.md
23. context/checkpoints/CHECKPOINT_IMPL-20260505-22.md
24. context/checkpoints/CHECKPOINT_IMPL-20260505-23.md
25. context/checkpoints/CHECKPOINT_IMPL-20260505-24.md
26. context/checkpoints/CHECKPOINT_IMPL-20260505-25_cabina_operador_accionable.md
27. supabase/migrations/20260505223000_identity_memberships_actor_context_v1.sql
28. supabase/migrations/20260505235500_clients_projects_brief_container_v1.sql
29. supabase/migrations/20260506000000_quotations_versionadas_v1.sql
30. supabase/migrations/20260506020000_assets_and_prompt_versions_v1.sql

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

### [~] Planificado para el siguiente corte

1. Implementar CRM ligero operativo con leads reales.
2. Permitir alta, cambio de estado y seguimiento minimo por lead.
3. Mostrar relación con cliente o proyecto cuando exista.
4. Reemplazar la metrica fake de CRM por datos reales.
5. Mantener el chat contextual fuera de este corte.

### [ ] Posterior

1. Implementar cotizaciones completas.
2. Implementar mini CRM operativo.
3. Implementar estadisticas resumidas con datos reales.
4. Implementar handoffs remotos completos para agentes.

## Riesgos Abiertos

1. sobrecargar la V1 con demasiados objetos antes de cerrar uno bien,
2. no aterrizar cotizaciones y activos sobre el contenedor client-project a tiempo,
3. mantener placeholders visibles demasiado tiempo en superficies clave,
4. abrir integraciones de agentes antes de cerrar bien autorizacion y evidencias,
5. crecer el modelo de datos sin una secuencia clara por objeto de negocio.

## Siguiente Paso Recomendado

Mover Bridge desde briefs con contenedor operativo hacia el siguiente bloque comercial ejecutable en este orden:

1. CRM ligero,
2. chat contextual real,
3. contexto derivado mas fuerte para agentes,
4. endurecimiento de handoffs remotos.