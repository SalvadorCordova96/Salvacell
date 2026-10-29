# Auditoría de ejecución del Plan Maestro

Fecha de corte: 2026-10-21  
Fuente: `Salvacell_Plan_Maestro.pdf`, versión del 18 de octubre de 2026.

Este corte actualiza el estado del código y las brechas a partir de la revisión del 21-10. Los resultados de ejecución enumerados abajo son evidencia histórica de sus fechas, no certifican los cambios más recientes ni el estado actual de Docker.

La matriz vigente por requisito está en `planning.md`, sección “Confirmadas”; este documento conserva el corte histórico del 21-10 y no debe usarse como estado actual.

## Entorno comprobado

- Proyecto activo: `outputs/Salvacel-local`.
- Compose configura el servicio Salvacel, PostgreSQL y la pasarela local; este corte no consultó los contenedores en ejecución ni el volumen persistente.
- WhatsApp y los mensajes salientes siguen fuera de la etapa de implementación; el worker interno de propuestas no equivale a un canal externo.
- Los flujos de prueba documentados usan bases temporales. No asumir el contenido actual de la base persistente sin una verificación separada y autorizada.

## Requisitos con evidencia de implementación

| Área del PDF | Estado comprobado | Evidencia |
| --- | --- | --- |
| Frontend y navegación | Base funcional estable; auditoría visual manual aún parcial | `pnpm test:e2e` pasó 21/21 escenarios sobre escritorio y móvil, incluida la regresión de Caja que deja de renderizar al salir de Cobros y una aserción de hidratación. En esta revisión se recorrieron los 11 módulos principales en escritorio: consola limpia y sin overflow horizontal; se abrieron/cerraron la Caja y el formulario de orden sin guardar. En móvil (390×844) el menú «Más» y el formulario de orden funcionan sin overflow; falta inspección visual manual de cada ruta, estados de error/carga, temas y demás modales. |
| Órdenes, clientes, equipos y reparaciones | Implementado | `ADR-0006`, recepción ramificada, una orden por equipo y varios trabajos por orden; el flujo temporal valida altas, edición y relaciones. |
| POS, anticipos, pagos e inventario | Parcial | POS cubre venta/abono, cambio, stock insuficiente y concurrencia. ADR-0018 añade pedidos, pagos a proveedor, recepciones parciales, costo/flete e instalación/traspaso trazable. ADR-0019 y migración 0007 incluyen gastos, retiros, pagos recurrentes y cierres conciliados; el ledger persistente marca 0007 aplicada y las tablas de órdenes/clientes/pagos siguen vacías. Ahora las reglas recurrentes pueden editarse, pausarse y reactivarse con revisión optimista, conservando vencimientos ya pagados (26 verificaciones de flujo y E2E dedicado). Sigue pendiente reversión compensatoria auditada de pagos de proveedor, corrección de pago recurrente ya registrado, compra desde cotización sin orden y configurar sueldo/distribución del propietario. |
| Devoluciones, cancelaciones y garantías | Implementado como seguimiento | `ADR-0007` y `ADR-0008`; reembolsos son movimientos separados y los reclamos guardan resolución/historial. |
| Cotizaciones y respuesta agéntica | Integración interna implementada; canal real pendiente | `ADR-0014` a `ADR-0017`; ingreso idempotente, contexto limitado, propuestas estructuradas y aprobación humana probados. Se endureció la correlación: una referencia explícita desconocida ya no cae a candidatas abiertas de ese proveedor. `pnpm test:flow` pasó 261 verificaciones heredadas, 26 de caja y 8 del worker simulado sobre PostgreSQL temporal; `pnpm test:e2e` pasó 21/21. Se ejecutaron con salida Next nueva y Webpack para aislar la junction local hacia D:. No hay conexión de WhatsApp ni envíos reales. |
| Identidades y permisos | Implementación en código; pendiente de verificación integral y despliegue | `ADR-0020`, autenticación individual, cierre de sesión, gestión de cuentas/roles y filtrado de módulos están en el árbol. Migraciones y estado del volumen persistente requieren confirmación actual antes del siguiente despliegue; no habilitar LAN sin probar la matriz de permisos y auditoría. |
| Evidencia fotográfica por QR | Flujo implementado en código; acceso móvil real permanece apagado por configuración de Docker | `ADR-0021`, rutas de token/canje/subida/lectura, pantalla móvil, validación de imágenes, miniaturas y almacenamiento privado están en el árbol. Se corrigió la comparación de origen detrás del proxy y se agregó E2E aislado para canje, replay, carga ficticia, miniatura, lectura autenticada, revocación, cuota de 10 imágenes y rechazo del intento 11; todavía no se ejecutó. Probar expiración y asociación antes de habilitar acceso desde teléfono. |
| Respaldo y restauración | Restauración JSON probada en flujos aislados; ensayo PostgreSQL custom agregado, aún sin ejecutar | `scripts/backup-local-db.mjs` crea dumps `-Fc`; `scripts/verify-pg-backup.mjs` inspecciona/restaura en contenedor efímero sin red, puertos ni volúmenes y comprueba migraciones/conteos básicos. Detecta y limpia por nombre aleatorio incluso si el CLI pierde respuesta al crear el contenedor; si no puede verificar limpieza, falla de manera explícita. No se debe considerar validado hasta ejecutarlo sobre una copia real del dump y revisar el resultado. |

## Brechas del Plan Maestro aún no implementadas o no demostradas

