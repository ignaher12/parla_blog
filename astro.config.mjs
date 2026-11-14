// @ts-check

import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://parladiviaggi.com.ar',
	// Las páginas públicas se generan como HTML estático (las sirve Caddy).
	// Las rutas con `export const prerender = false` (admin y API, fase 2)
	// corren en el servidor Node.
	output: 'static',
	adapter: node({ mode: 'standalone' }),
	integrations: [mdx(), sitemap()],
});
