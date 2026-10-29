# ADR-0002: Separar la interfaz por flujo operativo

**Estado:** Accepted  
**Fecha:** 2026-10-11

## Contexto

La interfaz local concentraba navegación, estado de sesión, formularios, tickets y todas las vistas operativas en `app/page.tsx`. El plan de desarrollo exige continuar ampliando órdenes, presupuestos, cobros y configuraciones sin que una modificación de un flujo obligue a editar toda la pantalla. La aplicación sigue teniendo una sola entrada de navegación y una sola API del taller.

## Decisión

Vamos a mantener `app/page.tsx` como orquestador de estado global y navegación, y separar los límites de la interfaz por responsabilidad:

- `orders.tsx` y `quotes.tsx` para listados y detalle de órdenes/presupuestos.
- `payments.tsx` para cobros, caja y registro de pagos.
- `record-form.tsx` para captura y edición de registros.
- `settings.tsx`, `settings-catalog.tsx` y `settings-advanced.tsx` para configuración general, catálogos y seguridad.
- `tickets.tsx` para documentos imprimibles.
- `ui.tsx` para primitivas visuales, rutas de interfaz y el marco común.
- `overlays.tsx` para coordinar modales que cruzan varios flujos.

Los módulos reciben datos y callbacks explícitos; las mutaciones siguen pasando por la API única y el estado de sesión permanece en el orquestador.

## Alternativas consideradas

### Mantener toda la interfaz en `page.tsx`

Se descarta porque aumenta el acoplamiento y hace difícil verificar cambios aislados.

### Crear un store global adicional

Se descarta para esta fase: introduciría otra fuente de verdad para datos que ya se recargan desde la API y elevaría el costo de sincronizar sesiones, PIN y revisiones.

## Consecuencias

### Positivas

- Cada flujo puede evolucionar y probarse con un contexto más pequeño.
- La pantalla principal queda por debajo del límite de tamaño previsto por la fase 3.
- Los límites de UI reflejan los límites operativos sin duplicar la API.

### Negativas

- Los contratos de props deben mantenerse explícitos cuando un modal cruza varios módulos.
- La coordinación de navegación y recarga continúa siendo responsabilidad de `page.tsx`.

### Neutrales

- La separación no cambia rutas HTTP ni el modelo de datos.

## Relaciones

- Supersedes:
- Superseded by:
- Related: [ADR 0001](0001-validacion-y-ordenes-historicas.md)
