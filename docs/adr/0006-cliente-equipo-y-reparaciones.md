# ADR-0006: Perfil de cliente, equipos independientes y reparaciones múltiples

**Estado:** Accepted  
**Fecha:** 2026-10-16

## Contexto

Un cliente puede traer varios equipos durante una visita, y un mismo equipo puede necesitar más de un trabajo. Copiar los datos de cliente en cada orden impide mantener un historial unificado; representar reparaciones adicionales como columnas fijas limita la evolución del flujo.

## Decisión

Cada cliente tendrá un perfil único. La recepción compartirá ese cliente entre uno o varios equipos; cada equipo originará una orden independiente con estado, cobros y garantía propios. Una orden podrá contener varias líneas de reparación, cada una con su propio problema, diagnóstico/solución, cobro y datos de refacción/costo. Las ventas POS podrán enlazarse opcionalmente al cliente; las ventas anónimas seguirán permitidas. Las órdenes históricas existentes se conservarán y se migrarán a una sola reparación inicial por orden; no se fusionarán perfiles históricos ambiguos automáticamente.

## Alternativas consideradas

### Una orden con varios equipos

Se descarta porque mezclaría estados, pagos y garantía de dispositivos distintos.

### Columnas fijas para trabajos adicionales

Se descarta porque crea un límite artificial y complica búsquedas, totales y crecimiento del formulario.

## Consecuencias

### Positivas

- El perfil puede reunir órdenes y compras asociadas sin exigir datos del cliente para ventas anónimas.
- El formulario puede repetir equipos y reparaciones sin duplicar campos estructurales.
- Cada equipo mantiene su propio ciclo operativo y financiero.

### Negativas

- Las órdenes actuales necesitan una migración de reparación inicial y una estrategia de vinculación de perfiles que no fusione coincidencias dudosas.
- Totales de orden, impresión, costos de refacción y solicitudes de proveedores deben derivarse de la reparación correspondiente.

## Relaciones

- Related: ADR-0001, ADR-0002; `docs/architecture.md` §§5–6, 8.
