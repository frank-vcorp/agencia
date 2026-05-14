# SPEC ARCH-20260514-01

## Titulo

Foco intra-workspace del disenador sin salir de /disenador

## Estado

Autorizado

## Fecha

2026-05-14

## ID de Intervencion

ARCH-20260514-01

## Objetivo

Cerrar el ultimo quiebre de continuidad del nuevo workspace del disenador para que cambiar entre activos de la cola no saque al usuario de `/disenador`, sino que actualice el foco dentro de la misma superficie.

## Problema que Resuelve

El corte anterior convirtio `/disenador` en una estacion unica de trabajo, pero el foco todavia no es verdaderamente continuo:

1. la rail izquierda muestra la cola correcta,
2. el activo central se entiende mejor,
3. el contexto del proyecto y el asistente ya viven en el rail derecho,
4. pero al elegir otro activo de la cola el usuario sale del workspace hacia `/activos/{id}`.

Ese salto rompe la tesis principal del rediseño: una sola mesa de trabajo por rol.

## Descubrimiento Integrado

El nuevo hallazgo operativo es este:

El foco no debe ser solo una derivacion automatica del server entre `activeTask` y `nextSuggestedTask`.

Tambien debe poder convertirse en una decision explicita del disenador dentro del mismo workspace, preservando el contexto visual y el estado mental de trabajo.

Por eso el foco debe evolucionar de:

1. seleccion automatica inicial,
2. a seleccion intra-workspace persistente y compartible por URL.

## Decision Arquitectonica

`/disenador` debe aceptar un foco explicito por asset dentro de la misma ruta, sin cambiar a otra pagina.

La recomendacion base es usar un query param de foco:

`/disenador?focus=<assetId>`

Reglas:

1. si existe `focus` y corresponde a un activo visible en `taskQueue`, ese activo gobierna el canvas y el rail derecho,
2. si no existe `focus`, se usa el foco automatico actual (`activeTask ?? nextSuggestedTask`),
3. si `focus` apunta a un activo inexistente o fuera de la cola, se ignora y se cae al foco automatico,
4. la rail izquierda ya no navega a `/activos/{id}` por defecto; cambia el query param dentro de `/disenador`.

## Principios Rectores

1. El foco debe poder ser automatico al entrar y manual al operar.
2. Cambiar de activo no debe desmontar la mesa de trabajo.
3. El canvas central, la tarjeta de contexto y el asistente deben reaccionar al mismo foco.
4. La URL debe reflejar el foco para soportar refresh, compartir enlace y rehidratacion correcta.
5. La ficha completa de `/activos/{id}` sigue existiendo como inspeccion profunda, no como navegacion primaria del diseñador.

## Comportamiento Esperado

### Al entrar a /disenador

1. si no hay query param `focus`, se abre el activo prioritario real,
2. si hay `focus`, se abre ese activo si pertenece a la cola actual,
3. la rail izquierda resalta el activo enfocado,
4. el rail derecho recibe el contexto del mismo activo.

### Al cambiar de activo desde la cola

1. cambia el `focus` en la URL,
2. se actualiza el canvas central,
3. se actualiza el contexto del proyecto si cambia el project/brief,
4. se actualiza el contexto del `Asistente de produccion`,
5. no hay salida a otra ruta ni perdida del layout.

### Al abrir la ficha completa

Debe seguir existiendo un CTA secundario desde el canvas central:

1. `Abrir ficha completa` sigue apuntando a `/activos/{id}`,
2. esa accion deja de ser el mecanismo principal para cambiar de foco.

## Contrato Funcional Esperado

El server-side debe aceptar foco explicito:

```ts
type GetDesignerWorkspaceOptions = {
  tenantSlug?: string;
  focusedAssetId?: string | null;
};
```

Y la respuesta debe garantizar:

```ts
type DesignerWorkspace = {
  focusedAsset: DesignerTask | null;
  focusedAssetSource: "auto" | "query";
  taskQueue: DesignerTask[];
  projectContext: ProjectContext | null;
  proposalDrafts: DesignerProposalDraft[];
  // resto del contrato vigente
};
```

## Superficies Afectadas

### 1. Server page

`app/disenador/page.tsx`

Debe leer `searchParams.focus` y pasarlo a la capa de datos.

### 2. Capa de datos

`lib/designer-workspace.ts`

Debe resolver el foco explicito contra `taskQueue` y recalcular:

1. `focusedAsset`,
2. `projectContext`,
3. `proposalDrafts`,
4. `productionAssistantContext` derivado por page.

### 3. UI de la rail izquierda

`components/designer-workspace.tsx`

Los items de la cola deben pasar de links a `/activos/{id}` a links o controles que mantengan `/disenador` y actualicen `?focus=`.

## Reglas de UX

1. El click principal de cada item de la cola cambia el foco dentro del workspace.
2. El usuario siempre debe percibir que sigue en la misma mesa de trabajo.
3. La transicion debe ser inmediata y sin saltos bruscos de scroll cuando sea posible.
4. La ficha completa del activo debe quedar relegada a una accion secundaria visible desde el canvas.
5. El rail izquierdo debe prepararse para `overflow-y-auto` si el volumen de activos crece.

## Mobile

En mobile el mismo query param debe gobernar las tres vistas del workspace:

1. cola,
2. activo,
3. asistente.

Cambiar foco desde la vista de cola debe abrir el activo correcto sin sacar al usuario de `/disenador`.

## Archivos Minimos a Modificar

| Archivo | Accion | Descripcion |
|---|---|---|
| `app/disenador/page.tsx` | Modificar | Leer `searchParams.focus` y pasarlo a `getDesignerWorkspace` |
| `lib/designer-workspace.ts` | Modificar | Soportar `focusedAssetId` explicito y devolver `focusedAssetSource` |
| `components/designer-workspace.tsx` | Modificar | Cambiar la rail izquierda para actualizar foco dentro de `/disenador` |

## Criterios de Aceptacion

1. Cambiar de activo desde la cola ya no navega a `/activos/{id}`.
2. `/disenador?focus=<assetId>` abre correctamente el activo solicitado si existe en la cola.
3. Sin query param, el sistema mantiene el foco automatico actual.
4. El canvas central, la tarjeta de contexto y el asistente lateral siempre responden al mismo foco.
5. `Abrir ficha completa` sigue existiendo como accion secundaria.
6. Refresh del navegador preserva el activo enfocado cuando hay `focus` en la URL.
7. Build y validacion del slice pasan.

## Fuera de Alcance de Este Corte

1. persistencia del foco por usuario en base de datos,
2. animaciones avanzadas de transicion,
3. sincronizacion multiusuario del foco,
4. rediseño de `/activos`,
5. rediseño del workflow del cliente.

## Orden de Implementacion Recomendado para SOFIA

1. ampliar `getDesignerWorkspace` para aceptar `focusedAssetId`,
2. leer `searchParams` en `app/disenador/page.tsx`,
3. cambiar la rail izquierda para mantener la navegacion dentro de `/disenador`,
4. validar que el rail derecho reaccione al foco nuevo,
5. agregar `overflow-y-auto` al rail izquierdo si el layout lo necesita.

## Resultado Esperado

Al terminar este corte, el nuevo workspace del disenador queda realmente cerrado como estacion unica: la cola cambia el foco, el centro ejecuta y la derecha contextualiza, todo sin abandonar `/disenador`.