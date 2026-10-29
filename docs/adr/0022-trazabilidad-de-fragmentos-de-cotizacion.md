# ADR-0022: Trazabilidad de fragmentos de respuestas de proveedor

**Estado:** Aceptada  
**Fecha:** 2026-10-20

## Contexto

Los proveedores pueden dividir una cotización en varios mensajes. La ventana global de silencio ya se puede ajustar en Configuraciones y los eventos entrantes se guardan por separado, pero el worker solo entregaba al agente el mensaje actual. Un precio en un mensaje y el envío/calidad en otro podían quedar interpretados por separado, o perder el vínculo visible entre sus fuentes. También se debe evitar mezclar dos cotizaciones simultáneas del mismo proveedor.

## Decisión

- Por ejecución, Salvacel puede recuperar hasta cinco mensajes recientes de la misma conversación y proveedor dentro de la ventana global configurada. Solo entrega los que comparten candidatas guardadas con las solicitudes vigentes del mensaje actual.
- Cada evento sigue siendo durable e idempotente por separado. El contexto reciente es evidencia temporal, no memoria autoritativa ni una señal suficiente para asociar una solicitud.
- Una propuesta puede referenciar hasta cinco mensajes previos mediante `sourceMessageIds`. El backend vuelve a validar proveedor, conversación, tiempo, estado y asociación común; no confía en la selección del agente.
- Si existen varias solicitudes plausibles, la propuesta conserva el estado ambiguo y no preselecciona una, aun si el agente sugiere una.
- Al confirmar manualmente una propuesta agrupada, Salvacel conserva los textos originales y marcas de tiempo en la respuesta, enlaza y audita los eventos fuente, y mantiene intactas las propuestas/ofertas anteriores.
- Si la solicitud deja de estar activa antes de guardar la propuesta, el evento pasa a tardío en el historial y no genera una propuesta aceptable.
- OpenClaw sigue restringido a una herramienta de propuesta, sesión aislada y sin acceso a base de datos, shell, navegador, mensajería ni aprobación de compra.

## Alternativas consideradas

### Confiar en memoria conversacional o en el mensaje más reciente

Se descarta porque no representa el estado actual de Salvacel y puede cruzar respuestas de solicitudes simultáneas.

### Reemplazar automáticamente una oferta anterior con datos del fragmento nuevo

Se descarta porque borraría trazabilidad y podría convertir una inferencia del agente en una decisión comercial. La persona revisa el conjunto y confirma lo que debe guardarse.

## Consecuencias

- No requiere migración de esquema: las fuentes permanecen en la bandeja existente y sus IDs se guardan en la propuesta JSON.
- La interfaz debe mostrar los fragmentos que sustentan la propuesta antes de confirmarla.
- Un mensaje ambiguo o que ya salió de su ventana queda sin asignar o requiere revisión; la seguridad prima sobre la automatización.
- Las pruebas deben usar proveedores, conversaciones, mensajes y solicitudes sintéticas.

## Relaciones

- Related: ADR-0014, ADR-0016, ADR-0017.
