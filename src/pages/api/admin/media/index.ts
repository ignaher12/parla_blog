import type { APIRoute } from 'astro';
import { error, json } from '../../../../lib/api';
import { guardarImagen, listarMedia, MAX_BYTES } from '../../../../lib/media';

export const GET: APIRoute = () => json(listarMedia());

/** Sube una imagen. El cuerpo es el archivo tal cual (image/jpeg, image/png, ...). */
export const POST: APIRoute = async ({ request }) => {
	const tipo = request.headers.get('content-type') ?? '';
	if (!/^image\/(jpeg|png|webp|gif|avif|heic|heif|tiff)$/.test(tipo)) {
		return error('Ese archivo no es una imagen. Probá con una foto JPG o PNG.', 415);
	}
	if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES) {
		return error('La imagen pesa más de 15 MB. Probá con una más liviana.', 413);
	}
	const buf = Buffer.from(await request.arrayBuffer());
	if (!buf.length || buf.length > MAX_BYTES) return error('La imagen está vacía o pesa más de 15 MB.', 413);
	const alt = decodeURIComponent(request.headers.get('x-alt') ?? '');
	try {
		return json(await guardarImagen(buf, alt), 201);
	} catch (e) {
		console.error('Error procesando imagen:', e);
		return error('No se pudo leer la imagen. Probá con otra foto (JPG o PNG).', 422);
	}
};
