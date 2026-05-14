# SPEC ARCH-20260513-04: SendGrid como proveedor de email para MCT V1

**ID:** ARCH-20260513-04  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-13  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Puntaje de prioridad:** (Valor 8 × 3) + (Urgencia 8 × 2) - (Complejidad 4 × 0.5) = 38  
**Depende de:** ARCH-20260510-09, ARCH-20260513-02, ARCH-20260510-11

---

## 1. Contexto

Bridge ya tiene un Módulo de Comunicación Transaccional operativo en código y ya conecta eventos reales para `client.created` y `quotation.active`.

Sin embargo, la implementación actual sigue acoplada a Resend en `lib/notifications.ts`, mientras que la decisión operativa ya quedó tomada: **el proveedor oficial para el piloto real será SendGrid**.

Esta SPEC formaliza ese cambio para evitar que la decisión quede solo como instrucción verbal y para que SOFIA implemente una migración controlada del canal email sin reabrir el resto del MCT.

---

## 2. Objetivo

Sustituir Resend por SendGrid como proveedor transaccional de email en Bridge, manteniendo intacto el contrato funcional del MCT y sin abrir cambios laterales en Google Chat, WhatsApp o los eventos ya integrados.

---

## 3. Resultado esperado

Al cerrar este slice:

1. `sendTransactionalEmail()` usa SendGrid como backend real de envío,
2. los eventos `client.created`, `quotation.active` y `asset.delivered` siguen usando el mismo contrato lógico,
3. la degradación honesta se mantiene si faltan credenciales o el destinatario es inválido,
4. el repo ya no depende de Resend para el canal email del piloto,
5. las variables de entorno y la documentación del proveedor quedan claras para producción.

---

## 4. Alcance

### Incluye

1. reemplazo del cliente Resend por cliente SendGrid en `lib/notifications.ts`,
2. actualización de dependencias en `package.json`,
3. actualización de tests del módulo de notificaciones si están acoplados al proveedor actual,
4. cambio de variables de entorno del canal email a la convención definida para SendGrid,
5. documentación mínima del nuevo proveedor en el estado del proyecto y checkpoint.

### Excluye

1. rediseño de plantillas React Email,
2. adjuntos PDF por email,
3. tracking avanzado de aperturas/clicks,
4. panel histórico de comunicaciones,
5. cambios en Google Chat o WhatsApp,
6. cambios de negocio en los eventos ya definidos.

---

## 5. Decisiones de diseño

### 5.1 SendGrid sustituye, no convive

Para este piloto, la decisión no es construir una abstracción multiproveedor sobrediseñada. La instrucción es **migrar a SendGrid** de forma directa y trazable.

No debe quedar una capa ambigua tipo “Resend o SendGrid” sin necesidad real.

### 5.2 Contrato del MCT estable

Las firmas públicas de dominio deben mantenerse estables tanto como sea razonable:

1. `sendTransactionalEmail()` debe conservar su contrato,
2. los tipos `MCTEmailEvent`, `MCTEmailResult` y los payloads por evento no deben romper a los consumidores actuales salvo necesidad técnica justificada,
3. la lógica de selección de plantilla por evento debe seguir centralizada.

### 5.3 Degradación honesta

Si falta la credencial de SendGrid, el sistema debe seguir degradando con warning y `success: false`, igual que hoy.

### 5.4 Sin reabrir magia de autenticación

Este slice no corrige ni amplía el flujo de magic link, portal ni onboarding. Solo cambia el proveedor de envío del canal email.

---

## 6. Anclas reales del repo

SOFIA debe concentrar el cambio alrededor de estas rutas:

1. `lib/notifications.ts` como centro del cambio,
2. `lib/notifications.test.ts` para validación del slice,
3. `package.json` y lockfile para el cambio de dependencia,
4. rutas ya integradas que consumen `sendTransactionalEmail()`:
   - `app/api/v1/clients/route.ts`
   - `app/api/v1/projects/[id]/quotation/route.ts`

La expectativa es un cambio estrecho alrededor del proveedor, no una refactorización amplia del sistema.

---

## 7. Variables de entorno esperadas

La convención objetivo mínima debe quedar explícita. Se espera algo como:

1. `SENDGRID_API_KEY`
2. `BRIDGE_FROM_EMAIL`
3. `BRIDGE_AGENCY_NAME`

Si SendGrid requiere configuración adicional mínima del remitente, debe documentarse en el checkpoint y quedar nombrada de forma clara.

El slice también debe retirar la dependencia funcional de `RESEND_API_KEY` para el canal email.

---

## 8. Criterios de aceptación

1. `sendTransactionalEmail()` ya no usa Resend como backend de envío,
2. el proveedor runtime del canal email es SendGrid,
3. las rutas consumidoras actuales siguen compilando sin cambiar su contrato de uso,
4. la degradación honesta se mantiene si falta `SENDGRID_API_KEY`,
5. el contrato del evento `asset.delivered` se mantiene operativo aunque todavía no sea el frente principal de disparo real,
6. el cambio no rompe Google Chat ni `buildWhatsAppLink()`,
7. las pruebas del slice pasan,
8. queda checkpoint con variables requeridas y riesgos remanentes.

---

## 9. Riesgos conocidos

1. SendGrid puede requerir diferencias en formato de payload, remitente verificado o manejo de respuesta,
2. si el cambio toca demasiada lógica de render o eventos, el slice se inflaría innecesariamente,
3. si se intenta dejar multiproveedor en este momento, se perdería foco.

La instrucción sigue siendo mantener el corte estrecho y pragmático.

---

## 10. Secuencia recomendada para SOFIA

1. identificar el acoplamiento exacto a Resend en `lib/notifications.ts`,
2. sustituirlo por SendGrid con el mínimo cambio estructural,
3. actualizar dependencia y tests,
4. validar que `client.created`, `quotation.active` y `asset.delivered` siguen funcionando a nivel de contrato,
5. documentar variables requeridas y riesgos remanentes,
6. emitir checkpoint.