# ADR-0004: Garantía derivada y términos configurables en la entrega

**Estado:** Accepted  
**Fecha:** 2026-10-16

## Contexto

El flujo de órdenes ya conserva los días de garantía por reparación y la fecha de entrega, pero no mostraba el vencimiento en el detalle ni emitía un ticket de entrega. Tampoco había un campo de Configuraciones para los términos que deben acompañar a ese comprobante. Las órdenes históricas pueden carecer de fecha de entrega o de días de garantía, y esos datos no deben inventarse.

## Decisión

- Agregar `settings.warranty_terms` mediante una migración aditiva con valor predeterminado vacío, y permitir que el taller redacte los términos desde Configuraciones.
- Derivar «Garantía hasta» de `delivered_at + warranty_days`, interpretando la fecha de entrega en la zona horaria configurada. No persistir una segunda fecha derivada.
- Mostrar vencimiento y términos en el detalle y en un ticket de entrega separado del ticket de ingreso. No imprimir el código de desbloqueo.
- Si la orden no tiene fecha de entrega o días de garantía positivos, no afirmar una vigencia; preservar los datos tal como están.

## Alternativas consideradas

### Guardar también una fecha de vencimiento

No se seleccionó porque duplica un valor calculable y puede quedar desincronizado si se corrige la fecha o la duración.

### Incluir términos fijos en el ticket

No se seleccionó porque el taller debe configurar su propio texto y no se deben asumir condiciones comerciales o legales.

## Consecuencias

### Positivas

- El personal puede consultar y entregar un comprobante con una fecha calculada de forma consistente.
- Los términos son editables sin alterar órdenes ya registradas.
- La migración conserva las filas existentes y las órdenes históricas incompletas.

### Negativas

- Hay que aplicar la migración `0015` a cada base ya inicializada antes de guardar términos.
- El texto de garantía requiere configuración explícita; el valor vacío no inventa condiciones.

### Neutrales

- El vencimiento se calcula en la zona horaria del taller y solo existe si hay entrega registrada y días positivos.

## Relaciones

- Supersedes:
- Superseded by:
- Related: Fase 7 del plan de desarrollo; `docs/architecture.md` §8.
