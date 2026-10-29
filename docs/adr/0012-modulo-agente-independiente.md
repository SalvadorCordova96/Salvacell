# ADR-0012: Módulo agéntico independiente

**Estado:** Superseded by ADR-0013  
**Fecha:** 2026-10-16

## Contexto

Salvacel prevé incorporar capacidades agénticas más adelante. La app de taller ya tiene su propio backend, frontend y base de datos; el propietario quiere desarrollar el módulo agéntico en una carpeta separada y poder ejecutarlo en su propio contenedor, sin mezclarlo con los demás proyectos locales. La conexión y las acciones concretas todavía no están definidas.

## Decisión

- El código futuro del módulo agéntico tendrá un espacio de trabajo independiente de `outputs/Salvacel-local`, al mismo nivel que `outputs/`.
- La intención de despliegue es un servicio/contenedor Docker propio, aislado de la aplicación, la base de datos y los demás proyectos. Su configuración detallada se decidirá antes de implementarlo.
- La creación del espacio no habilita conexiones, acceso directo a la base de datos, mensajería de WhatsApp ni acciones sobre órdenes.
- Antes de integrar ambos módulos se definirá un contrato explícito de comunicación y autorización; las reglas y persistencia del taller seguirán bajo control del backend de Salvacel.

## Alternativas consideradas

### Añadir el agente dentro de la aplicación Salvacel

Se descarta para este módulo inicial porque el propietario pidió trabajarlo por separado y mantener abierta una sustitución futura del runtime.

### Conectar el agente directamente a la base de datos

Se descarta: la integración aún no está diseñada y el agente no debe convertirse en propietario de las reglas ni de la persistencia del taller.

## Consecuencias

- El desarrollo y el ciclo de vida del agente podrán evolucionar independientemente de la aplicación principal.
- La futura integración requerirá acordar una API/contrato, autenticación entre servicios, límites de capacidades, auditoría y pruebas.
- La tecnología, el runtime final, la red Docker y los puertos quedan abiertos hasta diseñar esa integración.
