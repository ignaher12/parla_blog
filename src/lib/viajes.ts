// Viajes (salidas grupales y paquetes especiales): lectura, validación y guardado.
import { getDb, registrarHistorial, transaccion } from './db';
import {
	type DiaItinerario,
	ESTADOS,
	type Estado,
	MONEDAS,
	type Moneda,
	TIPOS,
	type Tipo,
	type Version,
	type Viaje,
	type ViajeEditable,
} from './tipos';

type Fila = Record<string, unknown>;

function desdeFila(f: Fila): Viaje {
	return {
		...(f as unknown as Viaje),
		galeria: JSON.parse(String(f.galeria)),
		itinerario: JSON.parse(String(f.itinerario)),
		incluye: JSON.parse(String(f.incluye)),
		no_incluye: JSON.parse(String(f.no_incluye)),
		destacado: !!f.destacado,
		publicado: !!f.publicado,
		slug_fijo: !!f.slug_fijo,
	};
}

export function listarViajes(opciones: { soloPublicados?: boolean; tipo?: Tipo } = {}): Viaje[] {
	const where: string[] = [];
	const params: string[] = [];
	if (opciones.soloPublicados) where.push('publicado = 1');
	if (opciones.tipo) {
		where.push('tipo = ?');
		params.push(opciones.tipo);
	}
	const sql = `SELECT * FROM viajes ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY orden, fecha_salida, id`;
	return (getDb().prepare(sql).all(...params) as Fila[]).map(desdeFila);
}

export function obtenerViaje(id: number): Viaje | undefined {
	const f = getDb().prepare('SELECT * FROM viajes WHERE id = ?').get(id) as Fila | undefined;
	return f && desdeFila(f);
}

export function viajePorSlug(slug: string, soloPublicado = true): Viaje | undefined {
	const f = getDb()
		.prepare(`SELECT * FROM viajes WHERE slug = ? ${soloPublicado ? 'AND publicado = 1' : ''}`)
		.get(slug) as Fila | undefined;
	return f && desdeFila(f);
}

// --- Validación ---------------------------------------------------------------

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const textoLargo = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\r\n/g, '\n').slice(0, max) : '');
const fecha = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);
const listaTextos = (v: unknown, maxItems: number, max: number) =>
	Array.isArray(v) ? v.map((x) => texto(x, max)).filter(Boolean).slice(0, maxItems) : [];
const idMedia = (v: unknown) => (typeof v === 'string' && /^[a-f0-9]{16}$/.test(v) ? v : null);

/** Deja solo las fotos que siguen existiendo (una versión vieja puede apuntar a una foto borrada). */
function soloExistentes(ids: string[]) {
	if (!ids.length) return ids;
	const st = getDb().prepare('SELECT 1 FROM media WHERE id = ?');
	return ids.filter((id) => st.get(id));
}

export function validarViaje(d: Record<string, unknown>): ViajeEditable {
	const v = validarCampos(d);
	v.portada = soloExistentes(v.portada ? [v.portada] : [])[0] ?? null;
	v.galeria = soloExistentes(v.galeria);
	return v;
}

function validarCampos(d: Record<string, unknown>): ViajeEditable {
	const precio = typeof d.precio === 'number' ? d.precio : typeof d.precio === 'string' ? Number(d.precio.replace(/\D/g, '')) : NaN;
	const itinerario: DiaItinerario[] = Array.isArray(d.itinerario)
		? d.itinerario
				.map((x: Record<string, unknown>) => ({ titulo: texto(x?.titulo, 150), texto: textoLargo(x?.texto, 3000) }))
				.filter((x) => x.titulo || x.texto)
				.slice(0, 60)
		: [];
	return {
		tipo: (d.tipo as string) in TIPOS ? (d.tipo as Tipo) : 'grupal',
		titulo: texto(d.titulo, 150) || 'Sin título',
		destino: texto(d.destino, 150),
		resumen: texto(d.resumen, 400),
		descripcion: textoLargo(d.descripcion, 30000),
		fecha_salida: fecha(d.fecha_salida),
		fecha_regreso: fecha(d.fecha_regreso),
		precio: Number.isFinite(precio) && precio > 0 ? Math.round(precio) : null,
		moneda: MONEDAS.includes(d.moneda as Moneda) ? (d.moneda as Moneda) : 'ARS',
		precio_nota: texto(d.precio_nota, 150),
		estado: (d.estado as string) in ESTADOS ? (d.estado as Estado) : 'abierta',
		etiqueta: texto(d.etiqueta, 40),
		portada: idMedia(d.portada),
		galeria: Array.isArray(d.galeria) ? [...new Set(d.galeria.map(idMedia).filter((x): x is string => !!x))].slice(0, 60) : [],
		itinerario,
		incluye: listaTextos(d.incluye, 40, 300),
		no_incluye: listaTextos(d.no_incluye, 40, 300),
		destacado: !!d.destacado,
		publicado: !!d.publicado,
	};
}

// --- Escritura ----------------------------------------------------------------

export function slugify(s: string) {
	return (
		s
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60) || 'viaje'
	);
}

function slugLibre(base: string, excepto = 0) {
	const db = getDb();
	const ocupado = db.prepare('SELECT 1 FROM viajes WHERE slug = ? AND id != ?');
	let slug = slugify(base);
	for (let i = 2; ocupado.get(slug, excepto); i++) slug = `${slugify(base)}-${i}`;
	return slug;
}

const COLUMNAS = [
	'tipo', 'titulo', 'destino', 'resumen', 'descripcion', 'fecha_salida', 'fecha_regreso', 'precio', 'moneda',
	'precio_nota', 'estado', 'etiqueta', 'portada', 'galeria', 'itinerario', 'incluye', 'no_incluye', 'destacado', 'publicado',
] as const;

