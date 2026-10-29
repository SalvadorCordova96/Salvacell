# ADR-0020: Identidades y permisos de operador

**Estado:** Accepted  
**Fecha:** 2026-10-19

## Contexto

El PIN global opcional protege la pantalla, pero no identifica a la persona que registra un cobro, modifica una orden o administra proveedores. El plan requiere usuarios, permisos y trazabilidad por actor antes de habilitar acceso desde otros equipos.

## Decisión

- Cada persona inicia sesión con nombre de usuario y contraseña; las contraseñas se almacenan mediante un hash resistente y nunca se devuelven por API.
- El primer administrador se crea mediante una operación local de consola, nunca mediante un endpoint público de registro.
- La sesión usa un token aleatorio, guarda solo su hash en PostgreSQL, se entrega en cookie `HttpOnly` y `SameSite=Strict`, y puede revocarse al cerrar sesión, desactivar al usuario o cambiar su contraseña. Se aplica `Secure` cuando el despliegue usa HTTPS.
- Los roles iniciales son administrador, técnico y caja. Sus permisos son datos editables por el administrador; el backend valida cada lectura y mutación. Ocultar una opción en la interfaz no sustituye la autorización del servidor.
- La delegación de permisos no puede superar los permisos efectivos del actor: solo `admin.manage` puede editar roles, restablecer contraseñas de otros usuarios o asignar privilegios administrativos. `users.manage` permite gestionar cuentas ordinarias y roles dentro del propio alcance, no conceder `*` ni editar el rol administrador.
- Las respuestas de lectura se filtran en backend por módulo; exportación/restauración funcional requiere `backup.manage`, auditoría requiere `admin.manage`, y secretos internos como `settings.pinHash`/`pinSalt` nunca se serializan al cliente. La interfaz oculta acciones sin permiso como ayuda de uso, no como frontera de seguridad.
- Las escrituras de usuario dejan actor asociado en la bitácora. Las operaciones automatizadas conservan identidad de servicio separada y no se presentan como acciones humanas.
- Las mutaciones de navegador validan que `Origin` coincida con el origen público exacto (esquema, host y puerto), considerando `X-Forwarded-Host`/`X-Forwarded-Proto` del proxy local; se rechazan peticiones marcadas `Sec-Fetch-Site: cross-site`. La API principal, login, cuentas y borradores comparten este control. La prueba E2E para origen ajeno y esquema incorrecto está añadida, aún pendiente de ejecución aislada.
- La interfaz de configuración presenta gestión de cuentas y roles solo cuando el actor tiene los permisos correspondientes; los cambios de código recientes requieren una verificación E2E actual antes de declararse cerrados.
- Las cuentas y sesiones no se incluyen en respaldos funcionales JSON: la restauración de órdenes y caja no debe reemplazar identidades ni reactivar sesiones.
- Salvacel permanece publicado solo por loopback hasta que autenticación, autorización, revocación y atribución pasen pruebas.

## Alternativas consideradas

### Continuar con el PIN compartido

No identifica al operador y no puede respaldar una bitácora atribuida.

### Registro público del primer administrador

Se descarta porque cualquier cliente que alcance el endpoint durante el primer arranque podría apropiarse del sistema.

### Autorización solo en el frontend

Se descarta porque una solicitud HTTP directa podría saltarse controles visuales.

## Consecuencias

### Positivas

- La API puede aplicar permisos en el último punto confiable y vincular acciones al actor.
- El alta inicial no depende de credenciales predeterminadas ni expone registro abierto.
- Las restauraciones de datos del taller no restablecen contraseñas ni sesiones.

### Negativas

- Se debe conservar una vía segura de recuperación administrativa local.
- Las pruebas automatizadas deben iniciar sesión explícitamente y cubrir intentos sin permiso.
- Los roles pueden usar una experiencia de solo lectura sin mostrar acciones que inevitablemente serían rechazadas; la matriz visual completa y la gestión de usuarios desde interfaz requieren verificación continua.

### Neutrales

- El PIN existente puede seguir protegiendo la visualización de códigos de desbloqueo, pero deja de ser la identidad de acceso.

## Relaciones

- Supersedes:
- Superseded by:
- Related: ADR-0010, ADR-0011; `docs/architecture.md` §§5, 6 y 8.
