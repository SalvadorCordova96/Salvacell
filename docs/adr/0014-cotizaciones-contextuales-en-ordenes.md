# ADR-0014: Cotizaciones contextuales en órdenes

**Estado:** Accepted  
**Fecha:** 2026-10-16

## Contexto

El taller necesita iniciar solicitudes de refacción desde la reparación que las requiere, comparar respuestas de proveedores sin navegar fuera de la orden y conservar los datos útiles para el historial. Las respuestas pueden llegar en lenguaje coloquial y en varios mensajes; no conviene obligar al agente a convertir cada detalle a un esquema rígido ni perder el texto original.

## Decisión

- Cada solicitud de refacción se relaciona con la reparación correspondiente dentro de la orden. Desde ahí, la persona selecciona proveedores individuales y usa la acción “Solicitar refacción” para iniciar el envío de la plantilla configurada.
- La banda existente se conserva como capa operativa. Sus tarjetas muestran órdenes activas con cliente, marca/modelo, tipo de reparación y estado; órdenes entregadas o canceladas dejan de aparecer. Seleccionar una tarjeta abre un modal con los datos completos de la orden y las solicitudes/cotizaciones relacionadas.
- Las respuestas del proveedor conservan el mensaje original y pueden incluir un resumen técnico en texto libre. Cada oferta mantiene por separado, como mínimo, el proveedor, el precio exacto y la fecha de solicitud; también se registran tipo/calidad y tiempo de envío para comparar las alternativas solicitadas. El agente no inventa datos no mencionados.
- Las variantes de calidad (por ejemplo, genérica y original) se presentan como ofertas separadas. Mensajes sucesivos pueden completar o agregar ofertas a la solicitud; cada mensaje reinicia una ventana global de silencio configurable en Configuraciones. Al vencer después de recibir al menos un mensaje, el grupo se marca como “respuesta completa por ahora”, sin asumir que nunca llegarán más opciones. Veinte minutos es un valor inicial sugerido, aún no confirmado.
- Si no llega ningún mensaje, la solicitud permanece pendiente hasta que la persona la cierre o cancele; no vence automáticamente. La persona puede cancelar la consulta de un proveedor o cerrar la ronda de cotización sin cancelar la reparación. Una respuesta explícita de indisponibilidad se registra como tal, no se infiere del silencio.
- Si llega una respuesta después del cierre de la ronda, se conserva como tardía y no modifica automáticamente ofertas elegidas. Si la orden sigue activa, queda disponible para revisión manual. Al cancelar la orden, sus solicitudes pendientes se cierran; respuestas posteriores quedan solo en historial y no reabren la orden, generan compra ni envían confirmaciones.
- Las cotizaciones se presentan sin ordenamiento ni recomendación automática. La elección explícita de la persona es la aprobación para enviar la confirmación al proveedor elegido y agradecer a los demás consultados. No se compra ni se acepta una oferta sin esa elección.
- Este ADR registra el diseño; no conecta WhatsApp ni autoriza todavía enviar mensajes reales. La autenticación, canal, permisos, textos finales, reintentos y pruebas se definen antes de habilitar la integración.

## Alternativas consideradas

### Mantener todo el flujo fuera de la orden

Se descarta porque obliga a navegar entre áreas y hace más difícil asociar una cotización con la reparación y refacción correctas.

### Forzar toda respuesta a un esquema rígido

Se descarta porque el proveedor puede responder en lenguaje natural y con varias alternativas o varios mensajes. Se conserva el original, con solo los datos esenciales normalizados por separado.

### Que el agente elija automáticamente al proveedor

Se descarta porque la persona responsable compara las ofertas y elige; el agente no recomienda ni decide compras.

## Consecuencias

### Positivas

- La solicitud, sus ofertas y la reparación quedan relacionadas para consulta posterior.
- La tarjeta resume lo prioritario y el modal concentra el detalle sin reemplazar la lista de órdenes.
- El mensaje original queda disponible para comprobar el resumen técnico del agente.

### Negativas

- La orden y la interfaz requieren asociar solicitudes y ofertas a una reparación, además de conservar el texto de origen.
- Se deberán representar estados distintos para respuesta parcial, grupo completo por ahora, ambigua, tardía, sin respuesta, sin disponibilidad y cancelada.

### Neutrales

- El valor definitivo de la ventana de silencio, las etiquetas visibles, los campos configurables y los textos de las plantillas se mantienen en `planning.md` hasta definirlos.

## Relaciones

- Supersedes:
- Superseded by:
- Related: ADR-0006, ADR-0013
