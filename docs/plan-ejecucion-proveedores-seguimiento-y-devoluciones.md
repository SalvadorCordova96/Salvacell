# Plan de ejecución para proveedores, seguimiento y devoluciones

Estado: aprobado para planificación; la implementación se ejecutará después por fases.

## 1. Resultado esperado

La aplicación debe permitir que una orden con refacción:

1. use el directorio existente de proveedores;
2. seleccione uno o varios proveedores para solicitar precio, sin confundir la consulta con una compra;
3. registre manualmente quién respondió, qué precio ofreció y qué solicitudes siguen pendientes;
4. compare respuestas y marque a qué proveedor se decidió comprar;
5. muestre en una banda superior la urgencia de la orden y el avance de la refacción;
6. permita cancelar una orden y registrar devoluciones cero, parciales o totales sin borrar cobros;
7. quede preparada para que, en una fase posterior, OpenClaw gestione mensajes mediante una integración reemplazable.

## 2. Alcance cerrado

Incluido en la primera entrega:

- directorio manual de proveedores con nombre, teléfono, notas y estado activo;
- selección múltiple de proveedores desde la captura o detalle de una orden con refacción;
- solicitudes manuales de precio, respuestas, comparación y elección del proveedor;
- banda horizontal de órdenes activas con prioridad, fecha y resumen de refacciones;
- cancelación de órdenes y registro contable de devoluciones;
- Caja, resumen financiero, tickets, auditoría y pruebas ajustados a las devoluciones;
- contratos internos preparados para una futura integración de mensajería.

Fuera de esta entrega:

- envío automático de WhatsApp, correo o SMS;
- lectura automática de respuestas de proveedores;
- compra automática de refacciones;
- devolución parcial de artículos de una venta de accesorios;
- cuentas de usuario por correo;
- exposición de la aplicación a la red.

## 3. Fundamentos que ya existen

Antes de crear estructuras nuevas, cada agente debe comprobar y reutilizar:

- `suppliers`: directorio de proveedores;
- `part_requests`: refacción requerida por una orden;
- `part_quotes`: precios recibidos de proveedores;
- `price_requests`: solicitudes de precio existentes que aún no distinguen correctamente al proveedor;
- `orders.promised_date`: fecha prometida;
- estados de orden, refacción y pagos existentes;
- `audit_log`: bitácora;
- PIN y sesiones;
- respaldo, restauración y pruebas con base temporal.

No se crearán tablas paralelas para conceptos que ya tengan una fuente canónica. Si una estructura actual puede ampliarse sin perder historial, se amplía y se documenta.

## 4. Reglas de negocio obligatorias

### Proveedores y cotizaciones

- Seleccionar un proveedor significa “pedir precio”, no “comprar”.
- Una orden puede consultar a varios proveedores para la misma refacción.
- Una solicitud pendiente no puede duplicarse para la misma refacción y proveedor.
- El historial sí puede conservar consultas anteriores al mismo proveedor cuando la anterior ya terminó o se canceló.
- Cada respuesta debe conservar proveedor, costo, moneda, disponibilidad, calidad, garantía, nota y fecha.
- Elegir proveedor para compra es una acción humana explícita.
- Al elegirlo, la refacción pasa a `solicitada` y copia el costo, proveedor y calidad elegidos.
- Las respuestas de los demás proveedores permanecen en el historial.
- Un proveedor inactivo permanece visible en registros antiguos, pero no puede seleccionarse para solicitudes nuevas.
- Cada grupo de solicitudes tendrá una ventana de cotización contada desde el envío a proveedores, no desde la creación de la orden.
- La ventana podrá configurarse como normal, urgente o decisión inmediata; el usuario siempre podrá cerrarla antes con “Decidir ahora”.
- Cada respuesta recibida se agrega a una comparación neutral con precio, disponibilidad, calidad, garantía y tiempo de entrega.
- El sistema no asigna puntuaciones, prioridades ni recomendaciones a proveedores. Puede ordenar columnas por solicitud expresa del usuario, pero no presenta una oferta como ganadora.
- La elección del proveedor corresponde siempre a la persona que opera la aplicación.
- Si todos responden antes del límite, la ventana puede cerrarse anticipadamente. Al vencer, las solicitudes pendientes pasan a “sin respuesta”.
- Se permite como máximo un recordatorio antes del vencimiento. La falta de respuesta no genera mensajes repetitivos.
- Una oferta tardía se incorpora únicamente si todavía no existe una compra confirmada. Si ya se pidió la pieza, se conserva como historial y no reabre la decisión.
- Si un proveedor no elegido responde o insiste después de que la pieza ya fue pedida, el agente envía una sola respuesta cortés de cierre, agradece la cotización e indica que la pieza ya fue conseguida. No revela quién ganó ni el precio de otro proveedor.
- Después del mensaje de cierre, el agente marca la conversación como cerrada y no entra en un intercambio repetitivo. Un nuevo dato queda registrado como nota sin modificar la compra.
- Si el proveedor elegido cambia el precio, disponibilidad o entrega después de la aceptación, el agente no confirma el cambio: crea una alerta crítica y solicita decisión humana.

