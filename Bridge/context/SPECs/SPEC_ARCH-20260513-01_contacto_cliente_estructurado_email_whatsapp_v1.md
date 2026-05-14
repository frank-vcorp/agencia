# SPEC ARCH-20260513-01: Contacto Estructurado del Cliente — Email y WhatsApp V1

**ID:** ARCH-20260513-01
**Agente autor:** INTEGRA - Arquitecto
**Fecha:** 2026-05-13
**Estado:** Autorizada — lista para SOFIA
**Prioridad:** Alta — primer slice bloqueante del corte ARCH-20260510-11
**Puntaje de prioridad:** (Valor 10 × 3) + (Urgencia 10 × 2) - (Complejidad 3 × 0.5) = 48.5
**Depende de:** ARCH-20260510-11, SPEC-09 (MCT), SPEC-10 (MCP)
**Corte paraguas:** ARCH-20260510-11
**Rol en el corte:** Slice activo inicial para destrabar contacto operable del cliente antes de PDF, agente Frank y endurecimiento final del MCT

---

## 1. Contexto y Motivación

Bridge ya tiene implementado el módulo de comunicación transaccional a nivel de código y ya puede crear clientes desde UI/API/MCP.

El problema actual es estructural:

1. el modelo `clients` guarda `primary_contact_name`,
2. guarda `primary_contact_channel` como texto libre,
3. pero no guarda un email explícito,
4. ni un número WhatsApp explícito.

Eso deja un hueco crítico:

1. `sendTransactionalEmail()` no tiene una fuente de verdad confiable para destinatario,
2. `buildWhatsAppLink()` no tiene un número estructurado,
3. el flujo de alta de cliente y de cotización vigente no puede automatizarse con seguridad,
4. el MCP puede crear clientes, pero no deja listo el contacto real para operación posterior.

Este slice existe para corregir ese hueco antes de seguir con PDF, agente Frank y disparadores MCT.

---

## 2. Objetivo

Agregar al modelo de cliente un contacto principal estructurado para operar Bridge en piloto real, con:

1. email del contacto principal,
2. número WhatsApp del contacto principal,
3. compatibilidad hacia atrás con el campo `primary_contact_channel`.

---

## 3. Resultado Esperado

Al cerrar este slice:

1. `clients` tendrá campos explícitos para email y WhatsApp,
2. crear cliente desde API/MCP aceptará esos campos,
3. el sistema podrá construir `wa.me` con un número confiable,
4. el MCT quedará desbloqueado para usar email real del cliente,
5. el texto libre `primary_contact_channel` quedará relegado a campo complementario opcional.

---

## 4. Alcance de esta SPEC

### Incluye

1. Migración SQL para agregar `primary_contact_email` y `primary_contact_whatsapp` a `public.clients`.
2. Actualización de tipos y normalizadores server-side del dominio `clients`.
3. Actualización de `POST /api/v1/clients`.
4. Actualización de `createClient()` en la capa `lib/assets.ts`.
5. Actualización del contrato MCP `bridge_create_client`.
6. Validaciones mínimas para email y formato de WhatsApp.
7. Ajustes de lectura donde el sistema muestra contacto principal del cliente.
8. Tests del slice tocado.

### Excluye

1. Disparo real de emails del MCT en este mismo slice.
2. Magic links o login del cliente.
3. Normalización internacional avanzada por país.
4. Integración con WhatsApp Business API.
5. Replanteamiento del modelo de identidad del cliente.

---

## 5. Decisiones de Diseño

### 5.1 Campos nuevos

Se agregan estos campos a `public.clients`:

1. `primary_contact_email text`
2. `primary_contact_whatsapp text`

### 5.2 Campo legado

`primary_contact_channel` no se elimina en V1.

Se conserva como:

1. campo libre complementario,
2. útil para notas como “WhatsApp oficina”, “Telegram”, “Atiende solo por la tarde”,
3. no apto como fuente de verdad para automatización.

### 5.3 Validación pragmática

Para este corte basta con:

1. validar email con patrón razonable,
2. limpiar WhatsApp a formato numérico base,
3. permitir nulos para no romper clientes existentes,
4. exigirlos solo cuando el flujo operativo realmente los necesite después.

### 5.4 Compatibilidad hacia atrás

Clientes existentes no deben romperse.

Por eso:

1. la migración agrega columnas nullable,
2. la API acepta campos opcionales,
3. la UI puede seguir mostrando `primary_contact_channel` si los nuevos campos no existen todavía,
4. el flujo nuevo debe preferir `primary_contact_email` y `primary_contact_whatsapp` cuando estén presentes.

---

## 6. Cambios Esperados por Capa

### Capa de datos

Migración sobre `public.clients`:

1. `add column if not exists primary_contact_email text`
2. `add column if not exists primary_contact_whatsapp text`

No se requiere índice especial en este corte.

### Capa de dominio

Actualizar tipos, lecturas y escrituras de cliente para incluir:

1. `primaryContactEmail?: string`
2. `primaryContactWhatsapp?: string`

### Capa API

`POST /api/v1/clients` debe aceptar:

```json
{
  "name": "Cliente X",
  "legalName": "Cliente X SA de CV",
  "status": "active",
  "primaryContactName": "Ana",
  "primaryContactEmail": "ana@cliente.com",
  "primaryContactWhatsapp": "5215512345678",
  "primaryContactChannel": "WhatsApp personal",
  "notes": "..."
}
```

### Capa MCP

`bridge_create_client` debe aceptar los mismos dos campos nuevos.

### Capa de presentación

Donde Bridge muestre contacto principal, el orden de preferencia debe ser:

1. nombre,
2. email,
3. WhatsApp,
4. canal libre,
5. fallback honesto.

---

## 7. Criterios de Aceptación Medibles

1. La tabla `clients` tiene `primary_contact_email` y `primary_contact_whatsapp`.
2. Crear cliente por API acepta y persiste ambos campos.
3. Crear cliente por MCP acepta y persiste ambos campos.
4. Los clientes previos siguen funcionando sin migración manual adicional.
5. La capa de dominio expone ambos campos nuevos de forma tipada.
6. `primary_contact_channel` permanece como campo opcional complementario.
7. Existe validación mínima de email y limpieza básica del número WhatsApp.
8. El slice queda cubierto por tests o validaciones equivalentes.

---

## 8. Orden Recomendado de Implementación

1. Crear migración SQL.
2. Actualizar dominio `clients` y helper de creación.
3. Actualizar endpoint `POST /api/v1/clients`.
4. Actualizar contrato MCP `bridge_create_client`.
5. Ajustar lecturas/presentación mínimas.
6. Ejecutar tests y checkpoint.

---

## 9. Riesgos del Slice

1. Tratar WhatsApp como texto libre sin normalización mínima y mantener el problema original.
2. Endurecer demasiado el requerimiento y romper clientes existentes o demos cargadas.
3. Tocar el modelo pero olvidar el contrato MCP, dejando inconsistencia entre UI y agentes.
4. Usar `primary_contact_channel` como alias encubierto en vez de dejarlo claramente secundario.

---

## 10. Definición de Terminado

Este slice se considera terminado cuando Bridge puede almacenar y exponer un contacto principal del cliente con email y WhatsApp estructurados, dejando desbloqueado el siguiente paso: PDF + MCT + operación real.