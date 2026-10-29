# ADR-0029: Compatibilidad posible de vidrio templado en productos

**Estado:** Accepted  
**Fecha:** 2026-10-23

## Contexto

El inventario de accesorios necesita conservar por separado cada producto y su existencia. Para planear compras, el operador también necesita anotar qué modelos declara compatibles un proveedor para un vidrio templado específico. Esas declaraciones pueden variar por proveedor y no son equivalencias universales ni una garantía de ajuste.

## Decisión

- Añadir a `products` el campo opcional `glass_compatibility`, texto libre con límite de 1000 caracteres. Los registros existentes reciben cadena vacía mediante una migración PostgreSQL aditiva.
- Mostrar el campo en el inventario de escritorio y móvil, permitir capturarlo/editarlo en Datos complementarios y buscar productos por ese texto.
- La anotación puede incluir modelos exactos y el proveedor/publicación que declaró la compatibilidad. Se conserva como referencia pendiente de confirmación, no se interpreta como identidad del producto.
- No combinar productos, SKU, precios ni existencias aunque compartan posibles modelos compatibles. Cada variante mantiene su registro y stock independientes.
- El dato no afecta ventas ni disponibilidad y no es obligatorio para fundas, cables, cargadores u otros accesorios.
- La API valida el campo y las copias JSON nuevas lo incluyen al exportar productos. Los respaldos históricos que carecen de la columna siguen restaurándose con el valor predeterminado vacío.

## Alternativas consideradas

### Fusionar modelos compatibles en una sola fila de inventario

Descartada porque compatibilidad declarada por un vendedor no demuestra que cada mica ajuste, y fusionar filas mezclaría el conteo de productos distintos.

### Crear una tabla de compatibilidades normalizada desde el inicio

No se adopta todavía: el proveedor puede describir grupos de manera inconsistente y el propietario pidió primero una nota de referencia para planear compras. Si después se necesita validar por proveedor, publicación, tipo de mica o evidencia, se podrá evolucionar el campo a relaciones estructuradas.

## Consecuencias

### Positivas

- El catálogo puede mostrar las declaraciones disponibles sin inventar compatibilidad ni alterar existencias.
- La captura es flexible y no obliga a llenar información que todavía no se ha confirmado.

### Negativas

- El texto libre no permite consultar automáticamente relaciones confiables ni garantizar ajuste; requiere confirmación con proveedor y prueba física.

## Relaciones

- Supersedes:
- Superseded by:
- Related: ADR-0018; `docs/architecture.md` §8.
