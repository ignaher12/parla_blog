// Imágenes subidas desde el panel: se convierten a WebP en varios tamaños.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { getDb, MEDIA_DIR } from './db';

// El servidor tiene poca RAM: procesar de a una imagen y sin caché.
sharp.concurrency(1);
sharp.cache(false);

export const ANCHOS = [480, 960, 1600] as const;
export type Ancho = (typeof ANCHOS)[number];
export const MAX_BYTES = 15 * 1024 * 1024;

export interface Media {
	id: string;
	ancho: number;
	alto: number;
	alt: string;
}

export const mediaUrl = (id: string, ancho: Ancho = 960) => `/media/${id}-${ancho}.webp`;

/** srcset para <img>: solo los tamaños que realmente existen (no se agranda la imagen). */
export function mediaSrcset(m: Pick<Media, 'id' | 'ancho'>) {
	return ANCHOS.map((w) => `${mediaUrl(m.id, w)} ${Math.min(w, m.ancho)}w`)
		.filter((s, i, a) => a.findIndex((x) => x.split(' ')[1] === s.split(' ')[1]) === i)
		.join(', ');
}

export async function guardarImagen(buf: Buffer, alt = ''): Promise<Media> {
	const id = crypto.randomBytes(8).toString('hex');
	const base = sharp(buf, { failOn: 'error', limitInputPixels: 60_000_000 }).rotate();
	let ancho = 0;
	let alto = 0;
	try {
		for (const w of ANCHOS) {
			const info = await base
				.clone()
				.resize({ width: w, withoutEnlargement: true })
				.webp({ quality: 80 })
				.toFile(path.join(MEDIA_DIR, `${id}-${w}.webp`));
			if (info.width > ancho) {
				ancho = info.width;
				alto = info.height;
			}
		}
	} catch (e) {
		await borrarArchivos(id);
		throw e;
	}
	getDb().prepare('INSERT INTO media (id, ancho, alto, alt) VALUES (?, ?, ?, ?)').run(id, ancho, alto, alt.slice(0, 200));
	return { id, ancho, alto, alt };
}

export function getMedia(id: string | null | undefined): Media | undefined {
	if (!id) return undefined;
	return getDb().prepare('SELECT id, ancho, alto, alt FROM media WHERE id = ?').get(id) as Media | undefined;
}

export function getMedias(ids: string[]): Media[] {
	if (!ids.length) return [];
	const porId = new Map(listarMedia().map((m) => [m.id, m]));
	return ids.map((id) => porId.get(id)).filter((m): m is Media => !!m);
}

export function listarMedia(): Media[] {
	return getDb().prepare('SELECT id, ancho, alto, alt FROM media ORDER BY creado DESC, rowid DESC').all() as unknown as Media[];
}

export function actualizarAlt(id: string, alt: string) {
	getDb().prepare('UPDATE media SET alt = ? WHERE id = ?').run(alt.slice(0, 200), id);
}

/** Borra una imagen si ningún viaje ni ajuste la usa. Devuelve false si está en uso. */
export async function borrarImagen(id: string): Promise<boolean> {
	const db = getDb();
	const usada =
		db.prepare('SELECT 1 FROM viajes WHERE portada = ? OR galeria LIKE ? LIMIT 1').get(id, `%"${id}"%`) ||
		db.prepare('SELECT 1 FROM ajustes WHERE valor LIKE ? LIMIT 1').get(`%"${id}"%`);
	if (usada) return false;
	db.prepare('DELETE FROM media WHERE id = ?').run(id);
	await borrarArchivos(id);
	return true;
}

async function borrarArchivos(id: string) {
	await Promise.all(ANCHOS.map((w) => fs.rm(path.join(MEDIA_DIR, `${id}-${w}.webp`), { force: true })));
}
