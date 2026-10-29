# ADR-0009: Asistente de voz modular con Gemini Live

**Estado:** Accepted  
**Fecha:** 2026-10-16

## Contexto

Salvacel necesita probar captura de recepción por voz y mostrar en pantalla cómo se completa el formulario. Se desea empezar con Gemini y conservar la posibilidad de cambiar de proveedor o conectar OpenClaw después, sin acoplar las reglas del taller a un modelo concreto. La recepción ya tiene un modelo de cliente, equipos como órdenes independientes y reparaciones repetibles.

## Decisión

La capacidad se implementará como un módulo propio de voz, separado de los módulos de recepción y configuración, con una interfaz interna pequeña y un adaptador Gemini Live inicial. Las capacidades disponibles para el modelo se definen y autorizan en Salvacel; la configuración de voz o instrucciones no puede añadir herramientas ni permisos.

En su primera entrega, el módulo podrá asistir únicamente con la recepción de órdenes. Las llamadas de función trabajarán sobre el borrador controlado de recepción mediante callbacks/estado de la aplicación. La aplicación valida cada argumento y transición y muestra el resultado en el formulario. Gemini no manipula el DOM, no accede directamente a la base de datos y no confirma por sí mismo el guardado, la impresión, compras, pagos o cambios en órdenes persistidas.

La clave permanente se mantiene como secreto local del servidor. Para la sesión de audio en navegador se emitirá una credencial efímera restringida. Las pruebas automatizadas sustituyen el adaptador Gemini por uno falso y usan datos temporales.

Las acciones exactas de V1, el momento de apertura del formulario, la política de confirmación para guardar/imprimir, y la persistencia de preferencias quedan deliberadamente como detalles de producto pendientes en `planning.md`; no cambian esta decisión de separación y autoridad.

## Alternativas consideradas

### Acoplar llamadas Gemini directamente a la recepción

Se descarta porque mezcla el ciclo de sesión/audio con las reglas y el estado de un formulario existente, dificulta las pruebas sin red y hace costoso sustituir el proveedor.

### Dar al modelo acceso directo a la API de órdenes o a la base

Se descarta porque permitiría mutaciones sin la validación visual y de dominio existente, y convertiría instrucciones conversacionales en autoridad de persistencia.

### Implementar ahora el runtime de OpenClaw o automatización de WhatsApp

Se descarta para esta etapa: el alcance solicitado empieza con Gemini Live para llenar recepciones. La futura automatización de proveedores es otra capacidad y no debe quedar implícita en este módulo.

## Consecuencias

### Positivas

- La recepción mantiene una sola fuente de verdad y el usuario ve cada cambio antes de persistirlo.
- Se pueden probar las llamadas a función y sus rechazos con un adaptador falso, sin clave ni conexión con Gemini.
- La lógica de autorización y validación permanece en Salvacel, no en el prompt.
- Un adaptador futuro puede conectarse a otra tecnología sin cambiar el modelo de recepción.

### Negativas

- El adaptador de Gemini y la emisión de credenciales efímeras agregan una integración de red y manejo explícito de reconexión/errores.
- La experiencia de voz depende de permisos de micrófono, navegador compatible y disponibilidad del proveedor.
- Las preferencias de voz y el prompt configurable requieren reglas para evitar instrucciones contradictorias; esas reglas deben permanecer subordinadas a las herramientas autorizadas.

### Neutrales

- V1 se limita a completar el borrador de recepción; inventario, POS, borrado de productos y mensajería permanecen fuera de alcance.
- No se requiere una cuenta de usuario ni exposición de la aplicación a la red para esta etapa local.

## Relaciones

- Supersedes:
- Superseded by:
- Related: [ADR 0002](0002-modulos-de-interfaz-por-flujo.md), [ADR 0006](0006-cliente-equipo-y-reparaciones.md); `docs/architecture.md` §§5–6, 8; `planning.md`.
