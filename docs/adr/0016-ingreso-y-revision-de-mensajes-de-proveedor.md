# ADR-0016: Ingreso y revisión de mensajes de proveedor

**Estado:** Accepted  
**Fecha:** 2026-10-17

## Contexto

Las cotizaciones pueden recibir mensajes fragmentados, tardíos o simultáneos para distintas órdenes. El texto del proveedor puede ser coloquial y no siempre identifica por sí solo la solicitud. La asociación equivocada puede contaminar el historial de una reparación. El runtime agéntico se ejecuta separado y no debe obtener acceso a PostgreSQL ni convertir una interpretación en una compra.

## Decisión

- Cada participación de proveedor en una solicitud tiene una referencia de correlación opaca y única. El backend la ofrece al agente para incluirla en futuras consultas; una coincidencia exacta ayuda a localizar la solicitud, pero nunca confirma por sí sola una oferta.
- Salvacel expone un endpoint agéntico independiente, deshabilitado si no hay un secreto compartido de al menos 32 caracteres. El secreto llega por `Authorization: Bearer` y se compara en tiempo constante. No se activa ni conecta un canal de WhatsApp con esta decisión.
- El endpoint registra cada mensaje con idempotencia por canal e ID externo, fecha, texto original, huellas HMAC del remitente/conversación y últimos cuatro dígitos del remitente. No persiste el número completo ni usa un hash simple vulnerable a búsqueda por diccionario.
- El contexto entregado al runtime se limita al proveedor reconocido y a solicitudes candidatas abiertas de ese proveedor: referencia, pieza, marca/modelo, reparación u orden y estado. No incluye nombre, teléfono ni otros datos del cliente. Un mensaje explícito que solo apunte a una solicitud cerrada se conserva como tardío.
- El texto entrante se trata como contenido no confiable. OpenClaw puede proponer resumen, variantes y campos estructurados, pero no escribir respuestas, elegir una asociación ni actualizar estados por sí mismo.
- Si falta referencia exacta, hay varias solicitudes candidatas o el proveedor no se reconoce, el mensaje queda en bandeja de revisión. La persona elige la asociación y confirma los campos antes de guardarlos como respuestas. Salvacel vuelve a validar proveedor, estado de solicitud y estado del equipo al confirmar.
- Una respuesta tardía, cancelada o sin asociación no reactiva solicitudes. La selección de proveedor/oferta sigue siendo una acción humana independiente; este flujo no envía mensajes ni confirma compras.
- El mensaje original, su propuesta y las ofertas confirmadas quedan en el respaldo de Salvacel. Las respuestas manuales actuales siguen funcionando sin configurar el endpoint.

## Alternativas consideradas

### Dar al agente acceso de lectura/escritura a PostgreSQL

Se descarta porque permitiría omitir validaciones, mezclar datos entre solicitudes y ejecutar cambios fuera del registro de auditoría de Salvacel.

### Asociar por la solicitud más reciente o por coincidencia de texto

Se descarta porque solicitudes simultáneas, respuestas por partes y textos ambiguos pueden producir asignaciones incorrectas.

### Requerir que el proveedor responda una plantilla rígida

Se descarta porque no controla cómo responde el proveedor. Salvacel conserva el texto original y deja la interpretación bajo revisión humana.

## Consecuencias

### Positivas

- Las respuestas cruzadas tienen referencia explícita, una bandeja durable y una ruta segura para ambigüedades.
- Hay idempotencia para reintentos y evidencia original para auditoría.
- Se limita la información operativa expuesta al agente y PostgreSQL permanece detrás del backend.
- La aplicación puede probarse con mensajes simulados sin WhatsApp ni credenciales de IA.

### Negativas

- Se añade una migración PostgreSQL y la instancia local persistente deberá migrarse antes de usar la nueva bandeja.
- Hace falta configurar el secreto en ambos servicios y conectarlos por una red privada antes de habilitar el endpoint para OpenClaw.
- Las respuestas ambiguas requieren intervención humana; el flujo prioriza evitar asociaciones erróneas sobre automatizar por completo.

## Relaciones

- Related: ADR-0013, ADR-0014, ADR-0015.
