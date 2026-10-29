# Salvacel · edición local

Aplicación privada para uso y desarrollo en la computadora. La interfaz y la API
corren juntas en un contenedor Node.js; PostgreSQL corre aparte en un contenedor
privado. No se conecta a Cloudflare ni publica la base de datos al equipo.

## Iniciar

Requisitos: Docker Desktop activo. Desde esta carpeta ejecuta:

```powershell
docker compose -f compose.local.yaml up -d --build
```

Abre [http://127.0.0.1:8787](http://127.0.0.1:8787). Para ver el estado y los
registros:

```powershell
docker compose -f compose.local.yaml ps
docker compose -f compose.local.yaml logs --tail=100
```

Para detener o volver a iniciar:

```powershell
docker compose -f compose.local.yaml stop
docker compose -f compose.local.yaml up -d --no-build
```

Las migraciones PostgreSQL pendientes se aplican automáticamente al arrancar.
No ejecutes scripts de Wrangler/D1 para esta base.

## Datos y respaldos

La base PostgreSQL activa persiste en `salvacel-local_salvacel-postgres-data`,
un volumen exclusivo sin puerto publicado. La contraseña está en
`.local-secrets/postgres_password`, fuera de Git y del contexto de compilación.
No compartas ese archivo ni los respaldos.

La base PostgreSQL se inició vacía, con catálogos iniciales; las órdenes antiguas
no se importaron. El volumen previo `salvacel-local_salvacel-data` se conserva
desmontado para una posible reversión. No lo borres ni importes sus datos sin
decidirlo explícitamente.

Para crear un respaldo PostgreSQL:

```powershell
pnpm db:backup
```

Los archivos de respaldo se guardan en `backups/` en formato PostgreSQL custom.
Antes de restaurar, puedes verificar el archivo con:

```powershell
pnpm db:verify-backup -- .\backups\salvacel-fecha.dump
```

El ensayo usa una imagen PostgreSQL que ya exista localmente y crea una base
efímera sin red, puertos publicados ni volúmenes; restaura con `pg_restore`,
comprueba migraciones y conteos básicos, e intenta retirar el contenedor al final.
No conecta ni restaura sobre la base activa. El límite actual del archivo de
entrada es 1 GiB y el contenedor temporal limita memoria y almacenamiento.
«Exportar respaldo» desde la interfaz es una copia JSON adicional, no sustituye
el respaldo completo de PostgreSQL.

## Organización

- `frontend/`: interfaz, formularios y componentes.
- `backend/http/`: rutas HTTP y reglas del taller.
- `db/`: adaptador de persistencia y esquema PostgreSQL.
- `drizzle-postgres/`: migraciones de PostgreSQL.
- `app/`: fachadas de Next.js para la página y las rutas API.

La separación de frontend y backend es por carpetas y responsabilidades; ambos
comparten proceso y contenedor. PostgreSQL está separado en su propio contenedor.
OpenClaw, WhatsApp y Gemini Live no forman parte de esta configuración de base.

## Comprobaciones

Las pruebas usan bases PostgreSQL temporales y no la base activa:

```powershell
pnpm lint
pnpm build
pnpm test:flow
pnpm test:e2e
```

La app solo se publica mediante Nginx en `127.0.0.1:8787`. No cambies el enlace
a `0.0.0.0` ni la expongas a la red o internet; todavía es un entorno local de
desarrollo y no está preparado para acceso externo.

## Demostración con datos sintéticos

La vista de carga alta usa una aplicación, un gateway y un volumen PostgreSQL
separados del entorno real. Abre [http://127.0.0.1:8790](http://127.0.0.1:8790).
No contiene teléfonos ni contactos reales y no conecta WhatsApp ni OpenClaw.

Para arrancar solo esa demo:

```powershell
docker compose -f compose.mock.yaml up -d
```

El escenario semanal base ya incluye ejemplos de órdenes y cotizaciones. Para
añadir una sola vez la carga alta (700 órdenes, 1,400 ventas, catálogo ampliado,
precios históricos, compras, caja, cancelaciones, devoluciones y garantías),
desde esta carpeta ejecuta:

```powershell
Get-Content -LiteralPath .\scripts\seed-demo-peak.sql -Raw | docker compose -f compose.mock.yaml exec -T mock-postgres psql -v ON_ERROR_STOP=1 -U salvacel_demo -d salvacel_demo
```

El script tiene una guarda para no duplicar el escenario. No lo ejecutes contra
`compose.local.yaml`; la base real debe permanecer sin datos de demostración.
Verifica los servicios con `docker compose -f compose.mock.yaml ps`.
