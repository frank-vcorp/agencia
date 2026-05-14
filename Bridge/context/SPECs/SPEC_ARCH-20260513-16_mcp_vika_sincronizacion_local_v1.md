# SPEC ARCH-20260513-16: MCP Vika — sincronizacion local de brief y archivos de activos

**ID:** ARCH-20260513-16  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-13  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Puntaje de prioridad:** (Valor 8 x 3) + (Urgencia 8 x 2) - (Complejidad 4 x 0.5) = 38  
**Depende de:** ARCH-20260510-08, ARCH-20260510-10, ARCH-20260513-15

---

## 1. Contexto

Bridge ya tiene un MCP operativo con 8 tools. Hoy resuelve bien:

1. lectura de brief,
2. escritura de cotizacion,
3. escritura de specs de produccion,
4. creacion de cliente, proyecto y activo.

Tambien ya existe copia local automatica del brief, pero hoy se guarda en la ruta legacy:

1. `context/clientes/[slug]/brief.md`

La definicion final de Vika exige una sincronizacion local minima mas limpia:

1. brief consolidado en `briefing/`,
2. archivos reales del proyecto dentro de `activos/`.

El hueco tecnico actual es que el MCP todavia no puede descargar binarios reales de activos al workspace ni exponer una forma clara de escribir el brief en la nueva estructura sin romper compatibilidad.

---

## 2. Objetivo

Extender el MCP existente de Bridge para que Vika pueda:

1. traer el brief consolidado al destino local `briefing/brief.md` cuando se solicite,
2. descargar archivos reales asociados a un activo hacia `activos/` dentro del workspace,
3. mantener compatibilidad con la ruta legacy actual mientras no se complete una migracion total.

---

## 3. Resultado esperado

Al cerrar este slice:

1. `bridge_get_brief` puede seguir funcionando en modo legacy,
2. `bridge_get_brief` puede escribir en `briefing/brief.md` cuando el operador o Vika lo pidan,
3. existe una tool MCP nueva para descargar archivos reales de un activo al workspace,
4. la descarga local usa la infraestructura ya existente de evidencias y signed URLs,
5. Vika puede materializar en local lo minimo necesario para trabajar desde VS Code sin salir de Bridge.

---

## 4. Alcance

### Incluye

1. endurecer la copia local del brief,
2. nueva tool MCP para descargar archivos de activos,
3. nueva ruta API si hace falta para exponer archivos descargables del activo,
4. utilidades locales para escribir en `briefing/` y `activos/`,
5. compatibilidad temporal con `context/clientes/[slug]/`.

### Excluye

1. migracion total y obligatoria de todos los artefactos legacy,
2. analisis de video en VS Code,
3. validacion automatica de captura via MCP,
4. descarga masiva de todos los activos del proyecto en una sola tool,
5. sincronizacion universal de todos los markdown intermedios.

---

## 5. Decisiones de diseño

### 5.1 Compatibilidad progresiva del brief

No conviene romper `bridge_get_brief` ni la ruta `context/clientes/[slug]/brief.md` de forma abrupta.

La decision correcta es:

1. mantener soporte legacy,
2. agregar soporte explicito a la estructura nueva `briefing/brief.md`,
3. dejar que el operador o Vika indiquen el layout deseado,
4. exigir una raiz local explicita de proyecto cuando se use el layout nuevo.

### 5.2 Descargar archivos reales, no referencias vacias

La tool nueva no debe bajar “activos” abstractos; debe bajar solo archivos reales disponibles.

Fuente tecnica a reutilizar:

1. evidencias reales ya persistidas en `asset_proposal_evidences`,
2. signed URLs ya generables desde la capa server-side actual.

### 5.3 Primero por activo, no por proyecto completo

Para este corte, la unidad correcta es el activo individual.

No conviene intentar una tool gigante de sincronizacion total del proyecto.

La tool minima correcta es:

1. descargar archivos de un activo concreto.

Si despues hace falta descarga por proyecto, se abre otro slice.

---

## 6. Cambios esperados sobre el MCP

### 6.1 Tool existente: `bridge_get_brief`

Debe endurecerse con un parametro opcional de layout local.

#### Comportamiento esperado

1. si no se especifica nada, mantiene compatibilidad legacy,
2. si se pide layout `project-folders`, guarda en `briefing/brief.md`,
3. sigue retornando el resumen estructurado actual.

#### Schema sugerido

```json
{
  "projectId": "uuid",
  "clientSlug": "vectoria",
  "localLayout": "legacy | project-folders",
  "localProjectPath": "clientes/acme/proyecto-lanzamiento"
}
```

`localLayout` es opcional.

`localProjectPath` es obligatorio cuando `localLayout = "project-folders"`.

La ruta final debe resolverse como:

1. `${workspaceRoot}/${localProjectPath}/briefing/brief.md`

