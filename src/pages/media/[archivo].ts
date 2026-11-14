// Sirve las imágenes subidas. En producción Caddy las sirve directo desde el
// disco; esta ruta queda para desarrollo y como respaldo.
import fs from 'node:fs/promises';
import path from 'node:path';
import type { APIRoute } from 'astro';
import { MEDIA_DIR } from '../../lib/db';

export const GET: APIRoute = async ({ params }) => {
	const archivo = params.archivo ?? '';
	if (!/^[a-f0-9]{16}-(480|960|1600)\.webp$/.test(archivo)) return new Response('No existe', { status: 404 });
	try {
		const datos = await fs.readFile(path.join(MEDIA_DIR, archivo));
		return new Response(datos, {
			headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' },
		});
	} catch {
		return new Response('No existe', { status: 404 });
	}
};
