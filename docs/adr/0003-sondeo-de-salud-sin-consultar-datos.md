# ADR-0003: Sondear disponibilidad sin consultar datos del taller

**Estado:** Accepted  
**Fecha:** 2026-10-16

## Contexto

Los healthchecks de Docker y de la pasarela local solicitaban `GET /api/taller` cada diez segundos. Ese endpoint carga el snapshot funcional completo de D1, por lo que las verificaciones periódicas repetían trabajo de negocio innecesario. El runtime acumuló memoria y agotó el tmpfs de logs; dejó de aceptar conexiones y la app local respondió 502.

## Decisión

Docker y la pasarela comprobarán `GET /api/health`, una ruta dinámica que responde `200` sin consultar D1. Las lecturas de datos continúan en `/api/taller` y no forman parte de las comprobaciones de disponibilidad.

## Alternativas consideradas

### Continuar usando `GET /api/taller`

Se descarta porque una comprobación frecuente no debe hidratar ni depender del snapshot de toda la aplicación.

### Comprobar solo el proceso del contenedor

Se descarta porque el proceso puede seguir activo aunque el servidor HTTP ya no acepte conexiones.

## Consecuencias

### Positivas

- Las comprobaciones periódicas no consultan ni exponen datos del negocio.
- El healthcheck detecta que el servidor HTTP está respondiendo sin repetir el flujo de carga.

### Negativas

- La ruta acredita disponibilidad HTTP, no la salud de D1; los errores de base de datos se manifiestan en las operaciones funcionales y sus registros.

### Neutrales

- No cambia el contrato de `/api/taller` ni el esquema de datos.

## Relaciones

- Supersedes:
- Superseded by:
- Related: ADR 0001, ADR 0002
