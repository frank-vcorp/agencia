# ADR ARCH-20260423-01

## Titulo

Arrancar por conceptualizacion y MVP escalonado

## Estado

Aprobado

## Contexto

El proyecto inicia sin codigo base y con una necesidad amplia: construir una Aceleradora de Ventas con IA. Existen multiples posibles direcciones de producto: CRM, agencia operativa, automatizacion comercial, reporting o asistente IA.

## Decision

Se decide iniciar por una fase de conceptualizacion documentada y ordenar el producto alrededor de un MVP escalonado en lugar de arrancar por una implementacion amplia.

## Razonamiento

1. Reduce riesgo de construir modulos innecesarios.
2. Permite validar primero el flujo comercial central.
3. Facilita delegar implementacion posterior a partir de SPECs cerradas.
4. Mantiene desacoplada la decision de stack de la decision de producto.

## Consecuencias

1. El avance de esta sesion es documental y estrategico, no de codigo de producto.
2. La siguiente iteracion debe seleccionar un solo modulo inicial para construir.
3. Las decisiones de autenticacion, multiusuario e integraciones quedan pendientes.

## Alternativas Consideradas

1. Arrancar construyendo una landing y dashboard demo.
2. Arrancar por CRM operativo minimo sin conceptualizacion previa.
3. Arrancar por automatizaciones IA desde el inicio.

## Decision Pendiente Asociada

Elegir el primer modulo implementable del MVP tecnico.