# ADR 0001: Separar la importación histórica de las reglas para órdenes nuevas

- Estado: Aceptada
- Fecha: 2026-10-11

## Contexto

El taller necesita iniciar con 48 órdenes del sistema anterior para observar ingresos y movimiento. La fuente histórica contiene teléfonos, modelos, proveedores y costos incompletos, mientras que las órdenes capturadas de ahora en adelante deben conservar una calidad mínima.

## Decisión

Las altas y ediciones normales exigirán nombre, apellido, marca, modelo, tipo de reparación y total mayor que cero. El teléfono será opcional y, cuando exista, deberá ser válido.

La carga histórica usará una operación separada, disponible únicamente cuando no existan órdenes. Validará folios consecutivos e importes conciliados, conservará la procedencia y permitirá valores heredados incompletos. `Entregada` se traducirá operativamente a `Terminada`, manteniendo el estado anterior.

Un cobro histórico sin desglose se registrará como un movimiento agregado con método `Otro` y una aclaración. Los costos internos ausentes se guardarán como nulos. Los indicadores usarán las expresiones “costo conocido” y “resultado aproximado”.

## Consecuencias

- La calidad de las órdenes futuras no se reduce para poder importar el pasado.
- Los folios históricos se conservan al ejecutar la carga sobre una base vacía.
- El total cobrado y el adeudo son utilizables, aunque el detalle histórico de pagos no se reconstruye.
- La utilidad exacta no puede afirmarse mientras falten costos y otros egresos.

## Alternativas descartadas

- Relajar permanentemente todos los campos: deterioraría las nuevas capturas.
- Inventar teléfonos, costos, proveedores o métodos de pago: produciría precisión falsa.
- Rechazar las órdenes incompletas: impediría usar el historial para observar el movimiento inicial.

