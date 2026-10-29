# ADR-0032: Separar Administración de Configuraciones y operación

- Estado: Aceptada
- Fecha: 2026-10-25

## Contexto

La navegación mezclaba la consulta global de datos, la edición del catálogo de accesorios, el directorio de proveedores y los ajustes del taller. El catálogo era accesible desde Punto de venta y la pestaña Datos exponía listas globales junto con acciones de exportación. En un taller con cuentas de empleados, una vista operativa no debe otorgar por accidente acceso a costos, listas administrativas, exportaciones o gestión de cuentas.

## Decisión

- Mantener **Administración** y **Configuraciones** como destinos separados de la navegación principal, visibles solo si la cuenta tiene los permisos correspondientes.
- Reservar **Administración** para cuentas con `admin.manage`. Reutiliza la vista de Datos como explorador global, administra productos/inventario y el directorio maestro de proveedores. No se crean copias paralelas de esas listas.
- Dejar **Punto de venta** dedicado a vender, cobrar e imprimir tickets. La edición del catálogo ya no aparece en ese flujo.
- Conservar el módulo operativo **Proveedores y compras** para cotizaciones, solicitudes, recepción y compras. El directorio maestro no aparece a empleados sin permiso de administración.
- Mantener **Configuraciones** para preferencias y reglas del taller, marcas/servicios/métodos de pago, cuentas y roles, y respaldos; cada operación conserva su permiso específico.
- Validar autorización en el servidor: la creación/edición de proveedores y productos, los ajustes de inventario y el CSV de tablas requieren `admin.manage`; acciones de compra mantienen `procurement.write`; exportar/restaurar un respaldo JSON mantiene `backup.manage`. Una cuenta con `pos.write` recibe solo los datos de producto necesarios para vender, sin costo ni listas administrativas.
- Aceptar `?v=data` como ruta heredada hacia Administración para que enlaces guardados sigan abriendo el área, sin mantener Datos como destino independiente.

## Consecuencias

- La navegación refleja responsabilidades y reduce la exposición accidental de listas administrativas.
- El personal puede conservar acceso a sus flujos autorizados de órdenes, atención y caja, sin recibir por ello el explorador global.
- Las tareas operativas con proveedores siguen disponibles separadas del mantenimiento del directorio.
- No se requiere migración ni se alteran los datos existentes.
- La asignación de `admin.manage` a cada puesto debe seguir siendo explícita y revisarse antes de habilitar acceso por LAN.

## Verificación

- Probar navegación de administración/configuración con una cuenta administradora y bloqueo para una cuenta operativa.
- Probar que Punto de venta no muestra controles de catálogo.
- Probar en API que empleados no pueden crear/editar proveedores ni descargar CSV, mientras las compras y respaldos conservan sus permisos separados.
- Ejecutar lint, TypeScript, pruebas de flujo y E2E focalizadas sin usar la base persistente.
