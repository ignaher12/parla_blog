import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { rangoFechas } from '../lib/formato';
import { listarViajes } from '../lib/viajes';

export function GET(context) {
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: listarViajes({ soloPublicados: true }).map((v) => ({
			title: v.titulo,
			description: [v.resumen, rangoFechas(v.fecha_salida, v.fecha_regreso)].filter(Boolean).join(' · '),
			pubDate: new Date(`${v.creado.replace(' ', 'T')}Z`),
			link: `/travel/${v.slug}/`,
		})),
	});
}
