# ADR-0010: Separación por carpetas dentro de un solo runtime

**Estado:** Accepted  
**Fecha:** 2026-10-16

## Contexto

El proyecto local utiliza un único Worker para servir la interfaz y la API. La implementación visual estaba junto a las entradas de Next/Vinext y el manejador principal de taller concentraba su lógica en una ruta extensa. Se necesita una organización más clara para facilitar el mantenimiento y permitir que, en el futuro, adaptadores de voz u otros agentes consuman las mismas reglas del backend, sin introducir ahora otro proceso ni modificar el despliegue local.

## Decisión

- Las implementaciones de interfaz viven en `frontend/`.
- Los manejadores HTTP viven en `backend/http/`.
- `app/` conserva solo las entradas del marco web y fachadas delgadas hacia esos módulos.
- El acceso a datos y el esquema permanecen en `db/`; las migraciones permanecen en `drizzle/`.
- Todo continúa compilándose y ejecutándose como la misma aplicación y el mismo Worker local. No se implementan ahora Gemini Live, OpenClaw, WhatsApp ni una segunda API o servicio.
- Las futuras integraciones podrán añadirse como adaptadores separados y usar contratos del backend, sin acceso directo de agentes a la base de datos.

## Alternativas consideradas

### Desplegar frontend y backend como servicios separados ahora

Se pospone: añadiría configuración de red, orígenes, despliegues y operación antes de que exista una necesidad funcional que lo justifique.

### Mantener todas las implementaciones dentro de `app/`

Se descarta porque mantiene mezcladas las responsabilidades visuales, HTTP y de dominio y hace más difícil ubicar futuros adaptadores.

## Consecuencias

- Las rutas del marco quedan como puntos de entrada estables, mientras las implementaciones pueden reorganizarse sin que la interfaz importe persistencia.
- El manejador del taller aún es grande; dividirlo en módulos de dominio es una tarea posterior y no forma parte de este cambio de carpetas.
- `db/` continúa usando D1/Drizzle y por tanto ligado al runtime Cloudflare. Extraer una base o servicio independiente requerirá otra decisión y pruebas de migración.
- No se requieren cambios de esquema ni migraciones de datos para esta reorganización.
