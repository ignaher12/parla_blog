// Formatos de fechas y precios, iguales en el sitio y en el panel.
import type { Moneda } from './tipos';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** '2026-02-28' -> '28 de febrero de 2026' (sin problemas de zona horaria). */
export function fechaLarga(iso: string | null | undefined, conAnio = true) {
	if (!iso) return '';
	const [a, m, d] = iso.split('-').map(Number);
	return `${d} de ${MESES[m - 1]}${conAnio ? ` de ${a}` : ''}`;
}

/** Rango de fechas legible: '28 de febrero al 7 de marzo de 2026'. */
export function rangoFechas(salida: string | null, regreso: string | null) {
	if (!salida) return '';
	if (!regreso || regreso === salida) return fechaLarga(salida);
	const mismoAnio = salida.slice(0, 4) === regreso.slice(0, 4);
	return `${fechaLarga(salida, !mismoAnio)} al ${fechaLarga(regreso)}`;
}

export function precioTexto(precio: number | null, moneda: Moneda) {
	if (!precio) return '';
	return `${moneda === 'USD' ? 'USD ' : '$'}${precio.toLocaleString('es-AR')}`;
}

/** Fecha y hora del historial (viene de SQLite en UTC: 'AAAA-MM-DD HH:MM:SS'). */
export function fechaHora(sqlite: string) {
	const d = new Date(`${sqlite.replace(' ', 'T')}Z`);
	return d.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' });
}