### Banda de seguimiento

- Solo aparecen órdenes activas: `nueva`, `proceso`, `esperando_refaccion` y `terminada`.
- Se excluyen `entregada` y `cancelada`.
- Orden: vencidas primero; luego fecha prometida más cercana; después órdenes sin fecha por antigüedad.
- Rojo: fecha prometida vencida.
- Amarillo: vence hoy o dentro de las próximas 24 horas, o existe una solicitud de precio bloqueada/no disponible.
- Verde: fecha futura mayor a 24 horas y sin bloqueo de refacción.
- Neutro: sin fecha prometida.
- El color siempre se acompaña de texto; nunca será la única señal.
- Cada tarjeta muestra folio, cliente, equipo, fecha o antigüedad, estado de orden y resumen de refacción.
- El resumen de proveedor muestra cantidades, por ejemplo: “3 consultados · 2 respondieron · 1 pendiente”.
- La banda se desplaza manualmente y por teclado; no usa movimiento automático.
- Pulsar una tarjeta abre la ficha de esa orden.

### Cancelaciones y devoluciones

- Cancelar la orden y devolver dinero son hechos relacionados, pero distintos.
- Los cobros originales nunca se borran ni se convierten en negativos.
- Una devolución es un egreso nuevo, fechado, con método, importe, motivo y clave idempotente.
- Se permiten cero, una o varias devoluciones.
- La suma devuelta nunca puede superar los cobros operativos activos menos devoluciones anteriores.
- Las liquidaciones históricas agregadas no se consideran origen reembolsable automático.
- Una orden cancelada no recibe nuevos pagos.
- Al cancelar, las solicitudes de precio todavía pendientes pasan a canceladas; las respuestas recibidas se conservan.
- La cancelación requiere categoría y detalle. Categorías iniciales: reparación no realizada, garantía, cliente desistió, pieza no disponible y otro.
- Cancelar o devolver exige reautenticación con PIN cuando el PIN esté activo.
- Caja conserva el ingreso en su fecha original y registra el egreso en la fecha de devolución.
- El resultado neto es cobrado menos devuelto; el adeudo contractual y el historial original permanecen consultables.

## 5. Orden de implementación: de menor a mayor dificultad

Cada fase se entrega y verifica antes de iniciar la siguiente. Dos agentes no deben editar simultáneamente `db/schema.ts`, `app/api/taller/route.ts`, migraciones ni `app/types.ts`.

### Fase 0. Línea base y seguridad de datos

Objetivo: demostrar que se puede trabajar sin poner en riesgo las 48 órdenes reales.

Proceso:

