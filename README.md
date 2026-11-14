# Parla di Viaggi

Sitio de la agencia de viajes Parla di Viaggi (Mar del Plata): https://parladiviaggi.com.ar

Hecho con [Astro](https://astro.build). Las páginas públicas son HTML estático. Las rutas de admin y API corren en Node.

## Desarrollo

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/client (estático) y dist/server (Node)
```

Los contactos (WhatsApp de las asesoras e Instagram) están en `src/consts.ts`.

## Hosting

Servidor Oracle Cloud (Ubuntu) detrás de Cloudflare (DNS, proxy y SSL "Full (strict)").

- **Caddy** sirve `dist/client` y pasa el resto a Node en `127.0.0.1:4321` (`deploy/Caddyfile.parladiviaggi`).
- **Node** corre como servicio systemd `parladiviaggi` con el usuario `parla` (`deploy/parladiviaggi.service`).
- Los datos persistentes (base de datos e imágenes subidas, desde la fase 2) van en `/var/lib/parladiviaggi`.
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
