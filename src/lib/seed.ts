// Carga inicial: si la base está vacía, importa los viajes de la carpeta seed/
// (el sitio viejo tenía uno solo, el Cruce Andino).
import fs from 'node:fs/promises';
import path from 'node:path';
import { getDb } from './db';
import { guardarImagen } from './media';
import { crearViaje } from './viajes';

let pendiente: Promise<void> | undefined;

export function sembrarSiHaceFalta() {
	pendiente ??= sembrar().catch((e) => {
		console.error('No se pudo hacer la carga inicial:', e);
	});
	return pendiente;
}

async function sembrar() {
	const db = getDb();
	const yaSembrado = db.prepare(`SELECT 1 FROM ajustes WHERE clave = '_sembrado'`).get();
	if (yaSembrado) return;
	const dir = path.resolve('seed');
	let viajes: Array<Record<string, unknown> & { imagen?: string; slug?: string }> = [];
	try {
		viajes = JSON.parse(await fs.readFile(path.join(dir, 'viajes.json'), 'utf8'));
	} catch {
		// Sin carpeta seed: no hay nada que importar.
	}
	const { n } = db.prepare('SELECT COUNT(*) AS n FROM viajes').get() as { n: number };
	if (n === 0) {
		for (const v of viajes) {
			let portada: string | null = null;
			if (v.imagen) {
				const img = await guardarImagen(await fs.readFile(path.join(dir, v.imagen)), String(v.titulo ?? ''));
				portada = img.id;
			}
			crearViaje({ ...v, portada, galeria: portada ? [portada] : [] }, v.slug);
		}
	}
	db.prepare(`INSERT INTO ajustes (clave, valor) VALUES ('_sembrado', '1')`).run();
}
