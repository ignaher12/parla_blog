// Convierte el texto escrito en el panel (Markdown simple) en HTML seguro.
import { Marked } from 'marked';

const escapar = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const marked = new Marked({
	gfm: true,
	breaks: true,
	renderer: {
		// Nada de HTML crudo: se muestra como texto.
		html({ text }) {
			return escapar(text);
		},
		// Solo enlaces http(s), mail, teléfono o internos.
		link({ href, title, tokens }) {
			const contenido = this.parser.parseInline(tokens);
			if (!/^(https?:|mailto:|tel:|\/|#)/i.test(href)) return contenido;
			const externo = /^https?:/i.test(href);
			return `<a href="${escapar(href)}"${title ? ` title="${escapar(title)}"` : ''}${externo ? ' target="_blank" rel="noopener noreferrer"' : ''}>${contenido}</a>`;
		},
		// Las fotos se cargan en la galería, no dentro del texto.
		image({ text }) {
			return escapar(text);
		},
	},
});

export function markdownAHtml(md: string): string {
	return marked.parse(md, { async: false });
}
