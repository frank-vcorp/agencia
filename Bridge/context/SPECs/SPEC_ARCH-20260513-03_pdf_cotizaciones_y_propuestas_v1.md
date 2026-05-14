# SPEC ARCH-20260513-03: PDF de cotizaciones y propuestas V1

**ID:** ARCH-20260513-03  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-13  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Puntaje de prioridad:** (Valor 9 × 3) + (Urgencia 8 × 2) - (Complejidad 4 × 0.5) = 41  
**Depende de:** ARCH-20260510-11, SPEC-23, SPEC-10, IMPL-20260513-02

---

## 1. Contexto

Bridge ya puede:

1. crear y versionar cotizaciones reales por proyecto,
2. activar una versión vigente,
3. guardar copia local `.md` de la propuesta,
4. disparar comunicación transaccional real cuando una cotización se vuelve vigente.

El hueco operativo que sigue abierto es la **salida comercial formal**. Hoy la propuesta existe como dato en Bridge y como copia markdown local, pero todavía no existe una salida PDF consistente que Frank pueda descargar, compartir o adjuntar en un flujo comercial real.

Este slice no reabre el modelo de cotización. Solo agrega la **capa de exportación comercial formal** con alcance mínimo y verificable.

---

## 2. Objetivo

Permitir que Bridge genere un PDF formal, legible y descargable para la cotización vigente de un proyecto, reutilizando la información ya persistida en `quotations` y `quotation_versions`, sin introducir una segunda fuente de verdad.

---

## 3. Resultado esperado

Al cerrar este slice:

1. el operador puede solicitar el PDF de la cotización vigente de un proyecto,
2. Bridge responde con un archivo PDF descargable y con nombre estable,
3. el documento incluye identidad comercial mínima, cliente, proyecto, resumen, items, total, vigencia y notas,
4. el contenido del PDF coincide con la versión vigente de la cotización,
5. existe validación técnica suficiente para asegurar que la salida no se rompió.

---

## 4. Alcance

### Incluye

1. resolución server-side de la cotización vigente por `projectId`,
2. plantilla PDF comercial mínima,
3. endpoint o acción explícita para descargar el PDF,
4. nombre de archivo consistente y trazable,
5. cobertura de validación para el render y el contrato de salida,
6. ajuste mínimo en la superficie actual para exponer la descarga si ya existe un punto lógico.

### Excluye

1. envío de PDF adjunto por email,
2. múltiples plantillas de marca,
3. firma digital,
4. aceptación jurídica,
5. edición visual avanzada del documento,
6. regeneración histórica por versiones arbitrarias fuera de la vigente.

---

## 5. Decisiones de diseño

### 5.1 Fuente de verdad única

El PDF no debe construir un modelo paralelo. Debe renderizar directamente desde la cotización vigente ya resuelta por Bridge.

### 5.2 Priorizar robustez sobre sofisticación

SOFIA debe escoger la ruta más estable y mantenible para generar el PDF. La decisión esperada es una de estas dos:

1. `@react-pdf/renderer` si permite una salida estable y controlada con baja fricción,
2. una ruta HTML -> PDF solo si en el contexto actual resulta claramente más simple y confiable.

La elección debe justificarse por robustez real en este repo, no por preferencia abstracta.

**Preferencia arquitectónica para este repo:**

1. hoy no existe motor PDF runtime instalado en `package.json`,
2. el stack actual ya está apoyado en React/Next y plantillas React Email,
3. por tanto, la opción preferida para este slice es **incorporar `@react-pdf/renderer` como dependencia puntual** y evitar una estrategia con navegador headless o toolchain pesada.

Solo debe desviarse de esta decisión si al implementar aparece un bloqueo técnico concreto.

### 5.3 Un solo caso de uso en V1

Este slice cubre **la cotización vigente**. No debe abrir de una vez versionado histórico de PDF, múltiples estados o propuestas paralelas.

### 5.4 Salida honesta

Si un proyecto no tiene cotización vigente, la ruta debe responder de forma explícita y útil. No debe generar un PDF vacío ni ambiguo.

---

## 6. Entregables mínimos

1. una utilidad o servicio de render PDF para cotización vigente,
2. una ruta tipo `GET /api/v1/projects/[id]/quotation/pdf` o equivalente coherente con el App Router,
3. un nombre de archivo con formato sugerido `cotizacion-[client]-[project]-v[version].pdf`,
4. validación automatizada del slice,
5. checkpoint de implementación.
6. un punto visible de descarga en la superficie comercial ya existente si el acoplamiento resulta pequeño y lógico.

---

## 7. Rutas candidatas de implementación

SOFIA debe confirmar el punto exacto según el código actual, pero el corte debe concentrarse cerca de estas rutas ya existentes:

