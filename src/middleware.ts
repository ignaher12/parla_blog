import { defineMiddleware } from 'astro:middleware';
import { usuarioAdmin } from './lib/auth';
import { sembrarSiHaceFalta } from './lib/seed';

const esAdmin = (p: string) => p === '/admin' || p.startsWith('/admin/') || p.startsWith('/api/admin/');
const MODIFICA = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const onRequest = defineMiddleware(async (ctx, next) => {
	await sembrarSiHaceFalta();

	const p = ctx.url.pathname;
	if (esAdmin(p)) {
		const usuario = await usuarioAdmin(ctx.request);
		if (!usuario) return new Response('No autorizado', { status: 401 });
		ctx.locals.usuario = usuario;

		// Protección contra CSRF: el panel siempre manda este header, y un sitio
		// ajeno no puede agregarlo sin que el navegador lo bloquee.
		if (p.startsWith('/api/admin/') && MODIFICA.has(ctx.request.method) && ctx.request.headers.get('x-parla') !== '1') {
			return new Response('Pedido inválido', { status: 400 });
		}
	}

	const res = await next();
	if (esAdmin(p)) {
		res.headers.set('Cache-Control', 'no-store');
		res.headers.set('X-Robots-Tag', 'noindex');
	}
	return res;
});