1. **Identidades y permisos:** las mutaciones de API, login, cuentas, borradores y QR comparten validación del origen público exacto (esquema, host y puerto) detrás del proxy; se añadieron E2E de rechazo cross-origin/esquema incorrecto. Las pruebas aún no se ejecutaron. Falta cerrar la verificación requisito por requisito en la UI/API y confirmar la migración con el volumen actual, sin asumir su estado. Mantener solo loopback hasta probar permisos y auditoría con cuentas ficticias.
2. **Recepción fotográfica por QR:** el flujo ya existe en código. Falta ejecutar las pruebas de origen y recorrido completo en base/almacenamiento temporales, añadir cobertura explícita de vencimiento/límite, y documentar validación móvil física antes de habilitar el perfil restringido. El QR no debe abrir la app completa ni publicar fotos.
3. **Compras y recepción:** el ciclo de pedido, pago, recepción parcial e instalación/traspaso existe en código y pruebas temporales (`ADR-0018`, migración `0006`); el ledger persistente marca 0006 aplicada. La devolución/nota de crédito al proveedor y comprar desde un presupuesto sin reparación siguen pendientes.
4. **Caja y gastos:** conciliación por fecha/moneda/método, egresos de gasto/retiro y vencimientos recurrentes pagados explícitamente ya existen en código (`ADR-0019`, migración `0007`) y pasaron pruebas temporales. El ledger marca 0007 aplicada y las tablas de órdenes/clientes/pagos siguen con 0 filas. Ya se editan/pausan/reactivan reglas recurrentes; falta reversión compensatoria de pagos de proveedor, corregir un pago recurrente registrado, clasificación configurable de sueldo/distribución y probar una restauración de backup en una instancia aislada.
5. **FMEA y resiliencia:** hay cobertura de idempotencia, concurrencia acotada, recepciones parciales, cierre y restore. Sigue faltando una matriz sistemática para cortes durante mutaciones, ediciones concurrentes generales, pagos/anulaciones de proveedor, cancelación posterior a compra y recuperación tras fallo.
6. **Operación desde celular:** después de terminar autenticación y QR, probar solo la ruta privada de subida desde un dispositivo del taller y revisar firewall. No cambiar bind, publicar la app completa, abrir el gateway ni exponer internet como parte de esta fase.

## Verificación ejecutada en esta revisión

- `pnpm exec tsc --noEmit --incremental false`: pasó con el bloque actual de autenticación.
- `pnpm lint`: pasó sin errores; quedaron siete advertencias no bloqueantes (elementos `<img>` existentes y una directiva de lint innecesaria).
- `pnpm test:flow`: 261 verificaciones de flujo, 26 de caja y 8 del worker agéntico simulado sobre PostgreSQL temporal (`productionTestData:false`). Sin WhatsApp.
- `pnpm test:e2e`: 21/21 en la ejecución completa del 19-10-2026, con Webpack y salida Next aislada. Incluye sesión individual, bandeja simulada de varias calidades y confirmación de propuesta desde el presupuesto.
- El runner de flujo y E2E pasan al indicar un directorio de compilación nuevo (`SALVACEL_VERIFY_NEXT_DIST_DIR`) y usar Webpack (`SALVACEL_NEXT_BUILD_ENGINE=webpack`); el flujo agéntico se prueba contra OpenClaw simulado, sin canal WhatsApp ni credenciales reales. No se borró ni alteró la junction o su destino.
- Browser plugin no disponible; se usó Playwright. La app Docker verificó título, DOM útil, CSS HTTP 200, consola sin errores y ancho documental igual al viewport en Inicio escritorio/móvil. Capturas fuera del proyecto: `C:\Users\Salva\AppData\Local\Temp\salvacel-audit-final-desktop.png` y `C:\Users\Salva\AppData\Local\Temp\salvacel-audit-final-mobile.png`.
- La junction temporal hacia D: se mantuvo intacta y se excluyeron `.next-verify*` del contexto Docker. El contexto bajó de ~422 MB a ~12 KB; el build pasó y la imagen fue actualizada.

No se insertaron datos de prueba en la base persistente. El contenedor de aplicación se reconstruyó para publicar la protección de correlación; `/api/health` devuelve `ok`, la app y PostgreSQL están saludables, OpenClaw sigue saludable y la comunicación interna Gateway→Salvacel responde 200. No se reinició OpenClaw ni se tocó su configuración/credenciales. No se expuso la app a otra interfaz: conserva el bind loopback.

## Siguiente secuencia de implementación

1. Verificar los cambios recientes de login, administración de usuarios/permisos y QR con las suites existentes, datos ficticios y base temporal; resolver cualquier falla antes del rebuild.
2. Confirmar por lectura del ledger el estado de migraciones/volumen y completar un ensayo de restauración aislado; no ejecutar migraciones sobre la base persistente como parte de una prueba.
3. Probar el QR extremo a extremo con token temporal, carga, lectura autenticada, expiración, revocación, límite y orden cerrada. Mantener el perfil móvil desactivado hasta completar una prueba controlada de TLS y firewall.
4. Ejecutar la auditoría visual ruta por ruta (estados loading/error/empty, overlays, CSS stacking y temas) y corregir únicamente defectos reproducibles.
5. Completar y endurecer caja: reversión compensatoria de pagos de proveedor y gastos sin borrar historial, corrección de pagos recurrentes ya registrados, sueldo/distribución configurables y pruebas de interrupción/concurrencia.
6. Cerrar compras desde presupuestos y devolución/nota de crédito al proveedor, sin forzar conversión a orden.
7. Completar FMEA: desconexión durante mutación, doble solicitud/recepción, cancelación tras pedido, restore, concurrencia y postcondiciones.
8. Mantener WhatsApp desactivado hasta seleccionar canal autorizado y configurar credenciales, retención, reintentos, correlación e ingreso autenticado; validar el adaptador con fake antes de habilitarlo.
