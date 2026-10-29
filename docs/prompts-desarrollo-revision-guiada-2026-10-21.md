# Prompts de desarrollo — revisión guiada de Salvacell

Documento de planificación, no de implementación. Fuente principal: `C:\Users\Salva\Downloads\revision-guiada-salvacel.md` (la copia en `docs/` tiene otro hash y no se usó para contar puntos). Fecha de inspección: 2026-10-21. Cada bloque Pxx está pensado para copiarse por separado a un chat con acceso al proyecto.

## 1. Resumen del análisis

Se leyeron los **38 apartados numerados y el 6.1: 39 puntos originales** del Markdown de Descargas. No se adjuntó en este encargo un `Texto pegado.txt` pertinente; el propio Markdown indica que incorpora interpretación de un dictado, por lo que no se contó dos veces. Se inspeccionaron `package.json`, `README.md`, `db/schema.ts`, componentes y formularios de `frontend/`, fachadas de `app/api/`, handlers de `backend/http/`, scripts de verificación y títulos de `e2e/taller.spec.ts`. No se encontró `AGENTS.md` aplicable en la raíz de esta copia ni en la carpeta de la aplicación. Ni la raíz ni `outputs/Salvacel-local` son repositorios Git en este entorno, así que no fue posible distinguir cambios preexistentes mediante `git status`; no se restauró ni limpió nada. No se arrancaron servicios, no se consultó la base activa y no se comprobó el comportamiento visual en navegador. Las observaciones de la bitácora son solicitudes, no defectos reproducidos aquí.

El proyecto inspeccionado usa Next.js 16, React 19, TypeScript, Tailwind 4, HeroUI 3 y componentes propios/@base-ui. `frontend/` y `backend/http/` comparten la aplicación Node/Next; PostgreSQL y migraciones están en `db/` y `drizzle-postgres/`. La fachada principal es `app/api/taller/route.ts`; autenticación, fotos y mensajes de proveedores tienen rutas propias bajo `app/api/`. `scripts/backup-local-db.mjs` crea un dump PostgreSQL, distinto de la exportación JSON de la interfaz. La recepción ramificada, la orden rápida y el presupuesto no tienen exactamente el mismo formulario. El ingreso de mensajes de proveedores y un trabajador OpenClaw existen, pero esta inspección estática **no confirma WhatsApp real, credenciales, entrega externa ni despliegue actual**. No hay evidencia de un chat general interno en `frontend/`; el agente existente está acotado a proveedores.

Para cada prompt, “existente” significa localizado en código, no aprobado por prueba de ejecución. En cualquier futura implementación se debe revalidar la versión de esos archivos, preservar registros reales e históricos, trabajar con datos ficticios en una base aislada y no declarar completado un flujo solo porque compila. Comandos comprobados en `package.json`: `pnpm lint`, `pnpm build`, `pnpm test:flow`, `pnpm test:e2e` y `pnpm test:static-assets`. La suite E2E se define en `e2e/taller.spec.ts`; la suite de flujo usa PostgreSQL temporal según `README.md` y los scripts, pero el ejecutor deberá reconfirmar ese aislamiento antes de correrla.

## 2. Tabla de cobertura

| Prompt | Origen en `revision-guiada-salvacel.md` | Función | Situación comprobada en código | Tipo | Dependencia principal |
|---|---|---|---|---|---|
| P01 | 1, 36 | Usuarios, permisos del asistente | Roles, sesiones y autorización existen; política del chat no | Completar/diseñar | Matriz de permisos |
| P02 | 2 | Fotos QR | Tokens, carga y vista existen | Verificar/corregir | Acceso móvil seguro |
| P03 | 3 | Respaldo/restauración | Dump PostgreSQL y restauración JSON existen | Verificar | Entorno de ensayo aislado |
| P04 | 4, 35 | Chat interno | No se localizó chat general; agente de proveedores sí | Diseñar etapa futura | P01 |
| P05 | 5 | WhatsApp proveedor | Ingreso admite canal `whatsapp`; conexión real no verificada | Diseñar etapa futura | Canal autorizado, P08 |
| P06 | 6, 33 | Revisión visual/contraste | CSS y componentes compartidos existen | Corregir tras auditoría | Recorrido visual |
| P07 | 6.1 | Login independiente | `frontend/page.tsx` retorna `AuthLogin` antes de construir `WorkshopLayout`; implementación presente, recorrido visual y auth E2E aún por verificar | Verificar | P01 |
| P08 | 7 | Cotización por reparación | Solicitudes, ofertas, bandeja y selección existen | Verificar/corregir | Datos ficticios |
| P09 | 8 | Garantía/cancelación/devolución | Entidades y diálogos existen | Verificar/corregir | Reglas de saldo |
| P10 | 9 | Aviso de respaldo | Preferencias y advertencia existen; disposición visual no probada | Verificar/corregir | P03 |
| P11 | 10, 38 | Vista inicial/POS | Preferencia `initialView` e `initialRoute` existen | Verificar/corregir | Política de valor inicial |
| P12 | 11 | Cobros y ventas en POS | `PosView` incluye carrito y selector de orden | Verificar/corregir | P17, P01 |
| P13 | 12 | Pago a proveedor/caja | Compras y pagos proveedor existen, fuera del carrito POS | Diseñar/implementar | Reglas contables |
| P14 | 13 | Ayudas contextuales | Componentes `tooltip` existen; cobertura no probada | Implementar selectivamente | P06 |
| P15 | 14 | Inicio operativo vs resumen financiero | `HomeView` y `SummaryView` separados | Verificar/corregir | P01 |
| P16 | 15 | Moneda inicial | Configuración MXN y moneda por registro existen | Verificar/corregir | Política de datos históricos |
| P17 | 16 | Buscar/elegir cliente y equipo | Recepción elige perfil; orden rápida usa teléfono de órdenes | Implementar | P19 |
| P18 | 17 | Acción global Nueva orden | Botón flotante añadido desde módulos distintos de Órdenes; respeta `orders.write`, abre el formulario real sin navegar ni guardar al abrir | Verificar/completar | E2E desde POS agregado, pendiente de ejecución; ampliar a tres módulos y probar cierre/datos sin guardar |
| P19 | 18 | Dos teléfonos | `customers` tiene un campo `phone` | Implementar | Política de contacto |
| P20 | 19 | Tipo de equipo/modelos | `orders.deviceType` y recepción existen | Verificar/ampliar | Catálogo P31 |
| P21 | 20 | Proveedores elegibles | Selección múltiple existe; no hay categoría proveedor | Implementar | P30 |
| P22 | 21 | Precios históricos | `part_quotes` y caducidad configurable existen | Verificar/ampliar | P20 |
| P23 | 22 | Consulta diferenciada a proveedores | Solicitud y asociación existen; envío real no verificado | Diseñar etapa futura | P05, P21 |
| P24 | 23 | Diagnóstico editable/pago flexible | Revisión ligada a tarifa USD y `reviewCents`; pagos separados | Implementar | Regla de aplicación posterior |
| P25 | 24 | Historial de diagnóstico | No se localizó entidad específica | Implementar | P24, P20 |
| P26 | 25, 26 | Borradores y cierre de modal | Formularios usan estado React; `Modal` cierra | Implementar | Persistencia y P17 |
| P27 | 27 | Perfil integral cliente | Órdenes y compras visibles, sin vista completa de cobros/tickets | Ampliar | P17, P19 |
| P28 | 28 | Presupuesto a orden | Conversión y filtro “Convertidos” existen | Verificar/ampliar | P17 |
| P29 | 29 | Estados separados | Orden, parte y cobro son entidades distintas | Verificar/corregir | P08, P09 |
| P30 | 30 | Inventario/proveedores | Productos/stock y proveedores existen; categoría proveedor no | Ampliar | Migración conservadora |
| P31 | 31 | Catálogos | Marcas, servicios y pagos en configuración; modelos sin entidad propia | Ampliar | P20 |
| P32 | 32 | Mensajes a clientes | Plantillas en `settings`, canal no verificado | Diseñar etapa futura | Consentimiento |
| P33 | 34 | Foto QR de pieza recibida | QR actual es para evidencia de orden, no recepción de compra | Diseñar etapa futura | P02, P13 |
| P34 | 37 | Acciones visibles del asistente | No se localizó chat general ni sus herramientas | Diseñar etapa futura | P01, P04 |

Se agruparon **1+36** (misma frontera de autorización), **4+35** (dos descripciones del chat), **6+33** (misma revisión visual), **10+38** (misma preferencia inicial) y **25+26** (el cierre depende del borrador). Ningún otro punto se fusionó: tener una dependencia no convierte dos resultados de negocio en uno solo.

## 3. Orden recomendado de ejecución

1. **Verificaciones de lo aparentemente existente:** P03, P02, P08, P09, P11, P16, P20, P28, P29. Documentar fallos reproducibles antes de modificar.
2. **Base de identidad y datos:** P01, P07, P19, P17, P26, P24, P25, P31 y P30. Las políticas comerciales y de permisos señaladas abajo se resuelven antes de migrar datos.
3. **Recorridos de operación:** P21, P22, P12, P13, P27, P18, P15, P10; luego P06 y P14 para coherencia visual. P23 solo prepara mensajes hasta autorizar canal.
4. **Futuro separado:** P04, P05, P32, P33, P34. Son prompts de diseño/contrato y pruebas aisladas, no activación de mensajería ni poderes administrativos.

Las prioridades de la tabla son recomendaciones de secuencia, no aprobaciones del negocio. P08 puede trabajarse independientemente en un chat de corrección si una prueba revela un defecto concreto. P06 puede repartirse por pantallas sin cambiar reglas de negocio.

## 4. Prompts completos

### P01 — Identidades, permisos y límites del asistente

**Identificación.** Origen: puntos 1 y 36, “Usuarios y permisos”/“Dar permisos claros al asistente”. Tipo: completar y diseñar política; prioridad sugerida alta. Depende de definir roles reales. Este agrupamiento protege la misma frontera de autorización humana y agéntica.

