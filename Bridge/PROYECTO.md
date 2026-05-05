# PROYECTO

**Proyecto:** Bridge  
**ID activo:** ARCH-20260504-11  
**Fecha de actualizacion:** 2026-05-04  
**Estado general:** Arquitectura base cerrada y roadmap inicial planificado

## MICRO-SPRINT ACTIVO

### MICRO-SPRINT: Cierre Arquitectonico y Orden de Construccion

**Fecha:** 2026-05-04  
**Proyecto:** Bridge  
**Duracion estimada:** Sesion de arquitectura y planeacion

### Entregable Demostrable

> Queda definida la arquitectura de Bridge V1, su criterio multitenant, la capa para agentes y una secuencia de micro-sprints lista para construccion ordenada.

### Resultado Visible

1. existe la arquitectura base,
2. existe la SPEC principal de V1,
3. existe el catalogo inicial de activos,
4. existe la definicion de operabilidad para agentes,
5. existe una hoja de ruta de sprints,
6. existe diseño base de datos, contratos, briefing y matriz P0.

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

## Backlog Estructural Priorizado

### [~] Planificado

1. Diseñar modelo de datos multitenant.
2. Diseñar contratos agente a Bridge.
3. Cerrar matriz de identidad y autorizacion.
4. Cerrar matriz de aprobaciones.
5. Diseñar mapa de pantallas por rol.
6. Diseñar motor de briefing estructurado.
7. Diseñar flujo de activos y prompts por catalogo.
8. Diseñar esquema de cotizaciones versionadas.
9. Diseñar capa de conocimiento derivado para agentes.
10. Cerrar politica de archivos y evidencias.

### [ ] Pendiente

1. Implementar base Next.js y Supabase.
2. Implementar tenancy y acceso.
3. Implementar briefing y chat contextual.
4. Implementar catalogo de activos.
5. Implementar cotizaciones.
6. Implementar mini CRM.
7. Implementar estadisticas resumidas.

## Riesgos Abiertos

1. sobrecargar la V1 con integraciones tempranas,
2. no cerrar bien los contratos para agentes,
3. no controlar la complejidad de la UI por rol,
4. dejar ambiguos los presets de activos por plataforma,
5. permitir acciones de agentes sin tenant o actor efectivo claro,
6. usar resumenes de conocimiento sin control de frescura.

## Siguiente Paso Recomendado

Pasar de arquitectura documental a arquitectura ejecutable en este orden:

1. datos,
2. identidad y contratos,
3. catalogo ejecutable,
4. pantallas,
5. implementacion base.