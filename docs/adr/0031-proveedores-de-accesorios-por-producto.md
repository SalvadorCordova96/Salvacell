# ADR-0031: Proveedores asociados a cada accesorio

**Estado:** Aceptada  
**Fecha:** 2026-10-25

## Contexto

El catálogo debe indicar qué proveedores ofrecen cada accesorio para facilitar futuras consultas y compras. Un producto puede estar disponible con varios proveedores. La compra real, sin embargo, debe conservar cuál proveedor se eligió en esa operación; una asociación general del catálogo no demuestra que ya se haya comprado ni fija precio o existencia.

## Decisión

- Crear la relación muchos-a-muchos `product_suppliers` entre productos y proveedores, con clave primaria compuesta y referencias foráneas. La migración 0016 es aditiva y no asigna proveedores automáticamente.
- En el catálogo de accesorios permitir elegir cero, uno o varios proveedores existentes, activos y clasificados para accesorios. No inferir proveedores para los productos iniciales.
- Mantener las asociaciones preexistentes visibles al editar si un proveedor se desactiva o deja de estar clasificado; permitir retirarlas, pero no crear nuevas asociaciones con proveedores no elegibles.
- Guardar la asociación del producto y sus vínculos en una transacción. Aplicar validación de proveedor en servidor y conservar control de revisión del producto.
- La asociación del catálogo es informativa. Las órdenes de compra mantienen su proveedor propio y son la fuente de verdad para el proveedor efectivamente usado en cada compra.
- Mostrar el campo en escritorio, móvil y consulta de datos. El usuario puede buscar por nombre de proveedor.
- No agregar campos de proveedores al área de refacciones de reparación: ese seguimiento conserva su flujo de cotización y compra separado.

## Consecuencias

- El usuario puede comparar las fuentes habituales de un producto sin crear datos ficticios ni confundirlas con compras realizadas.
- Los respaldos JSON incluyen la tabla de asociación y admiten restaurar respaldos antiguos que no la contienen.
- Para activar esta función en una base existente, se deben aplicar en orden las migraciones pendientes de compatibilidad y catálogo (0014 y 0015) y después la relación nueva (0016), con respaldo previo y prueba de restauración aislada.

## Relaciones

- Related: ADR-0018, ADR-0029, ADR-0030; `docs/architecture.md` §8.
