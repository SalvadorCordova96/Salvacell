# ADR-0011: PostgreSQL local en Docker

**Estado:** Accepted  
**Fecha:** 2026-10-16

## Contexto

La instancia de desarrollo ejecuta la app en un Worker local de Wrangler y usa D1, emulación local de SQLite ligada al runtime de Cloudflare. El propietario quiere trabajar sin servicios de nube adicionales y mantener Salvacel portable para un futuro servidor propio. Docker ya contiene otros proyectos y bases; sus contenedores, redes y volúmenes no deben reutilizarse.

## Decisión

- PostgreSQL será el motor de datos local de Salvacel y correrá en un contenedor dedicado, con volumen nombrado exclusivo del proyecto.
- PostgreSQL no publicará su puerto al host. La app se conectará por DNS interno de Docker dentro de la red privada de Salvacel; la única entrada desde el equipo seguirá siendo la pasarela enlazada a loopback.
- El servidor TypeScript correrá sobre Node.js dentro del contenedor actual de la app para poder abrir conexiones PostgreSQL. La interfaz React/Next, las reglas de negocio y su organización por carpetas se conservan.
- En esta etapa, interfaz y API permanecen en el mismo contenedor/proceso de la app; PostgreSQL y la pasarela permanecen como contenedores separados. No se introduce OpenClaw, WhatsApp ni otro servicio externo.
- La configuración y credenciales se suministran localmente mediante secretos/variables de entorno, sin incluir claves en el código ni en el repositorio.
- Las migraciones PostgreSQL se mantienen separadas de las migraciones SQLite históricas. No se copiará automáticamente la base D1 emulada; el volumen antiguo se conserva hasta validar la nueva instancia.

## Alternativas consideradas

### Mantener D1/SQLite en Wrangler

Se descarta para el entorno de desarrollo porque mantiene dependencia del runtime de Cloudflare y no prepara el despliegue acordado en un servidor propio.

### Publicar PostgreSQL en un puerto del host

Se descarta porque no es necesario para la app en Docker y ampliaría la superficie de acceso local. Los demás proyectos conservan sus propios puertos, redes y volúmenes.

### Separar ahora frontend y API como procesos/contenedores distintos

Se pospone. Se conserva la separación por carpetas ya acordada; la app existente comparte un runtime y dividir procesos exigiría otro contrato de red y configuración. Puede evaluarse por separado cuando haya una necesidad concreta.

## Consecuencias

- El código de persistencia debe adaptar consultas actualmente escritas para D1/SQLite al protocolo PostgreSQL y comprobar transacciones, resultados y restricciones.
- La aplicación deja de arrancar localmente dentro de Wrangler y pasa a arrancar con Node.js; TypeScript sigue siendo el lenguaje del backend.
- El stack local puede reproducirse con Docker Compose sin cuenta ni servicio de Cloudflare.
- Los datos existentes en el volumen D1 emulado no aparecerán en PostgreSQL sin una migración de datos explícita. Se preserva el volumen previo para recuperación hasta verificar la nueva base.
- Los respaldos del motor PostgreSQL requieren una estrategia compatible con PostgreSQL y pruebas de restauración.
