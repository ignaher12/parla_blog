// Piezas reutilizables del panel: listas que se ordenan arrastrando, selector de
// fotos con arrastrar y soltar, interruptores, etc.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import Sortable from 'sortablejs';
import { type MediaInfo, mediaUrl } from '../lib/tipos';
import { api, subirImagen } from './api';
import { avisarError } from './avisos';

export function mover<T>(lista: T[], desde: number, hasta: number): T[] {
	const copia = [...lista];
	const [x] = copia.splice(desde, 1);
	copia.splice(hasta, 0, x);
	return copia;
}

/**
 * Hace que los hijos directos del elemento se puedan reordenar arrastrando.
 * Sortable mueve el DOM; lo devolvemos a su lugar y dejamos que Preact
 * redibuje con el orden nuevo.
 */
export function useOrdenable<T>(lista: T[], alCambiar: (l: T[]) => void, opciones: Sortable.Options = {}) {
	const ref = useRef<HTMLElement>(null);
	const ultimo = useRef({ lista, alCambiar });
	ultimo.current = { lista, alCambiar };
	useEffect(() => {
		if (!ref.current) return;
		const s = Sortable.create(ref.current, {
			animation: 180,
			delay: 120,
			delayOnTouchOnly: true,
			ghostClass: 'arrastrando-fantasma',
			chosenClass: 'arrastrando',
			filter: 'input, textarea, select, button:not(.asa), [contenteditable]',
			preventOnFilter: false,
			...opciones,
			onEnd(e) {
				const { from, item, oldIndex, newIndex } = e;
				if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
				from.removeChild(item);
				from.insertBefore(item, from.children[oldIndex] ?? null);
				ultimo.current.alCambiar(mover(ultimo.current.lista, oldIndex, newIndex));
			},
		});
		return () => s.destroy();
	}, []);
	return ref;
}

export const Asa = () => (
	<span class="asa" title="Arrastrá para cambiar el orden" aria-hidden="true">
		⠿
	</span>
);

export function Campo(p: { etiqueta: string; ayuda?: string; children: ComponentChildren; ancho?: 'medio' | 'tercio' }) {
	return (
		<label class={`campo ${p.ancho ? `campo-${p.ancho}` : ''}`}>
			<span class="campo-etiqueta">{p.etiqueta}</span>
			{p.children}
			{p.ayuda && <span class="campo-ayuda">{p.ayuda}</span>}
		</label>
	);
}

export function Interruptor(p: { valor: boolean; alCambiar: (v: boolean) => void; si: string; no: string; title?: string }) {
	return (
		<button
			type="button"
			class={`interruptor ${p.valor ? 'encendido' : ''}`}
			role="switch"
			aria-checked={p.valor}
			title={p.title}
			onClick={(e) => {
				e.stopPropagation();
				p.alCambiar(!p.valor);
			}}
		>
			<span class="interruptor-bolita" />
			<span>{p.valor ? p.si : p.no}</span>
		</button>
	);
}

export function Tarjeta(p: { titulo: string; descripcion?: string; children: ComponentChildren }) {
	return (
		<section class="tarjeta">
			<h2>{p.titulo}</h2>
			{p.descripcion && <p class="tarjeta-desc">{p.descripcion}</p>}
			{p.children}
		</section>
	);
}

// --- Fotos --------------------------------------------------------------------

function useSoltar(alSoltar: (archivos: File[]) => void) {
	const [encima, setEncima] = useState(false);
	return {
		encima,
		props: {
			onDragOver: (e: DragEvent) => {
				if (!e.dataTransfer?.types.includes('Files')) return;
				e.preventDefault();
				setEncima(true);
			},
			onDragLeave: () => setEncima(false),
			onDrop: (e: DragEvent) => {
				if (!e.dataTransfer?.files.length) return;
				e.preventDefault();
				setEncima(false);
				alSoltar([...e.dataTransfer.files]);
			},
		},
	};
}

async function subirVarias(archivos: File[], alt: string, setSubiendo: (n: number) => void) {
	const subidas: MediaInfo[] = [];
	setSubiendo(archivos.length);
	for (const [i, a] of archivos.entries()) {
		try {
			subidas.push(await subirImagen(a, alt));
		} catch (e) {
			avisarError(e);
		}
		setSubiendo(archivos.length - i - 1);
	}
	return subidas;
}

