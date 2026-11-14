import type { APIRoute } from 'astro';
import { error, json, leerJson } from '../../../../lib/api';
import { actualizarAlt, borrarImagen, getMedia } from '../../../../lib/media';

export const PATCH: APIRoute = async ({ params, request }) => {
	const d = await leerJson(request);
	if (!getMedia(params.id) || typeof d?.alt !== 'string') return error('Datos inválidos');
	actualizarAlt(params.id!, d.alt);
	return json(getMedia(params.id));
};

export const DELETE: APIRoute = async ({ params }) => {
	if (!getMedia(params.id)) return error('No existe', 404);
	return (await borrarImagen(params.id!))
		? json({ ok: true })
		: error('Esta foto se está usando en un viaje o en la página de inicio. Sacala de ahí primero.', 409);
};
