# SPEC ARCH-20260505-19

## Titulo

Agente de briefing persistido V1 con 3 etapas obligatorias, orientacion comercial y revision humana antes del bloqueo final

## Estado

Planificado

## Fecha

2026-05-05

## Objetivo

Convertir el agente de chat de briefing en un flujo operable, persistido y gobernado dentro de Bridge, donde la conversacion completa se conserva, el brief se estructura en 3 etapas obligatorias y la aprobacion final siempre pasa por revision humana.

## Problema que Resuelve

Hoy Bridge ya tiene shell ejecutable, tenancy inicial y dashboard productivo.

Pero todavia no existe el primer objeto de negocio real del sistema.

Sin brief persistido:

1. el contexto sigue viviendo en conversaciones sueltas,
2. la cotizacion nace desde informacion inestable,
3. el diseñador y los agentes dependen de interpretaciones manuales,
4. se pierde intervencion humana de valor en el momento comercial clave,
5. no existe una fuente primaria trazable para decisiones posteriores.

## Decision Arquitectonica

Bridge V1 tratara el briefing como un objeto persistido con 4 capas separadas:

1. conversacion fuente completa,
2. brief estructurado vigente,
3. versionado del brief,
4. revision humana y decision comercial.

El agente no cierra operativamente el brief.

El agente solo madura el brief hasta dejarlo listo para revision del operador.

## Tesis de Diseño

El agente debe sonar natural, guiar siempre y hacer pensar al cliente, pero no debe sustituir la atencion humana.

La arquitectura correcta combina:

1. conversacion natural,
2. disciplina de proceso,
3. trazabilidad,
4. control humano,
5. orientacion comercial hacia el catalogo comercial activo o hacia slots comerciales configurables.

## Flujo Operativo Requerido

### Etapa 1. Descubrimiento

El agente entiende:

1. que quiere lograr el cliente,
2. que esta vendiendo o promoviendo,
3. cual es el problema u oportunidad,
4. que resultado espera.

Salida requerida:

1. resumen parcial,
2. primeros campos estructurados,
3. vacios principales.

### Etapa 2. Precision

El agente aterriza:

1. publico,
2. canal,
3. CTA,
4. tono,
5. restricciones,
6. referencias,
7. entregable,
8. tiempos.

Salida requerida:

1. resumen refinado,
2. cobertura estructurada ampliada,
3. alertas de inconsistencia.

### Etapa 3. Aterrizaje Comercial

El agente conecta el caso con la oferta de la agencia.

Salida requerida:

1. resumen final del brief,
2. producto o slot comercial recomendado,
3. razon de encaje,
4. posibles faltantes tolerables,
5. señales de upsell o reconduccion,
6. cierre de conversacion para envio a revision humana.

## Regla de 3 Etapas Obligatorias

Cada version del brief debe atravesar las 3 etapas.

No se debe permitir chat indefinido en modo exploratorio.

El objetivo de las 3 etapas es obligar a que el cliente piense mejor lo que pide y deje una solicitud mas madura antes de la intervencion humana.

## Regla de Conversacion Natural Guiada

El agente debe:

1. hablar en tono natural,
2. evitar sonar a formulario,
3. guiar con preguntas cortas y contextualizadas,
4. evitar preguntas redundantes,
5. resumir continuamente lo que ya entendio,
6. traer la conversacion de vuelta cuando el cliente se disperse.

## Regla de Persistencia

Se deben persistir al menos estas entidades:

1. `briefs`,
2. `brief_versions`,
3. `brief_messages`,
4. `brief_structured_fields`,
5. `brief_review_events`.

## Regla de Fuente Primaria

La conversacion completa se conserva como evidencia.

Nunca se debe reemplazar por unicamente el resumen.

El resumen estructurado es una derivacion operativa de la fuente primaria.

## Regla de Estados

Estados minimos:

1. `draft`,
2. `stage_1_discovery`,
3. `stage_2_precision`,
4. `stage_3_commercial_fit`,
5. `pending_operator_review`,
6. `operator_review_in_progress`,
7. `approved_locked`,
8. `returned_for_rework`,
9. `superseded`.

## Regla de Revision Humana

Al terminar la tercera etapa, el cliente ya no sigue conversando libremente en esa version.

La version pasa a `pending_operator_review`.

El operador revisa para:

1. aclarar dudas criticas,
2. llamar o contactar al cliente si hace falta,
3. validar encaje comercial,
4. orientar el caso al producto correcto,
5. aprobar o devolver el brief.

## Regla de Bloqueo

El chat se congela despues del cierre conversacional.

El brief solo queda bloqueado de forma definitiva cuando el operador lo aprueba.

## Regla de Cambios Posteriores

Una version `approved_locked` no se reabre.

Si el cliente cambia algo material, se crea una nueva version ligada a la anterior.

## Regla Comercial

Todo brief debe quedar orientado a un producto comercial activo o a un slot comercial configurable.

Mientras la definicion final del portafolio siga en revision, la arquitectura no debe depender de nombres cerrados ni de un numero fijo de productos.

Si el encaje no es claro, el agente debe dejarlo como `requiere revision comercial`, nunca inventar una clasificacion segura.

## Campos Estructurados P0

1. objetivo del proyecto,
2. oferta principal,
3. publico,
4. plataforma,
5. entregable,
6. CTA,
7. tono,
8. restricciones,
9. referencias,
10. urgencia,
11. vacios,
12. confianza de estructuracion.

## Campos Comerciales P0

1. producto o slot comercial recomendado,
2. confianza del encaje,
3. razon de encaje,
4. oportunidad de upsell,
5. nota para revision del operador.

## Criterios de Aceptacion

1. El sistema puede guardar la conversacion completa del briefing.
2. El agente opera en 3 etapas obligatorias y visibles.
3. Cada etapa deja resumen parcial o final y payload estructurado.
4. El cierre de la tercera etapa envia el caso a revision humana.
5. El operador puede aprobar, devolver o reconducir el brief.
6. Una version aprobada queda bloqueada.
7. Cambios posteriores generan nueva version.
8. El brief queda orientado a un producto comercial o marcado para revision comercial.
9. El tono del agente se mantiene natural y guiado en todo el flujo.

## Fuera de Alcance de Este Corte

1. Automatizacion completa de cotizacion desde el brief,
2. CRM avanzado,
3. handoff remoto completo a agentes externos,
4. scoring comercial sofisticado,
5. reentrenamiento automatico del agente por historial.

## Orden de Implementacion Recomendado

1. persistencia de briefs, versiones y mensajes,
2. motor de estados y transiciones,
3. UI de briefing por etapas,
4. resumen final y envio a revision humana,
5. panel de revision del operador,
6. enlace posterior con cotizaciones y activos.