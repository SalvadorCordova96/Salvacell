# Glosario del dominio

## Cliente

Persona con un perfil único que reúne sus órdenes y las ventas que decida asociar. Una venta de mostrador puede permanecer anónima.

## Recepción

Captura de uno o varios equipos de un cliente durante una misma visita. Se comparten los datos del cliente, pero cada equipo conserva su propio seguimiento.

## Equipo

Identidad persistente de un dispositivo físico de un cliente. Varias órdenes pueden referirse al mismo equipo si la persona lo elige explícitamente del historial; escribir la misma marca y modelo no lo identifica ni lo fusiona.

## Usuario del taller

Persona autorizada para operar Salvacel con una identidad individual. No es un cliente del taller; sus acciones deben poder distinguirse en la bitácora.

## Rol

Conjunto de permisos asignado a usuarios del taller. El backend decide si una operación está permitida; ocultar una opción de pantalla no concede ni revoca permisos.

## Evidencia fotográfica

Fotografías del estado de un equipo al recibirlo, ligadas a su orden y con fecha y procedencia verificables.

## Orden

Registro operativo de una visita de un equipo para reparación. Cada visita crea una orden nueva, aunque se vincule a la identidad de un equipo anterior; puede contener una o varias reparaciones y mantiene su propio estado, cobros y garantía. Marca, modelo, serie, condición y accesorios son una captura histórica de esa visita.

## Reparación

Trabajo individual realizado o solicitado sobre un equipo, con problema, diagnóstico, solución, mano de obra y datos de refacción propios. Una orden puede contener varias reparaciones.

## Solicitud de garantía

Seguimiento de un reporte relacionado con una reparación u orden anterior. El registro documenta el problema y su resultado sin asumir automáticamente que la reparación está cubierta.

## Solicitud de refacción

Registro de una pieza requerida para una reparación concreta. Puede originar una ronda de cotización a proveedores elegidos por la persona responsable.

## Solicitud de cotización

Ronda para consultar una refacción ligada a una reparación o a un presupuesto. No implica compra ni crea una reparación. Conserva proveedores elegidos, respuestas recibidas y su estado.

## Cotización de proveedor

Oferta capturada para una solicitud de cotización, con proveedor, precio y condiciones disponibles. Puede provenir de una respuesta interpretada por un agente o de captura manual. Registrar una oferta no significa aceptarla; la decisión corresponde al responsable del taller.

## Reembolso

Salida de dinero asociada a una orden, registrada aparte de los cobros originales para conservar el historial financiero. Puede ser parcial o total y requiere motivo y método cuando el importe sea mayor que cero.

## Pedido a proveedor

Documento interno creado desde una oferta elegida manualmente. Agrupa conceptos solo del mismo proveedor y moneda. Crear el borrador o marcarlo solicitado no cambia el inventario ni envía mensajes externos.

## Recepción de compra

Evento que registra la cantidad que realmente llegó, su costo real y el flete asignado. Puede ser parcial y es idempotente. Solo las cantidades recibidas afectan existencias o el costo interno de una reparación.

## Pago a proveedor

Salida ligada a un pedido y almacenada aparte de los cobros recibidos de clientes. No puede superar el saldo del pedido; una anulación debe conservar el movimiento y motivo.

## Refacción instalada

Refacción recibida y aplicada a una reparación activa. Si se compró como inventario, instalarla consume stock una sola vez. Una pieza recibida que deja de necesitarse puede transferirse manualmente a inventario con su procedencia y costo.

## Orden histórica

Orden procedente del sistema anterior. Puede conservar datos incompletos o provisionales, pero debe identificar cliente, equipo, reparación, fecha e importes. Su procedencia queda marcada con el folio, fecha y estado anteriores cuando existen.

## Cobro histórico agregado

Importe total que la fuente antigua marca como cobrado. Cuando no existe el detalle de movimientos, se registra una sola vez con método `Otro` y una nota que indica que la fecha y el método exactos no están documentados.

## Costo de refacción conocido

Costo interno respaldado por el registro histórico o capturado posteriormente. La ausencia de costo significa **desconocido**, no cero.

## Resultado aproximado

Importe cobrado menos los costos de refacción conocidos. No equivale a utilidad contable porque puede excluir costos desconocidos, mano de obra, gastos generales, impuestos y otros egresos.

