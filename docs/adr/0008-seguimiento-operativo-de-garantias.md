# ADR-0008: Mantener reclamos de garantía como seguimientos operativos vinculados a la orden

**Estado:** Accepted  
**Fecha:** 2026-10-16

## Contexto

El taller necesita registrar y continuar casos reportados después de una reparación, sin confundir el seguimiento interno con una determinación legal de cobertura. El caso debe conservar su relación con el equipo/orden original y dejar rastro de quién lo cambió y cuándo.

## Decisión

Guardar cada reclamo en `warranty_claims`, ligado a una orden, con motivo, estado y resultado. El mismo caso se actualiza con control de revisión y bitácora; los registros no se borran. Para marcarlo como resuelto o cerrado se requiere capturar el resultado. La aplicación no decide automáticamente la elegibilidad ni agrega condiciones legales. Los movimientos financieros derivados siguen en `order_resolutions`, separados de los cobros originales.

## Alternativas consideradas

### Guardar solo una nota en la orden

Se descarta porque no ofrece estado, revisión concurrente ni historial separado de los cambios del caso.

### Crear un reclamo nuevo en cada actualización

Se descarta porque fragmentaría un mismo caso y dificultaría distinguir reclamos distintos de sus avances.

## Consecuencias

### Positivas

- El perfil de la orden conserva el historial de casos de garantía y su estado actual.
- Los cambios tienen control de concurrencia y bitácora; una resolución debe explicar su resultado.
- Cancelaciones y devoluciones continúan siendo movimientos financieros separados.

### Negativas

- La migración requiere una tabla y respaldo/restauración compatibles con versiones anteriores.
- La decisión de cobertura y la comunicación con el cliente continúan siendo manuales.

## Relaciones

- Related: ADR-0004, ADR-0005, ADR-0007; migración 0018 (`warranty_claims`); `docs/architecture.md` §5, §6 y §8.
