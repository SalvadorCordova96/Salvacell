# Salvacel · guía para agentes

**Corte inicial:** 2026-10-29. Esta guía es una entrada rápida para agentes de cualquier aplicación o plataforma; describe el proyecto, señala las fuentes de verdad y evita asumir que una nota histórica refleja el estado actual.

## Qué es Salvacel

Salvacel es una aplicación privada para operar un taller de reparación y venta de accesorios para celulares. Incluye clientes, equipos y órdenes de reparación, diagnósticos y cotizaciones, proveedores y compras, inventario/Punto de venta, caja, garantías, evidencia fotográfica y asistencia agéntica integrada. Los perfiles, permisos y límites vigentes se deben confirmar en el código y las decisiones arquitectónicas antes de cambiar un flujo.

## Cómo orientarse

1. Confirma que trabajas en la raíz de este repositorio y revisa `git status` antes de editar.
2. Lee `README.md` para instalar y ejecutar, `CONTEXT.md` para el vocabulario del negocio y `package.json` para los comandos disponibles.
3. Consulta `docs/adr/README.md` y los ADR pertinentes para decisiones ya consolidadas. No contradigas una decisión aceptada sin explicar y documentar por qué debe cambiar.
4. Consulta `planning.md` para trabajo, dudas y propuestas aún activas. Es memoria temporal: una mención allí no prueba que algo esté implementado. Contrasta cada afirmación con el código, las migraciones, las pruebas y el entorno actual.
5. Para un cambio, identifica primero sus pantallas, rutas/API, reglas de backend, permisos, esquema/migraciones, pruebas y documentación afectadas. Al terminar, resume el cambio, archivos, pruebas y riesgos pendientes.

Si notas contradicciones entre notas, código y ejecución, no presentes una suposición como hecho: identifica la evidencia actual y actualiza la fuente de documentación adecuada como parte del trabajo.

## Estructura y ejecución

- `app/`: entrada Next.js y fachadas de rutas API.
- `frontend/`: vistas, formularios y componentes de la interfaz.
- `backend/http/` y `backend/agent/`: endpoints, reglas del servidor y flujos de agentes.
- `db/`, `drizzle-postgres/` y `drizzle/`: persistencia, esquema y migraciones. La configuración local usa PostgreSQL.
- `docs/adr/`: decisiones estables; `CONTEXT.md`: términos del dominio; `planning.md`: memoria de trabajo.
- `scripts/`, `e2e/`: utilidades y verificaciones.

Requisitos y comandos exactos pueden cambiar; verifica `package.json` y `README.md`. La configuración local documentada utiliza Docker Compose, PostgreSQL privado y acceso por `http://127.0.0.1:8787`. No afirmes que el sistema está corriendo sin comprobarlo en ese momento. Las pruebas y scripts de inicialización deben ejecutarse contra bases temporales o sintéticas, nunca contra datos persistentes, salvo que el propietario lo solicite y se haya verificado el alcance.

## Límites de seguridad y datos

- Trata credenciales, tokens, archivos de `.local-secrets/`, `.local-config/`, `.env*`, respaldos y bases locales como privados; no los leas o publiques sin necesidad. Nunca los añadas al repositorio.
- Mantén secretos en los mecanismos locales de Docker/entorno, no en código, logs, fixtures, documentación ni frontend. Usa datos sintéticos para pruebas.
- La aplicación está planteada para uso local. No publiques puertos ni la expongas a LAN o Internet sin una decisión explícita y revisión de autenticación, permisos, TLS y despliegue.
- El backend es la autoridad para validar identidad, permisos y cambios; ocultar un botón en la UI no sustituye esa validación.
- Antes de migraciones o cambios de datos persistentes, sigue el procedimiento de respaldo y restauración descrito en `README.md` y los ADR. No borres, recrees ni reutilices volúmenes para “limpiar” sin autorización explícita.
- Mantén producción/local y demo separados. No ejecutes cargas sintéticas sobre la base local ni copies registros entre ambas.
- Los agentes externos, incluidos OpenClaw, no son fuente de verdad: el servidor limita su contexto y las mutaciones deben respetar los flujos y controles de Salvacel. Revisa el ADR específico antes de cambiar estas integraciones.

## Verificación y entrega

El repositorio contiene scripts de lint, build, flujo funcional y E2E; consulta `package.json` y usa la menor suite suficiente para el cambio, ampliándola si el riesgo lo exige. Informa qué se ejecutó realmente y sus resultados; no declares una prueba pasada por una nota previa. No incluyas secretos ni datos de clientes en el reporte.

Al cerrar trabajo que cambie una decisión de producto, una interfaz entre módulos, una API o el modelo de datos, actualiza `planning.md` y, cuando la decisión ya esté acordada y sea arquitectónica, consolídala en un ADR siguiendo las instrucciones de `AGENTS.md`/`doc-flow` disponibles en el entorno de desarrollo.
