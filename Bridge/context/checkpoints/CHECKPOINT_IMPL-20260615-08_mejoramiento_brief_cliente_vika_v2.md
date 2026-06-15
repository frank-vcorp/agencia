# CHECKPOINT IMPL-20260615-08 — Mejoramiento del System Prompt de Vika para Preguntas Complementarias

**Fecha:** 2026-06-15  
**Micro‑Sprint:** IMPL-20260615-08  
**Descripción:** Mejora del System Prompt Maestro de Vika en `Bridge/lib/briefing-assistant-ai.ts` para garantizar que se pregunte explícitamente por todos los 8 frentes comerciales (5 núcleo + 3 complementarios) durante la conversación, manteniendo la posibilidad de cerrar el chat cuando haya información suficiente en los 5 frentes núcleo.

## ✅ Acciones completadas

### 1. Modificación del System Prompt Maestro de Vika
- **Archivo modificado:** `Bridge/lib/briefing-assistant-ai.ts`
- **Cambios clave:**
  - Actualización de la **INSTRUCCION DE PREGUNTAS** para los frentes complementarios:
    - Antes: "Para los frentes COMPLEMENTARIOS: haz un intento claro de preguntar por cada uno, pero no insistas más de 2 veces si la respuesta es vaga o el cliente no quiere profundizar."
    - Después: "Para los frentes COMPLEMENTARIOS: debes hacer una pregunta específica por cada uno de los siguientes temas al menos una vez durante la conversación: persona_perfil, cómo te describirías como persona y líder; administracion_negocio, cómo manejas las operaciones diarias; madurez, cuánto tiempo llevas operando; logo, si tienes marca gráfica definida; objeciones, qué dudas tienen los clientes; publicidad_previa, si has hecho publicidad antes; planes_futuro, tus metas a 6-12 meses. Si la respuesta es vaga o el cliente no quiere profundizar, no insistas más de 2 veces y pasa al siguiente frente."
  - Esto garantiza que Vika **debe preguntar explícitamente** por cada uno de los frentes complementarios al menos una vez durante la conversación.
  - Se mantuvo la regla de cierre basada exclusivamente en los 5 frentes núcleo (giro_y_producto_heroe, audiencia, presupuesto, cta_deseado, historia_y_contexto) mediante `isBriefSufficientForClosure()`.
  - Se corrigió un error de sintaxis previo (backticks mal escapados) que estaba causando problemas en TypeScript.
  - Se preservaron todas las preguntas originales de Vika (apertura, condicional de local, narrativa, reglas de oro de comunicación).

### 2. Validación de la implementación
- **Pruebas unitarias:** `pnpm test lib/briefing.test.ts` → **40/40 tests pasando**
- **Build del proyecto:** `pnpm run build` → **Compilado exitosamente sin errores**
- **Verificación de sintaxis TypeScript:** No se reportaron errores en el archivo modificado

### 3. Comportamiento garantizado
Con esta mejora, Vika ahora:
- **Preguntará explícitamente** por cada uno de los 8 frentes comerciales durante la conversación
- Para los **5 frentes núcleo**: buscará información suficiente para considerar el frente cubierto (no requiere perfección)
- Para los **3 frentes complementarios**: hará al menos una pregunta específica por cada uno, pero no insistirá más de 2 veces si la respuesta es vaga o el cliente no quiere profundizar
- **Permitirá cerrar el chat** cuando los 5 frentes núcleo tengan información suficiente, independientemente de la completitud de los complementarios
- **Continuará preguntando** por un frente si el cliente quiere agregar información, incluso si ya se consideró cubierto previamente

## 📁 Evidencia de cambios
- Commit: `5b57222` – `feat(brief): hacer más explícita la instrucción de preguntar por frentes complementarios en el System Prompt de Vika`
- Archivo modificado: `Bridge/lib/briefing-assistant-ai.ts` (diff disponible en el commit)
- Pruebas verificadas: 40/40 passing en `lib/briefing.test.ts`
- Build verificado: exitoso

## 🎯 Entregable demostrable
Al interactuar con Vika en un brief de cliente, se podrá observar que:
1. Vika formula preguntas explícitas sobre todos los 8 frentes comerciales (incluyendo los complementarios) durante la conversación
2. Incluso si el cliente da respuestas vagas o incompletas a los frentes complementarios, Vika continúa la conversación y puede cerrar el chat cuando haya información suficiente en los 5 frentes núcleo
3. El cierre se produce con la despedida canónica, los tags `[SYS_ACTION: LOCK_SUCCESS] [BRIEF_COMPLETO]` y un JSON que incluye solo los campos con valor significativo (omitiendo los vacíos)

## 📌 Próximos pasos sugeridos
1. Monitorear conversaciones reales para verificar que Vika está siguiendo la instrucción mejorada de preguntar por todos los frentes complementarios
2. Considerar hacer seguimiento en futuros micro-sprints para refinar aún más el equilibrio entre exhaustividad de preguntas y fluidez conversacional
3. Documentar cualquier caso de uso donde esta mejora haya permitido cerrar briefs que previamente se quedaban atrapados por falta de información en frentes complementarios

---  
Checkpoint generado automáticamente para documentar el mejoramiento del System Prompt de Vika garantizando que se pregunte por todos los frentes comerciales permitiendo cierre con información suficiente en el núcleo.