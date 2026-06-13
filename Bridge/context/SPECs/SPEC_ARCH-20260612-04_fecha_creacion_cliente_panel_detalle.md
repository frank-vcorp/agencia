# SPEC ARCH-20260612-04

## Título
Fecha de creación en el panel de cliente y detalle de información relacionada

## Estado
Planificado

## Fecha
2026-06-12

## ID de Decisión
ARCH-20260612-04

## Objetivo
Enriquecer el módulo de clientes (Bridge V1 y V2) para mostrar la fecha de creación del cliente tanto en el panel de listado (`/clientes`) como en el detalle del cliente (por ejemplo, en el header del proyecto o en una vista de perfil), permitiendo al operador y al cliente tener visibilidad de antigüedad y trazabilidad temporal sin sobrecargar la interfaz.

## Contexto y Problema
En la SPEC base ARCH-20260504-04 (líneas 604‑623) el módulo de clientes muestra métricas como número de clientes, canales y estado (activo, prospecto, inactivo), pero no incluye la fecha de creación. Esta información es útil para:
- Evaluar la antigüedad de la relación comercial.
- Priorizar follow‑ups en el CRM.
- Proveer contexto al cliente sobre cuándo se inició la colaboración.
- Mejorar la trazabilidad requerida en el módulo de trazabilidad y aprobaciones (líneas 648‑676).

Agregar la fecha de creación no rompe los principios de densidad de información ni de visibilidad controlada, ya que puede presentarse como un campo secundario (texto pequeño, formato de fecha corta) dentro de la tarjeta de cliente o en el detalle del proyecto.

## Principios de UX — No Negociables
1. **Visibilidad controlada**: La fecha de creación solo será visible para roles que ya pueden ver el listado de clientes (operador y cliente según su rol). No se expondrá públicamente ni a roles sin acceso.
2. **Formato conciso**: Se mostrará en formato `DD/MMM/YY` (ej: `12 Jun 26`) para mantener la densidad de información alta.
3. **Ubicación secundaria**: En el listado de clientes, la fecha aparecerá como una línea pequeña bajo el nombre del cliente o como un badge discreto. En la vista de detalle del cliente (por ejemplo, en el header del proyecto o en un panel “Información del cliente”), se mostrará de forma destacada pero sin interferir con acciones primarias.
4. **Consistencia de datos**: La fecha proviene del campo `created_at` de la tabla `tenants` (o `clientes` si el modelo evoluciona) y debe estar en zona horaria del tenant (America/Mexico_City) para coherencia con otros timestamps de la UI.
5. **No altera permisos existentes**: No se introducen nuevos roles ni se modifican los permisos de lectura; simplemente se muestra un campo ya existente en la entidad.

## Detalles de Implementación

### 1. Modelo de datos
- Asumir que la tabla `tenants` (o `clientes`) contiene un campo `created_at` TIMESTAMP WITH TIME ZONE.
- Si la tabla actual no tiene dicho campo, se debe añadir mediante migración Supabase (fuera del alcance de esta SPEC, pero se asume que exista o se creará en un esfuerzo paralelo de infraestructura).

### 2. Cambios en la UI

#### a. Listado de clientes (`/clientes`) – `ClientesPage` o componente `ClientCard`
- Añadir una línea de texto pequeño (ej: `text-[10px] text-muted`) bajo el nombre del cliente con la fecha de creación.
- Ejemplo de estructura:
  ```tsx
  <div className="flex flex-col">
    <p className="font-medium truncate">{client.name}</p>
    <p className="text-[10px] text-muted">Creado: {formatDate(client.created_at)}</p>
  </div>
  ```
- El formato `formatDate` utiliza `Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "2-digit" })`.

#### b. Detalle de cliente / Proyecto
- En la vista de proyecto (cuando el operador o cliente ven un proyecto específico), mostrar la fecha de creación del cliente asociado en el header o en un panel de información del cliente.
- Ejemplo en `ClientProjectHeaderV2` o `ProjectContextCard`:
  ```tsx
  <p className="text-[10px] text-muted">Cliente desde: {formatDate(client.created_at)}</p>
  ```

#### c. Panel de cliente (`/cliente`) – en la tarjeta de cliente activo
- Igual que en el listado: agregar la fecha de creación como dato adicional.

### 3. Impacto en otros módulos
- El módulo de clientes sigue teniendo las mismas métricas (clientes, canales, estado).
- No se modifican los permisos: el operador sigue viendo todo, el cliente sigue viendo solo su propio cliente (según tenant).
- La fecha de creación se considera parte de la información básica del cliente, por lo que su inclusión está alineada con el principio de “información útil para operar y conversar con el cliente” (líneas 635‑646 de la SPEC base).

## Criterios de Aceptación
1. **Listado de clientes**: Cada tarjeta de cliente muestra la fecha de creación en formato `DD/MMM/YY` bajo el nombre del cliente.
2. **Detalle de proyecto**: En la vista de proyecto asociada a un cliente, se muestra la fecha de creación del cliente en el header o panel de información.
3. **Formato de fecha**: Se usa formato corto de día, mes abreviado y año de dos dígitos, localizado a es-MX.
4. **Sin impacto en permisos**: El cliente solo ve la fecha de creación de su propio cliente; el operador ve la fecha de todos los clientes del tenant.
5. **Sin degradación de performance**: La fecha se incluye en las consultas existentes (`getClientPortal`, `getClientsByTenant`, etc.) sin requerir joins adicionales si el campo ya está en la tabla.
6. **Responsive**: La fecha se muestra correctamente en vistas móvil, tablet y escritorio sin romper el layout.
7. **Testing**: Existen pruebas unitarias que verifican que la fecha se renderiza correctamente dado un timestamp de ejemplo.

## Métricas de Validación
- **Build**: `pnpm build` debe pasar sin errores TypeScript.
- **Test**: Nuevos tests unitarios en `lib/client-portal.test.ts` (o archivo nuevo) que verifiquen la presencia y formato de la fecha de creación.
- **Linter**: `pnpm lint` sin warnings introducidos.
- **Revisión humana**: Verificación visual en los tres puntos de aparición listados.

## Referencias
- SPEC Base: ARCH-20260504-04 (módulo de clientes, líneas 604‑623).
- Principios de densidad de información y visibilidad controlada (líneas 635‑646).
- Módulo de trazabilidad y aprobaciones (líneas 648‑676) – la fecha de creación apoya la trazabilidad.
- Implementación existente del módulo de clientes: `app/cliente/page.tsx`, `lib/client-portal.ts`, `components/client-portal/*` (si existen).

## Decisión Final
Esta SPEC enriquece el módulo de clientes existente con la fecha de creación, un campo de metadata útil tanto para el operador como para el cliente, sin violar los principios de visibilidad controlada ni de densidad de información. La implementación se realiza mediante la adición de una línea de texto secundario en las tarjetas y detalles de cliente, utilizando el campo `created_at` ya presente (o que se añadirá en una migración paralela).