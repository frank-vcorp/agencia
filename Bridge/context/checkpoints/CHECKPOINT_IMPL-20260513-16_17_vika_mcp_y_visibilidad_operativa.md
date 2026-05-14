# CHECKPOINT IMPL-20260513-16_17 — MCP Vika + visibilidad operativa ligera

**ID:** IMPL-20260513-16 / IMPL-20260513-17  
**Agente:** SOFIA - Builder  
**Fecha:** 2026-05-13  
**SPEC de referencia:** ARCH-20260513-16  
**Soporte documental adicional:** context/AGENTE_VIKA_Y_SKILLS_TECNICAS_V1.md  
**Estado:** Entregado — validado para continuidad

---

## Resumen ejecutivo

Se cerró el endurecimiento MCP de Vika para sincronización local y se añadió la visibilidad mínima de `Captura`/`Produccion` en Bridge sin tocar el modelo de datos. El resultado deja a Vika operando con brief y archivos reales en local, y al diseñador viendo una diferencia ligera pero explícita entre trabajo de captura y producción.

---

## Cambios cerrados

### 1. MCP Vika — sincronización local

1. `bridge_get_brief` ahora soporta layout `project-folders` con `localProjectPath` explícito.
2. Se agregó `bridge_download_asset_files` para bajar archivos reales del activo al workspace.
3. Se agregó `GET /api/v1/assets/[id]/files` para exponer evidencias reales del activo.
4. La descarga local endurece contención de rutas y evita sobrescritura de evidencias homónimas mediante nombre local estable por `evidenceId`.

### 2. Bridge app — visibilidad operativa ligera

1. Se introdujo una clasificación derivada `Captura` / `Produccion` basada en el título del activo.
2. La etiqueta aparece en:
   - `/disenador` (tarea activa y cola),
   - `/activos` (lista),
   - `/activos/[id]` (ficha).
3. La distinción se resolvió como badge secundario y compacto, manteniendo simple la experiencia del diseñador.

---

## Archivos relevantes

1. `Bridge/mcp/src/utils/local-copy.ts`
2. `Bridge/mcp/src/tools/get-brief.ts`
3. `Bridge/mcp/src/tools/download-asset-files.ts`
4. `Bridge/mcp/src/bridge-client.ts`
5. `Bridge/mcp/src/index.ts`
6. `Bridge/mcp/src/__tests__/mcp-tools.test.ts`
7. `Bridge/app/api/v1/assets/[id]/files/route.ts`
8. `Bridge/lib/asset-detail.ts`
9. `Bridge/lib/assets.ts`
10. `Bridge/lib/designer-workspace.ts`
11. `Bridge/components/designer-workspace.tsx`
12. `Bridge/app/activos/page.tsx`
13. `Bridge/app/activos/[id]/page.tsx`

---

## Validación ejecutada

### Gate 1 — Compilación

1. `cd Bridge/mcp && npm run build` → limpio.
2. `cd Bridge && npm run build` → limpio.

### Gate 2 — Testing

1. `cd Bridge/mcp && npm test` → 33/33 tests verdes.
2. La heurística visible `Captura`/`Produccion` quedó además cubierta por pruebas unitarias en `Bridge/lib/assets.test.ts`.

### Gate 3 — Revisión

1. La visibilidad para diseñador se mantuvo ligera, sin exponer la arquitectura interna de Vika.
2. El endurecimiento MCP reutiliza la infraestructura real de evidencias y signed URLs ya existente.

### Gate 4 — Documentación

1. `PROYECTO.md` actualizado para reflejar cierre de `ARCH-20260513-15`, `ARCH-20260513-16` y el ajuste `IMPL-20260513-17`.
2. Este checkpoint consolida el cierre operativo de los bloques 3 y 4.

---

## Riesgos remanentes

1. La clasificación `Captura`/`Produccion` depende hoy de disciplina de naming en el título del activo; no existe todavía una columna estructurada para esta distinción.
2. La compuerta captura → producción sigue siendo regla de gobierno entre operador y Vika; el MCP aún no resuelve dependencias explícitas entre activos.
3. La descarga local se resolvió por activo individual; la sincronización masiva por proyecto completo queda fuera de este corte.

---

## Siguiente paso recomendado

1. Configurar env vars de producción de SendGrid para cerrar el frente operativo pendiente.
2. Ejecutar limpieza técnica y refinamiento UX/UI ya sobre la base estable de Vika + MCP.
3. Correr una validación end-to-end real del flujo brief → activo → producción.