**Objetivo y problema actual.** Lo solicitado es que cada persona vea y haga solo lo autorizado y quede trazabilidad; el asistente no debe eludirlo. Existe `backend/http/auth.ts` con roles, sesiones y `authorize`, `db/schema.ts` con `roles`, `users`, `auditLog`; no se probó que cada pantalla y acción esté cubierta.

**Contexto real.** `frontend/auth-login.tsx`, `frontend/page.tsx`, `app/api/auth/route.ts`, `app/api/auth/users/route.ts`, `app/api/taller/route.ts`; `backend/http/agent-supplier-messages.ts` usa una credencial técnica, no la identidad de un usuario del chat.

**Alcance futuro.** Audita lectura, escritura, datos financieros, costos, restauración y usuario administrador; corrige omisiones sin cambiar roles históricos a ciegas. Diseña que cada acción del chat lleve usuario/permiso y que Salvacel autorice en servidor. Nunca aceptar una contraseña escrita en chat ni elevar permisos por una instrucción en lenguaje natural; para administración usar reautenticación por el mecanismo seguro existente o propuesto.

**Recorrido.** Admin configura operador; operador entra, navega y recibe denegación clara donde falte permiso; una acción propuesta por el agente se valida con la sesión antes de confirmar y auditar.

**Datos, reglas y permisos.** Preservar hashes/sesiones y auditoría; no exponer campos sensibles en cargas de solo lectura. Una denegación no debe filtrar datos ni ejecutar parcialmente.

**Orientación.** Empezar por matriz acción→permiso sobre `permissionForAction` y pantallas, después cerrar huecos de API/UI; no confiar en ocultar botones como única seguridad.

**Aceptación.** Dos perfiles ficticios obtienen visibilidad distinta; mutación no autorizada devuelve 403 sin cambio; acción permitida registra actor; chat no obtiene permiso extra al pedirlo.

**Verificación/entrega.** Extender `e2e/taller.spec.ts` y pruebas de auth; correr `pnpm lint`, `pnpm build`, `pnpm test:flow`, `pnpm test:e2e` en entorno aislado. Reportar matriz y pruebas.

**Dudas.** Bloquea: quiénes usarán la app y qué datos financieros puede ver cada rol. No bloquea: nombres de componentes o disposición visual.

### P02 — Carga segura de fotos del equipo por QR

**Identificación.** Origen: punto 2. Tipo: verificar y corregir; prioridad sugerida media. Depende de identidad y acceso móvil acotado.

**Objetivo/actual.** La solicitud es fotografiar el equipo correcto desde móvil. Ya existen `frontend/photo-evidence.tsx`, `backend/http/photo-evidence.ts`, `app/api/photos/` y tablas `repair_photo_upload_tokens`/`repair_photos`; no se comprobó acceso desde teléfono real.

**Contexto real.** El QR se genera desde el expediente de orden y abre `/mobile-photos.html`; los handlers canjean token, limitan carga y sirven fotos bajo autorización.

**Alcance.** Probar emisión, vencimiento, revocación, límite y asociación a orden; corregir solo lo que falle. No abrir la app completa ni la BD a LAN/internet; la activación de red requerirá una puerta dedicada y aprobación de seguridad. Mantener original, miniatura y registro de retiro conforme a política.

**Recorrido.** Operador abre orden ficticia, crea QR; móvil sube dos imágenes; operador las ve solo en esa orden; QR vencido, revocado o reutilizado indebidamente falla sin mostrar otras órdenes.

**Datos/reglas/permisos.** No incluir datos de cliente en enlace público. Solo usuario con `repairs.write` crea/revoca; aplicar tamaño/tipo/cuota y definir retención.

**Orientación.** Reutilizar el almacenamiento y rutas actuales; probar LAN solo en entorno aislado, sin cambiar `compose.local.yaml` por defecto.

**Aceptación.** Fotos no se cruzan entre dos órdenes; token inválido da rechazo; usuario no autorizado no obtiene archivo; error de carga no deja registro aparente.

**Verificación/entrega.** Extender el test QR de `e2e/taller.spec.ts`, pruebas de API y móvil; comandos estándar. Informar si la prueba física no pudo hacerse.

**Dudas.** Bloquea la exposición en red: método de acceso del teléfono. Retención de imágenes es decisión pendiente; no inventar un plazo.

### P03 — Ensayo completo de recuperación desde respaldo

**Identificación.** Origen: punto 3. Tipo: verificar; prioridad sugerida alta. Depende de un entorno temporal aislado.

**Objetivo/actual.** Comprobar que un desastre se recupera, no solo que existe un archivo. `scripts/backup-local-db.mjs` crea dump PostgreSQL; `backend/http/taller.ts` ofrece exportación/restauración JSON y `frontend/recovery-snapshots.tsx` lista copias previas. Son mecanismos distintos.

**Contexto real.** `README.md` distingue el volumen PostgreSQL y exportación JSON; `db/schema.ts` define tablas y `drizzle-postgres/` migraciones.

**Alcance.** Preparar un ensayo con datos ficticios en base/volumen temporal, generar dump, restaurarlo allí, verificar integridad de relaciones, fotos y versionado; documentar recuperación y vuelta atrás. No restaurar sobre la base activa ni borrar volúmenes. Probar exportación JSON aparte, sin presentarla como sustituto de dump.

**Recorrido.** Admin genera copia, verifica fecha/archivo, simula pérdida en ensayo, restaura, entra y comprueba órdenes, pagos, proveedor y evidencia; un archivo dañado se rechaza sin corromper destino.

**Datos/permisos.** `backup.manage` para restaurar; proteger respaldos y secretos. Comparar conteos e invariantes, no solo respuesta HTTP.

**Orientación.** Usar scripts existentes y `pg_restore` en temporal según runbook; si falta automatización, proponerla sin afectar producción.

**Aceptación.** Dump restaurado conserva registros y relaciones; recuperación JSON validada por separado; daño/versión incompatible falla; base activa sin cambios.

**Verificación/entrega.** Reusar `scripts/verify-flow.mjs` para restauración JSON; agregar ensayo de dump y reportar tiempo, alcance y limitaciones. Ejecutar suites aplicables en base temporal.

**Dudas.** Definir RPO/RTO y destino cifrado de copias antes de operación diaria; no bloquean el ensayo local.

### P04 — Chat interno de consulta general (etapa futura)

**Identificación.** Origen: puntos 4 y 35; ambos describen el mismo chat. Tipo: diseñar etapa futura; prioridad sugerida media tras P01.

**Objetivo/actual.** Se pide preguntar por órdenes, clientes, proveedores y procesos dentro de la app. No se localizó chat general en `frontend/`; sí existe un agente acotado a mensajes de proveedor (`backend/agent/supplier-message-worker.ts`). “Claude” en el dictado es posibilidad, no elección de proveedor.

**Contexto real.** La UI vive en `frontend/page.tsx`/`frontend/ui.tsx`; datos en `db/schema.ts`; rutas de lectura pasan por API. La futura conversación y su endpoint son **archivos propuestos**, no presentes.

**Alcance.** Diseñar consultas de solo lectura con contexto recuperado bajo permisos, referencias a registros y respuestas que distingan hechos de inferencias. Prototipar con datos ficticios; no conectar WhatsApp ni activar acciones mutantes ni cambiar de LLM solo por preferencia.

**Recorrido.** Usuario autenticado abre chat, pregunta por reparaciones esperando pieza; el asistente consulta únicamente registros permitidos, muestra resumen y enlaces internos; si hay ambigüedad, pide precisar; cerrar y reabrir respeta política de conversación que se defina.

**Datos/permisos.** Minimización de datos, límites de historial y auditoría; el modelo no recibe acceso directo a PostgreSQL ni secretos.

**Orientación.** Proponer interfaz de herramientas de lectura sobre backend, no reutilizar automáticamente la credencial de ingreso de proveedores como identidad humana.

**Aceptación del diseño.** Contrato de consultas, matriz de permisos, estados de error, casos de cita y mockup integrable; cero respuesta inventada sobre registros inexistentes.

**Verificación/entrega.** Plan de pruebas con roles, ambigüedad y datos sintéticos; cuando se implemente, añadir E2E y comandos estándar. Entregar ADR solo tras decisión.

**Dudas.** Bloquean activación: LLM, alcance de datos, retención de conversaciones, costos y roles. Ubicación exacta del botón es detalle de UI.

### P05 — Conexión real de WhatsApp para proveedores (etapa futura)

**Identificación.** Origen: punto 5. Tipo: diseñar etapa futura; prioridad sugerida posterior. Depende de proveedor/canal autorizado y P08/P23.

**Objetivo/actual.** Se desea enviar consultas y recibir respuestas reales. `db/schema.ts` admite `supplier_inbound_messages.channel='whatsapp'`, `app/api/agent/supplier-messages/route.ts` ingresa mensajes y `supplier-message-worker.ts` procesa propuestas. Esto **no prueba** un adaptador WhatsApp real ni autorización de envío.

**Contexto real.** `frontend/supplier-inbox.tsx`, `frontend/supplier-quote-workflow.tsx`, `backend/http/agent-supplier-messages.ts` y `docs/agent-supplier-ingress.md` son puntos de integración. Adaptador externo sería nuevo.

**Alcance.** Diseñar alta de canal, verificación de webhooks, identidad de proveedor, idempotencia, consentimiento/plantillas, cola/reintentos, estados de entrega, pausado y observabilidad. No enviar a contactos reales en esta etapa ni almacenar tokens en código.

**Recorrido.** Operador selecciona proveedores, confirma solicitud; canal envía con referencia; respuesta entra y se coteja. Si dos solicitudes coinciden, pasa a revisión; una tardía no reabre compra.

**Datos/permisos.** Separar consultar de ordenar; ninguna compra sin aprobación. Conserva mensaje original y no expone precio al cliente.

**Orientación.** Encapsular canal detrás de contrato y reusar ingreso actual; probar primero con simulador de webhook y números ficticios.