1. Leer `AGENTS.md`, `planning.md`, este plan, los ADR y `docs/architecture.md`.
2. Confirmar que la aplicación sigue ligada solo a `127.0.0.1`.
3. Registrar conteos reales de órdenes, pagos, proveedores, refacciones, cotizaciones y solicitudes.
4. Crear un respaldo verificable con el mecanismo existente.
5. Preparar un estado temporal de Wrangler distinto de `.wrangler/state`.
6. Ejecutar en la línea base `lint`, `build`, verificación funcional y pruebas de interfaz.

Criterio de terminación:

- existe un respaldo nuevo;
- están documentados los conteos iniciales;
- las pruebas usan estado temporal;
- ningún dato de prueba aparece en la base real.

Condición de parada: si la línea base falla, el agente documenta el fallo y no inicia migraciones.

### Fase 1. Consolidar el directorio de proveedores

Objetivo: hacer utilizable la función que ya existe antes de agregar relaciones nuevas.

Proceso:

1. Verificar altas y ediciones de proveedor con nombre obligatorio y teléfono opcional.
2. Mostrar claramente proveedores activos e inactivos.
3. Confirmar búsqueda por nombre y teléfono.
4. Impedir nuevas selecciones de proveedores inactivos sin ocultar su historial.
5. Corregir únicamente carencias del directorio actual; no crear un segundo directorio.

Archivos probables: vista de proveedores, tipos, ruta única del taller y pruebas focalizadas.

Criterio de terminación: un proveedor creado aparece una sola vez, puede editarse, puede desactivarse y conserva sus cotizaciones anteriores.

### Fase 2. Modelo de solicitudes por proveedor

Objetivo: representar de forma inequívoca a quién se pidió precio y cuál fue la respuesta.

Proceso:

1. Reservar la siguiente migración disponible. En el estado actual corresponde `0014`; si ya existe al ejecutar, detenerse y renumerar sin sobrescribir.
2. Ampliar `price_requests` para relacionar opcionalmente proveedor, refacción y cotización de respuesta.
3. Estados canónicos: pendiente, respondida y cancelada.
4. Migrar `atendida` a `respondida` sin perder filas.
5. Conservar consultas generales antiguas aunque no tengan proveedor.
6. Impedir dos solicitudes pendientes para la misma pareja refacción–proveedor.
7. Mantener `part_quotes` como fuente canónica del precio recibido.
8. Añadir índices por refacción, proveedor y estado.
9. Incluir la estructura en respaldo, restauración y exportación.

Criterio de terminación: la migración conserva todos los registros anteriores y permite múltiples proveedores por refacción sin duplicados pendientes.

### Fase 3. Operaciones de servidor para el flujo manual

Objetivo: concentrar reglas en el servidor y dejar la interfaz como cliente del dominio.

Operaciones requeridas:

1. crear varias solicitudes para una refacción;
2. cancelar una solicitud pendiente;
3. registrar respuesta y crear su cotización vinculada en una sola operación;
4. elegir una cotización para compra y actualizar la refacción;
5. consultar resumen por orden: total consultado, pendientes, respondidas y proveedor elegido.

Reglas técnicas:

- claves idempotentes en operaciones que crean movimientos;
- revisión optimista para evitar sobrescribir cambios concurrentes;
- validación de proveedor activo al crear una solicitud;
- moneda de la respuesta compatible con la orden o conversión explícita, nunca silenciosa;
- operación atómica al responder y crear `part_quote`;
- auditoría de solicitud, respuesta, cancelación y elección;
- errores comprensibles y estados HTTP consistentes.

Criterio de terminación: repetir una petición con la misma clave no duplica datos y una respuesta incompleta no deja filas parciales.

### Fase 4. Selección de proveedores en la orden

Objetivo: permitir que el personal cree las consultas desde el flujo donde nace la necesidad.

Proceso:

