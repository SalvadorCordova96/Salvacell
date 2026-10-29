# Estado de instalación segura

Fecha de verificación: 10 de octubre de 2026.

Estado operativo revisado: 16 de octubre de 2026.

## Resultado

- Fuente: `C:\Users\Salva\Downloads\Salvacel_codigo_local.zip`
- SHA-256 del ZIP: `3CF81CBFDDCDCF91D8CEC08FD9BFCD74189967EBEBDDFCE8F061B0F4D8F21E6A`
- Destino: `outputs/Salvacel-local`
- Entorno: Node.js 24.19.0 y pnpm 11.25.0.
- Instalación: `pnpm install --frozen-lockfile --ignore-scripts`.
- Resultado de pnpm: 44 dependencias directas y 639 paquetes instalados.

El ZIP se validó antes de extraerlo: 112 entradas, sin rutas que escaparan del destino, rutas duplicadas, enlaces simbólicos, archivos excesivamente grandes ni compresión anómala. Los archivos `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` y `.npmrc` conservan exactamente sus hashes originales.

Los scripts automáticos de instalación se bloquearon. Los paquetes nativos necesarios para Windows (`esbuild`, `workerd`, `sharp` y `unrs-resolver`) ya incluyen sus binarios de plataforma, por lo que no fue necesario habilitarlos.

Microsoft Defender examinó el ZIP y la carpeta instalada. La protección antivirus y la protección en tiempo real estaban activas; no se registraron detecciones para el proyecto. La firma mostrada por Defender durante la verificación estaba fechada el 23 de septiembre de 2026.

## Estado de seguridad de dependencias

`pnpm audit` reportó 62 avisos: 1 crítico, 30 altos, 23 moderados y 8 bajos.

El aviso crítico afecta a `next` 16.3.4 cuando la aplicación usa `next/og` con `ImageResponse` y contenido SVG controlado por un atacante. El código de Salvacel no importa `next/og` ni `ImageResponse`. El aviso indica que la corrección empieza en Next.js 16.3.6:

- https://github.com/advisories/GHSA-vcvr-r3jv-pc5j

Otro aviso alto de Next.js afecta a la optimización de imágenes con `images.remotePatterns`; la configuración de este proyecto no define esos patrones. Su corrección empieza en Next.js 16.3.8:

- https://github.com/advisories/GHSA-cjq9-62q9-8jv4

Aunque no aparecen en el código las condiciones descritas por esos dos avisos, conviene actualizar las dependencias y repetir las pruebas antes de usar el proyecto fuera de un entorno local controlado.

## Límites aplicados

- La aplicación fue iniciada posteriormente en Docker para continuar el desarrollo local.
- El único puerto publicado escucha exclusivamente en `127.0.0.1:8787`.
- La base de datos no se inicializó durante la instalación inicial; se creó después, al autorizar la ejecución local aislada.
- No se crearon ni cargaron archivos `.env`.
- No se utilizaron credenciales del usuario para descargar paquetes.
- El servidor está configurado para `127.0.0.1`, pero la aplicación no incorpora autenticación propia y no debe exponerse a una red o a internet en este estado.

## Ejecución local posterior

Actualización verificada el 16 de octubre de 2026:

- Salvacel corre en Docker con Next.js/Node.js y PostgreSQL 17.6; el navegador solo entra por `http://127.0.0.1:8787` a través de Nginx.
- PostgreSQL usa el contenedor, volumen y red privada propios de Salvacel. No publica puerto al host ni se conecta a servicios de Cloudflare.
- La base nueva quedó inicializada vacía: 0 clientes, 0 órdenes y 0 productos; incluye 9 marcas y 8 servicios iniciales.
- El antiguo volumen `salvacel-local_salvacel-data`, que contenía la demostración D1/SQLite, se conserva intacto y desmontado. No se migraron sus órdenes antiguas.
- El secreto de PostgreSQL está en `.local-secrets/postgres_password`; no se copia al contexto de build ni al bundle del navegador.
- Validación: compilación de producción Docker exitosa, flujo PostgreSQL temporal con 218 comprobaciones, E2E 14/14, lint sin errores (8 advertencias) y TypeScript sin errores.
- Durante las pruebas se retiraron las bases temporales de test; la única base activa es la instancia privada de Salvacel.

La app sigue en desarrollo y uso local. No publiques puertos ni la expongas a la red local o internet sin definir autenticación y revisar el despliegue.
