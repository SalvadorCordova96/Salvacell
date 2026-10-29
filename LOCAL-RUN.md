# Ejecución local de Salvacel

La aplicación está disponible únicamente en:

http://127.0.0.1:8787

## Estado y operación

Ejecuta estos comandos desde esta carpeta:

```powershell
# Ver el estado
docker compose -f compose.local.yaml ps

# Ver los registros recientes
docker compose -f compose.local.yaml logs --tail=100

# Detener temporalmente
docker compose -f compose.local.yaml stop

# Volver a iniciar la versión ya compilada
docker compose -f compose.local.yaml up -d --no-build

# Reconstruir después de modificar el código
docker compose -f compose.local.yaml up -d --build
```

Docker Desktop debe permanecer encendido mientras se use la aplicación.

## Aislamiento aplicado

- La aplicación no publica puertos directamente.
- Solo la pasarela `salvacel-loopback` escucha en `127.0.0.1:8787`.
- El contenedor de la aplicación no tiene salida a internet.
- La raíz del contenedor es de solo lectura.
- Se eliminaron sus capacidades Linux y se bloquearon privilegios nuevos.
- Tiene límites de 1 GB de memoria, 1.5 CPU y 256 procesos.
- PostgreSQL persiste en el volumen `salvacel-local_salvacel-postgres-data`, unido solo a la red interna de Salvacel y sin puerto publicado.
- El volumen heredado `salvacel-local_salvacel-data` de D1/SQLite se conserva sin montar ni modificar, como respaldo de reversión; sus registros no se copiaron automáticamente.
- La base PostgreSQL nueva se inicializó vacía, con catálogos básicos. Las altas y cambios posteriores sí se guardan ahí.
- El secreto local de PostgreSQL vive en `.local-secrets/postgres_password`, ignorado por Git y fuera del contexto de compilación Docker.

No cambies la dirección publicada a `0.0.0.0` ni agregues otra interfaz hasta actualizar las dependencias, añadir autenticación y revisar el despliegue de red.
