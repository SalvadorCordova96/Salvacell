# ADR-0023: Teléfono principal y adicional del cliente

**Estado:** Aceptada  
**Fecha:** 2026-10-21

## Contexto

El registro del cliente guardaba un solo teléfono, mientras que el taller necesita distinguir un número principal de otro opcional. Las órdenes conservan una copia histórica del nombre y teléfono que tenían al crearse; actualizar el perfil no debe reescribir esa evidencia.

## Decisión

- Agregar `customers.phone_additional` como texto opcional, representado como cadena vacía cuando no se capturó, mediante una migración aditiva.
- Conservar el formato de presentación de ambos números y normalizarlos únicamente al buscar. El segundo número debe ser válido y distinto del principal cuando ambos existen.
- La recepción puede crear un perfil con uno o ambos números. El directorio permite editar ambos; los formularios de orden rápida pueden buscar por cualquiera de ellos y vincular explícitamente un perfil existente.
- Guardar el vínculo `orders.customer_id` solo cuando se selecciona explícitamente el perfil. La copia histórica `orders.phone` permanece independiente y no se reescribe al editar el perfil.
- Registrar dos teléfonos no implica consentimiento para enviar mensajes ni define qué número usar en un canal de comunicación.

## Alternativas consideradas

### Sobrescribir `customers.phone` con el segundo teléfono

Se descarta porque se perdería la distinción entre contacto principal y alternativo y no se podrían buscar ambos de forma fiable.

### Reescribir teléfonos en órdenes anteriores al editar el perfil

Se descarta porque alteraría datos históricos de recepción.

## Consecuencias

- La migración añade una columna e índice sin cambiar filas históricas.
- Búsqueda y selección de cliente consideran ambos teléfonos; los flujos que envían mensajes permanecen sujetos a una decisión separada de consentimiento y destinatario.
- Las pruebas deben cubrir creación/edición, búsqueda por segundo teléfono, vinculación explícita y conservación de la copia histórica.

## Relaciones

- Related: ADR-0006, ADR-0020.
