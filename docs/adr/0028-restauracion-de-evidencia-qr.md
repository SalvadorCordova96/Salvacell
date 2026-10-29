# ADR-0028: Restaurar metadatos de evidencia QR sin reactivar sesiones

**Estado:** Accepted  
**Fecha:** 2026-10-22

## Contexto

La restauración JSON reemplaza órdenes y sus relaciones. La evidencia QR tiene claves foráneas hacia órdenes y tokens de carga; sin incluir esas tablas en el respaldo ni vaciarlas en el orden correcto, PostgreSQL rechaza la eliminación de una orden. Además, una sesión QR es temporal y no debe volver a ser válida al restaurar un respaldo.

## Decisión

- El esquema de respaldo JSON 0026 incluye las filas de `repair_photo_upload_tokens` y `repair_photos` para mantener sus relaciones con órdenes.
- Al restaurar, se eliminan las fotos antes que sus tokens y luego las órdenes; después se insertan en orden padre→hijo. Respaldos anteriores que no incluyan las tablas QR continúan siendo válidos y dejan esas tablas vacías.
- Las sesiones/tokens QR restaurados se revocan y se borran sus hashes de sesión; las fotos conservan sus metadatos y referencias a los archivos del volumen privado.
- El JSON no contiene los bytes de las imágenes. Para restaurar evidencia visual se requiere conservar o restaurar también el volumen privado de fotos.

## Alternativas consideradas

### Mantener las tablas QR fuera del JSON y borrarlas al restaurar

No se seleccionó porque se perdería el vínculo de fotos existentes con órdenes restauradas, aunque el volumen privado conserve los archivos.

### Restaurar también sesiones QR activas

Se descartó porque podría reactivar una sesión temporal previa al proceso de restauración.

## Consecuencias

### Positivas

- Restaurar ya no falla por las claves foráneas de la evidencia QR.
- Los metadatos de fotos se conservan cuando el respaldo corresponde al mismo volumen privado.
- Ningún QR o sesión de carga vuelve a quedar activo por restaurar un respaldo.

### Negativas

- Un respaldo JSON por sí solo no traslada los archivos de imagen a otra instalación; debe acompañarse del respaldo del volumen privado cuando se necesite conservar los archivos.

### Neutrales

- Se mantiene compatibilidad con respaldos históricos que no contienen tablas QR.

## Relaciones

- Supersedes:
- Superseded by:
- Related: ADR-0005, ADR-0021; `docs/architecture.md` §8.