**Aceptación del diseño.** Matriz de éxito/fallo/duplicado, estados y pruebas de correlación; desactivar canal no impide usar Salvacel local.

**Verificación/entrega.** Diseñar pruebas unitarias/API y E2E sin red externa; luego pruebas controladas con canal autorizado. Documentar incertidumbres.

**Dudas.** Bloquean integración real: proveedor oficial, cuenta, reglas de mensajes, permisos de envío y tratamiento de teléfonos.

### P06 — Auditoría visual y legibilidad de listas

**Identificación.** Origen: puntos 6 y 33; ambas son revisión visual, con énfasis en listas. Tipo: verificar/corregir; prioridad sugerida alta para usabilidad.

**Objetivo/actual.** Detectar desbordes, jerarquía inconsistente y bajo contraste. Hay estilos en `app/globals.css` y CSS móviles, con componentes propios y HeroUI 3; no se hicieron capturas ni navegación en esta revisión, así que los defectos descritos son observaciones del usuario.

**Contexto real.** `frontend/ui.tsx` agrupa navegación/diálogo; `frontend/orders.tsx`, `pos.tsx`, `suppliers.tsx`, `parts.tsx`, `settings-workspace.tsx` son áreas clave. `app/orders-mobile.css`, `catalog-mobile.css`, `quotes-mobile.css` cubren tamaños menores.

**Alcance.** Auditar primero escritorio/móvil y claro/oscuro; corregir alineación, contraste, foco, texto y consistencia de acciones en listas de productos/proveedores/existencias. Preservar flujos, reglas y datos. No migrar toda la biblioteca ni rehacer pantallas sanas.

**Recorrido.** Personal escanea lista, distingue estado/acción, opera con teclado y móvil; textos largos no tapan botones ni importes.

**Datos/permisos.** No alterar semántica de estados ni mostrar costos a roles no autorizados.

**Orientación.** Crear inventario visual antes/después y reusar tokens/componentes existentes; evitar color como única señal.

**Aceptación.** No hay desbordes en datos sintéticos largos; controles alineados y con etiqueta/foco; claro y oscuro legibles en anchos de móvil/escritorio.

**Verificación/entrega.** Capturas comparativas y pruebas visuales/manuales, `pnpm lint`, `pnpm build`, `pnpm test:e2e`; registrar pantallas revisadas y las no revisadas.

**Dudas.** No bloquea: nivel exacto de brillo/sombra. El cambio de negocio nunca debe deducirse de una preferencia estética.

### P07 — Inicio de sesión sin carcasa de la aplicación

**Identificación.** Origen: 6.1. Tipo: corregir tras prueba; prioridad sugerida alta. Depende de conservar P01.

**Objetivo/actual.** El usuario quiere login limpio sin menú ni contenido de Salvacel detrás. En `frontend/page.tsx`, `if(locked)return <AuthLogin .../>` está antes del retorno de `WorkshopLayout`, por lo que el shell protegido no se renderiza cuando la sesión está bloqueada. Implementación presente; no se probó visualmente ni se ejecutó aquí la verificación de auth.

**Contexto real.** `frontend/auth-login.tsx`, `frontend/page.tsx`, `frontend/ui.tsx`, `app/api/auth/route.ts`.

**Alcance.** Verificar pantalla de acceso independiente antes del shell al no haber sesión; mantener setup inicial, errores y retorno a ruta autorizada tras login. No exponer menú, búsquedas ni acciones detrás. No tocar claves ni política de auth.

**Recorrido.** Visitante abre URL profunda, ve solo login; al entrar ve página permitida; al salir vuelve a login; error muestra mensaje sin filtrar datos.

**Datos/permisos.** El servidor sigue siendo autoridad; ocultar shell no reemplaza autorización API.

**Orientación.** La rama de render ya está separada en `Taller`; preservar `AuthLogin` y cubrir hidratación, foco y deep links con pruebas.

**Aceptación.** DOM sin nav protegido en sesión anónima; ninguna API de taller devuelve datos sin sesión; login/logout y ruta profunda funcionan.

**Verificación/entrega.** Extender E2E de autenticación y captura móvil/escritorio; comandos estándar. Señalar si setup inicial se probó solo en ensayo.

**Dudas.** No hay decisión comercial bloqueante; decidir solo si la ruta profunda se restaura tras login o se usa la vista inicial.

### P08 — Recorrido completo de cotizaciones por reparación

**Identificación.** Origen: punto 7. Tipo: verificar/corregir; prioridad sugerida alta. Depende de proveedores ficticios.

**Objetivo/actual.** La cotización debe permanecer ligada al trabajo/equipo. `ReceptionForm` permite `requestQuote` y varios `quoteSupplierIds`; `RecordForm` también tiene solicitud en orden rápida; `price_requests`, `price_request_suppliers`, `supplier_responses` y `supplier_inbox` existen. No se ejecutó el recorrido en navegador.

**Contexto real.** `frontend/reception-form.tsx`, `record-form.tsx`, `supplier-quote-workflow.tsx`, `supplier-inbox.tsx`, `orders.tsx`; `backend/http/procurement.ts`, `agent-supplier-messages.ts`; `db/schema.ts`.

**Alcance.** Probar orden con dos equipos, varias reparaciones, una con pieza y otra sin; comparar ofertas, calidad, precio, envío y entrega; confirmar selección humana, cancelación y llegada tardía. Corregir únicamente hallazgos; no activar envío WhatsApp ni comprar por selección de consulta.

**Recorrido.** Crear recepción ficticia, elegir proveedores, guardar, abrir orden, recibir respuestas simuladas fragmentadas/ambiguas, revisar propuesta, elegir oferta o cerrar solicitud; el detalle muestra el trabajo exacto.

**Datos/permisos.** Conservar mensaje original, referencias y estados; no asociar por proximidad temporal únicamente. Respuestas ambiguas van a revisión. Precio al cliente distinto del costo proveedor.

**Orientación.** Reutilizar flujo existente y `scripts/verify-agent-worker.mjs`; no fusionar solicitud de precio con pedido firme.

**Aceptación.** Dos solicitudes simultáneas no cruzan respuestas; pieza sin respuesta sigue pendiente; respuesta tardía no compra; error/reintento no duplica.

**Verificación/entrega.** Extender `scripts/verify-flow.mjs` y E2E; `pnpm test:flow`, `pnpm test:e2e`, lint/build. Entregar matriz de casos.

**Dudas.** Texto exacto y proveedor del canal son futuros; no bloquean prueba simulada.

### P09 — Garantía, cancelación y reembolso de extremo a extremo

**Identificación.** Origen: punto 8. Tipo: verificar/corregir; prioridad sugerida alta. Depende de definir saldos y aprobación.

**Objetivo/actual.** Deben verse causa, devolución y pendiente. Ya existen `warranty_claims`, `order_resolutions`, `frontend/warranty-claim-panel.tsx`, `resolution-dialog.tsx`, `orders.tsx`; eso no prueba claridad del recorrido.

**Contexto real.** `backend/http/taller.ts`, `db/schema.ts`, `frontend/tickets.tsx`, `payments.tsx`; ADR `docs/adr/0007-reembolsos-como-movimientos-separados.md` y `0008-seguimiento-operativo-de-garantias.md`.

**Alcance.** Ensayar garantía dentro/fuera de plazo, cancelación con y sin pagos, abono parcial y reembolso parcial/total; mejorar UI/API solo donde el caso falle. Preservar movimientos inmutables y trazabilidad; nunca borrar pagos para “corregir” saldo.

**Recorrido.** Operador abre orden, inicia reclamo o resolución, ve importe disponible, confirma razón y método, recibe estado/ticket actualizado; cancelar diálogo no guarda.

**Datos/permisos.** Reparación, refacción y pago conservan estados distintos; entregada puede tener adeudo. Un reembolso no supera lo pagado neto ni se cuenta dos veces.

**Orientación.** Revisar primero reglas existentes de backend/ADR; usar dos monedas por separado, no convertir montos sin tasa.

**Aceptación.** Historial muestra cada evento con fecha/razón/importes; reintento no duplica reembolso; cancelación con saldo informa lo restante; garantía no altera pago sin acción explícita.

**Verificación/entrega.** Pruebas de `scripts/verify-flow.mjs`, E2E de resolución y tickets; ejecutar comandos estándar y reportar casos no cubiertos.

**Dudas.** Bloquea cambios comerciales: política de reembolso y garantía fuera de plazo; la verificación de casos actuales puede comenzar.

### P10 — Aviso de respaldo separado y accionable

**Identificación.** Origen: punto 9. Tipo: verificar/corregir UI; prioridad sugerida media. Depende de distinguir P03.

**Objetivo/actual.** El aviso “sin respaldo” no debe confundirse con configuración general. Existen `settings.lastBackupAt`, `backupWarningDays`, `frontend/settings-workspace.tsx` y `recovery-snapshots.tsx`; no se verificó el diseño en navegador.

**Contexto real.** `frontend/settings.tsx`, `settings-advanced.tsx`, `settings-workspace.tsx`, `ui.tsx`, `scripts/backup-local-db.mjs`.

**Alcance.** Separar advertencia de controles, explicar qué copia falta/antigüedad y enlazar una acción real disponible; no prometer restauración ni iniciar dump desde navegador si no existe backend seguro.

**Recorrido.** Admin ve aviso, entra a respaldo, identifica última fecha y puede ejecutar el mecanismo documentado; aviso cambia tras respaldo válido. No admin ve solo información permitida.

**Datos/permisos.** Fecha visible debe corresponder al dump exitoso, no a clic o exportación JSON fallida. Mantener `backup.manage`.

**Orientación.** Inspeccionar composición antes de editar CSS; reutilizar ajustes actuales y documentar diferencia dump/JSON.

**Aceptación.** Alerta separada y clara en móvil/escritorio; no se da por respaldado tras fallo; enlace lleva a acción/documentación válida.

**Verificación/entrega.** Probar estados sin copia, copia reciente y vencida en ensayo; E2E del aviso y comandos estándar.

