# ADR-0026: Chat operativo de OpenClaw dentro de Salvacel

**Estado:** Accepted  
**Fecha:** 2026-10-21

## Contexto

El operador necesita consultar la actividad de Salvacel y preparar altas desde una interfaz conversacional, sin otorgar al modelo acceso directo a la base de datos ni permitir escrituras invisibles. El historial conversacional de la interfaz no debe sobrevivir una recarga o cierre de sesión. La solución debe respetar la autenticación individual y los permisos que ya aplica Salvacel.

OpenClaw documenta `/hooks/agent` como punto de entrada autenticado para ejecuciones, y `sessionMode: "isolated"` como una sesión de ejecución nueva. `waitForCompletion` entrega estado terminal/disposición, no el texto del modelo; por ello Salvacel usa una herramienta/plugin restringida como callback autenticado para recibir la respuesta estructurada. El endpoint de Chat Completions no se usa porque emplea la autorización del Gateway, que no debe exponerse al navegador. El agente limita herramientas mediante su allowlist específica.

## Decisión

- La UI mantiene una conversación en memoria del navegador y la descarta al recargar, cerrar sesión o iniciar una conversación nueva. El backend no persiste los turnos.
- Cada mensaje crea un turno temporal en memoria del backend asociado al usuario y sus permisos actuales. Salvacel obtiene los datos por sus APIs autorizadas, filtra el contexto y envía solo los campos pertinentes al agente.
- Salvacel llama al hook `/hooks/agent` con un token dedicado, `sessionMode: "isolated"`, `deliver: false`, clave idempotente y límite de tiempo. La URL permitida es la red privada de Docker; no se entrega al cliente web ningún secreto de OpenClaw.
- El workspace del agente de chat vive en `/tmp` del contenedor Gateway, montado como tmpfs, y se inicializa al arrancar copiando solo sus instrucciones aprobadas. La raíz de la imagen continúa en modo solo lectura; no se crea almacenamiento persistente para el chat.
- El nuevo agente OpenClaw `salvacel-operator-chat` tiene una sola herramienta permitida: `salvacel_operator_chat_reply`. Esta herramienta devuelve una respuesta y, opcionalmente, una acción tipada hacia el callback privado de Salvacel. El agente no tiene acceso SQL, shell, navegador, mensajería, pagos, compras ni borrados.
- El callback independiente valida secreto, turno pendiente, actor y permisos antes de aceptar la respuesta o acción. Las acciones posibles son navegar a un módulo o abrir un borrador visible de orden/recepción, cliente o producto. El backend ya valida y registra los cambios solo al enviar explícitamente el formulario existente; la escritura queda atribuida al usuario autenticado.
- Los datos y mensajes son contenido no confiable. El modelo no puede elevar permisos, y ante ambigüedad, falta de contexto, permisos o timeout se pide aclaración o se informa el fallo; nunca se declara guardado sin confirmación del backend.
- La aplicación no guarda memoria conversacional entre sesiones. OpenClaw crea sesiones aisladas por turno; sus registros temporales quedan sujetos a `session.maintenance` de OpenClaw (retención por defecto documentada de 30 días). No se altera la política global de retención de otros agentes.
- El conocimiento aprobado vive en instrucciones versionadas del agente; los hechos operativos se vuelven a consultar desde Salvacel. Los eventos episódicos se limitan a resúmenes auditados y trazables, sin copiar conversaciones ni PII.
- Voz, transcripción, WhatsApp y acciones financieras quedan fuera de esta versión.

## Alternativas consideradas

### Dar al navegador el token del Gateway o usar `/v1/chat/completions`

Se descarta: el navegador no debe poseer credenciales OpenClaw y el API de chat usa privilegios del Gateway. Además, `/hooks/agent` no devuelve contenido del modelo en su respuesta terminal.

### Permitir a OpenClaw consultar PostgreSQL directamente

Se descarta: el agente podría evitar permisos, validaciones de dominio, atribución y auditoría de Salvacel.

### Dejar que el agente automatice el DOM o guarde automáticamente

Se descarta: las acciones son contratos tipados entregados a React; los formularios existentes y su botón de guardar permanecen como autoridad de escritura.

## Consecuencias

### Positivas

- Cada turno usa contexto y permisos vigentes, aislados por operador.
- El agente puede responder y preparar trabajo visible, pero no confirmar cambios ni actos financieros.
- UI, historial y fallos no se hacen pasar por operaciones completadas.
- La integración es probada con un OpenClaw HTTP simulado y PostgreSQL temporal, sin WhatsApp ni llamadas externas reales.

### Negativas

- El runtime OpenClaw conserva temporalmente los registros de sesiones según su retención global por defecto; la sesión aislada no equivale a borrado inmediato del transcript.
- La primera versión limita las consultas a los conjuntos de datos que la API de taller expone y filtra explícitamente; consultas analíticas complejas requerirán herramientas read-only adicionales.

## Referencias

- OpenClaw, [Hooks de Gateway](https://docs.openclaw.ai/gateway/config-hooks): ejecución aislada, autenticación, espera de estado terminal y contrato de respuesta.
- OpenClaw, [Política de herramientas](https://docs.openclaw.ai/gateway/config-tools/tool-policy): allowlist por agente/plugin.
- OpenClaw, [Sesiones y retención](https://docs.openclaw.ai/gateway/config-agents/sessions): limpieza del almacén y retención predeterminada de 30 días.
- OpenClaw, [API OpenAI-compatible de Chat Completions](https://docs.openclaw.ai/gateway/openai-http-api): autenticación del Gateway y uso del endpoint.
