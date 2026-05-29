# DICTAMEN TECNICO: brief_creation_failed en portal cliente por relectura fragil
- **ID:** FIX-20260528-01
- **Fecha:** 2026-05-28
- **Solicitante:** INTEGRA
- **Estado:** VALIDADO

### A. Analisis de Causa Raiz
La causa mas probable no es un fallo real en la creacion del brief, sino un falso negativo en la validacion posterior. La ruta [Bridge/app/cliente/brief/[projectId]/page.tsx](Bridge/app/cliente/brief/%5BprojectId%5D/page.tsx#L15) intenta primero leer el brief por `projectId` y, si no existe, llama a `createBriefForProject(projectId)`. Dentro de [Bridge/lib/briefing.ts](Bridge/lib/briefing.ts#L1408), `createBriefForProject` completa cuatro pasos secuenciales: crea la fila en `briefs`, crea la fila inicial en `brief_versions`, actualiza estado/version activa y agrega el mensaje inicial del asistente. Solo despues vuelve a consultar por `tenant_id + project_id` usando [Bridge/lib/briefing.ts](Bridge/lib/briefing.ts#L1367). Si esa relectura devuelve `null`, la funcion lanza `brief_creation_failed` aunque la escritura previa ya haya ocurrido.

El punto fragil es esa rehidratacion por `project_id` en vez de usar el `briefRow.id` ya conocido. Cualquier desalineacion puntual de lectura por tenant, normalizacion o latencia de consistencia sobre el read-back convierte una creacion exitosa en error 500 visible al cliente.

### B. Justificacion de la Solucion
El cambio minimo recomendado es eliminar la dependencia de la reconsulta por `projectId` como prueba de exito. `createBriefForProject` debe rehidratar el resultado usando el `brief_id` recien creado, o construir el `BriefRecord` final desde las filas ya creadas y sus lecturas por identificador estable. Eso reduce la superficie del fallo y mantiene intacta la semantica actual del portal.

### C. Chequeo Discriminante Mas Barato
Verificar en la base si existe una fila nueva en `briefs` y su `brief_versions` asociada para el `projectId` reportado en la ventana temporal del error. Si las filas existen, la hipotesis queda confirmada y el problema esta en la relectura final, no en la creacion.

### D. Instrucciones de Handoff para SOFIA
1. Tomar [Bridge/lib/briefing.ts](Bridge/lib/briefing.ts#L1367) y [Bridge/lib/briefing.ts](Bridge/lib/briefing.ts#L1408) como anclas unicas del fix.
2. Reemplazar la validacion final de `createBriefForProject` para no depender de `getBriefByProjectId(projectId, tenantSlug)`.
3. Mantener sin cambios la pagina [Bridge/app/cliente/brief/[projectId]/page.tsx](Bridge/app/cliente/brief/%5BprojectId%5D/page.tsx) salvo que el compilador obligue a un ajuste menor.
4. Validar con `cd Bridge && npm run build` y reprobar la ruta del cliente sin generar duplicados de brief.