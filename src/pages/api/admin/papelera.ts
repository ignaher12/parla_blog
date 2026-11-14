import type { APIRoute } from 'astro';
import { error, json, leerJson } from '../../../lib/api';
import { papelera, restaurarViaje } from '../../../lib/viajes';

export const GET: APIRoute = () => json(papelera());

/** Recupera un viaje borrado: { id: <id del historial> }. Vuelve sin publicar. */
export const POST: APIRoute = async ({ request, locals }) => {
	const d = await leerJson(request);
	const v = restaurarViaje(Number(d?.id), locals.usuario ?? '');
	return v ? json(v) : error('No se encontró', 404);
};
