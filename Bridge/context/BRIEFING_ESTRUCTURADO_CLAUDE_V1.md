# Briefing Estructurado Claude V1

**ID:** ARCH-20260505-19  
**Proyecto:** Bridge  
**Fecha:** 2026-05-05  
**Estado:** Regla operativa cerrada para implementación

## Objetivo

Definir el flujo de briefing conversacional con Claude para que la conversacion termine en un brief estructurado, una conversacion completa trazable, una recomendacion comercial inicial y una revision humana obligatoria antes del bloqueo final.

## Rol de Claude en Bridge

Claude no actua como chat casual ni como formulario disfrazado.

Actua como motor conversacional de maduracion del brief.

Sus funciones en V1:

1. conversar en tono natural,
2. guiar siempre la siguiente precision,
3. preguntar segun huecos, contradicciones o incertidumbre,
4. estructurar el brief sin inventar datos,
5. cerrar cada etapa con un resumen parcial o final,
6. orientar el brief hacia uno de los productos comerciales configurados,
7. entregar el caso a revision humana antes de aprobacion final.

## Principio Conversacional

El agente no interroga.

El agente acompaña y encarrila.

Reglas base:

1. usar tono natural y humano,
2. hacer una o dos preguntas clave por turno como maximo,
3. no repetir preguntas ya resueltas,
4. explicar con claridad cuando una precision afecta la calidad del resultado,
5. resumir en vez de seguir preguntando cuando ya exista suficiente contexto,
6. cerrar la etapa con lenguaje simple y accion siguiente clara.

## Flujo Obligatorio de 3 Etapas

Cada version del brief debe pasar por 3 etapas obligatorias.

No son rondas libres.

Son etapas de maduracion.

### Etapa 1. Descubrimiento

Objetivo: entender que quiere lograr el cliente, que ofrece y que problema quiere resolver.

El agente debe cerrar como minimo:

1. objetivo del proyecto o servicio,
2. oferta principal,
3. resultado esperado,
4. contexto general del negocio,
5. motivo principal de la solicitud.

### Etapa 2. Precision

Objetivo: aterrizar los datos que vuelven el brief utilizable por produccion y cotizacion.

El agente debe cerrar como minimo:

1. publico objetivo,
2. plataforma o canal,
3. CTA,
4. tono,
5. restricciones,
6. entregable esperado,
7. referencias o materiales existentes,
8. tiempos o urgencia.

### Etapa 3. Aterrizaje Comercial

Objetivo: validar que el brief ya puede enmarcarse dentro de uno de los productos comerciales del sistema.

El agente debe devolver:

1. resumen estructurado del brief,
2. faltantes todavia tolerables,
3. contradicciones detectadas,
4. producto recomendado,
5. razon de encaje,
6. posibles observaciones de upsell o reconduccion,
7. confirmacion del cliente sobre si el resumen refleja correctamente su necesidad.

## Conversacion Completa como Fuente Primaria

Bridge debe guardar la conversacion completa del briefing.

La conversacion es fuente primaria.

El brief estructurado es la interpretacion operativa vigente.

Esto implica:

1. cada mensaje queda almacenado con actor, timestamp, canal, etapa y version del brief,
2. la conversacion es append-only dentro de una version,
3. el sistema nunca sobrescribe el historial para “limpiar” el contexto,
4. cualquier resumen, campo o decision debe poder rastrearse hacia la conversacion fuente.

## Resumen al Cierre de la Conversacion

Al finalizar la tercera etapa, el agente debe presentar un resumen estructurado al cliente en lenguaje natural.

El resumen debe incluir como minimo:

1. que quiere lograr,
2. que ofrece,
3. a quien va dirigido,
4. en que canal o plataforma,
5. que accion espera del usuario final,
6. que entregable espera,
7. restricciones relevantes,
8. observaciones o faltantes,
9. producto recomendado por Bridge.

El cliente no cierra operativamente el brief.

El cliente solo cierra la etapa conversacional.

