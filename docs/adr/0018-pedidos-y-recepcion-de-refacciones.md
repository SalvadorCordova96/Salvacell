# ADR-0018: Pedidos y recepción trazable de refacciones

**Estado:** Aceptada  
**Fecha:** 2026-10-18

## Contexto

El flujo de cotización ya conserva respuestas y requiere que una persona elija la oferta. Faltaba distinguir esa elección de una compra real, registrar pagos al proveedor por separado de los cobros de clientes y asegurar que el inventario/costo solo cambie cuando el taller recibe una pieza. Un pedido puede agrupar varios conceptos, pero todos deben pertenecer al mismo proveedor y moneda.

## Decisión

- La selección manual de una oferta permite crear un pedido en borrador; no envía mensajes ni confirma una compra externa. Una acción explícita lo marca como solicitado.
- El pedido guarda una instantánea de la oferta seleccionada, proveedor, equipo/refacción, precio, calidad, cantidad, moneda y flete compartido. La respuesta original permanece inmutable en el historial de cotización.
- Los pedidos agrupan ofertas seleccionadas de un solo proveedor y moneda. El flete total se reparte en centavos por peso de línea, con resto determinista; las recepciones parciales distribuyen el costo de flete restante sin duplicarlo.
- Los pagos al proveedor tienen libro separado de `payments` de clientes, clave idempotente y bloqueo del pedido para que pagos concurrentes no excedan el saldo.
- La recepción es una transacción corta con bloqueo de filas. Cada línea registra cantidad, costo real y flete recibido; solo la cantidad recibida aumenta existencias o actualiza el costo promedio del producto. La refacción asignada a una reparación se marca disponible y recibe un costo interno puesto en taller.
- La cantidad recibida nunca puede exceder lo pedido. Un reintento con la misma clave devuelve la recepción existente; un movimiento de stock conserva una referencia única al recibo.
- Cancelar un pedido conserva pagos, respuestas y recepciones anteriores. Una pieza recibida para una reparación cancelada puede transferirse manualmente a un producto de inventario, conservando costo y procedencia. Una pieza de reparación recibida puede marcarse instalada una sola vez; el backend evita volver a consumir existencias.
- El agente OpenClaw no crea pedidos, no modifica pagos, inventario o destino, y no envía mensajes. Su propuesta solo permite que la persona elija una oferta; Salvacel mantiene autoridad y auditoría.
- El respaldo JSON usa esquema `0022`, incluye pedido, líneas, pagos a proveedor y recibos, y sigue aceptando respaldos anteriores.

## Alternativas consideradas

### Incrementar inventario al seleccionar una oferta o al marcar el pedido solicitado

Se descarta porque una cotización o una orden al proveedor no prueba que la pieza llegó; inflaría existencias y costos.

### Reutilizar cobros de clientes para los pagos a proveedores

Se descarta porque mezcla flujos financieros y distorsiona adeudos, caja y reportes.

### Dejar que el agente escriba directo al esquema

Se descarta porque elude autorización humana, validaciones transaccionales y procedencia del inventario.

## Consecuencias

### Positivas

- Se puede seguir una oferta desde su selección hasta pedido, pago, recepción, inventario o instalación.
- Las recepciones parciales, reintentos, concurrencia y cancelaciones conservan trazabilidad sin doble contabilización.
- El flujo funciona localmente con pruebas simuladas sin conectar WhatsApp ni OpenClaw.

### Pendientes

- La primera versión de compra se inicia desde ofertas vinculadas a reparaciones; la compra de una oferta originada solo en presupuesto sigue siendo una decisión aparte.
- La devolución física al proveedor, notas de crédito y anulación de pagos de proveedor requieren un flujo de reversión auditable aún no implementado.
- La configuración de quién puede autorizar pedido, pago y traspaso depende del módulo de usuarios/roles pendiente.

## Evaluación y operación

- Riesgo/autonomía: R2/A0 en compras; toda transición financiera o de destino requiere acción humana. El agente solo interpreta y propone ofertas.
- Verificación aislada: pruebas cubren idempotencia, pago separado, límite de saldo, recepción parcial, costo/flete, cancelación y traspaso trazable. No migrar ni reconstruir la instancia persistente como parte de estas pruebas.
- Owner: Salvacel; revisar el libro de caja/proveedores antes de habilitar operación real.