Si `localLayout = "legacy"`, `localProjectPath` se ignora.

### 6.2 Tool nueva: `bridge_download_asset_files`

Debe descargar al workspace los archivos reales disponibles de un activo.

#### Objetivo

Traer a `activos/` los binarios ya asociados al activo dentro de Bridge.

#### Schema sugerido

```json
{
  "assetId": "uuid",
  "assetSlug": "reel-captacion",
  "localLayout": "legacy | project-folders",
  "localProjectPath": "clientes/acme/proyecto-lanzamiento",
  "overwriteExisting": true
}
```

#### Comportamiento esperado

1. consulta los archivos reales disponibles para ese activo,
2. obtiene signed URLs o URLs descargables temporales,
3. descarga los archivos al workspace,
4. si el layout es `project-folders`, guarda en `${workspaceRoot}/${localProjectPath}/activos/[assetSlug]/...`,
5. si el layout es `legacy`, puede guardar temporalmente bajo la ruta legacy definida por implementacion,
6. retorna que archivos se descargaron y donde quedaron.

`localProjectPath` es obligatorio cuando `localLayout = "project-folders"`.

`overwriteExisting` debe defaultar a `true` en esta iteracion para evitar prompts interactivos innecesarios. Si es `false` y el archivo ya existe, la tool debe omitirlo y reportarlo claramente.

---

## 7. Ruta API esperada en Bridge

Si el MCP no puede resolver esto solo con las tools actuales, debe agregarse una ruta API minima para exponer archivos descargables de un activo.

Ruta sugerida:

1. `GET /api/v1/assets/[id]/files`

### Contrato minimo esperado

Debe retornar:

1. `asset.id`,
2. `asset.title`,
3. lista de archivos reales disponibles,
4. por archivo: `fileName`, `mimeType`, `storagePath`, `signedUrl`.

No hace falta exponer toda la ficha del activo ni toda la vista creativa.

---

## 8. Estructura local objetivo

### Layout `project-folders`

La raiz local de proyecto no se infiere automaticamente. Debe recibirse por parametro como ruta relativa a `workspaceRoot`.

Ejemplo:

1. `clientes/acme/proyecto-lanzamiento/briefing/brief.md`
2. `clientes/acme/proyecto-lanzamiento/activos/reel-captacion/archivo.ext`

### Layout `legacy`

Se mantiene la estructura actual para compatibilidad mientras exista consumo de esa ruta:

1. `context/clientes/[slug]/brief.md`

La descarga de archivos puede usar una ruta legacy de compatibilidad si hace falta, pero no debe bloquear el layout nuevo.

### Politica de colision y sobreescritura

1. por defecto, la escritura local en layout `project-folders` sobreescribe el archivo si ya existe,
2. si `overwriteExisting = false`, la tool no sobreescribe y reporta el archivo como omitido,
3. los archivos de activos deben vivir dentro de una subcarpeta por `assetSlug` para evitar colisiones entre piezas homonimas.

---

## 9. Reglas tecnicas

1. No inventar archivos ni metadata si un activo aun no tiene binarios reales.
2. Si no hay archivos descargables, la tool debe responder honestamente y no fallar de forma opaca.
3. Solo deben descargarse archivos realmente accesibles por signed URL o mecanismo equivalente.
4. La tool no debe depender de que el usuario abra manualmente una signed URL.
5. Debe reutilizar la capa real de storage existente en Bridge.
6. Debe preservar la compatibilidad con el secret y tenant del MCP actual.
7. El layout `project-folders` no debe inferir la carpeta de proyecto desde `clientSlug`; debe usar `localProjectPath` explicito.

---

## 10. Criterios de aceptacion

1. `bridge_get_brief` sigue funcionando sin romper compatibilidad.
2. `bridge_get_brief` puede guardar el brief en `briefing/brief.md` cuando se le pida.
3. existe `bridge_download_asset_files` como tool MCP nueva.
4. la tool puede descargar al menos un archivo real de un activo al workspace.
5. si un activo no tiene archivos reales, la tool responde honestamente.
6. build del MCP pasa.
7. tests del MCP para esta extension pasan.

---

## 11. Riesgos que evita

1. seguir atrapando el brief solo en la ruta legacy,
2. obligar a Vika a trabajar con referencias en vez de archivos reales,
3. inventar un sistema de storage paralelo al que Bridge ya tiene,
4. romper herramientas MCP ya estables por una migracion abrupta.

---

## 12. Secuencia recomendada para SOFIA

1. extender `saveLocalCopy` o crear helper nuevo para soportar `project-folders`,
2. endurecer `bridge_get_brief` con layout opcional,
3. agregar endpoint o capa de lectura de archivos reales del activo,
4. crear `bridge_download_asset_files`,
5. agregar tests del MCP,
6. validar descarga local real,
7. emitir checkpoint.