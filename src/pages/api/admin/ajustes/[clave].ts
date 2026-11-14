import type { APIRoute } from 'astro';
import { CLAVES, type ClaveAjuste, getAjuste, guardarAjuste } from '../../../../lib/ajustes';
import { error, json, leerJson } from '../../../../lib/api';

const clave = (c: string | undefined) => (CLAVES.includes(c as ClaveAjuste) ? (c as ClaveAjuste) : undefined);

export const GET: APIRoute = ({ params }) => {
	const c = clave(params.clave);
	return c ? json(getAjuste(c)) : error('No existe', 404);
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
	const c = clave(params.clave);
	const d = await leerJson(request);
	if (!c || !d) return error('Datos inválidos');
	return json(guardarAjuste(c, d, locals.usuario ?? ''));
};