**Dudas.** No bloquea: posición exacta. Política de retención del dump pertenece a P03.

### P11 — Punto de venta como vista inicial configurable

**Identificación.** Origen: puntos 10 y 38; ambos tratan la vista inicial. Tipo: verificar/corregir; prioridad sugerida alta. Depende de decidir el valor por defecto de cuentas nuevas.

**Objetivo/actual.** Se pidió abrir POS tras login y luego se observó una preferencia ya agregada. `frontend/settings.tsx` muestra “Vista inicial”; `frontend/lib/prefs.ts` tiene `initialView`, actualmente `home` por defecto, y `frontend/ui.tsx` usa `initialRoute()` para escoger URL o preferencia local. No se probó persistencia entre equipos/sesiones.

**Contexto real.** `frontend/page.tsx` conserva `view` y navega; `frontend/pos.tsx` es el destino.

**Alcance.** Verificar guardado, reingreso y prioridad entre URL explícita y preferencia. Si se acuerda, cambiar solo valor inicial a POS para usuarios nuevos, respetando elecciones existentes; no forzar POS al seguir enlace interno válido. No duplicar opción en Configuraciones.

**Recorrido.** Usuario elige POS, sale y entra, llega a POS; después elige Órdenes y sucede lo mismo; una URL profunda autorizada abre su destino.

**Datos/reglas/permisos.** Preferencia local por navegador no equivale a preferencia por cuenta; decidir alcance antes de prometer sincronización. Si rol no puede usar destino, caer a vista permitida.

**Orientación.** Partir de `initialRoute`, `loadPrefs/savePrefs` y pantalla actual; evitar cambios de backend si se acepta preferencia local.

**Aceptación.** Elección se mantiene tras reload; nuevo perfil usa default acordado; preferencia inválida tiene fallback; login no muestra shell antes de autenticar.

**Verificación/entrega.** E2E con almacenamiento limpio y existente, `pnpm lint/build/test:e2e`; informar si se probó en un solo navegador.

**Dudas.** Bloquea default: ¿POS para todas las cuentas nuevas o solo recepcionistas? Recomiendo por rol, preservando preferencias previas; sincronizar entre dispositivos es decisión aparte.

### P12 — Cobrar órdenes y vender productos en POS

**Identificación.** Origen: punto 11. Tipo: verificar/corregir; prioridad sugerida alta. Depende de identidad de cliente (P17/P19) y permisos.

**Objetivo/actual.** Se solicita agregar abonos/liquidaciones al ticket de venta y permitir venta anónima. `frontend/pos.tsx` ya tiene carrito, `OrderPicker`, `orderPayment` y checkout mixto; `sales` tiene `customerId`, `orderId`, `orderPaymentCents` en `db/schema.ts`. Falta comprobar búsqueda de cliente y recibo real en UI.

**Contexto real.** `frontend/pos.tsx`, `tickets.tsx`, `payments.tsx`, `backend/http/taller.ts`, `db/schema.ts`.

**Alcance.** Probar cliente conocido, venta anónima, pago de orden solo, carrito mixto y dos monedas; corregir selección/ficha/ticket y cálculo sin crear cobros duplicados. No obligar a registrar cliente para venta de mostrador.

**Recorrido.** Cajero busca folio/nombre/teléfono, selecciona orden abierta con saldo, escribe abono o total, agrega producto opcional, elige método, confirma y obtiene ticket; cancelar no mueve caja ni stock.

**Datos/reglas/permisos.** Pago no supera saldo salvo regla explícita; venta vinculada cuenta una vez en perfil/caja; cambio en efectivo se calcula sobre total cobrado, sin mezclar monedas. Fallo de guardado deja carrito recuperable.

**Orientación.** Mantener transacción actual de `createSale` y pruebas de flujo; ampliar `OrderPicker`/selector cliente solo si falta.

**Aceptación.** Venta anónima funciona; abono parcial reduce saldo; venta mixta produce un ticket correcto; reintento con misma clave no duplica venta/pago/stock.

**Verificación/entrega.** Añadir casos a `scripts/verify-flow.mjs` y E2E de POS; comandos estándar. Mostrar cálculo esperado con datos ficticios.

**Dudas.** Bloquea combinar múltiples órdenes en un ticket: el esquema actual relaciona `sales` con un solo `orderId`; precisar si se pide una o varias. Lo demás puede verificarse ahora.

### P13 — Pago de refacciones a proveedores desde el flujo de caja

**Identificación.** Origen: punto 12. Tipo: diseñar/implementar; prioridad sugerida alta. Depende de reglas de caja y compra/recepción.

**Objetivo/actual.** Registrar pago real al proveedor de pieza aprobada/recibida desde un acceso de POS o caja. Ya existen `purchase_orders`, `purchase_receipts`, `supplier_payments`, `frontend/supplier-purchases.tsx` y `frontend/cash.tsx`; no se confirmó que POS ofrezca esa entrada, ni debe asumirse que cada recepción exige pago inmediato.

**Contexto real.** `frontend/pos.tsx`, `supplier-purchases.tsx`, `cash.tsx`, `backend/http/procurement.ts`, `backend/http/cash.ts`, `db/schema.ts`.

**Alcance.** Verificar flujo existente de pago; proponer enlace desde POS/caja solo si mejora operación. Mostrar proveedor, pieza, modelo, pedido, recibido/pagado/saldo; registrar egreso en método/currency correctos sin mover caja dos veces. No crear pago a partir de mera cotización.

**Recorrido.** Usuario localiza compra aprobada, verifica recepción y saldo, paga parcial/total, recibe comprobante/estado actualizado; cancela sin mutación; fallo/reintento no duplica.

**Datos/reglas/permisos.** Pagar contra pedido y saldo, conservar pagos históricos/anulaciones; factura/condiciones fiscales quedan fuera hasta especificarlas. Solo rol con permiso financiero.

**Orientación.** Reutilizar handler de `supplier_payments` y conciliación; si se añade ruta UI, no crear segundo ledger paralelo.

**Aceptación.** Pago parcial/total reduce saldo una vez y aparece en caja; presupuesto no genera egreso; usuario sin permiso no puede pagar; moneda consistente.

**Verificación/entrega.** Pruebas de caja/procurement (`scripts/verify-cash-flow.mjs`, `verify-flow.mjs`), E2E y comandos estándar; reconciliar conteos antes/después en base ficticia.

**Dudas.** Bloquea: ¿se permite anticipo a proveedor antes de recibir pieza? Recomiendo sí solo contra pedido aprobado y con estado explícito; no asumirlo.

### P14 — Ayuda contextual breve y accesible

**Identificación.** Origen: punto 13. Tipo: implementar selectivamente; prioridad sugerida baja. Depende de P06.

**Objetivo/actual.** Ayudar a personal nuevo a entender controles. Hay `frontend/components/ui/tooltip.tsx`, pero no se comprobó cobertura ni contenido.

**Contexto real.** `frontend/ui.tsx`, `orders.tsx`, `pos.tsx`, `parts.tsx`, `settings-workspace.tsx` y estilos globales.

**Alcance.** Inventariar términos/acciones ambiguos, añadir ayuda solo donde aporta (estados, saldo, precio/costo, solicitud vs compra, respaldo). Evitar iconos por cada elemento y no esconder información indispensable exclusivamente en hover.

**Recorrido.** Operador descubre ayuda con mouse, teclado o toque; lee explicación de una frase y sigue trabajando sin perder foco.

**Datos/permisos.** La ayuda no revela importes o acciones restringidas al rol; textos coherentes con estado real.

**Orientación.** Reutilizar tooltip existente y etiquetas visibles; probar compatibilidad móvil/accesibilidad.

**Aceptación.** Ayudas claves se abren con focus/tap, tienen texto útil, no bloquean botones ni se salen de pantalla; ningún control aparenta función que no tiene.

**Verificación/entrega.** Auditoría de controles, E2E/teclado/manual y capturas; comandos estándar. Listar dónde se agregó y dónde deliberadamente no.

**Dudas.** No hay bloqueos comerciales; contenido puede redactarse según funcionalidad verificada.

### P15 — Inicio operativo separado de resumen administrativo

**Identificación.** Origen: punto 14. Tipo: verificar/corregir; prioridad sugerida alta. Depende de P01.

**Objetivo/actual.** Personal necesita pendientes, stock bajo y piezas esperando; administración necesita ganancias/caja. `frontend/home.tsx` y `summary.tsx` ya son vistas separadas, pero no se confirmó filtrado por rol en UI/API. La indicación del documento de reservar **todas** las órdenes vencidas al admin se matiza por el prompt maestro: una orden vencida puede ser alerta operativa sin revelar ganancia.

**Contexto real.** `frontend/page.tsx` define nav y pasa `BootData`; `frontend/home.tsx`, `summary.tsx`, `backend/http/auth.ts`, `app/api/taller/route.ts`.

**Alcance.** Clasificar cada métrica por propósito/sensibilidad; mantener en Inicio lo accionable por operador (vencimientos, pieza, entrega, stock) y proteger márgenes/ganancias/movimientos financieros. Si `BootData` incluye información administrativa para un rol sin permiso, corregir proyección del servidor, no solo ocultar tarjeta.

**Recorrido.** Operador abre Inicio y resuelve pendientes; admin entra a Resumen y ve finanzas; ambos pueden abrir orden permitida desde alerta.

**Datos/permisos.** Definir qué importe es cobrado, facturado, saldo o resultado; no sumar dos veces venta mixta. No tratar vencimiento como secreto por defecto.

**Orientación.** Auditar `BootData` y `authorize`; diseñar vistas por permiso.

**Aceptación.** Operador ve alertas operativas sin ganancias; API tampoco revela campos restringidos; admin ve cifras con nombre/cálculo claro; enlaces llegan a registros correctos.

**Verificación/entrega.** E2E con dos roles y datos ficticios, pruebas API 403/proyección y comandos estándar.

