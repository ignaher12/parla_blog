// Llamadas del panel a la API. Todas mandan el header x-parla (protección CSRF).
import type { MediaInfo } from '../lib/tipos';

export class ErrorApi extends Error {}

async function pedir<T>(metodo: string, url: string, cuerpo?: unknown): Promise<T> {
	let res: Response;
	try {
		res = await fetch(url, {
			method: metodo,
			headers: { 'x-parla': '1', ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}) },
			body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
			credentials: 'same-origin',
		});
	} catch {
		throw new ErrorApi('No hay conexión. Revisá internet y probá de nuevo.');
	}
	return respuesta<T>(res);
}

async function respuesta<T>(res: Response): Promise<T> {
	if (res.status === 401 || res.redirected) {
		throw new ErrorApi('Se venció la sesión. Recargá la página para volver a entrar.');
	}
	const datos = await res.json().catch(() => ({}));
	if (!res.ok) throw new ErrorApi(datos.error ?? 'Algo salió mal. Probá de nuevo.');
	return datos as T;
}

export const api = {
	get: <T>(url: string) => pedir<T>('GET', url),
	post: <T>(url: string, cuerpo: unknown) => pedir<T>('POST', url, cuerpo),
	put: <T>(url: string, cuerpo: unknown) => pedir<T>('PUT', url, cuerpo),
	patch: <T>(url: string, cuerpo: unknown) => pedir<T>('PATCH', url, cuerpo),
	del: <T>(url: string) => pedir<T>('DELETE', url),
};

/** Achica la foto en el navegador antes de subirla: sube más rápido y el servidor sufre menos. */
async function achicar(archivo: File, maximo = 2400): Promise<Blob> {
	if (archivo.type === 'image/gif') return archivo;
	try {
		const bmp = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
		const escala = Math.min(1, maximo / Math.max(bmp.width, bmp.height));
		if (escala === 1 && archivo.size < 3_000_000) {
			bmp.close();
			return archivo;
		}
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(bmp.width * escala);
		canvas.height = Math.round(bmp.height * escala);
		canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
		bmp.close();
		return await new Promise<Blob>((ok, mal) => canvas.toBlob((b) => (b ? ok(b) : mal()), 'image/jpeg', 0.9));
	} catch {
		return archivo; // el servidor se arregla
	}
}

export async function subirImagen(archivo: File, alt = ''): Promise<MediaInfo> {
	if (!archivo.type.startsWith('image/')) throw new ErrorApi(`"${archivo.name}" no es una imagen.`);
	const blob = await achicar(archivo);
	let res: Response;
	try {
		res = await fetch('/api/admin/media', {
			method: 'POST',
			headers: { 'x-parla': '1', 'Content-Type': blob.type || archivo.type, 'x-alt': encodeURIComponent(alt) },
			body: blob,
			credentials: 'same-origin',
		});
	} catch {
		throw new ErrorApi('No hay conexión. Revisá internet y probá de nuevo.');
	}
	return respuesta<MediaInfo>(res);
}
