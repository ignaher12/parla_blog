// @ts-check

import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://parladiviaggi.com.ar',
	// Todas las páginas se generan en el servidor en cada visita, así lo que se
	// cambia en el panel admin se ve al instante. Caddy sirve directo los
	// archivos estáticos (/_astro, /imgs, /media).
	output: 'server',
	adapter: node({ mode: 'standalone' }),
	integrations: [mdx(), preact()],
	redirects: {
		'/travel/viaje-1': '/travel/cruce-andino',
	},
});
