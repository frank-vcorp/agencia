# SPEC ARCH-20260513-20

## Titulo

Workspace del disenador como estacion unica de ejecucion creativa

## Estado

Autorizado

## Fecha

2026-05-13

## ID de Intervencion

ARCH-20260513-20

## Objetivo

Redefinir `/disenador` para que deje de operar como una cola visual que deriva a otras superficies y pase a funcionar como una estacion unica de trabajo donde el disenador:

1. selecciona el activo correcto,
2. entiende el contexto minimo del proyecto,
3. ejecuta sobre el activo enfocado,
4. consulta dudas puntuales de produccion,
5. avanza el estado sin salir del mismo workspace.

## Problema que Resuelve

El workspace actual ya mejoro la priorizacion, pero todavia conserva un problema estructural:

1. la cola sigue siendo la protagonista visual,
2. el trabajo real sigue ocurriendo fuera de esa superficie,
3. el contexto general del proyecto no queda persistente cerca del foco,
4. el asistente de produccion existe tecnicamente pero quedo desacoplado del layout,
5. el disenador todavia puede perder contexto entre cola, ficha, brief y asistencia.

El siguiente corte debe cerrar esa brecha y convertir `/disenador` en una mesa de trabajo continua.

## Decision Arquitectonica

`/disenador` deja de ser un tablero de tarjetas como destino final y pasa a ser un workspace de tres zonas persistentes tipo IDE:

1. rail izquierda para cola priorizada y control de foco,
2. canvas central para el activo enfocado y su ejecucion,
3. rail derecha para contexto del proyecto y asistente de produccion.

La regla dominante cambia a:

1. izquierda decide,
2. centro ejecuta,
3. derecha contextualiza y desbloquea.

## Principios Rectores

1. Un activo enfocado gobierna toda la pantalla.
2. La cola sirve para cambiar de foco, no para trabajar dentro de ella.
3. El centro debe privilegiar ejecucion por encima de resumen.
4. El panel derecho no es un chat general; es contexto persistente + asistente puntual.
5. El brief completo sigue existiendo como fuente, pero el workspace debe exponer una version operativa y resumida.
6. El contexto general del proyecto no va en footer; debe vivir visible cerca del activo y del asistente.

## Relacion con SPECs Previas

Esta SPEC:

1. refina y reemplaza la estructura visual propuesta en `SPEC_ARCH-20260506-41_workspace_disenador_guiado.md`,
2. conserva el modelo de estados y sesiones de `SPEC_ARCH-20260506-40_modelo_ejecucion_disenador_sesiones_y_estados.md`,
3. conserva el asistente definido en `SPEC_ARCH-20260510-03_chat_asistente_produccion_disenador.md`,
4. no altera el dominio del asistente: sigue siendo puntual, especializado y no generalista.

## Estructura Obligatoria de Pantalla

### 1. Rail izquierda

Ancho objetivo desktop: `280px` a `320px`.

Debe incluir:

1. encabezado corto de jornada,
2. cola priorizada de activos,
3. estado de sesion activa o bloqueada,
4. cambio de foco entre activos,
5. filtros minimos si hacen falta.

No debe incluir:

1. bloques explicativos largos,
2. resumenes comerciales extensos,
3. acciones que compitan con el canvas central.

### 2. Canvas central

Es la zona principal del workspace.

Debe mostrar para el activo enfocado:

1. cliente,
2. proyecto,
3. nombre del activo,
4. estado operativo,
5. accion sugerida,
6. brief resumido operativo,
7. prompt vigente,
8. formato requerido,
9. referencias y restricciones,
10. propuestas o evidencias,
11. acciones operativas del activo.

La pregunta que responde esta zona es:

1. que tengo que producir ahora,
2. con que contexto,
3. y como avanzo el activo al siguiente estado.

### 3. Rail derecha

Ancho objetivo desktop: `320px` a `380px`.

Debe dividirse en dos bloques, en este orden:

1. tarjeta de contexto general del proyecto,
2. panel `Asistente de produccion`.

#### 3.1 Tarjeta de contexto general del proyecto

Debe ser persistente y compacta.

Debe responder en lenguaje corto:

1. que vende el cliente,
2. objetivo del proyecto,
3. oferta o mensaje principal,
4. tono o direccion general,
5. criterio que no debe romperse.

No debe ser:

1. un footer,
2. una copia del brief completo,
3. una ficha larga que obligue a scrollear demasiado.

#### 3.2 Asistente de produccion

Debe reutilizar exactamente el asistente ya definido en `SPEC_ARCH-20260510-03_chat_asistente_produccion_disenador.md`.

Condiciones obligatorias:

1. sigue siendo un asistente puntual para dudas de produccion creativa,
2. no decide estilo del cliente ni que pieza producir,
3. usa contexto del activo abierto cuando la pregunta lo requiere,
4. permanece visible en desktop como panel fijo lateral,
5. no se redefine como chat general tipo Copilot.

