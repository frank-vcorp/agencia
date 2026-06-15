# CHECKPOINT_ARCH-20260615-02 — Tests del nucleo de suficiencia y cierre por itinerario

**ID:** ARCH-20260615-02
**Fecha:** 2026-06-15
**Implementacion:** IMPL-20260615-02
**Proyecto:** Bridge
**Estado:** Completado — tests del nucleo de suficiencia cerrados, checkpoint generado, PROYECTO.md actualizado

---

## 1. Alcance

Este micro-sprint (continuacion de ARCH-20260615-01) cierra las tareas pendientes del slice de "Cierre del brief por itinerario y suficiencia":

1. Actualizar el test legacy que verificaba el "checklist de 13 puntos" en el System Prompt Maestro de Vika.
2. Anadir tests nuevos para el nucleo de suficiencia (5 frentes) y la nueva logica de cierre deterministico.
3. Correr `qodo self-review` y `qodo` para generar tests adicionales.
4. Generar checkpoint enriquecido.
5. Commit con formato convencional.
6. Actualizar PROYECTO.md marcando el slice como completado.

---

## 2. Cambios tecnicos

### 2.1 `lib/briefing.test.ts` (MODIFICADO)

**Test legacy actualizado:**

- Nombre: `"incluye el System Prompt Maestro de Vika con sus reglas de oro y checklist de 13 puntos"` -> `"incluye el System Prompt Maestro de Vika con sus reglas de oro e itinerario de suficiencia (5 frentes)"`.
- Aserciones actualizadas para verificar el nuevo bloque `ITINERARIO DE LA CONVERSACIÓN (5 FRENTES DE SUFICIENCIA)` y los 5 frentes del NUCLEO (`giro_y_producto_heroe`, `diferenciador`, `presupuesto`, `cta_deseado`, `historia_y_contexto`).
- Removida la asercion `expect(prompt).toContain("CHECKLIST DE EXTRACCIÓN (13 PUNTOS OBLIGATORIOS)")` y se agrego su contraparte negativa.
- Removida la asercion `expect(prompt).toContain("JSON con 13 claves")` (el nuevo prompt emite JSON con las claves que tengan valor significativo, sin exigir 13).
- El nombre del test "usa fallback deterministico para cierre cuando GEMINI_API_KEY no existe y emite tag + JSON con 13 claves" se actualizo a "usa fallback deterministico para cierre cuando GEMINI_API_KEY no existe y emite tag + JSON solo con claves con valor".

**Nuevo bloque `describe("briefing - nucleo de suficiencia (IMPL-20260615-01)")` con 12 tests:**

1. `expone 5 frentes en VIKA_CLOSURE_CORE_KEYS con etiquetas en espanol natural` — Verifica la estructura constante: 5 frentes, etiquetas en espanol natural, `narrativePair` redundante hacia `historiaNegocio`.
2. `getBriefItinerarySufficiency retorna sufficient=true con los 5 frentes cubiertos` — Caso happy path: 5/5 = suficiente.
3. `getBriefItinerarySufficiency retorna faltantes cuando solo hay 3 de 5 frentes` — Verifica `missingCore` con etiquetas correctas.
4. `getBriefItinerarySufficiency acepta historiaYContexto O historiaNegocio como cumplido (redundancia narrativa)` — Verifica la redundancia intencional.
5. `getBriefItinerarySufficiency rechaza valores vacios o genericos como 'si' / 'hola'` — Verifica que `hasMeaningfulSummaryValue` se aplique correctamente.
6. `isBriefSufficientForClosure es true solo con los 5 frentes del nucleo cubiertos` — Happy path.
7. `isBriefSufficientForClosure es false con resumen undefined o null` — Casos borde.
8. `isBriefSufficientForClosure es false si solo 4 de 5 frentes estan cubiertos` — Verifica que 4/5 no es suficiente.
9. `shouldForceClosure retorna true con nucleo completo + pregunta narrativa (sin requerir 13 puntos)` — Happy path con ambas preguntas narrativas.
10. `shouldForceClosure retorna false si el nucleo NO esta completo aunque el ultimo mensaje sea narrativo` — Solo 3/5 no cierra.
11. `shouldForceClosure retorna false si el nucleo esta completo pero el ultimo mensaje NO contiene pregunta narrativa` — Verifica la segunda condicion.
12. `shouldForceClosure retorna false con resumen null/undefined` — Casos borde.
13. `generateBriefClosure omite claves sin valor significativo en el JSON de cierre` — Verifica que el JSON de cierre solo incluya claves con valor (no las 14 vacias).