**Dudas.** Bloquea: matriz de permisos financieros y qué significa “ganancia” para el negocio.

### P16 — Peso mexicano inicial sin reinterpretar dinero histórico

**Identificación.** Origen: punto 15. Tipo: verificar/corregir; prioridad sugerida alta. Depende de política de múltiples monedas.

**Objetivo/actual.** MXN debe ser moneda predeterminada; efectivo/tarjeta/transferencia son métodos. `db/schema.ts` inicia `defaultCurrency='MXN'`, registros admiten MXN/USD y `frontend/settings.tsx` permite cambiarlo; `RecordForm` todavía muestra conversión para revisión basada en USD 5.

**Contexto real.** `frontend/record-form.tsx`, `reception-form.tsx`, `settings.tsx`, `types.ts`, `backend/http/taller.ts`, `db/schema.ts`.

**Alcance.** Verificar que nuevas órdenes, presupuestos, POS y tickets adopten la preferencia sin cambiar importes históricos; separar selector de método de pago. Corregir cualquier pantalla que muestre USD por defecto injustificadamente. Diagnóstico se trata en P24, no aquí.

**Recorrido.** Admin elige MXN; nueva operación muestra MXN, método se elige independientemente; orden USD anterior conserva USD; cambiar preferencia no recalcula saldos antiguos.

**Datos/permisos.** Importes en centavos con código ISO; nunca convertir solo cambiando etiqueta; operaciones mixtas de moneda siguen bloqueadas o requieren conversión explícita.

**Orientación.** Seguir configuración existente y revisar valores por defecto en cada formulario/handler antes de migrar nada.

**Aceptación.** Moneda inicial MXN en datos nuevos; pago conserva moneda de orden; histórico USD intacto; métodos no aparecen como monedas.

**Verificación/entrega.** Extender flujo de dos monedas y E2E de preferencias; comandos estándar.

**Dudas.** Bloquea cualquier conversión automática: tasa, fecha y reglas contables; recomendación: no convertir históricos.

### P17 — Buscar y seleccionar cliente/equipo en ambas entradas de orden

**Identificación.** Origen: punto 16. Tipo: implementar; prioridad sugerida alta. Depende de P19 y de definir identidad de equipo.

**Objetivo/actual.** Buscar por nombre/apellido/cualquiera de los teléfonos y completar datos tras selección explícita. `ReceptionForm` tiene selector de `customers`; `RecordForm` sugiere por prefijo de teléfono **a partir de órdenes**, no selección robusta de perfil. `CustomerProfiles` tiene búsqueda por nombre/teléfono actual; `orders` conserva equipo en cada registro.

**Contexto real.** `frontend/reception-form.tsx`, `record-form.tsx`, `customer-profiles.tsx`, `overlays.tsx`; `db/schema.ts` (`customers`, `receptions`, `orders`).

**Alcance.** Unificar búsqueda/selección para Nueva orden y Nueva recepción, con normalización telefónica y opción “cliente nuevo”. Mostrar equipos anteriores como sugerencias; seleccionar equipo debe confirmarse, no presumir misma pieza/falla/trabajo. Preservar diferencias funcionales entre entrada rápida y recepción ramificada.

**Recorrido.** Escribe parte de apellido o teléfono, ve coincidencias, elige perfil, se llenan datos; elige equipo anterior o nuevo; cambia de cliente y se limpian datos específicos del anterior sin perder borrador (P26).

**Datos/permisos.** Evitar duplicado de `customers` al guardar; teléfono personal y adicional son diferentes. No copiar diagnóstico/precio previo sin acción explícita.

**Orientación.** Extraer selector reutilizable solo si simplifica ambos formularios; backend decide vinculación por `customerId`.

**Aceptación.** Ambos formularios encuentran por cuatro campos; nombre coincidente no selecciona solo; cambio de perfil no mezcla equipos; cliente ya existente no se duplica.

**Verificación/entrega.** E2E de dos homónimos, dos teléfonos, equipo nuevo/previo y guardado; `pnpm test:flow/e2e`, lint/build.

**Dudas.** Bloquea reutilizar equipo como entidad persistente: hoy no se localizó tabla `devices`; definir si basta sugerencia histórica o se desea expediente único.

### P18 — Acción global y discreta de Nueva orden

**Identificación.** Origen: punto 17. Tipo: implementar UI; prioridad sugerida media. Depende de P17 y P26.

**Objetivo/actual.** Comenzar recepción desde cualquier módulo. `OrdersView` ofrece crear; `frontend/page.tsx` conserva atajo `N` y ahora ofrece un botón flotante desde los demás módulos a cuentas con `orders.write`. El botón abre el formulario real sin cambiar la ruta ni crear datos al abrir; el E2E desde Punto de venta está agregado pero falta ejecutarlo y ampliar recorridos.

**Contexto real.** `frontend/page.tsx`, `ui.tsx`, `orders.tsx`, `overlays.tsx`.

**Alcance.** Dar acceso consistente a Nueva orden sin desplazar POS ni duplicar menús; elegir si abre flujo rápido o recepción ramificada conforme a diferencia real. Respetar permisos, estado de formularios y navegación.

**Recorrido.** Desde POS/Configuraciones, usuario pulsa Nueva orden, guarda o cierra; vuelve exactamente a vista previa y recupera borrador cuando exista.

**Datos/permisos.** Sin crear orden al abrir; `orders.write` en API y visibilidad UI; no descartar carrito o formulario ajeno por navegar.

**Orientación.** Reutilizar `setEditor`/`setReceptionCustomerId`; el botón flotante usa estilos responsive y no duplica la acción del encabezado de Órdenes.

**Aceptación.** Acción visible y usable por teclado/móvil en vistas permitidas; ausencia para rol sin permiso; abrir/cerrar no crea registro ni borra trabajo en curso. Apertura desde POS y permanencia en esa ruta están en E2E, pendiente de ejecución; falta probar cierre y más roles/vistas.

**Verificación/entrega.** E2E desde tres módulos con estados sin guardar; capturas móvil/escritorio y comandos estándar.

**Dudas.** Elegir destino por defecto (rápida o ramificada). Recomiendo recepción ramificada para múltiples equipos, manteniendo rápida si tiene caso claro.

### P19 — Teléfono personal y teléfono adicional diferenciados

**Identificación.** Origen: punto 18. Tipo: implementar; prioridad sugerida alta. Depende de política de contacto.

**Objetivo/actual.** Registrar un número principal y otro opcional, ambos buscables. `db/schema.ts` muestra `customers.phone` único y `recordFields().phone`; `ReceptionForm` solo captura un teléfono. No hay columna adicional localizada.

**Contexto real.** `frontend/reception-form.tsx`, `record-form.tsx`, `customer-profiles.tsx`, `db/schema.ts`, `backend/http/taller.ts`.

**Alcance.** Proponer migración aditiva conservadora para teléfono adicional y propagarlo a crear/editar/buscar cliente; distinguir copia histórica en orden de perfil actual. No hacer ambos obligatorios ni inferir consentimiento de marketing/servicio.

**Recorrido.** Usuario guarda cliente con uno o dos números, busca por cualquiera, edita el secundario, crea orden sin duplicar perfil; teléfono ausente se ve claramente.

**Datos/permisos.** Normalizar para búsqueda, preservar texto de presentación y números existentes. Evitar sobrescribir uno con otro. Los destinatarios de mensajes se deciden en P32.

**Orientación.** Añadir campo nullable/valor vacío según esquema actual, migración compatible, actualización API y `BootData`; probar datos anteriores.

**Aceptación.** Cliente anterior conserva teléfono; buscar por ambos funciona; duplicidad/homónimos exigen selección explícita; nuevo secundario no cambia principal.

**Verificación/entrega.** Migración probada en base temporal con registros previos, flujo y E2E; comandos estándar.

**Dudas.** Bloquea envíos, no registro: política de autorización de cada número y si el adicional pertenece a familiar/tercero.

### P20 — Tipo de dispositivo y modelo exacto

**Identificación.** Origen: punto 19. Tipo: verificar/ampliar; prioridad sugerida media. Depende del catálogo P31.

**Objetivo/actual.** Diferenciar teléfono, tableta y laptop y evitar confundir variantes. `orders.deviceType` existe; `ReceptionForm` define dispositivo con `deviceType`, marca/modelo libres; `RecordForm` rápido solo trae marca/modelo y no campo de tipo localizado.

**Contexto real.** `frontend/reception-form.tsx`, `record-form.tsx`, `settings-catalog.tsx`, `db/schema.ts`.

**Alcance.** Verificar opciones actuales y completar la entrada rápida. Diseñar distinción marca, nombre comercial, modelo técnico y variante 4G/5G cuando aplique, sin obligar catálogos exhaustivos desde el primer día. Compatibilidad de refacción nunca se infiere solo por nombre parecido.

**Recorrido.** Registrar tableta/laptop/teléfono; introducir modelo técnico y variante; al cotizar pieza se muestra identificación suficiente y se pide confirmación si es ambigua.

**Datos/permisos.** Conservar marca/modelo históricos libres; una migración a campos estructurados debe ser aditiva. Valor “otro” con descripción si la lista no cubre caso.

**Orientación.** Revisar opciones de `ReceptionForm` y códigos del backend; coordinar catálogo propuesto en P31.

**Aceptación.** Ambos flujos aceptan tres tipos; variante se conserva en orden/presupuesto/ticket; piezas no se autoasocian por similitud textual.

**Verificación/entrega.** E2E para tres tipos y modelos homónimos, flujo y comandos estándar.

**Dudas.** ¿Se necesita inventario maestro de equipos o solo atributos por orden? Recomiendo empezar aditivo y no deducir compatibilidad.

### P21 — Seleccionar solo proveedores elegibles para refacciones

**Identificación.** Origen: punto 20. Tipo: implementar; prioridad sugerida alta. Depende de clasificación P30.

