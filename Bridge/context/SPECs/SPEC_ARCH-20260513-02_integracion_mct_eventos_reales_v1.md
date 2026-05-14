# SPEC ARCH-20260513-02: Integración MCT con Eventos Reales V1

**ID:** ARCH-20260513-02
**Agente autor:** INTEGRA - Arquitecto
**Fecha:** 2026-05-13
**Estado:** Autorizada — lista para SOFIA
**Prioridad:** Alta — segundo slice bloqueante del corte ARCH-20260510-11
**Puntaje de prioridad:** (Valor 10 × 3) + (Urgencia 9 × 2) - (Complejidad 4 × 0.5) = 46
**Depende de:** ARCH-20260510-11, ARCH-20260513-01, SPEC-09, SPEC-10
**Corte paraguas:** ARCH-20260510-11
**Rol en el corte:** Conectar el módulo de comunicación transaccional a los eventos reales del sistema aprovechando el contacto estructurado del cliente

---

## 1. Contexto y Motivación

Bridge ya tiene tres piezas que por separado funcionan:

1. el módulo `lib/notifications.ts`,
2. el flujo operativo de clientes y cotizaciones,
3. el contacto estructurado del cliente introducido en `ARCH-20260513-01`.

El hueco actual es de integración:

1. el sistema puede crear cliente, pero no dispara `client.created`,
2. el sistema puede marcar cotización activa, pero no dispara `quotation.active`,
3. `buildWhatsAppLink()` existe, pero no se usa sobre datos reales,
4. el contrato de salida expone `emailSent`, pero hoy sigue en `false` por falta de conexión.

Este slice existe para cerrar esa brecha sin abrir todavía login del cliente, PDFs o canales más complejos.

---

## 2. Objetivo

Conectar el MCT a los eventos reales mínimos de V1 usando los datos ya disponibles del cliente para que Bridge deje de declarar automatización y empiece a ejecutarla de forma trazable.

---

## 3. Resultado Esperado

Al cerrar este slice:

1. crear cliente podrá disparar `client.created` cuando exista email válido,
2. activar una cotización podrá disparar `quotation.active` cuando exista email válido,
3. el sistema podrá construir `wa.me` con `primary_contact_whatsapp` real,
4. el contrato MCP de cotización podrá devolver `emailSent: true` cuando efectivamente ocurra,
5. la ausencia de email o WhatsApp dejará una degradación explícita y honesta, no una promesa falsa.

---

## 4. Alcance de esta SPEC

### Incluye

1. Integración de `sendTransactionalEmail('client.created')` en el flujo de creación de cliente cuando el dato exista.
2. Integración de `sendTransactionalEmail('quotation.active')` en el flujo de cotización activa.
3. Resolución de datos mínimos de cliente y proyecto para poblar las plantillas.
4. Uso real de `primary_contact_whatsapp` para construir enlaces `wa.me` en las superficies donde aplique.
5. Ajuste del contrato `emailSent` para reflejar envío real.
6. Logging y degradación silenciosa coherente cuando falten env vars o contacto.
7. Validación enfocada del slice.

### Excluye

1. Magic links reales.
2. Login público del cliente.
3. WhatsApp Business API.
4. Adjuntos PDF por email en este mismo slice.
5. Historial completo de comunicaciones en UI.
6. Evento `asset.delivered` si no existe todavía un punto único y confiable de entrega final.

---

## 5. Decisiones de Diseño

### 5.1 Integración incremental

No se conectan todos los eventos a la vez. Se priorizan los dos que ya tienen mejor soporte de datos:

1. `client.created`
2. `quotation.active`

### 5.2 Degradación honesta

Si falta email del cliente, el sistema no falla, pero debe:

1. dejar `emailSent: false`,
2. registrar el motivo,
3. no simular envío exitoso.

### 5.3 WhatsApp como canal de apoyo visible

`buildWhatsAppLink()` no es envío automático. Es canal operacional asistido.

Por eso debe apoyarse en:

1. dato real del cliente,
2. mensaje prellenado,
3. superficie clara para el operador.

### 5.4 No inventar portal ni magic link

Mientras la ruta pública final del cliente no exista como flujo de login real, el MCT no debe fingir un onboarding completo con acceso seguro no implementado.

Si hace falta, el contenido del email debe degradar a una versión honesta y útil para V1.

---

## 6. Cambios Esperados por Capa

### Capa de negocio

1. El flujo de creación de cliente debe poder resolver si hay email y/o WhatsApp.
2. El flujo de cotización activa debe consultar el cliente asociado al proyecto.

### Capa MCT

1. reutilizar `sendTransactionalEmail()`,
2. reutilizar `buildWhatsAppLink()`,
3. no duplicar lógica de render de plantillas fuera del módulo.

### Capa API

#### `POST /api/v1/clients`

Debe poder:

1. crear cliente,
2. disparar `client.created` si existe `primary_contact_email`,
3. opcionalmente incluir `whatsAppLink` en la respuesta si existe `primary_contact_whatsapp`.

#### `POST /api/v1/projects/[id]/quotation`

Con `setAsActive=true`, debe poder:

1. resolver el cliente del proyecto,
2. usar `primary_contact_email`,
3. disparar `quotation.active`,
4. devolver `emailSent` real,
5. opcionalmente devolver `whatsAppLink` si existe WhatsApp.

### Capa MCP

No requiere tool nueva. Solo se beneficia del contrato ya existente si `emailSent` empieza a reflejar la realidad.

---

## 7. Criterios de Aceptación Medibles

1. Crear cliente con email válido puede disparar `client.created`.
2. Crear cliente sin email no rompe el flujo y deja degradación honesta.
3. Activar cotización con cliente que tiene email válido puede disparar `quotation.active`.
4. `emailSent` refleja el resultado real del envío.
5. Si el cliente tiene WhatsApp, el sistema puede construir un `wa.me` utilizable.
6. No se introducen rutas o promesas falsas de login/portal que aún no existen.
7. El slice queda validado con tests o verificaciones enfocadas.

---

## 8. Orden Recomendado de Implementación

1. Conectar `client.created`.
2. Conectar `quotation.active`.
3. Devolver `emailSent` real.
4. Exponer `whatsAppLink` donde sea útil.
5. Validar con tests del slice.
6. Generar checkpoint.

---

## 9. Riesgos del Slice

1. Seguir usando textos o URLs de portal no implementadas y enviar mensajes engañosos.
2. Marcar `emailSent: true` por solo intentar envío y no por resultado real.
3. Duplicar lógica de contacto en varios handlers en vez de centralizarla.
4. Introducir dependencia fuerte a env vars sin degradación controlada.

---

## 10. Definición de Terminado

Este slice se considera terminado cuando Bridge dispara al menos los eventos `client.created` y `quotation.active` sobre datos reales del cliente, con resultados trazables y degradación honesta cuando falten contacto o configuración.