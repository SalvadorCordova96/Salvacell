# Informe general de Salvacel para revisión externa

Fecha de corte: 15 de octubre de 2026.

## 1. Propósito

Este documento resume qué es Salvacel, qué hace actualmente, qué datos y controles conserva, cuáles son sus limitaciones comprobadas y qué se planea integrar. Está preparado para que otros agentes o programadores revisen el diseño antes de ejecutar cambios.

Regla de lectura:

- **Actual** significa que existe en el código o en la aplicación operativa y fue inspeccionado.
- **Planificado** significa que está definido, pero todavía no se implementó.
- **Pendiente de decisión** significa que falta una regla del negocio o una elección técnica.

## 2. Resumen ejecutivo

Salvacel es una aplicación privada de gestión de taller de reparación de celulares. Funciona localmente en la computadora, detrás de un proxy ligado únicamente a `127.0.0.1`, y guarda los datos operativos en un volumen privado de Docker mediante SQLite D1 ejecutado con Wrangler/Miniflare.

La aplicación actual administra órdenes, presupuestos, cobros, caja, refacciones, proveedores, precios, inventario, ventas, configuración, respaldos, auditoría y PIN. La base operativa verificada contiene 48 órdenes, 47 pagos y 29 solicitudes de refacción. Todavía no contiene proveedores, cotizaciones de proveedor, solicitudes de precio, productos ni ventas.

El siguiente bloque pretende integrar proveedores con órdenes y refacciones, una banda de seguimiento, cancelaciones con devoluciones y, posteriormente, un sistema agentic que envíe e interprete mensajes de WhatsApp. La selección del proveedor y la autorización de compra seguirán siendo humanas.

## 3. Entorno y arquitectura actuales

### Ejecución

- Contenedor `salvacel-local`: ejecuta la aplicación.
- Proxy `salvacel-loopback`: publica únicamente `127.0.0.1:8787`.
- Volumen privado `salvacel-data`: conserva la base operativa en `.wrangler/state` dentro del contenedor.
- La carpeta `.wrangler/state` del código fuente consultada directamente está vacía y no es la base operativa. Antes de migrar se debe identificar explícitamente el volumen del contenedor.
- La aplicación no está expuesta a la red local ni a internet.

### Tecnología

- Next 16 con vinext y React 19.
- TypeScript para interfaz y lógica de aplicación.
- Cloudflare D1/SQLite con Wrangler/Miniflare, aun cuando todo funciona localmente.
- Una sola ruta de servidor para el taller.
- Migraciones SQL numeradas hasta `0013`.
- Playwright para pruebas de interfaz.

### Organización

- `app/page.tsx`: coordinación de navegación, datos, sesión y overlays.
- Módulos separados para Inicio, Resumen, Órdenes, Presupuestos, Cobros, Caja, Refacciones, POS, Proveedores, Datos, Configuración y Tickets.
- `db/schema.ts`: esquema declarado.
- `drizzle/`: migraciones.
- `scripts/verify-flow.mjs`: verificación funcional de servidor.
- `e2e/`: pruebas de navegador sobre una base temporal.

## 4. Funciones actuales

### Inicio y seguimiento

- Indicadores de equipos listos, entregas vencidas, refacciones pendientes, adeudos antiguos y stock bajo.
- Lista “Para hoy” con órdenes vencidas y listas para entregar.
- Acceso a llamadas o WhatsApp cuando existe un teléfono válido.

### Órdenes

- Alta y edición de cliente, equipo, problema, reparación, importes y datos técnicos.
- Nombre, apellido, marca, modelo, reparación y total son obligatorios para órdenes nuevas; teléfono opcional.
- Estados: nueva, en proceso, esperando refacción, lista para entregar, entregada y cancelada.
- Fecha prometida, técnico, IMEI, accesorios, condición física, garantía y código de desbloqueo.
- Código de desbloqueo oculto y protegido con reautenticación cuando el PIN está activo.
- Historial antiguo separado de las reglas estrictas para nuevas órdenes.

### Presupuestos

- Creación, edición, vigencia, impresión y envío manual por WhatsApp.
- Conversión de presupuesto en orden sin duplicarla.

### Cobros y Caja

- Anticipos y pagos por orden en MXN o USD.
- Métodos: efectivo, transferencia, tarjeta u otro.
- Cálculo de total cobrado y adeudo.
- Anulación de pagos operativos con motivo y bitácora.
- Caja diaria por moneda y método; excluye pagos anulados y liquidaciones históricas agregadas.
- Impresión de recibos y cierre de caja.

