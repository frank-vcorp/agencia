# Bridge

Bridge es el sistema puente entre estrategia, produccion creativa y experiencia visible para cliente dentro del ecosistema de la agencia.

Bridge tambien debe funcionar como sistema operativo y base de conocimiento para agentes IA.

Su V1 se diseña para operar un piloto real con tres actores base:

1. operador estrategico desde VS Code,
2. diseñador u operador creativo,
3. cliente.

Y una cuarta capa transversal:

4. agentes IA que leen, proponen, crean, consultan y actualizan entidades de Bridge bajo reglas seguras.

Condiciones no negociables de esta V1:

1. multitenant desde el primer release,
2. conexion publica por internet con VS Code y futuros agentes remotos,
3. briefing conversacional que estructura datos utiles,
4. prompts definidos por tipo de activo y plataforma destino,
5. toda entidad relevante debe ser operable por agentes,
6. Bridge debe devolver conocimiento estructurado a esos agentes.

La definicion arquitectonica inicial de esta version vive en:

1. context/SPECs/SPEC_ARCH-20260504-04_bridge_v1_roles_base_y_flujos.md
2. context/AGENTES_Y_CONOCIMIENTO_V1.md
3. context/00_ARQUITECTURA.md
4. context/ROADMAP_Y_MICROSPRINTS_V1.md
5. PROYECTO.md

La regla de producto para Bridge V1 es simple:

**si no ayuda a coordinar mejor a estos tres actores dentro de un piloto real, no es prioridad.**

## Operacion MCP en VS Code

Respaldo documental: `IMPL-20260527-01` sobre `context/SPECs/SPEC_ARCH-20260527-01_unificacion_config_mcp_workspace_bridge.md`.

Cuando el workspace abierto en VS Code es la carpeta padre `agencia`, la configuracion MCP soportada para Bridge vive en `agencia/.vscode/mcp.json`.

Reglas operativas:

1. `agencia/.vscode/mcp.json` es la fuente de verdad para la sesion MCP del workspace padre.
2. El binario configurado debe seguir siendo `/home/frank/proyectos/agencia/Bridge/mcp/dist/index.js`.
3. `BRIDGE_WORKSPACE_ROOT` debe seguir apuntando a `/home/frank/proyectos/agencia/Bridge`.
4. `Bridge/.vscode/mcp.json` no se borra, pero solo aplica si se abre la subcarpeta `Bridge` como workspace independiente.
5. La configuracion global de usuario puede mantenerse como respaldo, pero no debe considerarse la fuente operativa principal para el workspace `agencia`.

Validacion manual esperada:

1. Abrir o mantener abierto el workspace `agencia`.
2. Ejecutar Reload Window en VS Code.
3. Confirmar que el catalogo MCP expone `bridge_list_projects`, `bridge_get_project` y `bridge_list_clients`.