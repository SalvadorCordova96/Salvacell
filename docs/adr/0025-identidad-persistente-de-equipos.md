# ADR-0025: identidad persistente de equipos

- Estado: aceptada
- Fecha: 2026-10-21
- Complementa: ADR-0006

## Contexto

El formulario permitía elegir una orden anterior del mismo cliente y copiar sus
datos físicos, pero descartaba esa elección al guardar. Por eso la siguiente
visita quedaba sin una relación durable con el aparato y el historial no podía
mostrar con certeza que era el mismo equipo. La marca y el modelo no bastan para
identificar un aparato: un cliente puede tener dos equipos iguales.

## Decisión

- Cada aparato tiene una identidad persistente en `customer_devices`, vinculada
  al perfil del cliente cuando existe.
- `orders.device_id` enlaza una orden/visita con esa identidad. Cada visita
  conserva una orden y un folio nuevos, con estado, cobros y garantía propios.
- Solo se reutiliza una identidad cuando el operador elige explícitamente un
  equipo anterior del cliente. Escribir una marca/modelo igual, incluso sin
  IMEI o serie, crea un equipo diferente.
- La API verifica que la identidad elegida pertenezca al cliente enviado; el
  frontend no es autoridad para crear el vínculo.
- Las órdenes existentes reciben una identidad individual por orden. No se
  fusionan por marca, modelo, IMEI ni coincidencias aproximadas. Los datos
  físicos en cada orden permanecen como captura histórica de esa visita.
- La migración es aditiva y los respaldos incluyen la tabla nueva. La
  restauración de respaldos anteriores crea identidades separadas por orden
  cuando no existe esa información.

## Consecuencias

- El perfil del cliente puede mostrar un historial confiable de visitas por
  aparato sin combinar equipos iguales.
- El alta rápida y la recepción ramificada mantienen su comportamiento de
  órdenes independientes.
- Equipos históricos ambiguos quedan deliberadamente separados; cualquier
  unión futura tendrá que ser una acción explícita.
- La migración, restauración compatible y validación de propiedad deben
  mantenerse cubiertas por pruebas. La migración `0011_customer_devices.sql`
  se aplicó al volumen local después de crear un respaldo; el build y los flujos
  se verificaron en un entorno temporal aislado antes del despliegue.
