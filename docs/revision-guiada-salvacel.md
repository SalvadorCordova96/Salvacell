# Revisión guiada de Salva

Esta bitácora sirve para recorrer la aplicación con calma y anotar qué funciona, qué falta y qué detalles conviene mejorar. Está escrita sin palabras técnicas para que cada punto explique también para qué sirve.

## Cómo vamos a usarla

- Revisamos una pantalla a la vez.
- Anotamos el detalle mientras lo vemos, sin perder el contexto.
- Primero describimos el problema; después decidimos si se corrige y qué tan urgente es.
- Los datos de esta revisión pertenecen a la demo y son ficticios. La información real de Salvacel no se modifica.

## Pendientes que ya conocemos

### 1. Usuarios y permisos

**Qué falta:** Definir quién puede entrar y qué puede hacer cada persona.

**Para qué sirve:** Evita que alguien cambie precios, borre información o vea datos que no le corresponden. También permite saber quién hizo cada cambio.

**Prioridad:** Alta antes de usar la aplicación desde otros equipos o desde internet.

**Estado:** Pendiente de terminar y probar.

### 2. Fotos de los equipos mediante QR

**Qué falta:** Terminar el proceso para que un celular escanee un código y suba fotos únicamente del equipo correcto.

**Para qué sirve:** Permite fotografiar el estado del teléfono al recibirlo sin abrir toda la aplicación en el celular. Las fotos quedan ligadas a la orden correspondiente.

**Prioridad:** Media.

**Estado:** La base está preparada, pero falta terminar la activación segura y probarla con imágenes ficticias.

### 3. Respaldo y recuperación

**Qué falta:** Hacer una prueba completa de recuperar la aplicación desde un respaldo.

**Para qué sirve:** Si la computadora falla o se daña la base de datos, confirma que podemos volver a levantar la información sin perder el trabajo.

**Prioridad:** Alta antes de depender de la aplicación todos los días.

**Estado:** Hay respaldos; falta comprobar una recuperación real en un entorno separado.

### 4. Chat interno del asistente

**Qué falta:** Integrar un chat dentro de Salvacel para hacer preguntas sobre órdenes, clientes, proveedores y procesos.

**Para qué sirve:** Permite preguntar, por ejemplo, qué reparaciones están esperando una pieza o qué sucedió con una orden, sin buscar manualmente en varias pantallas.

**Prioridad:** Media, después de dejar bien definidos los permisos.

**Estado:** Planeado; todavía no es un chat general completo.

### 5. WhatsApp con proveedores

**Qué falta:** Conectar WhatsApp real y decidir sus reglas, credenciales y límites.

**Para qué sirve:** Permitiría enviar solicitudes de precios y recibir respuestas de proveedores desde el flujo de refacciones.

**Prioridad:** Posterior. No es necesario para revisar la aplicación con datos simulados.

**Estado:** Deliberadamente desconectado; las pruebas actuales son simuladas.

### 6. Revisión visual de todas las pantallas

**Qué falta:** Recorrer cada módulo para detectar títulos desalineados, botones confusos, textos cortados, secciones difíciles de encontrar y problemas en celular.

**Para qué sirve:** Hace que la aplicación se sienta ordenada, clara y rápida de usar en el trabajo diario.

**Prioridad:** Alta para la experiencia de uso.

**Estado:** Algunas pantallas ya fueron mejoradas; falta revisar el resto con la misma atención.

### 6.1. Inicio de sesión como pantalla independiente

**Qué falta:** Mostrar el inicio de sesión como una pantalla completa y limpia, sin el menú ni partes de Salvacel visibles detrás. El contenido de la aplicación debe aparecer únicamente después de iniciar sesión.

**Para qué sirve:** Hace más claro que el acceso está protegido y evita que alguien vea o intente usar opciones antes de identificarse.

**Prioridad:** Alta.

**Estado:** Pendiente de revisión.

### 7. Cotizaciones y refacciones

**Qué falta:** Revisar que cada reparación permita solicitar una pieza a los proveedores elegidos y ver sus respuestas de manera clara.

**Para qué sirve:** Ayuda a comparar precio, calidad, envío y tiempo de entrega sin perder a qué equipo corresponde cada respuesta.

**Prioridad:** Alta para el flujo del taller.

**Estado:** La estructura existe y la demo tiene ejemplos; falta validar el recorrido completo desde una orden real de prueba.

### 8. Garantías, cancelaciones y devoluciones

**Qué falta:** Recorrer los casos completos y comprobar que cada pantalla muestre claramente qué pasó, cuánto se devolvió y qué queda pendiente.

**Para qué sirve:** Evita confusiones cuando un cliente regresa por garantía, cancela una reparación o necesita recuperar un pago.

**Prioridad:** Alta para revisar antes de usar la aplicación con operaciones reales.

**Estado:** La aplicación ya tiene estas operaciones; falta una revisión guiada con distintos ejemplos.

### 9. Encabezado y estado de respaldos

**Qué falta:** Separar el aviso de “sin respaldo” de la barra general de Configuraciones y explicar claramente qué significa y qué acción permite.

**Para qué sirve:** Evita mezclar una alerta importante con los controles normales de configuración.

**Prioridad:** Media.

**Estado:** Pendiente de revisión.

### 10. Punto de venta como entrada principal

**Qué falta:** Después de iniciar sesión, llevar al usuario directamente a Punto de venta, porque es el área de trabajo más frecuente del negocio.

**Para qué sirve:** El recepcionista puede cobrar o vender de inmediato sin buscar primero la sección correcta.

**Prioridad:** Alta.

**Estado:** Pendiente de revisión.

### 11. Cobros y ventas desde Punto de venta

**Qué falta:** Permitir buscar clientes, ver sus órdenes abiertas y agregar abonos o liquidaciones al mismo ticket de venta. También debe ser posible vender un producto sin registrar un cliente.

**Para qué sirve:** Centraliza en un solo lugar los cobros de reparaciones y las ventas de accesorios, sin obligar a entrar a cada orden.

**Prioridad:** Alta.

**Estado:** Pendiente de revisión.

### 12. Pago de refacciones a proveedores

**Qué falta:** Agregar en Punto de venta una opción para pagar refacciones aprobadas y recibidas, mostrando proveedor, pieza y modelo, y descontando el importe del efectivo o caja correspondiente.

**Para qué sirve:** Permite registrar el pago real de una pieza y mantener actualizado cuánto dinero queda disponible.

**Prioridad:** Alta.

**Estado:** Pendiente de revisión.

### 13. Ayudas rápidas en tarjetas y controles

**Qué falta:** Añadir pequeños íconos de ayuda en tarjetas, secciones y botones importantes. Al pasar el cursor, deben mostrar una explicación breve de lo que significa cada elemento.

**Para qué sirve:** Ayuda a recordar la función de cada área y facilita que nuevos empleados entiendan la aplicación sin tener que preguntar todo.

**Prioridad:** Baja, pero útil para la claridad diaria.

**Estado:** Pendiente de revisión.

## Notas que agregaremos durante el recorrido

### Pantalla o módulo

**Qué vi:**

**Qué esperaba que pasara:**

**Qué convendría cambiar:**

**Para qué ayudaría:**

**Prioridad:** Alta / Media / Baja

**Estado:** Pendiente / En revisión / Aceptado / Corregido

## Decisiones tomadas durante la revisión

- 