**Objetivo/actual.** Elegir uno o varios proveedores de piezas desde la reparación. `ReceptionForm` y `RecordForm` ya ofrecen selección; `suppliers` tiene nombre/teléfono/activo, pero no categoría. Por tanto hoy no se puede garantizar desde datos que un proveedor venda refacciones.

**Contexto real.** `frontend/reception-form.tsx`, `record-form.tsx`, `supplier-quote-workflow.tsx`, `suppliers.tsx`; `backend/http/procurement.ts`, `db/schema.ts`.

**Alcance.** Incorporar categorías múltiples de proveedor mediante migración conservadora P30 y filtrar selector sin ocultar históricos. Si no hay elegibles, mostrar acción de registro o estado vacío; guardar solicitud solo cuando haya pieza y al menos un proveedor válido. “Solicitar precio” no equivale a encargar pieza ni a enviar WhatsApp real.

**Recorrido.** Usuario activa “requiere refacción” en una reparación, elige dos proveedores habilitados; guarda; los vínculos quedan en esa reparación; quitar selección antes de guardar no dispara mensaje.

**Datos/permisos.** Validar categoría/actividad en backend y revisar cambios de estado entre abrir y enviar. Un proveedor puede ser accesorio y refacción.

**Orientación.** Reutilizar `price_requests` y `price_request_suppliers`; evitar tabla de compras nuevas al consultar.

**Aceptación.** Proveedor solo-accesorios no aparece para cotizar pieza; proveedor mixto sí; un proveedor desactivado da error claro; dos reparaciones no comparten selección accidental.

**Verificación/entrega.** Pruebas API y E2E de ambos formularios, base temporal, comandos estándar.

**Dudas.** Definir categorías comerciales iniciales; no bloquea usar clasificación mixta aditiva.

### P22 — Historial interno de precios de refacción con antigüedad

**Identificación.** Origen: punto 21. Tipo: verificar/ampliar; prioridad sugerida media. Depende de identificación de modelo P20.

**Objetivo/actual.** Ver costo anterior, proveedor y fecha sin tratarlo como oferta actual. `part_quotes` almacena `quotedAt`, proveedor/modelo/pieza/costo; `frontend/suppliers.tsx` marca antigüedad con `settings.quoteStaleDays` actualmente 30, no un año fijo. El año del documento es ejemplo de umbral solicitado, no debe reemplazarse silenciosamente.

**Contexto real.** `frontend/suppliers.tsx`, `supplier-quote-workflow.tsx`, `settings.tsx`, `db/schema.ts`.

**Alcance.** Mostrar histórico contextual de pieza exacta y similares claramente separados, fecha/calidad/proveedor/moneda; acordar umbral configurable o regla de un año. Reutilizarlo exige confirmación humana y jamás incluir precio histórico en mensaje nuevo al proveedor por defecto.

**Recorrido.** Al solicitar pantalla, operador ve dos registros con fechas y comparación; confirma reutilizar solo como referencia interna o pide cotización actual.

**Datos/permisos.** No mezclar moneda/costo proveedor/precio al cliente; “similar” requiere etiqueta explícita y no supone compatibilidad.

**Orientación.** Revisar búsqueda actual en `QuoteForm` y configuración de caducidad; evitar duplicar `part_quotes` si ya cubre historia.

**Aceptación.** Precio viejo muestra advertencia, proveedor y fecha; se puede crear solicitud nueva sin filtrarlo; elegir referencia no crea compra ni altera histórico.

**Verificación/entrega.** Pruebas de fechas límite, monedas/modelos variantes y E2E con datos ficticios; comandos estándar.

**Dudas.** Bloquea umbral exacto: documento dice “más de un año” y código tiene 30 días; presentar opciones y recomendar configurable con valor aprobado.

### P23 — Mensajes de consulta distintos según historial de proveedor (futuro)

**Identificación.** Origen: punto 22. Tipo: diseñar etapa futura; prioridad sugerida media después de P05/P21.

**Objetivo/actual.** Consultar a varios proveedores sin revelar margen: a quien ya surtió, preguntar existencia/precio vigente; a otro, pedir precio/disponibilidad. `price_requests` soporta asociaciones y referencias; no se comprobó salida real de WhatsApp.

**Contexto real.** `frontend/supplier-quote-workflow.tsx`, `backend/http/procurement.ts`, `db/schema.ts`, `docs/agent-supplier-ingress.md`.

**Alcance.** Diseñar plantilla parametrizada por proveedor y pieza, vista previa y aprobación de envío, referencia de correlación, registros de entrega/fallo; conservar consultas múltiples como **una necesidad de pieza** con varias asociaciones. Nunca comunicar precio de venta al cliente o costo histórico automáticamente. No enviar nada hasta P05.

**Recorrido.** Operador elige proveedor existente/nuevo, revisa texto, confirma consulta; cada respuesta se vincula a su solicitud; si proveedor no responde sigue pendiente; cerrar una asociación no cancela orden.

**Datos/permisos.** Identidad de proveedor autorizada, ventana de respuestas global si se usa, reintentos idempotentes. No elegir oferta por modelo.

**Orientación.** Reutilizar `correlationRef` y cola de entrada actual; contrato de salida sería propuesta nueva, no ruta inventada como existente.

**Aceptación del diseño.** Plantillas muestran contenido técnico correcto sin precio cliente; multi-proveedor no crea múltiples compras; fallo/reintento y respuesta ambigua tienen destino definido.

**Verificación/entrega.** Simulador de envío/webhook en base ficticia y plan de E2E; comandos estándar cuando se implemente.

**Dudas.** Bloquea envío: canal autorizado, redacción exacta y si se exige confirmación antes de cada consulta. Recomiendo vista previa al principio.

### P24 — Diagnóstico como concepto editable y cobrable después

**Identificación.** Origen: punto 23. Tipo: implementar; prioridad sugerida alta. Depende de decidir su relación con reparación posterior.

**Objetivo/actual.** Registrar diagnóstico independiente, importe editable y pago inicial/parcial/final. `recordFields` contiene `reviewCents`, `applyReview`, `reviewUsdCents` por defecto 500; `RecordForm` calcula revisión desde tarifa USD y conversión. `order_repairs` tiene `reviewCents`, pero no se localizó un concepto de diagnóstico separado del servicio. Pagos de orden sí existen.

**Contexto real.** `frontend/record-form.tsx`, `reception-form.tsx`, `settings.tsx`, `payments.tsx`, `tickets.tsx`; `backend/http/taller.ts`, `db/schema.ts`.

**Alcance.** Definir importe editable por orden/reparación según negocio, presentar diagnóstico una sola vez en total/ticket y permitir cobrarlo mediante saldo normal aun antes de autorizar reparación. No mantener USD 5 fijo como regla nueva ni duplicarlo en mano de obra. Conservar históricos y pagos actuales.

**Recorrido.** Recepción registra diagnóstico ficticio de MXN 180; cliente abona MXN 80 y paga resto más tarde; al autorizar reparación se ve con claridad qué se suma o descuenta según decisión aprobada.

**Datos/permisos.** Total = conceptos no duplicados; saldo = cargos aprobados menos pagos netos y devoluciones aplicables. Una edición posterior no reinterpreta cobros históricos.

**Orientación.** Evaluar si `reviewCents` puede representar el concepto sin migrar o si requiere línea contable nueva; documentar el contrato antes de cambiar cálculos.

**Aceptación.** Importe editable, pago parcial y posterior; ticket refleja un único diagnóstico; órdenes antiguas conservan saldo; no se exige abono al recibir.

**Verificación/entrega.** Casos de cálculo/reembolso en flujo y E2E, migración temporal si procede, comandos estándar.

**Dudas.** Bloquea cálculo: ¿diagnóstico se acredita al precio de reparación aceptada o siempre se cobra adicional? Presentar ambos con efectos de saldo; no asumir.

### P25 — Historial y sugerencias de precios de diagnóstico

**Identificación.** Origen: punto 24. Tipo: implementar; prioridad sugerida media. Depende de P24 y precisión de modelos P20.

**Objetivo/actual.** Mostrar precios usados para diagnósticos semejantes sin imponer tarifa. No se localizó entidad dedicada de historial; sí hay importes `reviewCents` en órdenes/reparaciones y servicios en `services`.

**Contexto real.** `db/schema.ts`, `frontend/record-form.tsx`, `reception-form.tsx`, `settings-catalog.tsx`.

**Alcance.** Diseñar consulta de registros históricos por tipo/modelo/variante, fecha y moneda, excluyendo cancelados si la política así lo exige; permitir seleccionar sugerencia o importe libre. No recalcular órdenes previas.

**Recorrido.** Usuario introduce modelo, recibe importes anteriores con fechas; elige uno o escribe otro; guarda el importe de esta orden y puede revisar qué se cobró realmente.

**Datos/permisos.** Diferenciar tarifa de catálogo, precio cotizado y pago recibido. Limitar exposición de precios por rol. Similaridad no implica mismo dispositivo.

**Orientación.** Priorizar una vista derivada de registros existentes; migrar solo si faltan metadatos indispensables.

**Aceptación.** Dos históricos de fechas distintas se distinguen; no hay autoprecio silencioso; importe manual gana sobre sugerencia; histórico no cambia tras editar catálogo.

**Verificación/entrega.** Prueba con modelos homónimos/monedas y órdenes antiguas, E2E y comandos estándar.

**Dudas.** Definir si incluir precios anulados/cancelados y qué variante constituye “similar”; recomendación: exactos primero, similares etiquetados.

### P26 — Borradores persistentes y cierre de modal sin pérdida

**Identificación.** Origen: puntos 25 y 26, agrupados porque cerrar depende de la política de borradores. Tipo: implementar; prioridad sugerida alta. Depende de P17.

**Objetivo/actual.** Conservar varias órdenes incompletas y recuperarlas aun al cerrar modal/sección/navegador. `RecordForm`/`ReceptionForm` guardan estado React y `frontend/ui.tsx` cierra `Modal`; eso **no demuestra** persistencia tras desmontaje o cierre del navegador. No se localizó entidad de borradores en `db/schema.ts`.

