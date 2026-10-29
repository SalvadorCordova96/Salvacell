# ADR-0013: Servicio agéntico integrado con Salvacel

**Estado:** Accepted  
**Fecha:** 2026-10-16

## Contexto

El usuario aclaró que OpenClaw debe ayudar a operar Salvacel desde la aplicación que ya usa el taller, no como una aplicación de trabajo independiente. Al mismo tiempo, pidió desarrollar el módulo en una carpeta separada y prever un contenedor propio. La primera capacidad es el flujo de cotización de refacciones por WhatsApp; la gestión de conversaciones con clientes queda para una etapa posterior.

## Decisión

- El desarrollo del servicio agéntico vive en `Salvacel-OpenClaw/`, fuera del árbol del código de la app, mientras que sus funciones se presentan y controlan desde la interfaz existente de Salvacel.
- Se prevé ejecutar OpenClaw en un servicio/contenedor propio. Se integrará con Salvacel por un contrato explícito con el backend; no accederá directamente a PostgreSQL.
- El primer flujo planeado parte de una orden: la persona elige uno o más proveedores; las solicitudes y respuestas se enlazan con la refacción/orden; el agente interpreta respuestas y las presenta como cotizaciones estructuradas en el contexto de la orden y su banda.
- Las cotizaciones se presentan sin recomendación ni selección automática. La persona compara y elige; solo después de esa elección explícita el servicio puede confirmar el pedido con el proveedor.
- Mensajes ambiguos, tardíos o incompatibles con solicitudes abiertas requieren revisión humana y no deben producir datos inventados ni acciones de compra.
- La centralización de mensajes de clientes queda fuera de la primera capacidad y se diseñará como ampliación aparte.
- Este ADR fija límites y dirección, no autoriza todavía conectar WhatsApp, enviar mensajes ni habilitar el runtime. Esos pasos requieren definir el contrato, permisos, secretos y pruebas.

## Alternativas consideradas

### Agente como aplicación independiente sin integración con la UI

Se descarta porque el usuario necesita gestionar solicitudes, ofertas y respuestas desde la aplicación existente de Salvacel.

### Ejecutar el runtime dentro del mismo proceso de la app

Se descarta como dirección inicial porque el módulo debe poder desarrollarse y desplegarse en un contenedor propio, conservando un límite reemplazable.

### Conexión directa del agente a PostgreSQL

Se descarta porque el backend debe conservar las reglas, autorización y persistencia del taller; el agente se integra a través de su contrato.

## Consecuencias

- La UI de Salvacel necesitará un contexto de cotizaciones por orden y una forma de revisar ofertas y elegir una.
- El backend requerirá operaciones explícitas para recibir eventos/cotizaciones autorizados, aplicar validaciones y registrar auditoría.
- Antes de implementar el flujo real se deben especificar correlación de mensajes, autorización del envío, autenticación de servicio, secreto de WhatsApp, fallos, deduplicación y pruebas con adaptadores simulados.
- OpenClaw queda encapsulado como runtime; las reglas de negocio y decisiones financieras permanecen en Salvacel.