1. `lib/quotations.ts` como capa reusable principal del dominio de cotizaciones,
2. `app/api/v1/projects/[id]/quotation/route.ts` como referencia del flujo MCP ya operativo para resolución de proyecto, versión y resumen,
3. `app/cotizaciones/page.tsx` como superficie candidata para exponer la descarga,
4. `lib/` para el servicio nuevo de exportación/render PDF,
5. una nueva ruta App Router para descarga del PDF,
6. tests del servicio o de la ruta.

El objetivo es un cambio acotado y verificable, sin abrir una expansión lateral del módulo comercial.

### Restricción de implementación

SOFIA no debe duplicar la lógica de resolución de cotización vigente en varios sitios.

La expectativa es una de estas dos rutas:

1. extender `lib/quotations.ts` con una función enfocada a exportación por `projectId`, o
2. extraer a una utilidad reusable la parte estrictamente necesaria para que la ruta PDF y la ruta existente de cotizaciones compartan criterio.

No es deseable resolver el PDF copiando consultas ad hoc dentro de una segunda ruta si eso deja dos fuentes de comportamiento.

---

## 8. Contrato esperado

### Request

`GET /api/v1/projects/[id]/quotation/pdf`

Autenticación:

1. si la ruta se diseña para consumo MCP/agente, debe respetar el mismo esquema de autenticación de las rutas `/api/v1/projects/[id]/quotation` ya existentes,
2. si la descarga se expone desde la UI interna de `/cotizaciones`, puede resolverse como ruta server-side interna siempre que no abra un nuevo modelo de auth.

### Respuesta exitosa

1. `200 OK`
2. `Content-Type: application/pdf`
3. `Content-Disposition: attachment; filename="...pdf"`
4. body binario del PDF

### Respuesta cuando no existe cotización vigente

1. `404` o respuesta equivalente consistente con el estilo actual,
2. mensaje claro indicando que el proyecto no tiene cotización vigente exportable.

---

## 9. Contenido mínimo del PDF

1. nombre comercial de la agencia,
2. nombre del cliente,
3. nombre del proyecto,
4. título de la cotización,
5. resumen ejecutivo,
6. tabla simple de line items,
7. total y moneda,
8. vigencia,
9. notas o condiciones básicas,
10. fecha de emisión o de generación del documento.

No se requiere diseño exuberante. Sí se requiere que el documento se vea profesional, estable y legible.

### Fuente de contenido esperada

1. `title` y `bodyMarkdown` de la versión vigente,
2. `commercialSummaryJson` cuando aporte estructura útil,
3. `projectId` y `clientId` resueltos desde la cotización,
4. nombre de cliente y proyecto recuperados en la misma resolución server-side.

La meta es que el PDF refleje la versión vigente real, no una reconstrucción parcial desde campos sueltos.

---

## 10. Criterios de aceptación

1. existe una ruta o acción comprobable que descarga el PDF de la cotización vigente de un proyecto,
2. el archivo generado abre correctamente y tiene `Content-Type` de PDF,
3. el documento incluye todos los campos mínimos definidos en esta SPEC,
4. si el proyecto no tiene cotización vigente, la salida falla de forma explícita y útil,
5. el cambio no rompe la creación ni activación actual de cotizaciones,
6. existe validación automatizada enfocada del slice,
7. si existe una cotización activa visible en `/cotizaciones`, el operador tiene un punto claro para descargar su PDF sin fricción extra,
8. se genera checkpoint con riesgos remanentes concretos.

---

## 11. Validación mínima exigida

1. test unitario o de integración del servicio/ruta PDF,
2. verificación de cabeceras de respuesta,
3. build o typecheck enfocado si aplica,
4. evidencia de que no se introdujeron regresiones en el flujo existente de cotizaciones,
5. si se agrega CTA en `/cotizaciones`, validación mínima de que la vista sigue compilando y renderizando.

---

## 12. Riesgos conocidos

1. si la capa PDF elegida exige demasiada configuración, el slice puede inflarse innecesariamente,
2. si se intenta acoplar el PDF al email en este mismo corte, se abriría otro frente y se perdería foco,
3. si el documento depende de estilos HTML frágiles, la salida puede degradarse entre entornos.

La instrucción es mantener este corte **estrecho**: exportación PDF de cotización vigente, sin abrir adjuntos ni flujos legales.

---

## 13. Secuencia recomendada para SOFIA

1. tomar `lib/quotations.ts` como ancla principal y decidir si requiere extensión mínima para exportación por `projectId`,
2. reutilizar como referencia el comportamiento de `app/api/v1/projects/[id]/quotation/route.ts` sin copiar su lógica completa,
3. instalar solo la dependencia PDF estrictamente necesaria, con preferencia por `@react-pdf/renderer`,
4. implementar el render mínimo del documento,
5. exponer la descarga por una ruta coherente,
6. agregar CTA en `app/cotizaciones/page.tsx` solo si el cambio es pequeño y directo,
7. validar headers, salida y no regresión,
8. emitir checkpoint.