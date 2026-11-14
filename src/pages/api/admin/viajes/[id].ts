import type { APIRoute } from 'astro';
import { error, idNumerico, json, leerJson } from '../../../../lib/api';
import { borrarViaje, guardarViaje, obtenerViaje } from '../../../../lib/viajes';

export const GET: APIRoute = ({ params }) => {
	const v = obtenerViaje(idNumerico(params.id) ?? 0);
	return v ? json(v) : error('No existe', 404);
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
	const d = await leerJson(request);
	if (!d) return error('Datos inválidos');
	const v = guardarViaje(idNumerico(params.id) ?? 0, d, locals.usuario ?? '');
	return v ? json(v) : error('No existe', 404);
};

export const DELETE: APIRoute = ({ params, locals }) =>
	borrarViaje(idNumerico(params.id) ?? 0, locals.usuario ?? '') ? json({ ok: true }) : error('No existe', 404);
