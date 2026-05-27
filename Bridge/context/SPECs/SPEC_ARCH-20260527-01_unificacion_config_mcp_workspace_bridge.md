# SPEC ARCH-20260527-01: Unificacion de configuracion MCP para workspace Bridge

**ID:** ARCH-20260527-01  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-27  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Puntaje de prioridad:** (Valor 8 x 3) + (Urgencia 9 x 2) - (Complejidad 2 x 0.5) = 41  
**Depende de:** ARCH-20260510-08, ARCH-20260526-04  
**Origen:** Incidente operativo FIX-20260527-01

---

## 1. Contexto

El servidor MCP de Bridge ya registra y compila correctamente las tools nuevas de proyectos y clientes. La evidencia local confirma que `bridge_list_projects` existe en fuente y en binario compilado:

1. `Bridge/mcp/src/index.ts`
2. `Bridge/mcp/dist/index.js`

Sin embargo, la sesion activa de VS Code no expone esas tools en el catalogo disponible del chat. La causa mas probable no es el servidor MCP sino la desalineacion de configuracion:

1. el workspace abierto real es la carpeta padre `agencia`,
2. no existe `agencia/.vscode/mcp.json`,
3. si existe `Bridge/.vscode/mcp.json`, pero ese archivo vive en un subdirectorio que no gobierna el workspace padre,
4. tambien existe configuracion global en `~/.config/Code/User/mcp.json`.

Esto deja dos fuentes de verdad potenciales y una raiz de workspace distinta de la carpeta donde esta el `mcp.json` local. El resultado operativo es ambiguo y propenso a cache o carga parcial del catalogo MCP.

---

## 2. Objetivo

Eliminar la ambiguedad de configuracion MCP para Bridge cuando el workspace abierto es `agencia`, dejando una sola configuracion operativa clara a nivel de workspace raiz y documentando el comportamiento soportado.

---

## 3. Resultado esperado

Al cerrar este slice:

1. existe una configuracion MCP valida en la raiz real del workspace abierto,
2. la configuracion apunta al binario compilado correcto de Bridge,
3. la documentacion deja explicito que la carpeta raiz soportada para operacion MCP es `agencia` con config en `.vscode/mcp.json`,
4. deja de dependerse operativamente de `Bridge/.vscode/mcp.json` cuando se abre el padre,
5. la validacion manual posterior a recarga de VS Code debe permitir ver `bridge_list_projects` y `bridge_get_project`.

---

## 4. Alcance

### Incluye

1. creacion o alineacion de `agencia/.vscode/mcp.json`,
2. actualizacion de documentacion operativa en Bridge para indicar la fuente de verdad de la configuracion MCP del workspace,
3. dejar consistente el uso de `BRIDGE_WORKSPACE_ROOT` con la carpeta `Bridge`.

### Excluye

1. cambios en `Bridge/mcp/src/index.ts`,
2. cambios en `Bridge/mcp/dist/index.js`,
3. cambios de endpoints API o auth,
4. cambios de secretos o tenant,
5. cambios en logica del servidor MCP.

---

## 5. Datos existentes a reutilizar

1. Configuracion global actualmente valida en `~/.config/Code/User/mcp.json` con:
   - `command: node`
   - `args: /home/frank/proyectos/agencia/Bridge/mcp/dist/index.js`
   - `BRIDGE_URL: https://vectoria-zeta.vercel.app`
   - `BRIDGE_MCP_SECRET` ya definido
   - `BRIDGE_TENANT_SLUG: vectoria`
   - `BRIDGE_WORKSPACE_ROOT: /home/frank/proyectos/agencia/Bridge`
2. Documentacion historica en `Bridge/PROYECTO.md` que hoy menciona configuracion global.
3. Configuracion local previa en `Bridge/.vscode/mcp.json` como referencia estructural.

---

## 6. Datos faltantes a crear

1. `agencia/.vscode/mcp.json` como configuracion MCP del workspace raiz.
2. aclaracion documental sobre cual configuracion manda cuando se abre `agencia` como raiz.

---

## 7. Archivos exactos a crear o modificar

1. Crear `/.vscode/mcp.json` en la raiz del workspace `agencia`.
2. Modificar `Bridge/PROYECTO.md`.
3. Modificar `Bridge/README.md`.

No tocar ningun otro archivo. Maximo permitido: 3 archivos afectados.

---

## 8. Reglas de implementacion

1. El contenido de `/.vscode/mcp.json` debe reflejar la configuracion operativa ya validada en la configuracion global actual.
2. `BRIDGE_WORKSPACE_ROOT` debe seguir apuntando a `/home/frank/proyectos/agencia/Bridge`.
3. No mover ni borrar `Bridge/.vscode/mcp.json` en este corte. Solo dejar claro que no es la fuente operativa cuando se abre el workspace padre.
4. La documentacion debe explicar en lenguaje directo que abrir `agencia` como raiz requiere usar `/.vscode/mcp.json`.
5. No introducir placeholders nuevos ni cambiar secretos existentes.

---

## 9. Validacion exacta esperada

Validacion manual obligatoria, sin tests automatizados nuevos:

1. Abrir o mantener abierto el workspace raiz `agencia`.
2. Ejecutar recarga de ventana en VS Code.
3. Confirmar que el catalogo MCP de Bridge expone al menos:
   - `bridge_list_projects`
   - `bridge_get_project`
   - `bridge_list_clients`
4. Confirmar que la ruta del binario configurado sigue siendo `Bridge/mcp/dist/index.js`.

Si Sofia no puede verificar el catalogo MCP desde su entorno, debe dejar explicitado que la implementacion queda lista para validacion manual humana despues de recargar VS Code.

---

## 10. Archivo ancla inicial

`Bridge/PROYECTO.md`

---

## 11. Condicion de detencion si falta contexto

Detenerse y devolver `BLOQUEO DE CONTEXTO` solo si encuentra que VS Code no soporta `/.vscode/mcp.json` en el workspace raiz o si el repo ya tiene una politica distinta documentada que contradiga esta SPEC.

---

## 12. Handoff operativo para SOFIA

### archivo ancla inicial

`Bridge/PROYECTO.md`

### datos existentes a reutilizar

1. configuracion global valida del MCP Bridge,
2. binario compilado en `Bridge/mcp/dist/index.js`,
3. estructura previa de `Bridge/.vscode/mcp.json`.

### datos faltantes a crear

1. `/.vscode/mcp.json` en la raiz `agencia`.

### archivos exactos a crear o modificar

1. `/.vscode/mcp.json`
2. `Bridge/PROYECTO.md`
3. `Bridge/README.md`

### maximo de archivos permitidos

3 archivos.

### validacion exacta esperada

Recarga de ventana en VS Code y confirmacion manual del catalogo MCP con `bridge_list_projects`, `bridge_get_project` y `bridge_list_clients` visibles.

### condicion de detencion

Si la raiz `agencia` no soporta el `mcp.json` de workspace o aparece una politica documentada incompatible, devolver `BLOQUEO DE CONTEXTO` con evidencia exacta.