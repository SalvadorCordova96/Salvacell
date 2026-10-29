# ADR-0015: Cotizaciones en presupuestos y respuestas estructuradas

**Estado:** Accepted  
**Fecha:** 2026-10-16

## Contexto

Una persona puede solicitar solo un presupuesto y necesitar conocer el costo de una refacción sin crear una orden. Cuando sí existe una reparación, la solicitud debe vincularse a esa reparación. Las respuestas pueden llegar manualmente por ahora; el canal y el runtime agéntico se integrarán después. El esquema necesita conservar el mensaje de origen y los datos confirmados por separado.

## Decisión

- Una ronda de cotización se liga a una reparación o a un presupuesto aún no convertido, nunca a ambos. No crea una orden ni efectúa una compra.
- La persona selecciona proveedores activos desde la recepción o desde el detalle del presupuesto. Una reparación que no requiere pieza no abre una solicitud.
- Cada proveedor tiene un registro de participación en la ronda. Las respuestas se guardan como filas independientes, con idempotency key, texto original, resumen técnico opcional, precio, envío, calidad/variante, disponibilidad, tiempo de entrega, fecha y marca de revisión.
- El texto original se conserva aunque el resumen sea manual hoy o provenga de un agente en el futuro. Datos desconocidos permanecen vacíos; no se infieren.
- La elección de una oferta es manual y cierra la ronda en Salvacel. La versión actual no envía confirmación, agradecimiento ni consulta; tampoco llama a OpenClaw o WhatsApp.
- El silencio global configurable solo cambia la etiqueta visual a “respuesta completa por ahora” cuando hubo al menos una respuesta y venció la ventana. No cierra ni cancela automáticamente la solicitud.
- Solicitudes cerradas/canceladas permanecen en historial. Una respuesta posterior se registra como tardía y no reabre la solicitud ni sustituye la elección.
- Las funciones actuales son internas a la API de Salvacel. Una futura integración agentic deberá usar un contrato autenticado y acotado, sin acceso directo a PostgreSQL ni tipos nativos de OpenClaw.

## Alternativas consideradas

### Cotizaciones solo desde órdenes

Se descarta porque hay clientes que piden precios sin solicitar la reparación.

### Reutilizar una orden temporal para un presupuesto

Se descarta porque alteraría el historial operativo y podría producir equipo, pagos o estados de reparación inexistentes.

### Dejar que el runtime agentic escriba directamente en PostgreSQL

Se descarta: Salvacel conserva validación, autorización y estado canónico detrás de su API.

## Consecuencias

### Positivas

- El taller puede iniciar cotizaciones desde reparación o presupuesto sin navegar a otra área.
- El historial separa la respuesta original de los campos estructurados y hace posible revisar la interpretación.
- El flujo manual permite validar la UI y el modelo antes de conectar mensajería o un runtime agentic.

### Negativas

- Se agregan tablas y una migración PostgreSQL; la instancia persistente necesita esa migración antes de usar la función.
- Los respaldos nuevos se identifican como esquema `0019`. La restauración conserva compatibilidad con respaldos anteriores, trata las tablas de participación/respuesta como opcionales cuando no existen y restaura las referencias a ofertas elegidas después de insertar sus respuestas.
- Hace falta diseñar autenticación/idempotencia de ingreso externo antes de aceptar respuestas de un agente.
- La finalización “por ahora” es una etiqueta derivada de la ventana y no un estado terminal del proveedor.

## Relaciones

- Related: ADR-0013, ADR-0014.