function valores(v: ViajeEditable) {
	return COLUMNAS.map((c) => {
		const x = v[c];
		if (Array.isArray(x)) return JSON.stringify(x);
		if (typeof x === 'boolean') return x ? 1 : 0;
		return x;
	});
}

export function crearViaje(datos: Record<string, unknown>, slug?: string): Viaje {
	const v = validarViaje(datos);
	const db = getDb();
	const { siguiente } = db.prepare('SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente FROM viajes WHERE tipo = ?').get(v.tipo) as {
		siguiente: number;
	};
	const r = db
		.prepare(`INSERT INTO viajes (slug, slug_fijo, orden, ${COLUMNAS.join(', ')}) VALUES (?, ?, ?, ${COLUMNAS.map(() => '?').join(', ')})`)
		.run(slugLibre(slug ?? v.titulo), slug || v.publicado ? 1 : 0, siguiente, ...valores(v));
	return obtenerViaje(Number(r.lastInsertRowid))!;
}

export function guardarViaje(id: number, datos: Record<string, unknown>, usuario: string): Viaje | undefined {
	return transaccion(() => {
		const anterior = obtenerViaje(id);
		if (!anterior) return undefined;
		const v = validarViaje(datos);
		registrarHistorial('viaje', id, 'editar', anterior, usuario);
		// La dirección web (slug) sigue al título mientras el viaje nunca se publicó.
		// Una vez publicado queda fija, para no romper enlaces ya compartidos.
		const slug = anterior.publicado || anterior.slug_fijo ? anterior.slug : slugLibre(v.titulo, id);
		getDb()
			.prepare(
				`UPDATE viajes SET ${COLUMNAS.map((c) => `${c} = ?`).join(', ')}, slug = ?,
				slug_fijo = slug_fijo OR ?, actualizado = CURRENT_TIMESTAMP WHERE id = ?`,
			)
			.run(...valores(v), slug, v.publicado ? 1 : 0, id);
		// Se guardan las últimas 30 versiones de cada viaje.
		getDb()
			.prepare(
				`DELETE FROM historial WHERE entidad = 'viaje' AND entidad_id = ? AND accion = 'editar' AND id NOT IN
				(SELECT id FROM historial WHERE entidad = 'viaje' AND entidad_id = ? AND accion = 'editar' ORDER BY id DESC LIMIT 30)`,
			)
			.run(String(id), String(id));
		return obtenerViaje(id);
	});
}

export function borrarViaje(id: number, usuario: string): boolean {
	return transaccion(() => {
		const anterior = obtenerViaje(id);
		if (!anterior) return false;
		registrarHistorial('viaje', id, 'borrar', anterior, usuario);
		getDb().prepare('DELETE FROM viajes WHERE id = ?').run(id);
		return true;
	});
}

export function ordenarViajes(ids: number[]) {
	transaccion(() => {
		const st = getDb().prepare('UPDATE viajes SET orden = ? WHERE id = ?');
		ids.forEach((id, i) => st.run(i + 1, id));
	});
}

export function versionesViaje(id: number): Version[] {
	return (
		getDb()
			.prepare(
				`SELECT id, accion, usuario, fecha, datos FROM historial
				WHERE entidad = 'viaje' AND entidad_id = ? AND accion = 'editar' ORDER BY id DESC LIMIT 30`,
			)
			.all(String(id)) as Fila[]
	).map((f) => ({ ...(f as unknown as Version), datos: JSON.parse(String(f.datos)) }));
}

export function papelera(): Version[] {
	return (
		getDb()
			.prepare(
				`SELECT h.id, h.accion, h.usuario, h.fecha, h.datos FROM historial h
				WHERE h.entidad = 'viaje' AND h.accion = 'borrar'
				AND NOT EXISTS (SELECT 1 FROM viajes v WHERE v.id = CAST(h.entidad_id AS INTEGER))
				ORDER BY h.id DESC LIMIT 50`,
			)
			.all() as Fila[]
	).map((f) => ({ ...(f as unknown as Version), datos: JSON.parse(String(f.datos)) }));
}

export function restaurarViaje(historialId: number, usuario: string): Viaje | undefined {
	return transaccion(() => {
		const h = getDb().prepare(`SELECT datos FROM historial WHERE id = ? AND accion = 'borrar'`).get(historialId) as
			| { datos: string }
			| undefined;
		if (!h) return undefined;
		const viejo = JSON.parse(h.datos) as Viaje;
		if (obtenerViaje(viejo.id)) return obtenerViaje(viejo.id);
		const v = validarViaje({ ...viejo, publicado: false });
		// Las imágenes pudieron haberse borrado mientras tanto.
		const existentes = new Set(
			(getDb().prepare('SELECT id FROM media').all() as { id: string }[]).map((m) => m.id),
		);
		v.portada = v.portada && existentes.has(v.portada) ? v.portada : null;
		v.galeria = v.galeria.filter((g) => existentes.has(g));
		getDb()
			.prepare(`INSERT INTO viajes (id, slug, slug_fijo, orden, ${COLUMNAS.join(', ')}) VALUES (?, ?, ?, ?, ${COLUMNAS.map(() => '?').join(', ')})`)
			.run(viejo.id, slugLibre(viejo.slug), viejo.slug_fijo ? 1 : 0, viejo.orden, ...valores(v));
		registrarHistorial('viaje', viejo.id, 'restaurar', viejo, usuario);
		return obtenerViaje(viejo.id);
	});
}
