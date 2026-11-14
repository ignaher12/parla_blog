// Base de datos SQLite del sitio: viajes, imágenes, ajustes e historial.
// Vive en DATA_DIR (en el servidor /var/lib/parladiviaggi, en desarrollo ./.data).
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? '.data');
export const MEDIA_DIR = path.join(DATA_DIR, 'media');
const DB_DIR = path.join(DATA_DIR, 'db');

let db: DatabaseSync | undefined;

export function getDb(): DatabaseSync {
	if (db) return db;
	fs.mkdirSync(MEDIA_DIR, { recursive: true, mode: 0o755 });
	fs.mkdirSync(DB_DIR, { recursive: true, mode: 0o700 });
	db = new DatabaseSync(path.join(DB_DIR, 'parla.db'));
	db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
	migrar(db);
	return db;
}

const MIGRACIONES: string[] = [
	`
	CREATE TABLE media (
		id TEXT PRIMARY KEY,
		ancho INTEGER NOT NULL,
		alto INTEGER NOT NULL,
		alt TEXT NOT NULL DEFAULT '',
		creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE viajes (
		id INTEGER PRIMARY KEY,
		tipo TEXT NOT NULL CHECK (tipo IN ('grupal', 'paquete')),
		slug TEXT NOT NULL UNIQUE,
		slug_fijo INTEGER NOT NULL DEFAULT 0,
		titulo TEXT NOT NULL,
		destino TEXT NOT NULL DEFAULT '',
		resumen TEXT NOT NULL DEFAULT '',
		descripcion TEXT NOT NULL DEFAULT '',
		fecha_salida TEXT,
		fecha_regreso TEXT,
		precio INTEGER,
		moneda TEXT NOT NULL DEFAULT 'ARS',
		precio_nota TEXT NOT NULL DEFAULT '',
		estado TEXT NOT NULL DEFAULT 'abierta',
		etiqueta TEXT NOT NULL DEFAULT '',
		portada TEXT REFERENCES media(id) ON DELETE SET NULL,
		galeria TEXT NOT NULL DEFAULT '[]',
		itinerario TEXT NOT NULL DEFAULT '[]',
		incluye TEXT NOT NULL DEFAULT '[]',
		no_incluye TEXT NOT NULL DEFAULT '[]',
		destacado INTEGER NOT NULL DEFAULT 0,
		publicado INTEGER NOT NULL DEFAULT 0,
		orden INTEGER NOT NULL DEFAULT 0,
		creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
		actualizado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE ajustes (
		clave TEXT PRIMARY KEY,
		valor TEXT NOT NULL
	);
	CREATE TABLE historial (
		id INTEGER PRIMARY KEY,
		entidad TEXT NOT NULL,
		entidad_id TEXT NOT NULL,
		accion TEXT NOT NULL,
		datos TEXT NOT NULL,
		usuario TEXT NOT NULL DEFAULT '',
		fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX historial_entidad ON historial (entidad, entidad_id, id DESC);
	`,
];

function migrar(d: DatabaseSync) {
	const { user_version } = d.prepare('PRAGMA user_version').get() as { user_version: number };
	for (let v = user_version; v < MIGRACIONES.length; v++) {
		d.exec('BEGIN');
		try {
			d.exec(MIGRACIONES[v]);
			d.exec(`PRAGMA user_version = ${v + 1}`);
			d.exec('COMMIT');
		} catch (e) {
			d.exec('ROLLBACK');
			throw e;
		}
	}
}

export function transaccion<T>(fn: () => T): T {
	const d = getDb();
	d.exec('BEGIN');
	try {
		const r = fn();
		d.exec('COMMIT');
		return r;
	} catch (e) {
		d.exec('ROLLBACK');
		throw e;
	}
}

export function registrarHistorial(entidad: string, entidadId: string | number, accion: string, datos: unknown, usuario = '') {
	getDb()
		.prepare('INSERT INTO historial (entidad, entidad_id, accion, datos, usuario) VALUES (?, ?, ?, ?, ?)')
		.run(entidad, String(entidadId), accion, JSON.stringify(datos), usuario);
}