function ElegirArchivo(p: { multiple?: boolean; alElegir: (f: File[]) => void; children: ComponentChildren; class?: string }) {
	const ref = useRef<HTMLInputElement>(null);
	return (
		<>
			<button type="button" class={p.class ?? 'boton'} onClick={() => ref.current?.click()}>
				{p.children}
			</button>
			<input
				ref={ref}
				type="file"
				accept="image/*"
				multiple={p.multiple}
				hidden
				onChange={(e) => {
					const input = e.currentTarget;
					if (input.files?.length) p.alElegir([...input.files]);
					input.value = '';
				}}
			/>
		</>
	);
}

/** Una sola foto (portada, foto del inicio...). */
export function SelectorImagen(p: { valor: string | null; alCambiar: (id: string | null) => void; alt?: string; formato?: 'ancho' | 'cuadrado' }) {
	const [subiendo, setSubiendo] = useState(0);
	const [biblioteca, setBiblioteca] = useState(false);
	const subir = async (archivos: File[]) => {
		const [m] = await subirVarias(archivos.slice(0, 1), p.alt ?? '', setSubiendo);
		if (m) p.alCambiar(m.id);
	};
	const soltar = useSoltar(subir);
	return (
		<div class={`selector-imagen formato-${p.formato ?? 'ancho'} ${soltar.encima ? 'encima' : ''}`} {...soltar.props}>
			{p.valor ? (
				<img src={mediaUrl(p.valor, 960)} alt="" />
			) : (
				<div class="zona-vacia">
					<span class="zona-icono">🖼️</span>
					<span>Arrastrá una foto acá</span>
				</div>
			)}
			{subiendo > 0 && <div class="cargando">Subiendo foto…</div>}
			<div class="selector-acciones">
				<ElegirArchivo alElegir={subir}>{p.valor ? 'Cambiar foto' : 'Elegir foto'}</ElegirArchivo>
				<button type="button" class="boton boton-suave" onClick={() => setBiblioteca(true)}>
					Fotos ya subidas
				</button>
				{p.valor && (
					<button type="button" class="boton boton-suave" onClick={() => p.alCambiar(null)}>
						Quitar
					</button>
				)}
			</div>
			{biblioteca && (
				<Biblioteca
					alElegir={(ids) => {
						if (ids[0]) p.alCambiar(ids[0]);
						setBiblioteca(false);
					}}
					alCerrar={() => setBiblioteca(false)}
				/>
			)}
		</div>
	);
}

/** Varias fotos que se ordenan arrastrando. */
export function Galeria(p: { valor: string[]; alCambiar: (ids: string[]) => void; alt?: string }) {
	const [subiendo, setSubiendo] = useState(0);
	const [biblioteca, setBiblioteca] = useState(false);
	const agregar = (ids: string[]) => p.alCambiar([...p.valor, ...ids.filter((id) => !p.valor.includes(id))]);
	const subir = async (archivos: File[]) => {
		const subidas = await subirVarias(archivos, p.alt ?? '', setSubiendo);
		agregar(subidas.map((m) => m.id));
	};
	const soltar = useSoltar(subir);
	const ref = useOrdenable(p.valor, p.alCambiar);
	return (
		<div class={`galeria ${soltar.encima ? 'encima' : ''}`} {...soltar.props}>
			<div class="galeria-grilla" ref={ref as never}>
				{p.valor.map((id) => (
					<div class="galeria-foto" key={id} title="Arrastrá para cambiar el orden">
						<img src={mediaUrl(id, 480)} alt="" draggable={false} />
						<button
							type="button"
							class="galeria-quitar"
							aria-label="Quitar foto"
							onClick={() => p.alCambiar(p.valor.filter((x) => x !== id))}
						>
							✕
						</button>
					</div>
				))}
			</div>
			{subiendo > 0 && <div class="cargando-linea">Subiendo {subiendo} foto(s)…</div>}
			<div class="zona-galeria">
				<span>Arrastrá fotos acá (podés soltar varias juntas)</span>
				<div class="selector-acciones">
					<ElegirArchivo multiple alElegir={subir}>
						Agregar fotos
					</ElegirArchivo>
					<button type="button" class="boton boton-suave" onClick={() => setBiblioteca(true)}>
						Fotos ya subidas
					</button>
				</div>
			</div>
			{biblioteca && (
				<Biblioteca
					multiple
					alElegir={(ids) => {
						agregar(ids);
						setBiblioteca(false);
					}}
					alCerrar={() => setBiblioteca(false)}
				/>
			)}
		</div>
	);
}