1. En el formulario de orden, mostrar proveedores activos solo cuando se capture una refacción requerida.
2. Usar selección múltiple accesible con búsqueda por nombre o teléfono.
3. Explicar junto al selector: “Esto solicita precio; no elige todavía dónde comprar”.
4. Permitir guardar la orden sin seleccionar proveedor.
5. Si se seleccionan proveedores, crear la orden, la refacción y las solicitudes en una operación coherente.
6. En una orden existente, permitir agregar más proveedores desde la sección de refacción.
7. Mostrar qué proveedores ya fueron consultados para impedir selecciones duplicadas.

Criterio de terminación: una orden con una refacción y tres proveedores produce una sola refacción y tres solicitudes pendientes correctamente vinculadas.

### Fase 5. Respuestas, comparación y elección de compra

Objetivo: cerrar manualmente el ciclo sin automatización externa.

Proceso:

1. Mostrar por proveedor estado, teléfono, fecha de solicitud y respuesta.
2. Para registrar respuesta, pedir costo, moneda, disponibilidad; calidad, garantía y nota pueden ser opcionales.
3. Presentar una tabla comparativa neutral con precio, disponibilidad, calidad, garantía y tiempo de entrega, sin resaltar automáticamente un proveedor como mejor.
4. Permitir “Elegir y pedir” únicamente sobre una respuesta válida.
5. Pedir confirmación mostrando proveedor, pieza y costo.
6. Actualizar la refacción a `solicitada` con la respuesta elegida.
7. Mantener las otras respuestas como evidencia histórica.
8. Permitir cambiar de proveedor con motivo y auditoría mientras la pieza no esté marcada como disponible.
9. Mostrar el tiempo restante de la ventana y permitir “Decidir ahora”.
10. Al recibir una oferta tardía, comprobar primero si la compra sigue abierta; si ya cerró, archivar la oferta sin recalcular la elección.
11. Diferenciar “conversación cerrada con proveedor no elegido” de “incidencia del proveedor elegido”.

Criterio de terminación: el usuario puede saber quién falta por responder, comparar respuestas y registrar una decisión sin alterar cotizaciones descartadas.

### Fase 6. Motor común de atención y banda superior

Objetivo: evitar reglas diferentes entre Inicio, Órdenes y el encabezado.

Proceso:

1. Crear un módulo puro que reciba órdenes, refacciones, solicitudes, configuración y una hora inyectada.
2. El módulo devuelve elementos ordenados, severidad, texto de razón y conteos; no consulta la base ni el reloj por su cuenta.
3. Reemplazar cálculos duplicados de Inicio por el resultado común.
4. Añadir orden “Prioridad” a Órdenes sin quitar los órdenes manuales existentes.
5. Añadir la banda como segunda franja del encabezado.
6. En móvil, mostrar primero el conteo urgente y abrir una lista desplazable.
7. Recalcular al cargar datos, tras una mutación y al cambiar el día local.
8. Tratar fechas inválidas como diagnóstico visible, sin detener toda la aplicación.

Criterio de terminación: Inicio, Órdenes y la banda coinciden en cuál es la siguiente orden crítica y explican el motivo con texto.

### Fase 7. Cancelación de orden y devoluciones

Objetivo: registrar correctamente una reparación cancelada y el dinero que realmente salió.

Proceso:

1. Reservar la migración posterior a proveedores; en el orden actual corresponde `0015`.
2. Crear un historial append-only de resoluciones de orden con cancelación y devolución.
3. Añadir desde la ficha un botón específico “Cancelar orden”; quitar la cancelación del selector genérico de estado.
4. Abrir un formulario con categoría, detalle, total cobrado, total devuelto antes, máximo disponible, importe a devolver y método.
5. Admitir cero, parcial o total y varias devoluciones posteriores.
6. Aplicar cancelación, devolución, cierre de solicitudes pendientes y auditoría de forma atómica.
7. Rechazar órdenes entregadas, revisiones obsoletas, exceso de devolución y nuevos pagos tras cancelar.
8. Emitir comprobante imprimible de cancelación/devolución.

