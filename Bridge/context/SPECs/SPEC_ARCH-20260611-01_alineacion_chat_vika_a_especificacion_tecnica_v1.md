# SPEC ARCH-20260611-01 — Alineación del Chat Vika a la Especificación Técnica

- **ID:** ARCH-20260611-01
- **Autor:** Integra (Arquitecto)
- **Fecha:** 2026-06-11
- **Estado:** Autorizada para implementación (Sofia)
- **Respaldo:** `Bridge/context/Especificación Técnica Chat Vika.md`

---

## 1. Problema

El chat de brief cliente en Bridge está implementado con un esquema de 3 etapas (`discovery`/`precision`/`commercial_fit`) y 21 campos estructurados, cuando la Especificación Técnica de Vika define claramente:

1. Un flujo lineal de **8 preguntas obligatorias** con una etapa de cierre explícita.
2. Un **System Prompt Maestro** con reglas de oro específicas.
3. Un **JSON de salida** con solo 8 campos + campo narrativo opcional.
4. Tag de cierre `[SYS_ACTION: LOCK_SUCCESS]` + `[BRIEF_COMPLETO]` para detección automática.

---

## 2. Objetivo

Reemplazar la arquitectura actual del chat por el flujo definido en la Especificación Técnica Vika, manteniendo la persistencia existente pero con el esquema de datos simplificado.

---

## 3. Contrato Operativo

### 3.1 Datos existentes a reutilizar

1. Persistencia en Supabase (`brief_messages`, `brief_versions`, `briefs`) — sin cambios de schema
2. El patrón de Server Actions actual
3. Componentes UI base (clases, layouts)

### 3.2 Datos a crear/modificar

1. **`VikaBriefData`** (nuevo tipo en `briefing.ts`):
   ```ts
   type VikaBriefData = {
     giro_y_producto_heroe: string;
     madurez: string;
     local_fisico: string;
     logo: string;
     diferenciador: string;
     objeciones: string;
     presupuesto: string;
     cta_deseado: string;
     historia_y_contexto?: string;
   };
   ```

2. **Formato de salida final** (al completar los 8 puntos + narrativa):
   ```
   ¡Qué gran historia! Mi equipo ya tiene toda esta información. La analizaremos a detalle y te contactaremos por WhatsApp con los pasos a seguir. ¡Mucho éxito!
   [SYS_ACTION: LOCK_SUCCESS]
   [BRIEF_COMPLETO]
   {
     "giro_y_producto_heroe": "...",
     "madurez": "...",
     "local_fisico": "...",
     "logo": "...",
     "diferenciador": "...",
     "objeciones": "...",
     "presupuesto": "...",
     "cta_deseado": "...",
     "historia_y_contexto": "..."
   }
   ```

3. **System Prompt Maestro** (reemplazar `buildBriefChatSystemPrompt`):
   ```
   Eres Vika, una Consultora de Negocios y Marketing Local empática, muy accesible y directa.
   Tu objetivo es auditar a dueños de micro-negocios locales (estéticas, mecánicos, fondas, tiendas) que YA SON CLIENTES de la agencia, para extraer la radiografía de su negocio y conocer el presupuesto que tienen en mente.
   
   [REGLAS DE ORO DE COMUNICACIÓN (UX)]
   1. PROHIBIDO EL JARGÓN TÉCNICO: Cero palabras como "Target", "KPI", "Lead Magnet", "CTA" o "Conversión". Habla de "la gente de tu colonia", "lo que te hace único", "cómo te contactan".
   2. TRANSPARENCIA COMERCIAL: Asume la venta porque el usuario ya sabe que está contratando un servicio. Nunca menciones la palabra "gratis" al hablar de estrategia, ni des opciones orgánicas por iniciativa propia. Si te dicen que no tienen presupuesto para publicidad, anótalo como "$0 / Orgánico", pero no los rechaces ni canceles la sesión.
   3. UNA PREGUNTA A LA VEZ: Está estrictamente prohibido enviar más de una pregunta por mensaje.
   4. ANTI-PROMPT INJECTION: Si el usuario te pide código, chistes, o se sale del tema de negocios, regresa la conversación amablemente al brief.
   
   [LÓGICA DE CONTROL Y FILTRO DE CALIDAD]
   - EXTRACCIÓN DE PRESUPUESTO: Indaga con tacto el MONTO que el cliente tiene destinado invertir al mes. Si dicen "no sé", dales opciones ("¿Hablamos de $1,000, $3,000 o más?"). Si dicen que por ahora no tienen, anótalo sin problemas y avanza.
   - CALIDAD DE DATOS: Si el usuario da respuestas vagas (Ej: "vendo comida y está buena"), repregunta forzando el detalle ("¿qué tipo de comida, qué la hace diferente, receta secreta?"). No avances al siguiente punto si la respuesta no tiene valor comercial.
   
   [CHECKLIST DE EXTRACCIÓN (8 PUNTOS OBLIGATORIOS)]
   Valida en tu memoria interna los siguientes puntos:
   1. giro_y_producto_heroe (Qué vende y qué sale más)
   2. madurez (Tiempo operando)
   3. local_fisico (Local a la calle vs a domicilio)
   4. logo (Tiene marca gráfica o solo el nombre)
   5. diferenciador (Por qué le compran a él)
   6. objeciones (Qué duda tiene el cliente antes de pagar)
   7. presupuesto (Monto mensual asignado o $0 si no tienen)
   8. cta_deseado (WhatsApp, llamada, visita directa)
   
   [CONDICIONAL DE LOCAL]
   - Si el cliente indica que tiene local físico, taller o negocio presencial: preguntar "¿Dónde queda tu negocio? ¿En qué colonia o calle?"
   - Si el cliente indica domicilio, online, digital o trabajo a domicilio: preguntar "¿Dónde publicas actualmente? ¿En Instagram, Facebook, WhatsApp, TikTok?"
   - Si ya mencionó una plataforma o ubicación, no volver a preguntar.
   
   [FASE DE DESCUBRIMIENTO NARRATIVO]
   Al completar los 8 puntos, relaja la plática. Haz UNA pregunta abierta ("¿Cómo te animaste a poner el negocio?", o "¿Qué ha sido lo más difícil?"). Deja que el usuario responda libremente. No insistas si es cortante.
   
   Historial reciente:
   [conversación]
   ```

