# INTERCONSULTA PARA INTEGRA: Analisis de eliminacion segura de entidades
- **ID:** ARCH-20260526-01
- **Fecha:** 2026-05-26
- **Solicitante:** VIKA por instruccion explicita del humano
- **Estado:** VALIDADA POR INTEGRA — derivada a SPEC_ARCH-20260526-03_eliminacion_operativa_entidades_v1.md

### A. Contexto operativo
El humano solicita preparar una prueba completa de Bridge comenzando por la limpieza controlada de entidades operativas existentes.

En la revision local del sistema se confirmo lo siguiente:

1. El MCP operativo actual expone creacion y lectura de entidades, pero no una tool de eliminacion publicada.
2. El endpoint de proyectos existente expone GET y POST, no DELETE.
3. La arquitectura base ya establece que las acciones sensibles de V1 deben resolverse con aprobacion explicita por entidad.
4. La peticion actual no es implementar el borrado todavia, sino dejar el analisis y la especificacion listos para traspaso a SOFIA.

### B. Aprobacion humana explicita
El humano aprueba de forma explicita que INTEGRA analice y disene el mecanismo de eliminacion de entidades para Bridge.

Esta aprobacion cubre:

1. analisis funcional y tecnico,
2. definicion de alcance,
3. matriz de aprobacion por entidad,
4. decision sobre soft delete vs hard delete,
5. definicion de contratos, endpoints, tools o flujos administrativos necesarios,
6. redaccion de SPEC autorizada y lista para SOFIA.

Esta aprobacion NO cubre todavia:

1. ejecucion destructiva en produccion,
2. borrado masivo sin matriz de alcance,
3. eliminacion implicita de relaciones sin regla trazable,
4. cambios de seguridad o politicas RLS sin quedar documentados en la SPEC.

### C. Encargo puntual para INTEGRA
INTEGRA debe producir un analisis que responda, como minimo, estas preguntas:

1. Que entidades deben poder eliminarse en esta fase: clients, projects, briefs, quotations, assets, prompt versions, leads, archivos o solo una parte.
2. Que entidades deben usar soft delete y cuales, si alguna, pueden usar hard delete.
3. Cual es la cadena de dependencias y cascadas permitidas por entidad.
4. Que aprobacion humana se requiere por entidad, por lote y por entorno.
5. Si la limpieza para pruebas debe resolverse como:
   a. endpoint administrativo,
   b. accion interna restringida,
   c. tool MCP separada,
   d. script de mantenimiento,
   e. combinacion de las anteriores.
6. Que evidencia y trazabilidad minima deben persistirse antes y despues de una eliminacion.
7. Como evitar borrados accidentales en tenant equivocado.
8. Como dejar el sistema listo para pruebas end-to-end sin abrir una puerta insegura para produccion.

### D. Restricciones no negociables
1. Toda operacion debe ser tenant-aware.
2. Debe existir confirmacion explicita por entidad sensible o por lote claramente enumerado.
3. Debe quedar trazado actor tecnico, actor efectivo y momento de aprobacion.
4. La solucion no debe depender de borrado manual directo en base de datos como flujo operativo normal.
5. Si existe ambiguedad entre limpieza de pruebas y destruccion productiva, debe privilegiarse la separacion explicita de flujos.

### E. Salida esperada para dejar listo a SOFIA
INTEGRA debe entregar una SPEC autorizada y lista para implementacion por SOFIA que incluya:

1. objetivo,
2. alcance exacto,
3. entidades cubiertas y excluidas,
4. decision de arquitectura sobre soft delete o hard delete,
5. archivos a modificar,
6. contrato de API o MCP si aplica,
7. validaciones y guardrails,
8. criterios de aceptacion medibles,
9. estrategia de pruebas,
10. plan de rollback o recuperacion,
11. orden recomendado de implementacion.

La SPEC debe dejar claro si el primer corte sera:

1. limpieza solo de proyectos,
2. limpieza de proyectos y entidades hijas,
3. limpieza total del tenant de pruebas,
4. o un flujo mixto con confirmaciones escalonadas.

### F. Criterio de listo para SOFIA
Se considera listo para SOFIA solo si INTEGRA deja resuelto y documentado:

1. el alcance exacto del borrado,
2. la matriz de aprobacion,
3. el tipo de eliminacion por entidad,
4. la superficie tecnica a implementar,
5. los riesgos y exclusiones,
6. los tests minimos esperados,
7. la distincion entre entorno de prueba y uso productivo.

### G. Nota de gobierno
La presente interconsulta habilita el analisis y preparacion del slice. No habilita por si sola la ejecucion destructiva sobre datos reales sin una confirmacion operativa posterior del humano sobre el alcance final.

### H. Resolucion de INTEGRA
La interconsulta queda validada con esta decision de arquitectura:

1. el primer corte NO sera purga total del tenant,
2. el primer corte SI sera eliminacion operativa por entidad bajo demanda,
3. `projects`, `quotations`, `assets` y componentes subordinados deben poder eliminarse con guardrails acordes a su impacto,
4. la eliminacion de `projects` podra apoyarse en cascadas ya existentes sobre `quotations` y `assets`,
5. `briefs` y `leads` requieren reglas explicitas por entidad y no deben quedar como efecto colateral ambiguo del sistema,
6. el primer corte SI debe exponer esta capacidad tambien via MCP para Vika,
7. el MCP debe reutilizar los mismos guardrails, previews, confirmaciones y limites de alcance que la API interna,
8. la salida autorizada para implementacion queda documentada en `context/SPECs/SPEC_ARCH-20260526-03_eliminacion_operativa_entidades_v1.md`.