// Mapa del sitio para Google: páginas fijas + cada viaje publicado.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { listarViajes } from '../lib/viajes';

export const GET: APIRoute = async ({ site }) => {
	const base = site!.origin;
	const posts = await getCollection('post');
	const urls = [
		{ loc: '/' },
		{ loc: '/travel/' },
		{ loc: '/about/' },
		{ loc: '/past-travels/' },
		...posts.map((p) => ({ loc: `/past-travels/${p.id}/` })),
		...listarViajes({ soloPublicados: true }).map((v) => ({ loc: `/travel/${v.slug}/`, lastmod: v.actualizado.slice(0, 10) })),
	];
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${base}${u.loc}</loc>${'lastmod' in u && u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;
	return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