**Contexto real.** `frontend/record-form.tsx`, `reception-form.tsx`, `overlays.tsx`, `ui.tsx`; `backend/http/taller.ts`, `db/schema.ts`.

**Alcance.** Definir estado `borrador` separado de orden confirmada, autosave, lista de recuperación por usuario/cliente y descarte individual confirmado. Modal puede cerrarse por botón, Esc y clic fuera si accesibilidad/confirmación preservan datos. No crear folio definitivo ni cobrar mientras sea borrador.

**Recorrido.** Comienza orden A, cambia a B y a otro módulo, vuelve y elige A; cierra navegador y recupera A; descarta B confirmando; guardar A definitivamente elimina o marca convertido solo su borrador.

**Datos/permisos.** Aislar borradores por usuario y clave única, evitar mezclar cliente/equipo, cifrar o proteger datos sensibles según almacenamiento; no afirmar persistencia si solo se usa memoria/localStorage sin política clara. Evitar duplicado en reintentos.

**Orientación.** Elegir backend persistente si se requiere resistencia a cierre/equipo; migración aditiva y TTL opcional no aprobado. Reusar formulario existente.

**Aceptación.** A/B independientes, recuperación tras reload, clic fuera no borra, descarte confirmado afecta solo elegido, fallo de autosave visible y reintentable.

**Verificación/entrega.** E2E de cierre/reload/cambio de cliente y permisos, pruebas de conflicto/duplicado, comandos estándar.

**Dudas.** Bloquean: borrador compartido entre usuarios/equipos y retención. Recomiendo privado por creador hasta asignación explícita.

### P27 — Perfil de cliente con historial económico sin doble conteo

**Identificación.** Origen: punto 27. Tipo: ampliar; prioridad sugerida media. Depende de P17/P19 y permisos.

**Objetivo/actual.** El cliente debe reunir órdenes actuales/pasadas, reparaciones, compras, comprobantes e importes. `frontend/customer-profiles.tsx` ya presenta reparaciones y compras, pero no se localizó en esa vista un historial íntegro de pagos/tickets ni un “total gastado” inequívoco.

**Contexto real.** `frontend/customer-profiles.tsx`, `tickets.tsx`, `payments.tsx`, `pos.tsx`; `db/schema.ts` (`customers`, `orders`, `payments`, `sales`, `sale_items`, `order_resolutions`).

**Alcance.** Ampliar perfil con secciones y enlaces a comprobantes existentes, definir métricas separadas: importe vendido, cobrado neto, saldo y devoluciones. No sumar ticket de venta mixta y su pago de orden dos veces; ventas anónimas permanecen sin atribuir.

**Recorrido.** Selecciona perfil, consulta órdenes/ventas/pagos/tickets cronológicos; abre detalle; si hay devolución, ve efecto en cobrado neto. Otro homónimo no mezcla historial.

**Datos/permisos.** Vinculación por `customerId`, no coincidencia de nombre/teléfono; preservar ordenes históricas no vinculadas y permitir reconciliación explícita. Ocultar datos financieros según rol.

**Orientación.** Calcular a partir del ledger existente, no almacenar “total gastado” duplicado sin necesidad; paginar si volumen crece.

**Aceptación.** Venta vinculada aparece una vez, venta anónima no; abono y reembolso ajustan neto; saldo coincide con orden; comprobante corresponde a operación.

**Verificación/entrega.** Pruebas de agregación, E2E con dos homónimos y venta mixta, comandos estándar.

**Dudas.** Bloquea rotular “total gastado”: ¿ventas contratadas o efectivo neto recibido? Recomiendo mostrar ambas métricas con nombre explícito.

### P28 — Presupuesto recuperable y conversión sin duplicar cliente

**Identificación.** Origen: punto 28. Tipo: verificar/ampliar; prioridad sugerida alta. Depende de P17 y quizá P19.

**Objetivo/actual.** Presupuestar antes de recibir equipo, encontrar interesado y convertir a orden conservando historial. `frontend/quotes.tsx` ya filtra convertidos; `backend/http/taller.ts` tiene `convertQuote`, `orders.quoteId` es único y el flujo de prueba comprueba enlace. `quotes` hereda datos personales en `recordFields`, pero no se localizó `customerId` propio para presupuestos.

**Contexto real.** `frontend/record-form.tsx`, `quotes.tsx`, `customer-profiles.tsx`; `db/schema.ts`, `scripts/verify-flow.mjs`.

**Alcance.** Probar búsqueda, edición, vigencia, conversión idempotente y estado convertido. Si se requiere perfil persistente antes de orden, enlazar presupuesto a `customers` de forma aditiva sin duplicar persona. No borrar presupuesto convertido.

**Recorrido.** Se captura presupuesto de interesado ficticio, se encuentra semanas después por datos, se acepta, se vincula o elige cliente existente, se convierte una vez y se abre orden; presupuesto sale de pendientes y queda en historial.

**Datos/permisos.** No usar coincidencia de nombre para unir automáticamente. Conservar importe/moneda y relación; cambios posteriores al presupuesto histórico requieren versionado o política clara.

**Orientación.** Reutilizar `convertQuote` y filtro `convertedOrderId`; añadir vínculo cliente solo si la prueba confirma la carencia.

**Aceptación.** Conversión repetida no crea segunda orden; cliente existente no se duplica; presupuesto aún consultable y folio de orden enlazado.

**Verificación/entrega.** Reusar prueba `verify-flow` de conversión, añadir E2E de perfil y persistencia; comandos estándar.

**Dudas.** Decidir si todo presupuesto crea perfil desde el inicio o solo al aceptarse. Recomiendo perfil desde captura con selección explícita y campos mínimos.

### P29 — Estados separados de orden, refacción y pago

**Identificación.** Origen: punto 29. Tipo: verificar/corregir; prioridad sugerida alta. Depende de P08/P09.

**Objetivo/actual.** Distinguir proceso, espera de pieza, listo y adeudo. `orders.status` ya incluye `nueva`, `proceso`, `esperando_refaccion`, `terminada`, `entregada`, `cancelada`; `part_requests.status` tiene ciclo propio y deuda se deriva de importes/pagos. Falta comprobar consistencia de pantallas y transiciones.

**Contexto real.** `frontend/orders.tsx`, `parts.tsx`, `components/order-operations-ribbon.tsx`, `payments.tsx`, `types.ts`; `db/schema.ts`, `backend/http/taller.ts`.

**Alcance.** Auditar matrices de transición y etiquetas en lista, banda, modal, tickets y filtros. No sustituir estados históricos ni confundir entregada con liquidada. Evitar que parte recibida marque orden terminada automáticamente sin trabajo hecho.

**Recorrido.** Orden inicia, espera pieza, pieza disponible, reparación terminada, entrega con/sin saldo según confirmación; cancelación sale de banda activa pero permanece en historial.

**Datos/permisos.** Estado de orden ≠ parte ≠ pago. Transición inválida responde error y no cambia otras entidades.

**Orientación.** Reutilizar enums y mapeos existentes, centralizar etiquetas si hay contradicción; migrar solo si un estado nuevo es imprescindible.

**Aceptación.** Todos los módulos muestran mismo estado; entregada con saldo aparece pendiente de cobro; cancelada no desaparece de historial; reabrir exige permiso/confirmación.

**Verificación/entrega.** Tabla de transiciones, pruebas flujo/UI con órdenes históricas y comandos estándar.

**Dudas.** Si se requieren estados nuevos, definir actor, transición y efecto financiero antes de agregarlos.

### P30 — Clasificación de proveedores e inventario de accesorios

**Identificación.** Origen: punto 30. Tipo: ampliar; prioridad sugerida alta. Depende de migración conservadora y P21.

**Objetivo/actual.** Separar proveedores de piezas/accesorios/materiales e inventario de venta. `products` ya guarda SKU/categoría/costo/precio/stock; `stock_movements` registra cambios; `suppliers` carece de categoría y `products` no muestra `supplierId` directo en esquema. `frontend/pos.tsx` administra inventario y `suppliers.tsx` directorio.

**Contexto real.** `frontend/pos.tsx`, `suppliers.tsx`, `supplier-purchases.tsx`; `backend/http/procurement.ts`, `backend/http/taller.ts`, `db/schema.ts`.

**Alcance.** Conservar inventario actual; agregar categorías múltiples de proveedor y vínculo de abastecimiento de producto si el negocio lo requiere. Diferenciar pieza para reparación de producto revendible; filtrar proveedores de refacciones en P21. No asignar categoría por inferirla de nombre/notas.

**Recorrido.** Admin clasifica proveedor como refacciones y accesorios, crea producto con SKU/costo/precio/stock y registra origen; operador busca artículo en POS; al cotizar reparación ve solo elegibles.

**Datos/permisos.** Clasificación aditiva con estado “sin clasificar” para históricos, sin perder compras anteriores. Costo y precio al cliente son distintos; movimientos de stock auditables.

**Orientación.** Reusar `products`, `stock_movements`, `purchase_order_items`; si se necesita multi-proveedor por producto, proponer relación aparte, no columna única que impida alternativas.

**Aceptación.** Proveedor mixto sirve ambos flujos; proveedor solo accesorio no aparece en refacciones; producto histórico queda legible; venta descuenta stock una vez.

**Verificación/entrega.** Migración temporal con datos previos, flujo de compra/venta y E2E; comandos estándar.

**Dudas.** Decidir si un producto puede tener varios proveedores y si “materiales” se inventarían igual que accesorios. Recomiendo relación múltiple opcional.

### P31 — Catálogos de marcas/modelos/servicios separados de preferencias

**Identificación.** Origen: punto 31. Tipo: ampliar; prioridad sugerida media. Depende de P20.

**Objetivo/actual.** Administrar marcas/modelos y servicios claramente, dejar métodos de pago en Configuraciones. `db/schema.ts` tiene `brands`, `services`, `payment_methods` pero no tabla de modelos; `frontend/settings-catalog.tsx` reúne catálogos y `settings-workspace.tsx` tiene pestaña Catálogos. Esto puede ser ya suficiente para parte del pedido, pero no para modelos exactos.

