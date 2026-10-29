# Habilitar captura móvil de fotos por QR

La función ya está conectada al detalle de cada orden, pero inicia deshabilitada. No ejecutes estos pasos sin una ventana de mantenimiento y un respaldo PostgreSQL verificado. El inicio de la app aplica migraciones pendientes; después debe crearse la cuenta administrativa individual desde la consola local antes de permitir uso desde LAN.

## Requisitos de red y certificado

- Un equipo celular y la PC del taller conectados a la misma red privada.
- Una IP fija o reservada de la PC, por ejemplo `192.168.1.25`.
- Un certificado HTTPS cuyo nombre/IP coincida con la dirección que abrirá el celular y que el teléfono confíe. Un certificado autofirmado no confiable genera advertencias y no es apto para usar este flujo.
- Regla de firewall local limitada a la IP privada de la PC y al puerto elegido. No crear redirección de puertos en el router ni publicar Salvacel, PostgreSQL u OpenClaw.
- El almacenamiento tiene un tope predeterminado de 5 GiB, configurable con `SALVACEL_PHOTO_MAX_STORAGE_BYTES`; se rechaza una carga si originales más miniaturas rebasan el límite.

## Configuración local (PowerShell)

1. Crea la carpeta local de certificados y guarda ahí el certificado y su llave privada. Mantén la carpeta privada y fuera de respaldos o commits compartidos:

   ```powershell
   New-Item -ItemType Directory -Force .\.local-secrets\photo-tls | Out-Null
   ```

   Los archivos deben llamarse `.local-secrets/photo-tls/fullchain.pem` y `.local-secrets/photo-tls/privkey.pem`.
2. En `.env` (archivo ignorado por Git) configura el origen, la IP privada y el puerto. Ejemplo:

   ```dotenv
   SALVACEL_PHOTO_MOBILE_ORIGIN=https://salvacel-taller.local:8788
   SALVACEL_PHOTO_BIND_IP=192.168.1.25
   SALVACEL_PHOTO_PORT=8788
   SALVACEL_PHOTO_MAX_STORAGE_BYTES=5368709120
   ```

   El nombre `salvacel-taller.local` debe resolver a esa IP en el celular. También se puede usar una IP privada HTTPS cubierta por el certificado.
3. Desde esta carpeta inicia solo el perfil restringido (esto reconstruye y reinicia Salvacel; antes revisa el respaldo y confirma que puedes entrar localmente):

   ```powershell
   docker compose -f .\compose.local.yaml --profile photos-mobile up -d --build salvacel photo-mobile-ingress
   docker compose -f .\compose.local.yaml ps
   ```

4. En la primera ejecución, crea la cuenta inicial desde la PC cuando Salvacel lo indique; también puedes hacerlo con `docker compose -f .\compose.local.yaml exec -it salvacel node scripts/bootstrap-admin.mjs`. Abre una orden, usa **Generar QR temporal** y escanéalo con el celular conectado a la misma red y confiando en el certificado.
5. Al terminar, puedes detener solo la entrada móvil con:

   ```powershell
   docker compose -f .\compose.local.yaml stop photo-mobile-ingress
   ```

El servicio adicional solo expone por HTTPS tres archivos estáticos y los dos endpoints mínimos de canje/carga; cualquier otra ruta devuelve 404. PostgreSQL y OpenClaw no se unen a esa red. Por defecto el puerto queda ligado a `127.0.0.1`, el perfil no se inicia y el backend rechaza emitir QR si falta origen privado; así los cambios no abren acceso LAN por accidente.

Los QR duran 10 minutos y se canjean una vez. Emitir un nuevo QR para la misma orden revoca QR/sesiones anteriores aún vigentes. La sesión permite hasta 10 fotos de máximo 12 MB durante 30 minutos; se validan como JPG/PNG/WebP, se genera miniatura y los originales se guardan en el volumen privado `salvacel-photo-data`. El detalle de orden requiere inicio de sesión para listar, abrir o retirar fotos. Retirar una foto la oculta y deja bitácora; el archivo se conserva y sigue contando contra el límite hasta implementar y verificar una política segura de retención y purga.