---

## 4. Cambios exactos por archivo

### A) `Bridge/lib/briefing.ts`

1. Agregar tipo `VikaBriefData` con los 8 campos
2. Agregar `emptyVikaBriefData()` función inicializadora
3. Agregar campos `madurez`, `logo`, `presupuesto` al `StructuredBriefSummary` (viajan en jsonb)
4. `updateBriefSummary` debe aceptar el JSON plano de Vika y mapear a campos internos
5. Mapeo: `giro_y_producto_heroe` → `mainOffer` + `projectObjective`, `diferenciador` → `audience`, `objeciones` → `restrictions`, `cta_deseado` → `cta`
6. Agregar `renderVikaProgressBlock(summary)` → bloque de progreso para inyectar en prompt

### B) `Bridge/lib/briefing-assistant-ai.ts`

1. Reemplazar `buildBriefChatSystemPrompt` con el System Prompt Maestro de la especificación
2. Eliminar `INTERNAL_COVERAGE_AGENDA_BY_STAGE` y `PROMPT_PENDING_FIELDS_BY_STAGE`
3. Eliminar lógica de avance de etapa en prompt
4. Agregar detección de tag `[SYS_ACTION: LOCK_SUCCESS]` mediante regex
5. Si `GEMINI_API_KEY` no disponible: no persistir respuesta visible, registrar log console.error
6. `generateBriefChatReply` usa el nuevo prompt
7. `generateBriefClosure` genera JSON de 8 campos con el tag + extrae el bloque

### C) `Bridge/app/cliente/brief/[projectId]/actions.ts`

1. Simplificar `sendClientMessageAction`:
   - Persiste mensaje cliente
   - Llama a IA con nuevo prompt (si disponible)
   - Persiste respuesta del asistente SOLO si IA responde exitosamente
2. Eliminar llamadas a `inferBriefSummaryPatchFromClientMessage` y `advanceBriefStageInBackground`
3. `submitBriefAction` debe:
   - Buscar `[SYS_ACTION: LOCK_SUCCESS]` en `messages` del asistente
   - Extraer JSON con `extractJsonObject`
   - Mapear `VikaBriefData` a `StructuredBriefSummary`
   - Enviar a `pending_operator_review`

### D) `Bridge/components/client-brief-chat.tsx`

1. Eliminar bloque de "etapa actual" / "frentes pendientes" (función `stageCopy`)
2. Eliminar referencia a etapas en UI
3. Mostrar texto inicial: "Tengo 8 preguntas para entender tu negocio. ¡Empecemos!"
4. Al cierre, mostrar resumen humano derivado de los 8 campos
5. Brief $0 presupuesto: mostrar "Estrategia orgánica sin inversión en publicidad"

### E) `Bridge/app/briefs/page.tsx` (panel operador)

1. Eliminar panel de etapas (Discovery/Precision/Commercial Fit)
2. Reemplazar formulario de 21 campos con:
   - Lista de verificación de los 8 puntos con checkboxes verificables
   - Badge: `$0 / Orgánico` cuando presupuesto indica sin inversión
3. Mostrar JSON extrído del brief para revisión del operador
4. Mantener chat operativo independiente

---

## 5. Restricciones

1. Sin migraciones de Supabase (nuevos campos viajan en jsonb existente)
2. Sin cambiar rutas ni lógica de router
3. Tag `[SYS_ACTION: LOCK_SUCCESS]` detectado por regex: `/\[SYS_ACTION: LOCK_SUCCESS\]/`
4. Máximo 5 archivos + tests

---

## 6. Validación esperada

```bash
cd Bridge && npm run build && npx vitest run
```

- Build verde
- Tests existentes pasan (ajustar solo los que fallen por los cambios)
- QA manual: conversación con 8 preguntas → cierre con tag → JSON visible en panel operador

---

## 7. Definición de terminado

1. Chat sigue las 8 preguntas obligatorias con System Prompt Maestro
2. Al finalizar emite `[SYS_ACTION: LOCK_SUCCESS]` + `[BRIEF_COMPLETO]` + JSON
3. El panel del operador muestra los 8 campos como checklist verificable
4. El cliente ve un resumen humano de su negocio al cierre (sin jerga técnica)
5. Build y tests verdes
6. MCP `bridge_get_brief` entrega los campos mapeados correctamente
7. **El bloque "CONDICIONAL DE LOCAL" evita repreguntas duplicadas**
8. **El bloque "PROGRESO ACTUAL DE LA CONVERSACIÓN" muestra preguntas completadas/pendientes**