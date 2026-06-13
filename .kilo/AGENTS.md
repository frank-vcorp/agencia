# AGENTS.md - Configuración Kilo/opencode para proyecto Bridge

## Reglas de Delegación Obligatoria (INTEGRA v3.2.0)

### ❌ INTEGRA NUNCA implementa código
**TODA implementación se delega a SOFIA** via `task` tool con `subagent_type='sofia'`.

INTEGRA (Arquitecto) solo:
1. Define arquitectura y decisiones (qué, por qué, orden)
2. Escribe SPECs en `context/SPECs/SPEC_ARCH-<ID>_<nombre>.md`
3. Actualiza `PROYECTO.md` moviendo tarea a `[~] Planificado` tras SPEC
4. Delega a SOFIA: `task` tool con `subagent_type='sofia'`
5. Valida resultado final (build, tests, demo)
6. Cierra: checkpoint + CRONISTA

### ✅ Excepción única
**SOLO** si el usuario dice explícitamente: **"hazlo tú"** o **"implementa tú"**.

---

## Flujo Obligatorio por Tarea

```
Usuario pide feature
       │
       ▼
INTEGRA: Analiza → Crea SPEC (context/SPECs/) → PROYECTO.md [~] Planificado
       │
       ▼
INTEGRA: Delegar a SOFIA (task tool, subagent_type='sofia')
       │
       ▼
SOFIA: Implementa + Tests + Build + Checkpoint
       │
       ▼
INTEGRA: Valida resultado → Cierra (CRONISTA)
```

---

## Agentes Disponibles (Kilo subagent_type)

| Agente | subagent_type | Uso |
|--------|---------------|-----|
| SOFIA - Builder | `sofia` | **Toda implementación** (código, tests, UI, API) |
| GEMINI - QA/Infra | `gemini` | Auditoría, hosting, CI/CD, validación producción |
| DEBY - Debugger | `debugger` | Errores complejos, causa raíz, dictámenes forenses |
| CRONISTA - Estados | `cronista` | Sincronizar PROYECTO.md, detectar inconsistencias |
| VIC - Bridge Operator | `vic` | CRUD Bridge via MCP (clientes, proyectos, briefs, assets) |
| VIKA - Bridge Strategist | `vika` | Performance marketing, prompt engineering visual |

---

## Recordatorios Críticos

- **ID obligatorio**: `ARCH-YYYYMMDD-NN` para cada decisión/SPEC
- **SPEC antes de código**: Sin SPEC → sin implementación
- **PROYECTO.md es fuente de verdad**: Estados `[x] [/] [~] [ ]` siempre actualizados
- **Build + Tests obligatorios**: SOFIA debe entregar verde
- **Checkpoint al cerrar**: `context/checkpoints/CHK_YYYY-MM-DD_HHMM.md`
- **No exponer secretos**: `.env.local` nunca en commits
- **Rollback solo INTEGRA/GEMINI**: `git revert` + checkpoint + CRONISTA