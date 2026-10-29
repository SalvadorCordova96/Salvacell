# ADR-0030: Catálogo inicial de accesorios y existencias desconocidas

**Estado:** Accepted  
**Fecha:** 2026-10-23

## Contexto

El taller necesita preparar su catálogo de accesorios antes de contar las existencias y completar los precios o proveedores. Registrar valores ficticios o convertir un conteo pendiente en cero podría causar ventas incorrectas o una lista de compra equivocada. Las fundas y los vidrios templados de cada modelo deben conservar inventarios separados aunque una publicación declare compatibilidad posible.

## Decisión

- Crear mediante migración aditiva el catálogo inicial de fundas y vidrios templados para cada variante iPhone incluida en la lista acordada, más artículos genéricos de cables, eliminadores y cargadores completos. La carga es idempotente y no crea proveedores ficticios.
- Para cada modelo de funda y vidrio templado, establecer un mínimo de reposición de 3 unidades. No sumar mínimos ni existencias entre modelos potencialmente compatibles. Los genéricos de carga quedan sin mínimo hasta que el propietario lo defina.
- Permitir que SKU, precio de venta, costo, existencia y proveedor aún no estén registrados. Una existencia desconocida se guarda como `NULL`, nunca como cero. El usuario debe hacer el conteo físico e introducir el valor real.
- Añadir `minimum_stock` separado de `stock`. El mínimo guía la reposición y no declara que esas unidades existan.
- Permitir mostrar y anotar compatibilidad de vidrio templado declarada por proveedor como nota informativa por producto. No es garantía, equivalencia universal ni autorización para combinar SKU o cantidades.
- No permitir vender un producto si no tiene precio de venta positivo y existencia conocida. Al registrar el primer conteo, el inventario pasa de desconocido a conocido; después, los ajustes conservan movimientos auditables.
- Proveedor, costo y precio se capturan solo cuando el operador tenga el dato; ningún dato ausente bloquea crear o editar el producto. El nombre sigue siendo obligatorio para identificarlo.

## Alternativas consideradas

### Inicializar existencia en cero

Descartada: cero significa conteo real sin unidades, mientras que `NULL` significa que aún no se contó.

### Asignar precios y proveedores estimados

Descartada: valores inventados contaminarían ventas, márgenes y compras.

### Fusionar modelos por compatibilidad anunciada

Descartada: la nota de proveedor no garantiza ajuste y no debe mezclar existencias independientes.

## Consecuencias

El catálogo puede prepararse antes de la compra y luego compararse con el conteo físico. Hasta capturar precio y existencia real, los artículos no aparecen como vendibles en Punto de Venta. Los mínimos iniciales son una guía de reposición decidida por el propietario, no una afirmación de demanda ni una orden de compra.

## Relaciones

- Related: ADR-0018, ADR-0029; `docs/architecture.md` §8.
