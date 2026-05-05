# ADR ARCH-20260504-02

## Titulo

Bridge V1 se construira como sistema operativo minimo interno con tres agentes y arquitectura monolitica web

## Estado

Aprobado para planeacion

## Fecha

2026-05-04

## Contexto

La vision original de Bridge contempla CRM, operacion, archivos, comentarios, agentes y automatizaciones.

Sin embargo, el proyecto aun no ha sido validado con un cliente interno o piloto real.

Construir una version demasiado amplia al inicio elevaria el costo, el tiempo y la complejidad antes de probar el flujo verdadero de trabajo.

## Decision

Se decide que Bridge V1 se construira bajo estas reglas:

1. enfoque interno primero,
2. una sola aplicacion web como superficie principal,
3. Next.js con TypeScript como marco base,
4. Supabase como base de datos, auth y storage,
5. Google Drive seguira vivo como repositorio externo de archivos pesados cuando convenga,
6. la capa de agentes iniciara con solo tres agentes: intake, operaciones y produccion asistida,
7. el mini CRM de V1 se limitara a los campos minimos que cambian decisiones diarias,
8. comentarios contextuales y cotizaciones versionadas simples si entran en V1,
9. todas las acciones sensibles requeriran aprobacion humana,
10. no entra en V1 la automatizacion externa sin aprobacion,
11. no entra en V1 la facturacion ni el portal avanzado de cliente,
12. no entra en V1 un vault productivo de secretos ni la pausa automatica de campañas.

## Consecuencias Positivas

1. baja friccion de implementacion,
2. menor riesgo de sobrediseño,
3. validacion rapida con un cliente real,
4. arquitectura extensible sin reescritura total,
5. separacion clara entre operacion humana y ayuda de agentes.

## Consecuencias Negativas o Tradeoffs

1. V1 no lucira como plataforma completa,
2. algunas tareas seguiran siendo parcialmente manuales,
3. Google Drive seguira siendo parte del flujo,
4. el cliente externo no tendra aun una experiencia rica de portal.

## Alternativas Descartadas

### Alternativa 1. Plataforma completa desde el inicio

Se descarta por sobrealcance y alto riesgo de construir funciones no validadas.

### Alternativa 2. Mantener todo en documentos y agentes sin aplicacion

Se descarta porque no deja una superficie operativa clara ni trazabilidad suficiente para crecer.

### Alternativa 3. Microservicios desde V1

Se descarta porque agrega complejidad desproporcionada para el volumen inicial esperado.

## Regla de Evolucion

Toda nueva capacidad de Bridge despues de V1 debe justificar claramente que:

1. elimina friccion real ya observada,
2. mejora una operacion ya usada,
3. no complica innecesariamente la experiencia del operador,
4. no rompe la regla de aprobacion humana para acciones sensibles.