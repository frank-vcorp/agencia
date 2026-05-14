# SPEC ARCH-20260513-19: Limpieza técnica para piloto real de Bridge V1

**ID:** ARCH-20260513-19  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-13  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Media-alta  
**Puntaje de prioridad:** (Valor 8 x 3) + (Urgencia 7 x 2) - (Complejidad 4 x 0.5) = 36  
**Depende de:** ARCH-20260510-11, ARCH-20260513-15, ARCH-20260513-16  
**Rol en el corte:** reducir residuos de implementación y endurecer mantenibilidad antes del último refinamiento UX/UI del piloto

---

## 1. Contexto

Bridge ya cerró la arquitectura operativa principal del piloto:

1. agentes y skills de Vika ya existen,
2. MCP ya sincroniza brief y archivos reales al workspace,
3. la app ya distingue `Captura` y `Produccion` en superficies clave,
4. los flujos principales compilan y validan.

Con esa base ya estable, el siguiente riesgo no es funcional sino de mantenimiento: el repo todavía arrastra piezas transitorias, referencias históricas desalineadas, imports y helpers que crecieron por iteraciones, y documentación de estado que ya no siempre refleja el corte actual con precisión suficiente para el siguiente implementador.

Este slice existe para bajar esa deuda sin reabrir arquitectura ni tocar comportamiento de negocio que ya está validado.

---

## 2. Objetivo

Ejecutar una limpieza técnica acotada y verificable sobre Bridge para dejar el repositorio más mantenible, más legible y menos propenso a errores silenciosos antes del refinamiento UX/UI final del piloto.

---

## 3. Resultado esperado

Al cerrar este slice:

1. se eliminan residuos técnicos claramente sobrantes,
2. se corrigen referencias locales o documentales obsoletas cuando su reparación sea directa y segura,
3. se reducen imports, helpers y ramas muertas del código tocado,
4. la estructura visible del repo queda más clara para el siguiente corte,
5. el cambio queda validado sin introducir regresiones funcionales.

---

## 4. Alcance

### Incluye

1. eliminar imports no usados o duplicados,
2. remover helpers transitorios que ya no aportan al flujo actual,
3. reducir duplicación menor y residuos de refactors recientes,
4. corregir referencias documentales o locales que quedaron obsoletas cuando la fuente vigente sea identificable con alta confianza,
5. revisar configuraciones temporales dejadas por cortes previos si ya no son necesarias,
6. endurecer pequeñas incoherencias entre código, checkpoint y backlog cuando formen parte del mismo ajuste.

### Excluye

1. reescrituras amplias de módulos estables,
2. cambios de modelo de datos,
3. cambios de negocio o UX profundos,
4. migraciones nuevas solo “por limpieza”,
5. refactors cosméticos sin impacto real en legibilidad o mantenimiento,
6. eliminación de artefactos documentales que sigan siendo respaldo de decisiones activas.

---

## 5. Principios rectores

### 5.1 Limpieza con riesgo bajo

La limpieza debe atacar primero residuos con alta certeza y bajo riesgo:

1. imports muertos,
2. utilidades huérfanas,
3. ramas no alcanzables,
4. referencias obsoletas claramente localizables,
5. duplicaciones pequeñas dentro de la misma superficie.

### 5.2 No reabrir comportamiento validado

Si una pieza ya está validada por build, tests o checkpoint y el beneficio de tocarla es solo estético, no debe moverse en este slice.

### 5.3 Documentación viva antes que borrado agresivo

No se deben eliminar checkpoints, SPECs o documentos de contexto solo porque parezcan viejos. Si un artefacto aún explica una decisión activa, se conserva.

### 5.4 Corrección directa de referencias obsoletas

Cuando exista una desalineación puntual y verificable, como IDs históricos o rutas locales ya inválidas, este slice sí puede corregirla si la fuente vigente es identificable sin ambigüedad.

---

## 6. Frentes permitidos en este slice

### Frente A. Código muerto y ruido local

SOFIA puede:

1. eliminar imports no usados,
2. compactar helpers duplicados dentro del mismo módulo,
3. borrar ramas obvias sin consumidores,
4. reducir ruido de utilidades transitorias dejadas por el endurecimiento MCP y de visibilidad operativa reciente.

### Frente B. Referencias locales desalineadas

SOFIA puede corregir referencias documentales o locales cuando se cumplan ambas condiciones:

1. la fuente vigente existe y es comprobable,
2. la corrección no obliga a reinterpretar negocio.

Ejemplo claro permitido:

1. reparar un `projectId` histórico en una copia local si el proyecto vivo correcto puede identificarse con suficiente confianza.

### Frente C. Backlog y checkpoints menores

Si durante la limpieza aparece una incoherencia pequeña entre:

1. `PROYECTO.md`,
2. checkpoints,
3. y estado real del código,

puede corregirse dentro del mismo corte siempre que no derive en replanificación arquitectónica nueva.

---

## 7. Superficies objetivo esperadas

La implementación debe concentrarse en un conjunto acotado de archivos realmente afectados por ruido o desalineación, priorizando:

1. `Bridge/lib/`
2. `Bridge/app/`
3. `Bridge/mcp/src/`
4. copias locales del caso demostración cuando exista una referencia obsoleta verificable,
5. `PROYECTO.md` y checkpoint de cierre del slice.

No se espera un barrido indiscriminado del repo completo.

---

## 8. Criterios de aceptación

1. el repo queda con menos ruido técnico comprobable que al inicio del slice,
2. no se introducen cambios de negocio no pedidos,
3. las referencias obsoletas reparadas quedan verificadas contra una fuente viva,
4. build o validación enfocada de las superficies tocadas pasa,
5. el slice emite checkpoint con lista concreta de residuos retirados y riesgos remanentes.

---

## 9. Validación mínima exigida

1. ejecutar la validación más estrecha posible sobre las superficies tocadas,
2. si se toca MCP, correr tests/build de `Bridge/mcp`,
3. si se toca app Next, correr al menos build o validación enfocada del módulo impactado,
4. si se corrigen referencias locales del caso demostración, dejar evidencia documental en checkpoint.

---

## 10. Riesgos del slice

1. convertir limpieza técnica en refactor amplio y perder foco,
2. borrar documentación de respaldo que aún importa,
3. tocar demasiado comportamiento validado solo para “ordenar”,
4. corregir una referencia histórica con baja certeza y dejar una inconsistencia nueva.

---

## 11. Orden recomendado para SOFIA

1. localizar residuos de bajo riesgo y alta certeza,
2. corregir referencias obsoletas puntuales si la fuente viva es clara,
3. validar de forma estrecha cada superficie tocada,
4. actualizar checkpoint y backlog menor si aplica,
5. cerrar el corte sin abrir frentes de UX ni negocio.

---

## 12. Definición de terminado

Este slice se considera terminado cuando Bridge queda visiblemente más mantenible, con menos ruido técnico y sin regresiones, dejando el terreno limpio para el refinamiento UX/UI final del piloto.