# ADR-0005: Conservar una copia recuperable antes de restaurar

**Estado:** Accepted  
**Fecha:** 2026-10-16

## Contexto

La restauración reemplaza las tablas activas. Descargar una copia desde el navegador depende de que el cliente termine correctamente y no proporciona una copia recuperable almacenada con la base. Además, el formato de exportación no incluía `order_resolutions`, por lo que una restauración podía perder cancelaciones y devoluciones.

## Decisión

- Antes de reemplazar datos, el servidor guardará en una tabla de recuperación el respaldo JSON completo de su estado actual, incluido `order_resolutions`.
- La copia previa, restauración solicitada y evento de auditoría se ejecutarán dentro del mismo lote atómico; se conservarán las cinco copias más recientes.
- El endpoint protegido permitirá listar metadatos y descargar una copia concreta para volver a restaurarla.
- El formato de exportación declarará el esquema 0016; las tablas nuevas ausentes en respaldos anteriores se aceptarán como opcionales, sin omitir tablas existentes.

## Alternativas consideradas

### Depender solo de la descarga en el navegador

No se seleccionó porque puede fallar o ser omitida antes de la mutación que reemplaza los datos.

### Guardar las copias fuera de SQLite

No se seleccionó porque el runtime local de Cloudflare no ofrece un sistema de archivos persistente portable desde la función y el respaldo debe acompañar a la misma base que protege.

## Consecuencias

### Positivas

- Una restauración accidental conserva una vía concreta de recuperación.
- Los respaldos incluyen ahora resoluciones de órdenes y devoluciones.
- La copia de seguridad no depende de una acción posterior del navegador.

### Negativas

- Las cinco copias ocupan espacio dentro de D1 y pueden contener datos personales; se debe mantener el volumen privado y respaldado.
- La migración 0016 debe aplicarse antes de usar el nuevo flujo.

### Neutrales

- Se sigue ofreciendo la descarga previa en navegador como copia adicional.

## Relaciones

- Supersedes:
- Superseded by:
- Related: Fases 5, 9 y 10; `docs/architecture.md` §8.