### Refacciones y proveedores

- Una orden puede tener una refacción requerida con estado, costo interno, proveedor, calidad y nota.
- Estados actuales de refacción: por verificar, solicitada, disponible y no disponible.
- Directorio de proveedores con nombre, teléfono, notas y activo/inactivo.
- Registro de precios de piezas, disponibilidad, calidad, garantía y precio ofrecido al cliente.
- Solicitudes de precio manuales existentes, todavía sin relación completa por proveedor.

### Punto de venta e inventario

- Catálogo de productos, SKU, precio, costo, stock y margen.
- Ventas con descuento, cambio y ticket.
- Ajustes de inventario y movimientos de stock.
- Anulación total de venta con restauración de existencias.

### Resumen financiero

- Total registrado, cobrado, adeudo, costos de refacción conocidos y resultado aproximado.
- Separación por moneda y movimiento mensual.
- Los costos desconocidos no se convierten en cero.
- El resultado aproximado no equivale a utilidad contable completa.

### Configuración y seguridad

- Datos del negocio, logotipo, prefijos, papel térmico, importes, moneda y tipo de cambio.
- Catálogos de marcas, servicios y métodos de pago.
- Plantillas de WhatsApp.
- Exportación, restauración y respaldo local.
- PIN opcional de 4 a 6 dígitos, hash PBKDF2, sesión HttpOnly, inactividad, bloqueo por intentos y reautenticación sensible.
- Bitácora para anulaciones y otras operaciones sensibles.

## 5. Estado técnico comprobado

- Base operativa: 48 órdenes, 47 pagos y 29 solicitudes de refacción.
- Proveedores, cotizaciones, solicitudes de precio, productos y ventas: cero registros actuales.
- Compilación: correcta.
- Lint: cero errores y ocho advertencias menores.
- Pruebas de navegador: cinco de cinco correctas sobre una base aislada.
- La base operativa no fue modificada por esas pruebas.

Advertencias conocidas:

- El README afirma que una hoja de 46 órdenes no fue importada, pero la aplicación operativa contiene 48 órdenes. La documentación debe corregirse.
- Las cinco pruebas actuales pasan, pero no representan exactamente los cinco recorridos exigidos por el plan original de la fase 10.
- Hay advertencias de dependencias de React, uso de imágenes y limpieza de referencias; no bloquean la compilación, pero deben revisarse.

## 6. Limitaciones actuales relevantes

- El estado `cancelada` existe, pero el flujo visible no solicita correctamente el motivo al usar el selector general.
- No existe un historial financiero de devoluciones; anular un pago corrige una captura, pero no representa dinero devuelto al cliente.
- Caja no registra egresos por devolución.
- Una orden cancelada todavía requiere reglas más estrictas para bloquear cobros y cerrar solicitudes pendientes.
- El directorio de proveedores no aparece en el formulario de orden como selección múltiple.
- Las solicitudes de precio no representan de forma completa una solicitud por proveedor.
- No existe una banda superior compartida de prioridades.
- No existe integración de WhatsApp ni agente que interprete respuestas.
- No existe gestión de usuarios por correo.

## 7. Integración planificada

### Proveedores dentro de la orden

- Registrar proveedores una sola vez en el directorio.
- Desde una orden con refacción, seleccionar uno o varios proveedores para pedir precio.
- Seleccionar proveedor significa solicitar cotización, no autorizar compra.
- Crear una solicitud independiente por proveedor, sin duplicados pendientes.
- Registrar respuesta con precio, moneda, disponibilidad, calidad, garantía, entrega, nota y fecha.
- Mostrar todas las respuestas de forma neutral.
- El sistema no asignará puntos, prioridad ni recomendación a proveedores.
- La persona operadora elegirá manualmente a quién comprar.
- Al elegir, la refacción pasa a solicitada y las demás ofertas permanecen como historial.

### Ventana de cotización

- El plazo comienza cuando se envían las solicitudes, no cuando se crea la orden.
- Habrá modos normal, urgente y decisión inmediata.
- La banda mostrará respuestas recibidas, pendientes y tiempo restante.
- Puede enviarse un solo recordatorio.
- La persona puede pulsar “Decidir ahora” sin esperar al vencimiento.
- Una respuesta tardía se incorpora únicamente si la compra sigue abierta.
- Si ya se compró, la cotización tardía se archiva y se envía un cierre cortés una sola vez.