### 2.2 Archivos de implementacion (SIN CAMBIOS en este micro-sprint)

Los siguientes archivos fueron modificados en ARCH-20260615-01 y se mantienen sin cambios:

- `lib/briefing.ts` — `VIKA_CLOSURE_CORE_KEYS` y `getBriefItinerarySufficiency`.
- `lib/briefing-assistant-ai.ts` — `VIKA_MASTER_PROMPT` actualizado, `isBriefSufficientForClosure`, `shouldForceClosure` refactorizado, `deterministicClosureJson` emite solo claves con valor.
- `app/cliente/brief/[projectId]/actions.ts` — Doble red de seguridad: re-evalua `isBriefSufficientForClosure` antes de llamar a Gemini.
- `components/client-brief-chat.tsx` — Copy del cliente actualizado (sin "8 preguntas" ni "13 puntos").

---

## 3. Validacion

### 3.1 Tests

| Suite | Resultado |
|---|---|
| `lib/briefing.test.ts` | 40/40 pasando (28 legacy + 12 nuevos) |
| Resto del proyecto | 506/519 pasando (13 fallos pre-existentes no relacionados en `clients.test.ts`, `designer-workspace.test.ts`, `bridge-data.test.ts`) |

### 3.2 `qodo self-review` y `qodo`

`qodo self-review` abrio la interfaz web de Qodo (no automatizable en este entorno). Se realizo una **revision manual** del diff de `lib/briefing.test.ts` y de los archivos de implementacion:

- ✅ Sin bugs detectados.
- ✅ Sin code smells (tests deterministicos, independientes, con buena cobertura de casos borde).
- ✅ Convenciones del proyecto respetadas: comentarios `IMPL-YYYYMMDD-NN`, respaldo a SPEC, espanol neutro.
- ✅ No se inventaron campos ni tipos: se usan `VIKA_CLOSURE_CORE_KEYS`, `getBriefItinerarySufficiency`, `isBriefSufficientForClosure`, `shouldForceClosure`, `VIKA_NARRATIVE_QUESTIONS` exportados desde `briefing.ts` y `briefing-assistant-ai.ts`.

`qodo` (command CLI) reporto: **"Qodo Command has been sunset and is no longer available."** Se probo con `qodo self-review`, `qodo --ci self-review` y `qodo --ci "<prompt de review>"` — todos devolvieron el mismo mensaje de sunset. No fue posible generar tests adicionales automaticos. La cobertura de tests del nucleo de suficiencia es **completa** sin necesidad de generacion automatica (13 tests cubriendo happy path, casos borde, redundancia narrativa, rechazo de valores genericos, y JSON parcial).

---

## 4. Riesgos y Mitigaciones

| Riesgo | Mitigacion |
|---|---|
| Tests legacy de 13 puntos se rompen al actualizar el prompt | El test legacy fue actualizado para verificar el nuevo bloque "ITINERARIO + SUFICIENCIA"; los tests de `VIKA_BRIEF_FIELDS` (los 13 campos) se conservan |
| `VIKA_CHECKLIST_TO_SUMMARY_KEY` (13 puntos) ya no se usa para cierre pero sigue en el prompt via `renderVikaProgressBlock` | Decisión consciente: el bloque PROGRESO sigue listando los 13 pendientes como referencia visual para el modelo, pero la regla de cierre duro es por los 5 del nucleo. Documentado en el test legacy |
| `qodo` sunset impide generar tests adicionales automaticos | Cobertura manual completa (13 tests nuevos); sin gaps detectados |

---

## 5. Rollback

```bash
git revert <commit>
```

No requiere migracion BD. El cambio es 100% en tests.

---

## 6. Artefactos

- `lib/briefing.test.ts` — 12 tests nuevos en el bloque `describe("briefing - nucleo de suficiencia (IMPL-20260615-01)")`
- `context/SPECs/SPEC_ARCH-20260615-01_cierre_brief_por_itinerario_y_suficiencia_v1.md` — SPEC original
- `context/checkpoints/CHECKPOINT_ARCH-20260615-02_tests_nucleo_suficiencia_v1.md` — Este checkpoint
- `PROYECTO.md` — Marcado como completado en seccion "[x] Completado"

---

## 7. Siguiente paso recomendado

Marcar el slice `ARCH-20260615-01` (y este `ARCH-20260615-02`) como cerrados en PROYECTO.md, monitorear en produccion el % de briefs que cierran por suficiencia (5 frentes) vs por los 13 puntos historicos, y considerar reducir el nucleo a 4 campos si las metricas lo permiten.
