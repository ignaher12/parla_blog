// Pantallas de Inicio, Contacto y Papelera.
import { useEffect, useState } from 'preact/hooks';
import { fechaHora } from '../lib/formato';
import type { Asesora, Contacto, Inicio, Version } from '../lib/tipos';
import { api } from './api';
import { avisar, avisarError } from './avisos';
import { Asa, Campo, Interruptor, SelectorImagen, Tarjeta, useOrdenable } from './componentes';
import { ir, useCambiosSinGuardar } from './navegacion';

function useAjuste<T>(clave: string) {
	const [valor, setValor] = useState<T | null>(null);
	const [original, setOriginal] = useState('');
	const [guardando, setGuardando] = useState(false);
	useEffect(() => {
		api.get<T>(`/api/admin/ajustes/${clave}`).then((v) => {
			setValor(v);
			setOriginal(JSON.stringify(v));
		}, avisarError);
	}, [clave]);
	const sucio = !!valor && JSON.stringify(valor) !== original;
	useCambiosSinGuardar(sucio);
	const guardar = async () => {
		setGuardando(true);
		try {
			const g = await api.put<T>(`/api/admin/ajustes/${clave}`, valor);
			setValor(g);
			setOriginal(JSON.stringify(g));
			avisar('Guardado ✓ Los cambios ya se ven en el sitio.');
		} catch (e) {
			avisarError(e);
		} finally {
			setGuardando(false);
		}
	};
	return { valor, setValor, sucio, guardando, guardar };
}

function BarraGuardar(p: { sucio: boolean; guardando: boolean; guardar: () => void }) {
	return (
		<div class="barra-guardar">
			<span>{p.sucio ? 'Tenés cambios sin guardar' : 'Todo guardado'}</span>
			<a class="boton boton-suave" href="/" target="_blank">
				Ver el sitio
			</a>
			<button type="button" class="boton boton-principal" disabled={!p.sucio || p.guardando} onClick={p.guardar}>
				{p.guardando ? 'Guardando…' : 'Guardar cambios'}
			</button>
		</div>
	);
}

export function EditorInicio() {
	const { valor: v, setValor, ...g } = useAjuste<Inicio>('inicio');
	if (!v) return <p class="cargando-pagina">Cargando…</p>;
	const cambiar = <K extends keyof Inicio>(k: K, x: Inicio[K]) => setValor({ ...v, [k]: x });
	return (
		<div class="pagina">
			<header class="pagina-cabecera">
				<h1>Página de inicio</h1>
				<p>Los textos y fotos de la portada del sitio.</p>
			</header>
			<Tarjeta titulo="Portada (lo primero que se ve)">
				<div class="campos">
					<Campo etiqueta="Foto de fondo" ayuda="Conviene una foto horizontal y luminosa. Si no elegís ninguna, queda la actual.">
						<SelectorImagen valor={v.hero_imagen} alCambiar={(x) => cambiar('hero_imagen', x)} alt="Parla di Viaggi" />
					</Campo>
					<Campo etiqueta="Título grande" ancho="medio">
						<input value={v.hero_titulo} maxLength={80} onInput={(e) => cambiar('hero_titulo', e.currentTarget.value)} />
					</Campo>
					<Campo etiqueta="Bajada" ancho="medio">
						<input value={v.hero_subtitulo} maxLength={120} onInput={(e) => cambiar('hero_subtitulo', e.currentTarget.value)} />
					</Campo>
					<Campo etiqueta="Primer párrafo">
						<textarea rows={3} value={v.hero_texto} maxLength={600} onInput={(e) => cambiar('hero_texto', e.currentTarget.value)} />
					</Campo>
					<Campo etiqueta="Segundo párrafo">
						<textarea rows={3} value={v.hero_texto2} maxLength={600} onInput={(e) => cambiar('hero_texto2', e.currentTarget.value)} />
					</Campo>
				</div>
			</Tarjeta>
			<Tarjeta titulo="Sección «Viajes para mujeres»">
				<div class="campos">
					<Campo etiqueta="Título" ancho="medio">
						<input value={v.mujeres_titulo} maxLength={120} onInput={(e) => cambiar('mujeres_titulo', e.currentTarget.value)} />
					</Campo>
					<Campo etiqueta="Frase destacada" ancho="medio">
						<input value={v.mujeres_destacado} maxLength={120} onInput={(e) => cambiar('mujeres_destacado', e.currentTarget.value)} />
					</Campo>
					<Campo etiqueta="Texto">
						<textarea rows={5} value={v.mujeres_texto} maxLength={1500} onInput={(e) => cambiar('mujeres_texto', e.currentTarget.value)} />
					</Campo>
					<Campo etiqueta="Foto" ayuda="Si no elegís ninguna, queda la foto actual del grupo.">
						<SelectorImagen valor={v.mujeres_imagen} alCambiar={(x) => cambiar('mujeres_imagen', x)} alt="Grupo de viajeras" formato="cuadrado" />
					</Campo>
				</div>
			</Tarjeta>
			<BarraGuardar {...g} />
		</div>
	);
}