Criterio de terminación: los pagos originales siguen visibles; Caja registra el egreso correcto; repetir la operación no duplica la devolución.

### Fase 8. Caja, resumen, tickets y auditoría

Objetivo: propagar los nuevos eventos a todas las vistas financieras y documentales.

Proceso:

1. Caja separa entradas, devoluciones y neto por moneda y método.
2. Resumen muestra cobrado bruto, devuelto y cobrado neto.
3. Órdenes canceladas dejan de aparecer como adeudos operativos.
4. Los datos históricos originales permanecen consultables.
5. Añadir ticket de devolución y razón de cancelación sin mostrar datos sensibles innecesarios.
6. La bitácora enlaza cancelación, devolución, solicitud, respuesta y elección de proveedor.
7. Exportación y restauración incluyen todas las tablas nuevas.

Criterio de terminación: para cada moneda, cobrado neto equivale a cobros activos menos devoluciones y coincide entre Caja, resumen y detalle.

### Fase 9. Verificación integral y documentación

Objetivo: declarar el cambio terminado solo con evidencia reproducible.

Pruebas funcionales mínimas:

1. proveedor activo e inactivo;
2. tres solicitudes para una refacción y rechazo de duplicado pendiente;
3. dos respuestas y una pendiente;
4. elección de proveedor y actualización de refacción;
5. banda roja, amarilla, verde y neutra;
6. orden sin fecha y empate determinista;
7. cancelación sin devolución;
8. devolución parcial, segunda devolución y devolución total;
9. rechazo de exceso e idempotencia;
10. bloqueo de pagos nuevos a orden cancelada;
11. Caja, resumen, ticket y auditoría;
12. PIN activo para acciones financieras;
13. respaldo y restauración sobre base temporal;
14. navegación por teclado y comportamiento móvil.

Comprobaciones de cierre:

- lint sin errores;
- build correcto;
- verificación funcional completa;
- pruebas Playwright en estado temporal;
- conteos de la base real sin datos de prueba;
- README y registro de migraciones actualizados;
- `planning.md` condensado y decisiones estables movidas a ADR/arquitectura.

## 6. Preparación para OpenClaw, sin implementarlo todavía

### Clasificación

- Solicitud y respuesta de precio: dominio del taller.
- Envío/recepción por WhatsApp, correo u otro canal: Integration.
- Enviar un mensaje o registrar una respuesta: Tool atómica.
- Solicitar, esperar, interpretar y escalar: Workflow conocido.
- OpenClaw: runtime reemplazable detrás de un port; no es fuente de verdad.

### Fuente canónica

La base local conserva proveedores, solicitudes, respuestas y decisiones. OpenClaw nunca mantiene el único registro de un precio, estado o proveedor elegido.

### Contratos que la implementación manual debe dejar disponibles

- listar solicitudes pendientes autorizadas;
- obtener datos mínimos del proveedor y la refacción;
- preparar mensaje sin enviarlo;
- confirmar envío con clave idempotente;
- registrar entrega o fallo;
- proponer una respuesta interpretada;
- confirmar humanamente importe, moneda y disponibilidad antes de guardarlos;
- cerrar cortésmente una oferta tardía sin revelar información de otros proveedores;
- escalar cambios del proveedor elegido sin aceptarlos automáticamente;
- comprobar después que la solicitud cambió de estado en la base canónica.

### Riesgo y autonomía futura

- Consultar pendientes: R0/A0.
- Preparar borrador: R1/A2.
- Enviar mensaje a proveedor: R2/A3, con confirmación humana durante el piloto.
- Registrar automáticamente precio interpretado: R2/A2 al inicio; el humano confirma antes de mutar.
- Elegir proveedor o comprar: fuera de autonomía; siempre humano.

### Límites iniciales del workflow futuro

