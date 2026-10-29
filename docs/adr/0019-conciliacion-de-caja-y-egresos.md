# ADR-0019: Conciliación de caja y egresos trazables

**Estado:** Aceptada  
**Fecha:** 2026-10-19

## Contexto

El Plan Maestro requiere separar flujo de efectivo, utilidad y obligaciones; conciliar el saldo esperado contra el contado por fecha, moneda y método; registrar pagos a proveedores, gastos y retiros del propietario sin doble contabilización; y proyectar gastos recurrentes sin descontar caja antes de pagarlos. La app ya conserva cobros, ventas, reembolsos y pagos a proveedor en libros propios, así que el cálculo debe agregarlos sin duplicar ventas aplicadas a órdenes.

## Decisión

- Mantener `payments`, `sales`, `order_resolutions` y `supplier_payments` como fuentes canónicas de sus movimientos. La vista de caja los combina para presentación y conciliación, restando la parte de una venta ya contabilizada como pago de orden.
- Registrar gastos y retiros del propietario en `cash_outflows`, con categorías separadas, moneda, método, fecha, clave idempotente y anulación motivada. Un retiro no se clasifica como gasto operativo.
- Modelar conceptos recurrentes y vencimientos separados. Crear un calendario no produce un egreso; el egreso aparece únicamente cuando se registra el pago. El siguiente vencimiento conserva la cadencia y se crea en la misma transacción que el pago.
- Guardar cierres inmutables por fecha de negocio, moneda y método, con fondo inicial, esperado calculado en el servidor, contado, diferencia y número de revisión. Un nuevo cierre no reemplaza uno anterior; las claves idempotentes evitan duplicar reintentos.
- Mantener el cálculo en PostgreSQL del backend y ejecutar pruebas con una base temporal. No migrar la base persistente como parte de esta decisión.

## Alternativas consideradas

### Tratar todo egreso como pago de proveedor o reembolso

Se descarta porque confunde obligaciones con proveedores, devoluciones a clientes y gastos/uso personal del propietario.

### Restar gastos recurrentes desde que se programan

Se descarta porque una proyección no prueba que el dinero salió de caja.

### Reemplazar un cierre anterior al corregirlo

Se descarta porque perdería la evidencia de lo contado y de las correcciones; se conserva cada revisión.

## Consecuencias

### Positivas

- La conciliación se calcula en servidor desde movimientos rastreables y se agrupa por método y moneda.
- Programar un gasto no altera caja; pagar una ocurrencia idempotente crea un único egreso y conserva historial.
- Las diferencias y correcciones de cierre quedan auditables.

### Límites y pendientes

- La primera versión no gestiona sueldo ni distribución del propietario como subcategorías configurables; solo distingue gasto del negocio y retiro del propietario.
- Las reglas recurrentes se editan, pausan y reactivan con control de revisión; cambiar una regla actualiza solo el vencimiento pendiente, sin alterar ocurrencias pagadas. Sigue pendiente corregir un pago recurrente ya registrado mediante un movimiento compensatorio, sin borrar el original.
- Las acciones aún no se atribuyen a una identidad individual. El PIN global opcional no equivale a usuarios, roles ni permisos por acción.
- Esta migración todavía no se ha aplicado al volumen persistente; requiere respaldo, ejecución controlada y verificación posterior.

## Evaluación y operación

- Riesgo/autonomía: R2/A0. El sistema calcula y registra solo tras acción explícita de una persona; no programa pagos ni mueve dinero automáticamente.
- Pruebas aisladas: idempotencia de egresos y pagos recurrentes, categoría, calendario frente a salida real, ajuste mensual fin de mes, conciliación y revisiones de caja, exportación y restauración de las nuevas tablas.
- Evidencia al 2026-10-19: `scripts/verify-cash-flow.mjs` aprobó 26 verificaciones sobre PostgreSQL temporal, incluidas edición, pausa/reactivación y rechazo de revisiones obsoletas; `pnpm test:flow` completó además 261 verificaciones heredadas y 8 del worker simulado; `pnpm test:e2e` pasó 21/21. TypeScript y lint dirigidos sin errores. No se usó la base persistente.
- Owner: Salvacel. Revisar antes de habilitar acceso multiusuario o migrar el volumen persistente.