Los tiempos propuestos —dos horas normal, treinta minutos urgente y diez minutos inmediato— todavía requieren aprobación explícita.

### Banda superior

- Mostrar órdenes activas y abrirlas desde la tarjeta.
- Ordenar vencidas primero, luego fecha prometida más cercana y finalmente antigüedad.
- Rojo: vencida.
- Amarillo: vence hoy, dentro de 24 horas o tiene refacción bloqueada.
- Verde: dentro de tiempo y sin bloqueo.
- Neutro: sin fecha prometida.
- Incluir estado de orden, fecha, refacción y conteo de proveedores: consultados, respondidos y pendientes.
- Movimiento manual y accesible; sin desplazamiento automático.

### Cancelaciones y devoluciones

- Botón específico para cancelar, separado del selector normal de estado.
- Motivo, categoría, importe, método y fecha.
- Devolución cero, parcial o total; posibilidad de varias devoluciones.
- Conservar cobros originales y registrar cada devolución como egreso.
- Bloquear devoluciones que superen lo efectivamente cobrado.
- Bloquear nuevos pagos a una orden cancelada.
- Cerrar solicitudes de precio pendientes y conservar respuestas recibidas.
- Reautenticación con PIN cuando esté activo.
- Ticket, Caja, resumen y auditoría consistentes.

### Sistema agentic y WhatsApp

El agente tendrá como responsabilidad interpretar conversaciones, no decidir compras.

Flujo previsto:

1. La persona selecciona proveedores registrados.
2. El sistema envía una solicitud con referencia interna, equipo y pieza; nunca datos sensibles del cliente.
3. Cada mensaje queda vinculado a proveedor, orden, refacción y solicitud.
4. El agente acepta mensajes solo de números registrados como proveedores.
5. Recupera el contexto y extrae disponibilidad, precio, moneda, calidad, garantía y entrega.
6. Si falta un dato, pregunta solo ese dato.
7. Si hay varias solicitudes abiertas o la respuesta es ambigua, no modifica la orden y solicita aclaración o revisión humana.
8. Registra una respuesta estructurada y actualiza la banda.
9. La persona elige manualmente al proveedor.
10. El agente envía la confirmación al proveedor elegido.
11. Si un proveedor no elegido responde tarde, guarda el dato, agradece una sola vez y cierra la conversación sin revelar competidores ni precios.
12. Si el proveedor elegido cambia precio, disponibilidad o fecha, crea una alerta crítica y espera decisión humana.

Límites:

- Nunca elegir proveedor ni comprar automáticamente.
- Nunca responder conversaciones de clientes u otros números.
- Nunca compartir nombre, teléfono, IMEI o código de desbloqueo del cliente.
- Nunca inventar un precio o disponibilidad.
- La base local es la fuente canónica; OpenClaw será un runtime reemplazable detrás de una integración.
- En el piloto, cada envío con efecto requiere confirmación humana y auditoría.

## 8. Decisiones pendientes

1. Aprobar tiempos de ventana normal, urgente e inmediata.
2. Definir horario permitido para mensajes y días de operación.
3. Fijar el momento exacto del recordatorio.
4. Aprobar los textos de solicitud, aclaración, recordatorio, confirmación, cierre e incidencia.
5. Definir qué nivel de ambigüedad obliga a revisión humana.
6. Elegir la conexión autorizada de WhatsApp y revisar sus permisos, webhooks, costos y límites.
7. Confirmar si una devolución puede usar un método distinto al cobro original.
8. Confirmar formalmente si se permiten varias devoluciones sobre la misma orden.
9. Decidir si una garantía que falla se maneja como cancelación o como retrabajo separado.
10. Mantener fuera o incorporar después devoluciones parciales de ventas de accesorios.
11. Diseñar en otra fase cuentas de usuario mediante correo.

## 9. Orden sugerido de implementación

1. Línea base, respaldo y verificación de la base operativa.
2. Consolidar directorio de proveedores.
3. Relacionar solicitudes de precio con proveedores.
4. Operaciones de servidor y auditoría del flujo manual.
5. Selección múltiple en la orden.
6. Registro neutral de respuestas y elección humana.
7. Motor común de atención y banda superior.
8. Cancelaciones y devoluciones.
9. Caja, resumen, tickets y auditoría.
10. Pruebas integrales y documentación.
11. Solo después, integración de WhatsApp y OpenClaw.