- máximo 10 proveedores por orden;
- máximo 2 reintentos de envío por solicitud;
- tiempo máximo de una ejecución: 30 segundos sin contar espera de respuesta externa;
- una sola propiedad de reintentos por canal;
- clave idempotente por solicitud y canal;
- pausa inmediata configurable;
- sin bucles abiertos ni compra automática;
- datos personales mínimos en mensajes y trazas.

### Condición para empezar la integración real

El flujo manual debe haber funcionado de extremo a extremo con datos reales del taller, sin duplicados y con estados comprensibles. Hasta entonces, la alternativa menos agentic —reglas y captura manual— es la referencia contra la que se evaluará OpenClaw.

## 7. Paquetes de trabajo para agentes Luna

Los agentes se ejecutan secuencialmente. Cada agente recibe únicamente este documento, `planning.md`, los ADR relacionados y la fase asignada.

### Luna A: línea base y directorio

- Ejecuta fases 0 y 1.
- No crea migraciones.
- Entrega conteos, resultados de pruebas, archivos cambiados y cualquier bloqueo.

### Luna B: persistencia y servidor de cotizaciones

- Ejecuta fases 2 y 3.
- Tiene propiedad exclusiva temporal de esquema, migración, tipos, ruta del taller y verificación funcional.
- Prueba primero sobre copia temporal.

### Luna C: orden y comparación manual

- Ejecuta fases 4 y 5 después de que Luna B termine.
- No redefine reglas del servidor.
- Entrega evidencia de los recorridos principales y estados vacíos/de error.

### Luna D: atención y banda

- Ejecuta fase 6.
- Centraliza reglas existentes en vez de copiarlas.
- Entrega pruebas unitarias del orden determinista y pruebas de interfaz responsive.

### Luna E: cancelaciones y dinero

- Ejecuta fases 7 y 8.
- Tiene propiedad exclusiva temporal de esquema, migración, ruta, Caja, resumen, tickets y auditoría.
- Trata la devolución como egreso, no como anulación de cobro.

### Luna F: verificación independiente

- Ejecuta fase 9 sin asumir que los agentes anteriores terminaron bien.
- Busca inconsistencias entre UI, servidor y base.
- No modifica datos reales; propone correcciones o aplica fixes acotados con pruebas.

### Luna G: integración futura

- Solo se activa después de validar el flujo manual.
- Diseña el port de mensajería, el adapter de OpenClaw, policies, tools, workflow, telemetría y evals.
- No compra, no elige proveedor y no registra precios interpretados sin confirmación humana.

## 8. Instrucciones comunes para cada agente

1. Confirmar la fase asignada y leer solo los archivos relacionados.
2. Revisar cambios existentes antes de editar y preservar trabajo ajeno.
3. Usar `apply_patch` para cambios manuales.
4. Mantener la aplicación únicamente en local.
5. Ejecutar migraciones primero sobre estado temporal.
6. Crear respaldo antes de migrar la base real.
7. No ejecutar `db:init` sobre una base existente.
8. Añadir validación server-side y prueba por cada mutación.
9. No declarar éxito solo porque la interfaz cambió; verificar el estado guardado.
10. Actualizar `planning.md` con el estado actual, no con un diario acumulativo.
11. Detenerse ante datos reales inesperados, conflicto de migración o una decisión financiera no cubierta.
12. Entregar: resultado, pruebas ejecutadas, archivos modificados, riesgos residuales y siguiente fase habilitada.

## 9. Definición global de terminado

El bloque completo estará terminado cuando una orden pueda recorrer, sin pasos ocultos:

1. registrar equipo y refacción;
2. seleccionar varios proveedores;
3. registrar solicitudes;
4. recibir y comparar precios;
5. elegir proveedor y marcar pieza solicitada;
6. aparecer correctamente priorizada en la banda;
7. completarse o cancelarse;
8. registrar una devolución exacta si corresponde;
9. producir Caja, resumen, ticket y auditoría consistentes;
10. restaurarse desde respaldo;
11. superar todas las pruebas sobre una base temporal sin alterar las 48 órdenes reales.