**Contexto real.** `frontend/settings-catalog.tsx`, `settings-workspace.tsx`, `record-form.tsx`, `reception-form.tsx`; `db/schema.ts`, `backend/http/taller.ts`.

**Alcance.** Verificar navegación actual y separar conceptos: marcas/modelos y servicios como datos maestros, métodos de pago como preferencia. Añadir modelo técnico/variante con migración solo si la definición P20 lo exige; no romper texto libre o registros antiguos.

**Recorrido.** Admin agrega marca y modelo, desactiva uno sin borrar órdenes previas, edita servicio/precio base, configura métodos; empleado selecciona o introduce modelo no catalogado según política.

**Datos/permisos.** Identificadores estables, unicidad por marca/modelo técnico/variante cuando proceda, precio de servicio base no reescribe órdenes históricas.

**Orientación.** Reusar UI de catálogos; no mover tablas por estética. Si un nuevo módulo de catálogo mejora la navegación, proponerlo como componente nuevo.

**Aceptación.** Modelo 4G y 5G no se fusionan; servicio desactivado no se ofrece a nuevas órdenes, históricos intactos; métodos siguen localizables.

**Verificación/entrega.** Migración y E2E de catálogo/orden, pruebas de datos anteriores y comandos estándar.

**Dudas.** Bloquea estructura fina del modelo: ¿código técnico y variante obligatorios o opcionales? Recomiendo opcionales pero explícitos.

### P32 — Mensajería futura a clientes con consentimiento y destinatarios

**Identificación.** Origen: punto 32. Tipo: diseñar etapa futura; prioridad sugerida baja ahora. Depende de P19, identidad y canal autorizado.

**Objetivo/actual.** Planear avisos de servicio y promociones sin asumir que registrar un teléfono autoriza contactar. `settings` incluye plantillas WA para listo/presupuesto/recordatorio, pero eso no demuestra envío, consentimiento ni gestión de preferencias.

**Contexto real.** `frontend/settings.tsx`, `frontend/tickets.tsx`, `db/schema.ts`, `backend/http/taller.ts`; conexión de WhatsApp real no verificada.

**Alcance.** Diseñar política diferenciada de avisos transaccionales y marketing, consentimiento/opt-out, selección de número principal/adicional, vista previa, envío/reintento y auditoría. No enviar automáticamente a ambos ni activar canal en producción. Venta anónima debe seguir posible.

**Recorrido.** Cliente consiente canal para avisos, operador revisa destinatario y plantilla antes de enviar; promoción solo llega a quien optó por recibirla; revocación detiene futuros envíos.

**Datos/permisos.** Guardar propósito, destinatario, fecha y fuente del consentimiento. Teléfono adicional puede ser de tercero; requiere permiso específico. No usar chat general como vía de autorización.

**Orientación.** Reutilizar plantillas existentes tras definir contrato de consentimiento; adaptador de canal separado de reglas de negocio.

**Aceptación del diseño.** Matriz aviso/promoción/número/consentimiento; rechazos y reintentos no duplican; operación sin cliente no genera mensajes.

**Verificación/entrega.** Pruebas simuladas de opt-in/opt-out, destinatario incorrecto y canal caído; comandos estándar solo cuando haya código. Entregar política pendiente.

**Dudas.** Bloquean envío: qué avisos requieren autorización y cuándo puede usarse teléfono adicional; validar requisitos legales aplicables antes de activar.

### P33 — Evidencia de refacción recibida por QR (etapa futura)

**Identificación.** Origen: punto 34. Tipo: diseñar etapa futura; prioridad sugerida posterior. Depende de P02 y del ciclo de compras P13.

**Objetivo/actual.** Fotografiar pieza recibida y marcar estado buena/dañada/usada; diferenciarla de foto del equipo. El QR actual (`repair_photo_upload_tokens`/`repair_photos`) liga evidencia a `orders`, no a `purchase_receipt_items`. Sí existen compras/recepciones en `db/schema.ts`.

**Contexto real.** `frontend/photo-evidence.tsx`, `supplier-purchases.tsx`; `backend/http/photo-evidence.ts`, `backend/http/procurement.ts`; `db/schema.ts`.

**Alcance.** Proponer contrato de evidencia por ítem recibido, token temporal exclusivo, condición y posible devolución al proveedor. No reutilizar token de equipo como si probara condición de pieza; no mandar aviso automático ni cambiar saldo sin aprobar reglas.

**Recorrido.** Operador abre recepción de pedido, genera QR del ítem, toma foto, registra condición; si dañada, marca “para devolución” y ve siguiente paso pendiente; foto queda en esa compra y orden vinculada.

**Datos/permisos.** Vincular foto con `purchaseReceiptItemId` o entidad equivalente propuesta, fecha, actor y hash; no exponer cliente al proveedor. Preservar evidencia aun si pedido se cancela según retención acordada.

**Orientación.** Reutilizar endurecimiento de token/almacenamiento de P02 mediante módulo separado de asociación; diseñar transición de devolución antes de migrar.

**Aceptación del diseño.** Dos piezas del mismo pedido no cruzan fotos; QR vencido falla; condición dañada no acredita stock utilizable ni inicia reembolso automático.

**Verificación/entrega.** Plan de pruebas con dos ítems, parcialidad, fallo de subida y permisos; implementación posterior con base aislada/comandos estándar.

**Dudas.** Bloquean activación: política de devolución, retención fotográfica y efecto contable/stock de pieza dañada.

### P34 — Acciones visibles y autorizadas del asistente (etapa futura)

**Identificación.** Origen: punto 37. Tipo: diseñar etapa futura; prioridad sugerida posterior. Depende de P01 y P04.

**Objetivo/actual.** Poder pedir tareas en lenguaje natural y ver formularios/resultados antes de confirmar. No se localizó chat general ni herramientas para crear órdenes/ventas desde él. El trabajador OpenClaw actual solo procesa mensajes de proveedores; no es autorización para darle acceso amplio.

**Contexto real.** `frontend/page.tsx`, `overlays.tsx`, `record-form.tsx`, `reception-form.tsx`, `pos.tsx`, `suppliers.tsx`; `backend/http/auth.ts`, `backend/http/taller.ts`, `backend/http/procurement.ts`.

**Alcance.** Diseñar capacidades separadas de buscar/abrir, preparar formulario, proponer mutación y ejecutar tras confirmación. Orden, presupuesto, venta, stock, proveedor y encargo de pieza son capacidades distintas. Reusar validaciones y permisos del servidor; mostrar borrador visible y resultado verificable, nunca simular éxito ni realizar compras invisibles.

**Recorrido.** Usuario pide “abre orden ficticia SC-123”; asistente muestra enlace correcto. Luego solicita crear presupuesto: UI presenta campos prellenados, usuario revisa/corrige, confirma, backend valida y devuelve folio real. Si falla, se conserva borrador y se informa.

**Datos/permisos.** Herramientas de lectura filtran por actor; las de escritura exigen confirmación, idempotencia y auditoría. Una instrucción “soy administrador” no aumenta permiso; contraseña solo en login seguro. No entregar secretos al modelo.

**Orientación.** Diseñar contratos por capacidad y adaptador agéntico desacoplado del proveedor LLM; probar con ejecución simulada antes de habilitar mutaciones.

**Aceptación del diseño.** Cada herramienta tiene precondiciones, permiso, confirmación y resultado observable; fallo no crea registro falso; usuario restringido no abre datos/campos administrativos.

**Verificación/entrega.** Matriz acción→API→permiso→prueba, casos E2E de confirmar/cancelar/reintentar; comandos estándar cuando se implemente. ADR solo tras aprobación del contrato.

**Dudas.** Bloquean acciones reales: lista inicial de capacidades, qué requiere confirmación por operación, retención del chat y política de reautenticación admin. Recomiendo comenzar solo lectura y preparación de formularios.

## 5. Decisiones pendientes que cambian el resultado

1. **Roles y finanzas (P01/P15/P27):** quién entra, quién ve ganancias/costos/caja y qué se audita; órdenes vencidas operativas no se ocultan por defecto.
2. **Inicio (P11):** POS por defecto para toda cuenta nueva o solo rol de mostrador; la opción existente debe seguir siendo configurable.
3. **Identidad de equipo (P17/P20/P31):** sugerir datos históricos vs crear entidad persistente de dispositivo; campos técnicos/variantes requeridos.
4. **Teléfono y mensajes (P19/P32):** quién es titular del adicional y qué consentimiento permite avisos de servicio frente a promociones. Registrar teléfono no equivale a permiso de envío.
5. **Diagnóstico (P24/P25):** si se acredita a la reparación autorizada o se cobra aparte; qué históricos sirven como sugerencia.
6. **Borradores (P26):** alcance privado/compartido, persistencia entre equipos y retención.
7. **Compras y caja (P12/P13/P30):** un ticket con varias órdenes o una; anticipos a proveedor antes de recepción; uno o varios proveedores por producto.
8. **Antigüedad de cotización (P22):** la fuente pide advertir tras un año y el código tiene `quoteStaleDays` de 30; aprobar umbral/configuración antes de cambiarlo.
9. **Restauración/fotos (P02/P03/P33):** acceso móvil seguro, retención de evidencia, objetivos de recuperación y tratamiento de piezas dañadas.
10. **Canales/agente (P04/P05/P23/P32/P34):** proveedor de WhatsApp/LLM, autorización de envío, límites de lectura y acciones, costos/retención. Hasta decidir, las pruebas siguen simuladas.

**Cierre de cobertura.** Se identificaron **39 puntos originales** y se redactaron **34 prompts**. La diferencia de cinco corresponde exclusivamente a los cinco pares explicitados después de la tabla. Los puntos futuros tienen prompt de diseño, no de activación. Este documento no prueba visualmente la aplicación ni garantiza el estado de Docker o de la base persistente; esas verificaciones se dejan a los chats ejecutores.



