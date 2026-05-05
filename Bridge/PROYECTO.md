# PROYECTO

**Proyecto:** Bridge  
**ID activo:** ARCH-20260505-19  
**Fecha de actualizacion:** 2026-05-05  
**Estado general:** V1 ejecutable publicada con dashboard operativo, tenancy inicial real y conexion activa con Supabase y Vercel

## MICRO-SPRINT ACTIVO

### MICRO-SPRINT: Bridge Ejecutable y Tenancy Inicial Real

**Fecha:** 2026-05-05  
**Proyecto:** Bridge  
**Duracion estimada:** Sesion de construccion, despliegue y validacion inicial

### Entregable Demostrable

> Existe una primera version funcional de Bridge publicada en Vercel que ya muestra el tenant real `vectoria` y consume configuracion inicial desde Supabase.

### Como se Demuestra

1. abrir la URL productiva de Bridge,
2. ver el dashboard principal cargando correctamente,
3. confirmar tenant real `vectoria`, canal primario y modulos activos,
4. validar que Supabase aparece conectado en la vista principal.

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

### [~] En curso

1. Convertir los modulos visibles del dashboard en objetos operativos persistidos.
2. Extender tenancy desde configuracion publica inicial hacia memberships, usuarios y entidades reales.
3. Reemplazar placeholders restantes por datos reales del piloto.

### [ ] Pendiente

1. Implementar briefing persistido y chat contextual real.
2. Implementar cotizaciones versionadas con flujo visible para operador y cliente.
3. Implementar catalogo operable de activos con combinaciones y prompts asociados.
4. Implementar mini CRM con leads y seguimiento.
5. Implementar capa minima de identidad, memberships y autorizaciones ejecutables.
6. Implementar conocimiento derivado utilizable por agentes sobre datos vivos.

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
11. El agente de briefing madura el brief en 3 etapas obligatorias y la aprobacion final siempre pasa por revision humana.

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

### [~] Planificado para el siguiente corte

1. Implementar briefs como primer objeto persistido del piloto.
2. Extender esquema con memberships, users y clients.
3. Mostrar tenant snapshot real en mas superficies del shell.
4. Pasar de dashboard informativo a dashboard accionable.

### [ ] Posterior

1. Implementar cotizaciones completas.
2. Implementar mini CRM operativo.
3. Implementar estadisticas resumidas con datos reales.
4. Implementar handoffs remotos completos para agentes.

## Riesgos Abiertos

1. sobrecargar la V1 con demasiados objetos antes de cerrar uno bien,
2. no aterrizar memberships e identidad ejecutable a tiempo,
3. mantener placeholders visibles demasiado tiempo en superficies clave,
4. abrir integraciones de agentes antes de cerrar bien autorizacion y evidencias,
5. crecer el modelo de datos sin una secuencia clara por objeto de negocio.

## Siguiente Paso Recomendado

Mover Bridge desde shell ejecutable hacia primer objeto de negocio real en este orden:

1. briefs persistidos,
2. memberships y users,
3. clients y projects,
4. cotizaciones versionadas,
5. CRM ligero.