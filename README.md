# Parla di Viaggi

Sitio de la agencia de viajes Parla di Viaggi (Mar del Plata): https://parladiviaggi.com.ar

Hecho con [Astro](https://astro.build) sobre Node. Cada página se genera en el servidor al visitarla, así lo que se cambia en el panel se ve al instante.

## Panel admin (`/admin`)

Para la agencia: carga de salidas grupales y paquetes especiales (fotos con arrastrar y soltar, itinerario, precios, estado de cupos), textos e imágenes del inicio, y los WhatsApp de las asesoras. Guarda versiones anteriores y tiene papelera.

- **Login:** Cloudflare Access (código por email) protege `/admin` y `/api/admin`. La app además verifica el JWT de Access (`src/lib/auth.ts`), así no se puede saltear entrando directo al servidor. Las emails habilitadas se manejan en Cloudflare Zero Trust → Access → Applications.
- **Datos:** SQLite (`node:sqlite`) en `DATA_DIR/db/parla.db`. Las fotos se convierten a WebP en 3 tamaños y quedan en `DATA_DIR/media`.
- **Código:** el panel es una app Preact en `src/admin/`. La API está en `src/pages/api/admin/` y la lógica en `src/lib/`.
- **Carga inicial:** la primera vez que arranca con la base vacía importa los viajes de `seed/`.

## Desarrollo

```sh
npm install
npm run dev      # http://localhost:4321 (el panel en /admin no pide login en desarrollo)
npm run build    # genera dist/client (estático) y dist/server (Node)
```

En desarrollo los datos se guardan en `./.data/`.

## Hosting

Servidor Oracle Cloud (Ubuntu) detrás de Cloudflare (DNS, proxy y SSL "Full (strict)").

- **Caddy** sirve `dist/client` y pasa el resto a Node en `127.0.0.1:4321` (`deploy/Caddyfile.parladiviaggi`).
- **Node** corre como servicio systemd `parladiviaggi` con el usuario `parla` (`deploy/parladiviaggi.service`). Lee `/etc/parladiviaggi.env` (ver `deploy/parladiviaggi.env.example`).
- La base de datos y las fotos subidas están en `/var/lib/parladiviaggi`. Caddy sirve `/media/*` directo desde ahí.
- El certificado de origen de Cloudflare está en `/etc/caddy/certs/`.

### Deploy

Automático con GitHub Actions (`.github/workflows/deploy.yml`) en cada push a la rama configurada:

1. Compila en GitHub, porque el servidor tiene 1 GB de RAM.
2. Sube el paquete por SSH como `parla`.
3. `deploy/activate.sh` lo descomprime en `/var/www/parladiviaggi/releases/<versión>`, mueve el symlink `current` y reinicia el servicio.
4. Si la versión nueva no responde, vuelve sola a la anterior. Se guardan las últimas 5 versiones.

Secretos del repo: `DEPLOY_SSH_KEY` y `DEPLOY_KNOWN_HOSTS`. Variables: `DEPLOY_HOST` y `DEPLOY_USER`.

Para volver a una versión anterior a mano, en el servidor:

```sh
ls /var/www/parladiviaggi/releases
ln -sfn /var/www/parladiviaggi/releases/<versión> /var/www/parladiviaggi/current
sudo systemctl restart parladiviaggi
```
