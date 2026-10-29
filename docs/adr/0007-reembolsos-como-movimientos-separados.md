# ADR-0007: Registrar las devoluciones sin alterar los cobros originales

**Estado:** Accepted  
**Fecha:** 2026-10-16

## Contexto

Cancelar una reparación no implica que se devuelva todo lo cobrado. El taller necesita poder cancelar con devolución cero, parcial o total, y mantener trazabilidad de los cobros y del efectivo que sale.

## Decisión

La cancelación conserva el motivo y registra en el libro inmutable de resoluciones una devolución separada con importe, método y motivo; los cobros originales no se borran ni se editan para simular la salida de dinero. Se permite devolución cero al cancelar y las devoluciones positivas acumuladas no pueden superar los cobros vigentes de la orden. La interfaz confirmará el importe antes de registrar la operación.

## Alternativas consideradas

### Anular o reducir los cobros existentes

Se descarta porque elimina la diferencia entre dinero recibido y dinero devuelto y debilita el historial financiero.

## Consecuencias

### Positivas

- Caja e ingresos pueden distinguir cobros y reembolsos.
- La devolución parcial y la devolución cero quedan explícitas y auditables.

### Negativas

- Los indicadores financieros deben restar devoluciones sin contar como cero los datos desconocidos.

## Relaciones

- Related: ADR-0001; migración 0014 (`order_resolutions`); `docs/architecture.md` §8.