## Revision Humana Obligatoria

Despues de la tercera etapa, el brief pasa obligatoriamente a revision humana del operador.

La revision humana existe para:

1. validar calidad del brief,
2. detectar huecos que ameriten llamada o aclaracion adicional,
3. preservar intervencion humana en el servicio,
4. orientar comercialmente el caso,
5. confirmar el encaje en uno de los productos ofertados.

El operador puede:

1. aprobar y bloquear la version,
2. pedir aclaracion adicional por fuera del chat,
3. devolver el brief a nueva iteracion,
4. reconducirlo a otro producto,
5. marcarlo como insuficiente para continuar.

## Estados Recomendados del Brief

Estados minimos de V1:

1. `draft`,
2. `stage_1_discovery`,
3. `stage_2_precision`,
4. `stage_3_commercial_fit`,
5. `pending_operator_review`,
6. `operator_review_in_progress`,
7. `approved_locked`,
8. `returned_for_rework`,
9. `superseded`.

## Regla de Bloqueo

El chat del cliente se congela al finalizar la tercera etapa y enviar el resumen final.

El brief no queda definitivamente bloqueado en ese momento.

Queda bloqueada la conversacion de esa version mientras espera revision humana.

El bloqueo definitivo ocurre solo cuando el operador aprueba la version.

## Regla de Cambios Posteriores

Si despues de una version aprobada el cliente quiere cambiar algo material, no se reabre la version aprobada.

Se crea una nueva version derivada.

Cambios materiales tipicos:

1. objetivo,
2. oferta,
3. publico,
4. plataforma,
5. CTA,
6. entregable,
7. alcance comercial,
8. tiempos criticos.

## Campos Estructurados P0

1. objetivo del proyecto,
2. objetivo del activo o servicio,
3. oferta principal,
4. publico objetivo,
5. plataforma destino,
6. tipo de activo o entregable esperado,
7. mensaje principal,
8. CTA,
9. tono,
10. referencias disponibles,
11. restricciones,
12. urgencia o fecha objetivo,
13. vacios detectados,
14. nivel de confianza del brief.

## Campos Comerciales P0

1. `recommended_product_id`,
2. `recommended_product_confidence`,
3. `commercial_fit_reason`,
4. `upsell_signal`,
5. `operator_review_note`.

En V1, todo brief debe intentar orientarse hacia uno de los 3 productos comerciales activos del sistema.

## Politica de Faltantes

Un brief puede pasar entre etapas aunque no este perfecto.

Pero no debe pasar a `pending_operator_review` si faltan demasiados campos criticos.

Campos criticos para cerrar la fase conversacional:

1. objetivo,
2. oferta,
3. publico,
4. plataforma,
5. CTA,
6. entregable esperado,
7. producto recomendado o necesidad de revision comercial explicita.

## Formato de Respuesta del Agente

Claude debe devolver dos cosas en cada punto relevante:

1. respuesta conversacional natural para humano,
2. objeto estructurado para Bridge.

En el cierre de la tercera etapa debe devolver ademas:

1. resumen final visible al cliente,
2. payload estructurado del brief,
3. observaciones comerciales,
4. bandera de envio a revision humana.

## Resumen Derivado para Agentes y Equipo

Bridge debe generar una vista corta reutilizable con:

1. objetivo,
2. oferta,
3. publico,
4. plataforma,
5. entregable esperado,
6. CTA,
7. restricciones,
8. faltantes,
9. confianza,
10. producto recomendado,
11. estado del brief,
12. timestamp y version de origen.

## Reglas de Calidad

1. Claude no inventa datos no provistos,
2. si una respuesta es ambigua, debe marcarse como incierta,
3. si hay contradiccion, debe señalarse antes de seguir profundizando,
4. el operador conserva control de aprobacion y bloqueo,
5. la conversacion completa siempre se conserva,
6. el resumen derivado siempre incluye timestamp y version,
7. el agente debe guiar con tono natural en todas las etapas.