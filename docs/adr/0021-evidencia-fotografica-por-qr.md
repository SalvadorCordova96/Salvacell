# ADR-0021: Evidencia fotográfica por QR de alcance limitado

**Estado:** Accepted  
**Fecha:** 2026-10-19

## Contexto

El taller necesita capturar desde un celular el estado físico de cada equipo recibido. La app actualmente solo se publica por loopback; un QR con `127.0.0.1` no sería accesible desde el teléfono y exponer toda la aplicación o la base de datos no es aceptable.

## Decisión

- Una persona autenticada genera desde la orden un QR temporal ligado a un solo equipo.
- El token aleatorio se almacena como hash y puede canjearse una sola vez por una sesión de carga corta, limitada a ese equipo, con máximo de 10 imágenes por sesión. El QR no revela datos del cliente ni permite consultar otras órdenes.
- La página móvil solo permite capturar/subir imágenes permitidas. Se validan tipo real, tamaño y cantidad en el servidor; cada original conserva fecha, actor de la orden, vínculo y SHA-256. La miniatura se genera aparte.
- Las mutaciones de QR validan el origen público exacto (esquema, host y puerto) usando los encabezados preservados por el proxy local, porque la URL interna del framework puede contener el nombre privado del servicio. Se comparte la validación con autenticación y borradores; el perfil del proxy no debe aceptar un host/origen arbitrario del cliente.
- Archivos originales y miniaturas viven en almacenamiento privado persistente, no en una ruta pública. La lectura y eliminación se hacen mediante la API autenticada y quedan auditadas.
- El almacenamiento total tiene un límite inicial de 5 GiB, configurable por entorno y aplicado de forma transaccional. Retirar evidencia la oculta pero no purga el archivo; el espacio no se recupera automáticamente.
- La conectividad desde celular se habilita únicamente mediante un perfil Docker opt-in de entrada HTTPS, con bind por defecto a loopback y allowlist de página/recursos y dos endpoints. Para una IP/nombre de LAN se exige certificado confiable; HTTP solo se admite para loopback de desarrollo. La entrada no comparte red con PostgreSQL ni OpenClaw y nunca se publica a internet.
- La retención y cuotas de almacenamiento se definirán antes de uso prolongado; en pruebas se usan archivos sintéticos.

## Alternativas consideradas

### Enlace QR permanente a la orden

Se descarta porque podría reutilizarse y revelar datos operativos o personales.

### Guardar fotos en una carpeta web pública

Se descarta porque conocer la URL sería suficiente para acceder al archivo y dificulta aplicar autorización.

### Enviar las imágenes al teléfono sin persistir en el servidor

Se descarta porque no deja evidencia disponible en el expediente de la orden.

## Consecuencias

### Positivas

- El teléfono puede colaborar sin recibir una cuenta general de Salvacel.
- El token limita equipo, tiempo y cantidad; el servidor conserva procedencia e integridad verificable.

### Negativas

- Se requiere un volumen privado persistente y una ruta LAN controlada para el celular.
- Para uso desde celular se requiere resolver el nombre local y distribuir/confíar un certificado apropiado; habilitar el perfil y el firewall es una acción explícita de operación.
- La capacidad predeterminada no sustituye una política de retención y purga; se debe acordar y verificar antes de operar a largo plazo.
- Se necesita una política de retención/capacidad antes de operar a largo plazo.

### Neutrales

- Una sesión corta canjeada a partir del QR permite varias fotos; el token QR en sí no se reutiliza.

## Relaciones

- Supersedes:
- Superseded by:
- Related: ADR-0006, ADR-0010, ADR-0020; `docs/architecture.md` §§5, 6 y 8.