La especificación detallada por fases está en `docs/plan-ejecucion-proveedores-seguimiento-y-devoluciones.md`.

## 10. Preguntas para los agentes revisores

### Comprensión del negocio

- ¿Está clara la diferencia entre solicitar precio, elegir proveedor y autorizar compra?
- ¿Existe algún estado real del taller que no esté representado?
- ¿La banda informa sin saturar ni ocultar por qué una orden es urgente?
- ¿Las reglas de oferta tardía y proveedor elegido cubren los casos cotidianos?
- ¿Cancelación, garantía y retrabajo deberían ser flujos distintos?

### Datos y migraciones

- ¿Cuál es la base canónica exacta antes de ejecutar la migración?
- ¿La migración conserva filas antiguas aunque carezcan de proveedor?
- ¿Existe respaldo probado y una restauración ensayada?
- ¿Hay una sola fuente de verdad para proveedor, solicitud, cotización y compra elegida?
- ¿Se evita crear dos solicitudes pendientes para la misma pieza y proveedor?
- ¿Las monedas e importes se guardan en centavos sin conversiones silenciosas?

### Servidor y concurrencia

- ¿Cada operación que crea datos tiene clave idempotente?
- ¿Dos respuestas simultáneas pueden duplicar una cotización?
- ¿Una devolución concurrente puede superar lo cobrado?
- ¿La operación completa es atómica o puede dejar datos a medias?
- ¿El servidor valida todas las reglas aunque se llame directamente sin la interfaz?
- ¿Los errores permiten al usuario corregir sin perder lo capturado?

### Interfaz

- ¿Se puede completar el flujo con teclado y lector de pantalla?
- ¿Los colores tienen también texto y no son la única señal?
- ¿La selección múltiple distingue claramente cotizar de comprar?
- ¿La vista móvil sigue siendo utilizable con la banda abierta?
- ¿Existen estados de carga, vacío, error, conflicto y éxito?

### Dinero

- ¿Anulación y devolución tienen significados distintos en código y pantalla?
- ¿Caja conserva el ingreso original y registra el egreso el día correcto?
- ¿Cobrado bruto, devuelto y neto coinciden en detalle, Caja y resumen?
- ¿Una orden cancelada desaparece de adeudos operativos sin borrar su historia?
- ¿El ticket de devolución muestra lo suficiente sin exponer datos sensibles?

### Agente y WhatsApp

- ¿Cada mensaje entrante se puede correlacionar inequívocamente con una solicitud?
- ¿Qué sucede si un proveedor tiene varias solicitudes abiertas y responde “sí hay” sin más datos?
- ¿El número está normalizado y autorizado antes de permitir al agente responder?
- ¿Los webhooks verifican autenticidad y evitan mensajes repetidos?
- ¿Hay límites de reintentos, tiempos, horarios y volumen?
- ¿El agente se abstiene cuando no tiene suficiente contexto?
- ¿Toda mutación se confirma después en la base canónica?
- ¿Existe una pausa inmediata para detener mensajes automáticos?
- ¿Las trazas evitan datos personales y secretos?
- ¿La selección y compra continúan fuera de la autonomía del agente?

### Pruebas y entrega

- ¿Cada regla nueva tiene una prueba positiva, una negativa y una de repetición?
- ¿Las pruebas usan una base temporal y dejan intacta la base operativa?
- ¿Se probaron respuestas tardías, ambiguas, duplicadas y fuera de horario?
- ¿Se probaron fallos del proveedor elegido después de la confirmación?
- ¿Se probaron cancelación sin devolución, parcial, múltiple y total?
- ¿El README refleja el estado real y las migraciones nuevas?
- ¿Existe un procedimiento de reversión antes de activar el cambio?

## 11. Formato solicitado para recomendaciones

Cada revisor debe devolver sus observaciones clasificadas como:

- **Crítica:** riesgo de pérdida de datos, dinero, privacidad, seguridad o inconsistencia.
- **Necesaria:** falta para cumplir el flujo acordado.
- **Recomendada:** mejora claridad, mantenibilidad o experiencia sin bloquear.
- **Futura:** útil, pero fuera del alcance aprobado.

Para cada observación debe indicar: problema, escenario que lo demuestra, impacto, cambio sugerido y prueba que confirmaría la corrección. No debe implementar cambios mientras el plan siga en revisión.

