# ADR-0024: borradores privados de formularios

- Estado: aceptada
- Fecha: 2026-10-21

## Contexto

Cerrar accidentalmente una orden rápida o una recepción puede perder datos de
captura todavía incompletos. Un borrador no debe crear folios, cobros ni órdenes
parciales, y no debe ser visible para otras cuentas.

## Decisión

- Guardar automáticamente borradores de orden rápida y recepción en
  `form_drafts`, con payload JSON y propietario individual.
- Autenticar y autorizar listar, guardar y descartar en el backend; cada
  consulta limita sus filas al usuario de la sesión. El identificador UUID no
  concede acceso por sí mismo.
- No guardar el código de desbloqueo ni credenciales. El código se elimina
  también del payload del navegador antes de enviarlo.
- Admitir solo objetos JSON de hasta 256 KiB, con límites de profundidad,
  cantidad de campos y longitud. Borradores sin actividad por 30 días se
  eliminan cuando su propietario vuelve a consultar la lista.
- Al completar correctamente el formulario, borrar su borrador. Descartarlo es
  explícito y auditado. Un fallo de guardado no impide completar el formulario.
- Aplicar la migración de forma aditiva; ninguna regla comercial, cálculo o
  dato de órdenes existentes cambia.

## Consecuencias

- Un usuario autenticado puede recuperar su captura si cierra el formulario o
  se interrumpe la sesión antes de enviar.
- El borrador puede contener datos personales de cliente/equipo; queda aislado
  por propietario y sujeto a expiración, pero no se replica a otros usuarios.
- Los borradores no reemplazan respaldos ni crean órdenes hasta que la persona
  confirma el envío.

## Pendiente

- Validar en navegador el cierre/reapertura, recuperación, descarte y expiración
  con una cuenta de prueba aislada antes de desplegar la migración al volumen
  local.
