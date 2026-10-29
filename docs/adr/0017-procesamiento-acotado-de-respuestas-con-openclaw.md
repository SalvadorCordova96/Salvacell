# ADR-0017: Procesamiento acotado de respuestas con OpenClaw

**Estado:** Accepted  
**Fecha:** 2026-10-18

## Contexto

ADR-0016 define el ingreso autenticado e idempotente de mensajes y la bandeja de revisión, pero no iniciaba la interpretación automática. El taller necesita que Salvacel procese mensajes ya recibidos en segundo plano, entregue a OpenClaw contexto vigente y limitado, y muestre la propuesta en la bandeja sin asignar ni aprobar ofertas de forma automática.

## Decisión

- Salvacel ejecuta un trabajador Node.js acotado durante el ciclo de vida de la app. Reclama mensajes elegibles desde PostgreSQL con bloqueo de fila, limita los reintentos a tres y persiste el estado de procesamiento junto al evento durable.
- La interpretación es un paso LLM dentro de un workflow determinista. El trabajador vuelve a cargar candidatos vigentes del mismo proveedor y solicitud; no envía PII del cliente ni usa memoria del runtime como fuente de verdad.
- Salvacel invoca únicamente el endpoint de hooks de OpenClaw usando un token dedicado, distinto del token operador del Gateway. El hook solo admite el agente `salvacel-supplier-replies`, ejecutado en sesión aislada.
- Ese agente tiene únicamente la herramienta `salvacel_supplier_submit_proposal`. El plugin devuelve una propuesta al endpoint autenticado de Salvacel; no puede leer la base, usar shell/navegador/mensajería ni confirmar compras.
- El backend valida nuevamente la respuesta, conserva el original y deja la propuesta en la bandeja para confirmación humana. Oferta, asociación, compra y mensajes externos nunca se confirman automáticamente.
- Se usa una red Docker interna exclusiva para el enlace app↔Gateway. PostgreSQL permanece únicamente en la red interna de datos; OpenClaw no se conecta a ella y el Gateway no publica puertos al host.
- El worker queda inactivo si faltan secretos/URL/agentId. WhatsApp y cualquier canal de mensajería permanecen deshabilitados; en esta etapa solo se procesan mensajes que ya entraron mediante el contrato autenticado o pruebas simuladas.

## Alternativas consideradas

### Entregar a Salvacel el token operador del Gateway y llamar `/v1/responses`

Se descarta porque OpenClaw documenta ese endpoint como acceso operador completo y sus turnos usan la configuración/permisos generales del Gateway.

### Dar al Gateway acceso directo a PostgreSQL

Se descarta porque el runtime podría omitir validaciones, asociación, auditoría y revisión humana.

### Asociar siempre por la solicitud más reciente

Se descarta porque solicitudes simultáneas, mensajes parciales y respuestas tardías pueden cruzarse. La incertidumbre queda en revisión.

## Consecuencias

### Positivas

- La interpretación funciona en segundo plano y su estado es observable y respaldable.
- El modelo recibe solo el contexto operativo mínimo actual y cada propuesta conserva trazabilidad al mensaje original.
- Un plugin/tool y un webhook dedicados limitan el efecto de una ejecución comprometida.
- Las pruebas pueden usar proveedor y respuesta simulados sin invocar un modelo ni conectar WhatsApp.

### Negativas

- Se introduce una migración para estados/reintentos del worker y un plugin OpenClaw versionado contra su SDK.
- Los secretos locales requieren permisos de archivo seguros y deben montarse como Docker secrets en ambos servicios.
- El acoplamiento se produce solo si el modelo está autenticado, el hook/plugin pasan sus verificaciones y el usuario recibe respuestas por el endpoint habilitado; sin canal conectado, no hay ingreso real de WhatsApp.

## Evaluación y operación

- Riesgo/autonomía: interpretación R1/A1; el agente solo propone. La revisión y selección de oferta siguen siendo humanas.
- Límites: máximo tres intentos; timeout por ejecución; una sesión aislada por mensaje; idempotencia por ID del mensaje.
- Evals mínimos: dos calidades, precio/envío parcial, mensaje ambiguo con varias solicitudes, solicitud cerrada/tardía, mensaje sin oferta, prompt injection en el texto y duplicado de evento.
- Owner: Salvacel; revisión antes de activar cualquier canal externo o aumentar permisos.