## Contrato Funcional Esperado

El workspace debe evolucionar para exponer una estructura como esta:

```ts
type DesignerWorkspaceV2 = {
  focusedAsset: DesignerTask | null;
  leftRailQueue: DesignerTask[];
  sessionState: {
    activeSession: ActiveSession | null;
    dailyStatsToday: DailyStatsToday;
  };
  workCanvas: {
    suggestedAction: string | null;
    briefSummary: string | null;
    promptText: string | null;
    promptVersion: number | null;
    references: string[];
    restrictions: string[];
    proposalDrafts: DesignerProposalDraft[];
  };
  projectContext: {
    clientName: string | null;
    projectName: string | null;
    businessSummary: string | null;
    projectObjective: string | null;
    offerSummary: string | null;
    toneSummary: string | null;
    nonNegotiables: string[];
  } | null;
  productionAssistantContext?: {
    tool: string;
    promptText: string;
    format: string;
    name: string;
  };
};
```

## Reglas de Contenido

### Brief resumido operativo

El resumen del brief dentro del workspace debe ser util para producir, no para vender.

Debe priorizar:

1. objetivo concreto,
2. oferta,
3. audiencia,
4. tono,
5. restricciones.

### Contexto general del proyecto

Debe ser transversal al activo, pero corto.

Debe servir para que el disenador no pierda el marco general mientras trabaja piezas distintas del mismo proyecto.

### Propuestas y evidencias

Siguen viviendo en el canvas central del activo.

El usuario no debe salir a otra pantalla para ver el estado actual del trabajo creativo.

## Reglas de Interaccion

1. Al entrar al workspace se abre el activo prioritario real.
2. Al cambiar de activo en la rail izquierda, cambian el canvas central y el contexto del asistente.
3. El asistente nunca desplaza al activo como foco principal.
4. Si no existe activo enfocado, el centro muestra estado vacio util y la derecha conserva contexto general si existe.
5. El footer no debe cargar contexto critico del proyecto.

## Comportamiento Mobile

En mobile el workspace sigue siendo uno, pero no conserva tres columnas simultaneas.

Debe resolverse como tres vistas del mismo workspace:

1. cola,
2. activo,
3. asistente.

La tarjeta de contexto general del proyecto debe vivir dentro de la vista del asistente o encima del canvas, segun el espacio disponible.

## Archivos Minimos a Modificar

| Archivo | Accion | Descripcion |
|---|---|---|
| `components/designer-workspace.tsx` | Modificar | Reorganizar layout en rail izquierda, canvas central y rail derecha |
| `app/disenador/page.tsx` | Modificar | Reintegrar explicitamente `DesignerChatPanel` en la nueva estructura |
| `lib/designer-workspace.ts` | Modificar | Exponer `focusedAsset`, `projectContext` y bloques requeridos por el nuevo contrato |
| `components/designer-chat-panel.tsx` | Ajustar si hace falta | Mantenerlo como asistente puntual dentro del rail derecho |

## Criterios de Aceptacion

1. `/disenador` ya no usa una cuadricula de tarjetas como superficie principal de trabajo.
2. El activo prioritario se abre como foco central al entrar.
3. La rail izquierda permite cambiar de activo sin abandonar el workspace.
4. El canvas central concentra el trabajo operativo del activo abierto.
5. La rail derecha muestra primero contexto general del proyecto y debajo el `Asistente de produccion`.
6. El contexto general del proyecto queda visible sin usar footer ni abrir el brief completo.
7. El asistente sigue respondiendo dudas puntuales de produccion y no se vuelve un chat general.
8. El flujo completo puede entenderse como una sola estacion de trabajo en desktop.
9. En mobile la experiencia mantiene la logica de workspace unico mediante vistas equivalentes.
10. Build y validaciones del slice pasan.

## Fuera de Alcance de Este Corte

1. rediseñar `/operador`,
2. rediseñar `/cliente`,
3. persistir historial conversacional del asistente,
4. agregar colaboracion multiusuario,
5. construir un editor binario dentro de Bridge.

## Orden de Implementacion Recomendado para SOFIA

1. redefinir el contrato server-side para `focusedAsset` y `projectContext`,
2. reorganizar `DesignerWorkspaceView` en tres zonas persistentes,
3. reinsertar el `Asistente de produccion` en la rail derecha,
4. agregar la tarjeta de contexto general del proyecto encima del asistente,
5. ajustar responsive mobile sin romper el foco central.

## Resultado Esperado

Al terminar este corte, `/disenador` debe sentirse como una mesa de trabajo unica: cola a la izquierda, activo al centro, contexto y ayuda a la derecha. El disenador deja de navegar entre piezas sueltas del sistema y pasa a operar dentro de una sola superficie continua.