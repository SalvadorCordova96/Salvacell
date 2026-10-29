# Registro de decisiones

| ADR | Estado | Decisión |
| --- | --- | --- |
| [0001](0001-validacion-y-ordenes-historicas.md) | Aceptada | Separar la importación histórica de las reglas para órdenes nuevas |
| [0002](0002-modulos-de-interfaz-por-flujo.md) | Aceptada | Separar la interfaz por flujo operativo |
| [0003](0003-sondeo-de-salud-sin-consultar-datos.md) | Aceptada | Sondear disponibilidad sin consultar datos del taller |
| [0004](0004-garantia-en-ticket-de-entrega.md) | Aceptada | Calcular vencimiento de garantía y configurar sus términos en el ticket de entrega |
| [0005](0005-respaldo-servidor-antes-de-restaurar.md) | Aceptada | Conservar una copia recuperable antes de restaurar |
| [0006](0006-cliente-equipo-y-reparaciones.md) | Aceptada | Perfil único por cliente, una orden por equipo y reparaciones repetibles |
| [0007](0007-reembolsos-como-movimientos-separados.md) | Aceptada | Registrar devoluciones aparte de los cobros originales |
| [0008](0008-seguimiento-operativo-de-garantias.md) | Aceptada | Reclamos de garantía como seguimientos operativos versionados y auditables |
| [0009](0009-asistente-de-voz-gemini-modular.md) | Aceptada | Asistente de voz desacoplado con Gemini Live como primer adaptador y herramientas autorizadas por Salvacel |
| [0010](0010-separacion-por-carpetas-en-un-solo-runtime.md) | Aceptada | Organizar frontend, backend HTTP y persistencia en carpetas distintas sin separar el runtime |
| [0011](0011-postgresql-local-en-docker.md) | Aceptada | Usar PostgreSQL en un volumen y red exclusivos de Docker, con la app TypeScript ejecutándose en Node.js local |
| [0012](0012-modulo-agente-independiente.md) | Reemplazada por ADR-0013 | Módulo agéntico en espacio de trabajo independiente |
| [0013](0013-servicio-agente-integrado-con-salvacel.md) | Aceptada | Operar el agente desde la UI de Salvacel y ejecutarlo como servicio separado integrado mediante el backend |
| [0014](0014-cotizaciones-contextuales-en-ordenes.md) | Aceptada | Vincular cotizaciones a la reparación y gestionarlas desde la banda y el detalle de la orden |
| [0015](0015-cotizaciones-en-presupuestos-y-respuestas-estructuradas.md) | Aceptada | Solicitudes por reparación o presupuesto, respuestas estructuradas y revisión humana sin mensajería automática |
| [0016](0016-ingreso-y-revision-de-mensajes-de-proveedor.md) | Aceptada | Ingreso autenticado e idempotente de mensajes de proveedor, contexto acotado al agente y confirmación humana |
| [0017](0017-procesamiento-acotado-de-respuestas-con-openclaw.md) | Aceptada | Worker en segundo plano y OpenClaw por webhook/plugin restringidos, con propuestas que requieren revisión humana |
| [0018](0018-pedidos-y-recepcion-de-refacciones.md) | Aceptada | Pedidos agrupados, pagos separados y recepción parcial idempotente; stock solo al recibir |
| [0019](0019-conciliacion-de-caja-y-egresos.md) | Aceptada | Caja conciliable por fecha/moneda/método, gastos y retiros separados, y egresos recurrentes pagados explícitamente |
| [0020](0020-identidades-y-permisos-de-operador.md) | Aceptada | Identidades individuales, permisos validados en backend y bitácora atribuida al operador |
| [0021](0021-evidencia-fotografica-por-qr.md) | Aceptada | QR de un uso canjeable por sesión corta de carga de fotos ligada a un equipo y almacenada en privado; entrada móvil HTTPS opt-in y restringida |
| [0022](0022-trazabilidad-de-fragmentos-de-cotizacion.md) | Aceptada | Contexto de fragmentos limitado por proveedor/conversación y ventana de silencio, validación backend y trazabilidad con revisión humana |
| [0023](0023-telefonos-de-contacto-del-cliente.md) | Aceptada | Teléfono principal y adicional opcional, búsqueda explícita por ambos y preservación de la copia histórica en órdenes |
| [0024](0024-borradores-privados-de-formularios.md) | Aceptada | Borradores privados de orden/recepción, autoguardado, recuperación, descarte y expiración a 30 días |
| [0025](0025-identidad-persistente-de-equipos.md) | Aceptada | Identidad estable por aparato; cada visita genera su propia orden y solo se reutiliza un equipo elegido explícitamente |
| [0026](0026-chat-operativo-openclaw-en-salvacel.md) | Aceptada | Chat operativo con contexto autorizado, sesiones OpenClaw aisladas, herramienta limitada y borradores visibles guardados por el usuario |
| [0027](0027-acciones-visibles-de-consulta-del-copiloto.md) | Aceptada | Abrir órdenes y perfiles desde el copiloto solo por referencias del contexto autorizado del turno |
| [0028](0028-restauracion-de-evidencia-qr.md) | Aceptada | Incluir metadatos QR en respaldos JSON y revocar sesiones al restaurar |
| [0029](0029-compatibilidad-posible-de-vidrio-templado.md) | Aceptada | Guardar compatibilidades declaradas por proveedor como referencia libre por producto, sin mezclar SKU ni existencias |
| [0030](0030-catalogo-inicial-y-existencias-desconocidas.md) | Aceptada | Preparar catálogo inicial con mínimos independientes y representar precio/existencia aún no capturados como desconocidos |
| [0031](0031-proveedores-de-accesorios-por-producto.md) | Aceptada | Asociar varios proveedores de accesorios por producto sin confundir la lista con compras realizadas |
| [0032](0032-separacion-de-administracion-y-configuraciones.md) | Aceptada | Separar Administración, Configuraciones y flujos operativos con permisos de backend |