function Biblioteca(p: { multiple?: boolean; alElegir: (ids: string[]) => void; alCerrar: () => void }) {
	const [medias, setMedias] = useState<MediaInfo[] | null>(null);
	const [elegidas, setElegidas] = useState<string[]>([]);
	useEffect(() => {
		api.get<MediaInfo[]>('/api/admin/media').then(setMedias, avisarError);
		const esc = (e: KeyboardEvent) => e.key === 'Escape' && p.alCerrar();
		addEventListener('keydown', esc);
		return () => removeEventListener('keydown', esc);
	}, []);
	const tocar = (id: string) => {
		if (!p.multiple) return p.alElegir([id]);
		setElegidas((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
	};
	const borrar = async (id: string) => {
		if (!confirm('¿Borrar esta foto para siempre?')) return;
		try {
			await api.del(`/api/admin/media/${id}`);
			setMedias((l) => l?.filter((m) => m.id !== id) ?? null);
		} catch (e) {
			avisarError(e);
		}
	};
	return (
		<div class="modal-fondo" onClick={p.alCerrar}>
			<div class="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Fotos ya subidas">
				<header class="modal-cabecera">
					<h2>Fotos ya subidas</h2>
					<button type="button" class="boton boton-suave" onClick={p.alCerrar}>
						Cerrar
					</button>
				</header>
				{!medias ? (
					<p>Cargando…</p>
				) : medias.length === 0 ? (
					<p>Todavía no subiste ninguna foto.</p>
				) : (
					<div class="biblioteca-grilla">
						{medias.map((m) => (
							<div key={m.id} class={`biblioteca-foto ${elegidas.includes(m.id) ? 'elegida' : ''}`}>
								<button type="button" class="biblioteca-elegir" onClick={() => tocar(m.id)}>
									<img src={mediaUrl(m.id, 480)} alt={m.alt} loading="lazy" />
								</button>
								<button type="button" class="biblioteca-borrar" title="Borrar foto" onClick={() => borrar(m.id)}>
									🗑
								</button>
							</div>
						))}
					</div>
				)}
				{p.multiple && (
					<footer class="modal-pie">
						<button type="button" class="boton boton-principal" disabled={!elegidas.length} onClick={() => p.alElegir(elegidas)}>
							Agregar {elegidas.length || ''} foto(s)
						</button>
					</footer>
				)}
			</div>
		</div>
	);
}

// --- Listas de texto ------------------------------------------------------------

/** Lista de renglones (incluye / no incluye) que se ordenan arrastrando. */
export function ListaTextos(p: { valor: string[]; alCambiar: (l: string[]) => void; placeholder: string; agregar: string }) {
	const ref = useOrdenable(p.valor, (l) => p.alCambiar(l), { handle: '.asa' });
	return (
		<div>
			<div class="lista-textos" ref={ref as never}>
				{p.valor.map((t, i) => (
					// Los inputs son controlados: alcanza con la posición como clave.
					<div class="renglon" key={i}>
						<Asa />
						<input
							value={t}
							placeholder={p.placeholder}
							onInput={(e) => p.alCambiar(p.valor.map((x, j) => (j === i ? e.currentTarget.value : x)))}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									p.alCambiar([...p.valor.slice(0, i + 1), '', ...p.valor.slice(i + 1)]);
									setTimeout(() => (e.currentTarget.parentElement?.nextElementSibling?.querySelector('input') as HTMLInputElement)?.focus());
								}
							}}
						/>
						<button type="button" class="boton-icono" aria-label="Quitar" onClick={() => p.alCambiar(p.valor.filter((_, j) => j !== i))}>
							✕
						</button>
					</div>
				))}
			</div>
			<button type="button" class="boton boton-suave" onClick={() => p.alCambiar([...p.valor, ''])}>
				+ {p.agregar}
			</button>
		</div>
	);
}
