import type { APIRoute } from 'astro';
import { error, json, leerJson } from '../../../../lib/api';
import { crearViaje, listarViajes, ordenarViajes } from '../../../../lib/viajes';

export const GET: APIRoute = () => json(listarViajes());

/** Crea un viaje nuevo (sin publicar) con los datos mínimos. */
export const POST: APIRoute = async ({ request }) => {
	const d = await leerJson(request);
	if (!d) return error('Datos inválidos');
	return json(crearViaje({ ...d, publicado: false }), 201);
};

/** Reordena: recibe { ids: [3, 1, 2] } en el orden nuevo. */
export const PUT: APIRoute = async ({ request }) => {
	const d = await leerJson(request);
	const ids = Array.isArray(d?.ids) ? d.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0) : null;
	if (!ids) return error('Datos inválidos');
	ordenarViajes(ids);
	return json({ ok: true });
};
