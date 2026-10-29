# ADR-0027: Apertura visible de registros desde el copiloto

**Estado:** Accepted  
**Fecha:** 2026-10-21

## Contexto

El copiloto ya puede consultar contexto operativo filtrado y proponer navegación o borradores, pero no puede llevar al operador desde una respuesta hasta el registro concreto que se encontró. Se busca reducir pasos sin permitir que OpenClaw elija IDs arbitrarios, acceda directamente a PostgreSQL o ejecute una mutación.

La documentación oficial de OpenClaw define el hook autenticado `/hooks/agent`, permite restringir los agentes destinatarios mediante `allowedAgentIds`, trata el contenido de entrada como no confiable y permite limitar herramientas por agente. El modo aislado crea una ejecución nueva; no significa que el registro temporal del Gateway se borre inmediatamente. [SÍNTESIS]

## Decisión

- El copiloto puede proponer abrir una orden por el folio configurado del taller (por ejemplo, `SC-000001`) o un perfil por referencia `CLI-000000`, además de las acciones actuales de navegación y borradores.
- Salvacel construye por turno la lista de registros que el operador puede ver y que aparecen en el contexto autorizado. El callback acepta únicamente referencias presentes en esa lista; el backend vuelve a comprobar permiso y pertenencia al conjunto permitido. Los folios de órdenes siguen siendo configurables y no se fija el prefijo `SC` en el contrato.
- React vuelve a resolver el registro contra los datos cargados bajo la sesión actual y lo abre en la interfaz existente. La acción no edita, guarda ni altera el registro.
- El contexto de cliente excluye teléfonos y notas de forma predeterminada; solo los incluye si el operador pregunta explícitamente por contacto o notas y su permiso lo permite.
- OpenClaw conserva una sola herramienta tipada de respuesta/callback en su allowlist por agente. No se añaden tools genéricas de datos, SQL, shell, navegador, pagos, compras, eliminaciones o cambios financieros.
- Se mantienen hook autenticado, `sessionMode: "isolated"`, `deliver: false`, idempotencia y timeout. El navegador no recibe credenciales de OpenClaw. La conversación del navegador sigue siendo efímera; la retención del registro temporal del runtime sigue gobernada por la política global de OpenClaw.

**Clasificación:** apertura de registro = capacidad de interfaz/R1/A2; resolución de folio = validación determinista del backend; interpretación de intención = agente single-agent acotado. Se conserva el camino menos agentic: el LLM propone una referencia y el backend decide si está permitida.

## Alternativas consideradas

### Permitir al modelo enviar cualquier ID de registro

Se descarta porque convertiría el callback en un canal para enumerar registros y evitaría el límite del contexto de ese turno.

### Dar herramientas de consulta directas al agente

Se descarta porque duplicaría autorización, expondría datos más amplios y acoplaría el dominio a OpenClaw. Salvacel sigue siendo la fuente canónica y filtra antes de invocar el runtime.

### Mantener solo navegación general

Se descarta porque obliga al operador a buscar de nuevo un registro ya identificado por el contexto.

## Consecuencias

### Positivas

- Reduce pasos para abrir órdenes y perfiles encontrados por el operador.
- Las referencias disponibles están limitadas a registros efectivamente incluidos en el contexto filtrado de ese turno.
- La UI permanece como autoridad visible; los formularios actuales conservan la escritura explícita.
- Se minimiza el envío rutinario de datos personales de clientes.

### Negativas

- Un registro que no entró al contexto del turno no puede abrirse desde la respuesta; el asistente debe pedir otra búsqueda o el operador puede usar la búsqueda normal.
- Cada nueva acción requiere mantener sincronizados el schema del plugin, el parser/allowlist del backend, el contrato frontend y sus pruebas.

### Neutrales

- Los folios son referencias de interfaz y no sustituyen los IDs internos ni se convierten en autoridad de autorización.
- No se añaden tablas ni migraciones.

## Evaluación y operación

- Probar referencias válidas, desconocidas, malformadas y no incluidas en el contexto; denegar permisos insuficientes.
- Probar el estado de la orden/perfil que React abre contra los datos cargados bajo el operador actual.
- Ejecutar lint, build, pruebas de flujo y E2E aplicables antes del despliegue local.
- Owner: Salvacel. Revisión: al habilitar voz, escritura agéntica u otro tipo de acción.

## Referencias

- OpenClaw, [Configuración de hooks](https://docs.openclaw.ai/gateway/config-hooks): autenticación, lista de agentes permitidos, payload no confiable, modo aislado y contrato del hook.
- OpenClaw, [Política de herramientas](https://docs.openclaw.ai/gateway/config-tools/tool-policy): restricciones allow/deny y políticas por agente.
- OpenClaw, [Sesiones y retención](https://docs.openclaw.ai/gateway/config-agents/sessions): scope, reset y mantenimiento/retención de sesiones.
- Relacionado: [ADR-0026](0026-chat-operativo-openclaw-en-salvacel.md).
