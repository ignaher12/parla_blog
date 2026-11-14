// Ajustes generales del sitio que se editan desde el panel (contacto, inicio).
import { getDb, registrarHistorial } from './db';
import type { Ajustes, Contacto, Inicio } from './tipos';

export const AJUSTES_POR_DEFECTO: Ajustes = {
	contacto: {
		asesoras: [
			{ nombre: 'Andrea', whatsapp: '5492235261703', activa: true },
			{ nombre: 'Claudia', whatsapp: '5492235828803', activa: true },
		],
		instagram: 'https://www.instagram.com/parladiviaggi.viajes/',
	},
	inicio: {
		hero_titulo: 'Parla di Viaggi',
		hero_subtitulo: 'Agencia de viajes.',
		hero_texto:
			'Nos especializamos en acompañar a cada viajero desde el primer contacto, ofreciendo asesoramiento personalizado y una planificación cuidadosa en cada etapa del viaje.',
		hero_texto2:
			'Nuestro objetivo es simple: que disfrutes de tu experiencia sin preocupaciones, sabiendo que cada detalle fue pensado para vos.',
		hero_imagen: null,
		mujeres_titulo: 'Viajes Especializados para Mujeres',
		mujeres_destacado: 'Seguridad, compañía y disfrute',
		mujeres_texto:
			'Uno de nuestros principales diferenciales es la organización de viajes pensados especialmente para mujeres. Diseñamos experiencias que priorizan la seguridad, la comodidad, el acompañamiento y el disfrute, creando itinerarios adaptados a los intereses y necesidades de mujeres que desean viajar solas, con amigas o en grupos afines.',
		mujeres_imagen: null,
	},
};

export type ClaveAjuste = keyof Ajustes;
export const CLAVES = Object.keys(AJUSTES_POR_DEFECTO) as ClaveAjuste[];

export function getAjuste<K extends ClaveAjuste>(clave: K): Ajustes[K] {
	const f = getDb().prepare('SELECT valor FROM ajustes WHERE clave = ?').get(clave) as { valor: string } | undefined;
	const guardado = f ? JSON.parse(f.valor) : {};
	return { ...AJUSTES_POR_DEFECTO[clave], ...guardado };
}

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const idMedia = (v: unknown) => (typeof v === 'string' && /^[a-f0-9]{16}$/.test(v) ? v : null);

const VALIDADORES: { [K in ClaveAjuste]: (d: Record<string, unknown>) => Ajustes[K] } = {
	contacto(d): Contacto {
		const asesoras = Array.isArray(d.asesoras)
			? d.asesoras
					.map((a: Record<string, unknown>) => ({
						nombre: texto(a?.nombre, 40),
						whatsapp: texto(a?.whatsapp, 30).replace(/\D/g, ''),
						activa: a?.activa !== false,
					}))
					.filter((a) => a.nombre && a.whatsapp.length >= 10)
					.slice(0, 10)
			: [];
		const ig = texto(d.instagram, 200);
		return {
			asesoras,
			instagram: /^https:\/\/(www\.)?instagram\.com\//.test(ig) ? ig : AJUSTES_POR_DEFECTO.contacto.instagram,
		};
	},
	inicio(d): Inicio {
		const def = AJUSTES_POR_DEFECTO.inicio;
		return {
			hero_titulo: texto(d.hero_titulo, 80) || def.hero_titulo,
			hero_subtitulo: texto(d.hero_subtitulo, 120),
			hero_texto: texto(d.hero_texto, 600),
			hero_texto2: texto(d.hero_texto2, 600),
			hero_imagen: idMedia(d.hero_imagen),
			mujeres_titulo: texto(d.mujeres_titulo, 120),
			mujeres_destacado: texto(d.mujeres_destacado, 120),
			mujeres_texto: texto(d.mujeres_texto, 1500),
			mujeres_imagen: idMedia(d.mujeres_imagen),
		};
	},
};

export function guardarAjuste<K extends ClaveAjuste>(clave: K, datos: Record<string, unknown>, usuario: string): Ajustes[K] {
	const valor = VALIDADORES[clave](datos);
	registrarHistorial('ajuste', clave, 'editar', getAjuste(clave), usuario);
	getDb()
		.prepare('INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor')
		.run(clave, JSON.stringify(valor));
	return valor;
}

/** Asesoras activas, con respaldo si se borraron todas. */
export function asesorasActivas() {
	const activas = getAjuste('contacto').asesoras.filter((a) => a.activa);
	return activas.length ? activas : AJUSTES_POR_DEFECTO.contacto.asesoras;
}
