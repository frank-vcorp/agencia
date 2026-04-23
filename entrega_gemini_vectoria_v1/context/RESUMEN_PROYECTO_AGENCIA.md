# Resumen del Proyecto: "Puente de Mando" - Dashboard para Agencia Digital

## 1. Visión General

El objetivo es construir un **sistema de gestión de proyectos a medida**, denominado "Puente de Mando", para una agencia de marketing digital. Este sistema reemplazará herramientas externas como Trello o Notion, centralizando el control operativo directamente dentro de VS Code y proporcionando una interfaz web limpia y dedicada para el equipo creativo (diseñadores, editores de video).

La filosofía es separar los roles de manera clara:
- **Dirección Estratégica (Tú):** Opera exclusivamente desde VS Code, utilizando agentes de IA para planificar, generar briefs y automatizar tareas.
- **Producción Creativa (Diseñador):** Trabaja en una interfaz web simple y dedicada, recibiendo "Kits de Creación" completos y actualizando el estado de su trabajo.

## 2. Arquitectura Propuesta

El sistema se compone de tres partes fundamentales que se comunican entre sí:

### A. El Frontend: Dashboard del Diseñador
- **Tecnología:** Aplicación web moderna, preferiblemente con **Next.js**.
- **Función:** Es la única interfaz que el diseñador necesita. Muestra una lista de tareas asignadas. Cada tarea es un "Kit de Creación" que contiene toda la información necesaria: briefs, copies, prompts para IA, hashtags, y directrices visuales.
- **Interacción:** El diseñador puede ver sus tareas, subir los entregables (ej. enlace a Google Drive) y actualizar el estado de la tarea (ej. de "Pendiente" a "En Revisión").

### B. El Backend: La API del Sistema
- **Tecnología:** Una **API REST** construida con Node.js (puede ser parte de la misma aplicación Next.js) o un framework similar.
- **Función:** Es el cerebro que conecta todo. Expone endpoints para:
    - `POST /api/tasks`: Crear nuevas tareas.
    - `GET /api/tasks`: Obtener tareas (filtrando por estado, asignado, etc.).
    - `PATCH /api/tasks/{id}`: Actualizar el estado de una tarea.
- **Seguridad:** La API debe estar protegida, requiriendo una clave (API Key) para autorizar las peticiones.

### C. La Base de Datos
- **Tecnología:** Una base de datos NoSQL como **Firestore** (Firebase) o MongoDB.
- **Función:** Almacena toda la información de las tareas: clientes, briefs, estados, fechas de entrega, enlaces a los archivos finales, etc.

### D. El Cliente: Tus Agentes en VS Code
- **Tecnología:** Agentes personalizados de Copilot (`@Planner`, `@FileManager`) dentro de tu entorno de VS Code.
- **Función:** Estos agentes están programados para "hablar" con tu API REST. En lugar de solo generar texto, realizan acciones:
    - **`@Planner`:** Toma un brief, genera los "Kits de Creación" y hace llamadas `POST` a la API para crear las tareas en el dashboard.
    - **`@FileManager`:** Hace llamadas `GET` para obtener el estado de las tareas y llamadas `PATCH` para aprobarlas o solicitar cambios.

## 3. Flujo de Trabajo de Ejemplo

1.  **Planificación (VS Code):** Das una orden a `@Planner` para generar el plan de contenidos de un cliente.
2.  **Automatización (Agente -> API):** `@Planner` genera los detalles de cada post y envía múltiples peticiones `POST` a tu API, creando las tareas en la base de datos.
3.  **Ejecución (Diseñador -> Dashboard):** El diseñador ve las nuevas tareas en su dashboard web, las ejecuta y actualiza su estado a "En Revisión".
4.  **Revisión (VS Code):** Pides a `@FileManager` que te muestre las tareas "En Revisión". El agente llama a la API (`GET`) y te muestra los resultados.
5.  **Aprobación (Agente -> API):** Das la orden de aprobar una tarea. `@FileManager` envía una petición `PATCH` a la API, cambiando el estado a "Aprobado". El diseñador ve el cambio en tiempo real.

## 4. Beneficios Clave

- **Control Centralizado:** Gestionas toda la operación de la agencia sin salir de VS Code.
- **Flujo de Trabajo Profesional:** El diseñador tiene una herramienta limpia y a medida, sin la complejidad de un entorno de desarrollo.
- **Automatización Real:** Tus agentes de IA se convierten en verdaderos asistentes que ejecutan acciones en tu sistema.
- **Sistema Escalable y Propio:** Tienes control total sobre las funcionalidades y puedes adaptar el sistema a medida que la agencia crece.