export function EditorContacto() {
	const { valor: v, setValor, ...g } = useAjuste<Contacto>('contacto');
	if (!v) return <p class="cargando-pagina">Cargando…</p>;
	return (
		<div class="pagina">
			<header class="pagina-cabecera">
				<h1>Contacto</h1>
				<p>Los WhatsApp que aparecen en el sitio y a los que llegan las consultas.</p>
			</header>
			<Tarjeta titulo="Asesoras" descripcion="Las consultas del sitio se reparten entre las asesoras activas. Arrastralas para cambiar el orden en que aparecen.">
				<ListaAsesoras asesoras={v.asesoras} alCambiar={(asesoras) => setValor({ ...v, asesoras })} />
			</Tarjeta>
			<Tarjeta titulo="Redes">
				<Campo etiqueta="Instagram" ayuda="La dirección completa del perfil.">
					<input value={v.instagram} onInput={(e) => setValor({ ...v, instagram: e.currentTarget.value })} />
				</Campo>
			</Tarjeta>
			<BarraGuardar {...g} />
		</div>
	);
}

function ListaAsesoras(p: { asesoras: Asesora[]; alCambiar: (l: Asesora[]) => void }) {
	const ref = useOrdenable(p.asesoras, p.alCambiar, { handle: '.asa' });
	const cambiarAsesora = (i: number, cambio: Partial<Asesora>) => p.alCambiar(p.asesoras.map((a, j) => (j === i ? { ...a, ...cambio } : a)));
	return (
		<>
			<div class="lista-asesoras" ref={ref as never}>
				{p.asesoras.map((a, i) => (
					<div class={`asesora ${a.activa ? '' : 'inactiva'}`} key={i}>
						<Asa />
						<Campo etiqueta="Nombre" ancho="tercio">
							<input value={a.nombre} maxLength={40} onInput={(e) => cambiarAsesora(i, { nombre: e.currentTarget.value })} />
						</Campo>
						<Campo etiqueta="WhatsApp" ayuda="Con código de país, sin 0 ni 15. Ej.: 5492235261703" ancho="tercio">
							<input inputMode="tel" value={a.whatsapp} onInput={(e) => cambiarAsesora(i, { whatsapp: e.currentTarget.value.replace(/[^d]/g, '') })} />
						</Campo>
						<div class="asesora-acciones">
							<Interruptor valor={a.activa} si="Activa" no="Pausada" alCambiar={(x) => cambiarAsesora(i, { activa: x })} />
							{a.whatsapp.length >= 10 && (
								<a class="boton boton-suave" href={`https://wa.me/${a.whatsapp}`} target="_blank" rel="noopener noreferrer">
									Probar
								</a>
							)}
							<button
								type="button"
								class="boton-icono"
								aria-label="Quitar asesora"
								onClick={() => confirm(`¿Quitar a ${a.nombre || 'esta asesora'}?`) && p.alCambiar(p.asesoras.filter((_, j) => j !== i))}
							>
								✕
							</button>
						</div>
					</div>
				))}
			</div>
			<button type="button" class="boton boton-suave" onClick={() => p.alCambiar([...p.asesoras, { nombre: '', whatsapp: '549', activa: true }])}>
				+ Agregar asesora
			</button>
		</>
	);
}

export function Papelera() {
	const [items, setItems] = useState<Version[] | null>(null);
	useEffect(() => {
		api.get<Version[]>('/api/admin/papelera').then(setItems, avisarError);
	}, []);
	const recuperar = async (h: Version) => {
		try {
			const v = await api.post<{ id: number }>('/api/admin/papelera', { id: h.id });
			avisar('Viaje recuperado. Quedó oculto: revisalo y publicalo cuando quieras.');
			ir(`/viaje/${v.id}`);
		} catch (e) {
			avisarError(e);
		}
	};
	return (
		<div class="pagina">
			<header class="pagina-cabecera">
				<h1>Papelera</h1>
				<p>Los viajes borrados quedan acá por si hay que recuperarlos.</p>
			</header>
			{!items ? (
				<p class="cargando-pagina">Cargando…</p>
			) : items.length === 0 ? (
				<p class="vacio">La papelera está vacía.</p>
			) : (
				<ul class="versiones tarjeta">
					{items.map((h) => (
						<li key={h.id}>
							<div>
								<strong>{h.datos.titulo}</strong>
								<span>
									Borrado el {fechaHora(h.fecha)}
									{h.usuario && ` por ${h.usuario}`}
								</span>
							</div>
							<button type="button" class="boton" onClick={() => recuperar(h)}>
								Recuperar
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
