// Pantallas de viajes: la lista (con orden por arrastre) y el editor.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { fechaHora, precioTexto, rangoFechas } from '../lib/formato';
import { markdownAHtml } from '../lib/texto';
import { ESTADOS, type Estado, mediaUrl, TIPOS, type Tipo, type Version, type Viaje } from '../lib/tipos';
import { api } from './api';
import { avisar, avisarError } from './avisos';
import { Asa, Campo, Galeria, Interruptor, ListaTextos, SelectorImagen, Tarjeta, useOrdenable } from './componentes';
import { ir, useCambiosSinGuardar } from './navegacion';

// --- Lista ----------------------------------------------------------------------

export function ListaViajes() {
	const [viajes, setViajes] = useState<Viaje[] | null>(null);
	useEffect(() => {
		api.get<Viaje[]>('/api/admin/viajes').then(setViajes, avisarError);
	}, []);

	const crear = async (tipo: Tipo) => {
		try {
			const titulo = tipo === 'grupal' ? 'Nueva salida grupal' : 'Nuevo paquete';
			const v = await api.post<Viaje>('/api/admin/viajes', { tipo, titulo });
			ir(`/viaje/${v.id}?nuevo`);
		} catch (e) {
			avisarError(e);
		}
	};

	if (!viajes) return <p class="cargando-pagina">Cargando viajes…</p>;
	return (
		<div class="pagina">
			<header class="pagina-cabecera">
				<h1>Viajes</h1>
				<p>Tocá un viaje para editarlo. Arrastrá las tarjetas para cambiar el orden en que aparecen en el sitio.</p>
			</header>
			{(['grupal', 'paquete'] as const).map((tipo) => (
				<SeccionViajes
					key={tipo}
					tipo={tipo}
					viajes={viajes.filter((v) => v.tipo === tipo)}
					alCambiar={(nuevos) => setViajes([...viajes.filter((v) => v.tipo !== tipo), ...nuevos])}
					alCrear={() => crear(tipo)}
				/>
			))}
		</div>
	);
}

function SeccionViajes(p: { tipo: Tipo; viajes: Viaje[]; alCambiar: (l: Viaje[]) => void; alCrear: () => void }) {
	const reordenar = async (lista: Viaje[]) => {
		p.alCambiar(lista);
		try {
			await api.put('/api/admin/viajes', { ids: lista.map((v) => v.id) });
			avisar('Orden guardado ✓');
		} catch (e) {
			avisarError(e);
		}
	};
	const ref = useOrdenable(p.viajes, reordenar);

	const cambiarRapido = async (v: Viaje, cambio: Partial<Viaje>) => {
		try {
			const guardado = await api.put<Viaje>(`/api/admin/viajes/${v.id}`, { ...v, ...cambio });
			p.alCambiar(p.viajes.map((x) => (x.id === v.id ? guardado : x)));
			if ('publicado' in cambio) avisar(cambio.publicado ? 'Publicado: ya se ve en el sitio ✓' : 'Oculto: ya no se ve en el sitio');
			else avisar('Guardado ✓');
		} catch (e) {
			avisarError(e);
		}
	};

	return (
		<section class="seccion-viajes">
			<div class="seccion-cabecera">
				<h2>{p.tipo === 'grupal' ? 'Salidas grupales' : 'Paquetes especiales'}</h2>
				<button type="button" class="boton boton-principal" onClick={p.alCrear}>
					+ {p.tipo === 'grupal' ? 'Nueva salida grupal' : 'Nuevo paquete'}
				</button>
			</div>
			{p.viajes.length === 0 && <p class="vacio">Todavía no hay {p.tipo === 'grupal' ? 'salidas grupales' : 'paquetes'} cargados.</p>}
			<div class="lista-viajes" ref={ref as never}>
				{p.viajes.map((v) => (
					<article key={v.id} class={`fila-viaje ${v.publicado ? '' : 'borrador'}`} onClick={() => ir(`/viaje/${v.id}`)}>
						<Asa />
						<div class="fila-foto">{v.portada ? <img src={mediaUrl(v.portada, 480)} alt="" draggable={false} /> : <span>Sin foto</span>}</div>
						<div class="fila-datos">
							<h3>{v.titulo}</h3>
							<p>
								{[rangoFechas(v.fecha_salida, v.fecha_regreso), precioTexto(v.precio, v.moneda)].filter(Boolean).join(' · ') ||
									'Sin fecha ni precio'}
							</p>
							<span class={`estado estado-${v.estado}`}>{ESTADOS[v.estado]}</span>
							{v.etiqueta && <span class="etiqueta">{v.etiqueta}</span>}
						</div>
						<div class="fila-acciones">
							<Interruptor valor={v.publicado} si="Publicado" no="Oculto" alCambiar={(x) => cambiarRapido(v, { publicado: x })} />
							<button
								type="button"
								class={`estrella ${v.destacado ? 'activa' : ''}`}
								title={v.destacado ? 'Destacado en el inicio' : 'Destacar en el inicio'}
								aria-pressed={v.destacado}
								onClick={(e) => {
									e.stopPropagation();
									cambiarRapido(v, { destacado: !v.destacado });
								}}
							>
								{v.destacado ? '★' : '☆'}
							</button>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}

// --- Editor ---------------------------------------------------------------------

const SUGERENCIAS_ETIQUETA = ['Solo mujeres', 'Promo', 'Novedad', 'Fin de semana largo', 'Con aéreos', 'En bus'];

export function EditorViaje(p: { id: number; nuevo: boolean }) {
	const [v, setV] = useState<Viaje | null>(null);
	const [original, setOriginal] = useState('');
	const [guardando, setGuardando] = useState(false);
	const [versiones, setVersiones] = useState<Version[] | null>(null);
	const tituloRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		api.get<Viaje>(`/api/admin/viajes/${p.id}`).then((x) => {
			setV(x);
			setOriginal(JSON.stringify(x));
			if (p.nuevo) setTimeout(() => tituloRef.current?.select(), 50);
		}, avisarError);
	}, [p.id]);

	const sucio = !!v && JSON.stringify(v) !== original;
	useCambiosSinGuardar(sucio);

	const cambiar = <K extends keyof Viaje>(campo: K, valor: Viaje[K]) => setV((x) => (x ? { ...x, [campo]: valor } : x));

	const guardar = async () => {
		if (!v) return;
		setGuardando(true);
		try {
			const g = await api.put<Viaje>(`/api/admin/viajes/${v.id}`, v);
			setV(g);
			setOriginal(JSON.stringify(g));
			avisar(g.publicado ? 'Guardado ✓ Los cambios ya se ven en el sitio.' : 'Guardado ✓ (está oculto: no se ve en el sitio)');
		} catch (e) {
			avisarError(e);
		} finally {
			setGuardando(false);
		}
	};

	// Ctrl+S / Cmd+S guarda.
	useEffect(() => {
		const atajo = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 's') {
				e.preventDefault();
				guardar();
			}
		};
		addEventListener('keydown', atajo);
		return () => removeEventListener('keydown', atajo);
	});

	const borrar = async () => {
		if (!v || !confirm(`¿Borrar "${v.titulo}"?\n\nSi te equivocás, lo podés recuperar desde la Papelera.`)) return;
		try {
			await api.del(`/api/admin/viajes/${v.id}`);
			setOriginal(JSON.stringify(v));
			avisar('Viaje borrado. Lo podés recuperar desde la Papelera.');
			ir('/', true);
		} catch (e) {
			avisarError(e);
		}
	};

	const abrirVersiones = async () => {
		try {
			setVersiones(await api.get<Version[]>(`/api/admin/viajes/${p.id}/versiones`));
		} catch (e) {
			avisarError(e);
		}
	};

	if (!v) return <p class="cargando-pagina">Cargando…</p>;
	const esGrupal = v.tipo === 'grupal';

	return (
		<div class="pagina editor">
			<header class="pagina-cabecera">
				<a href="#/" class="volver">
					← Volver a viajes
				</a>
				<h1>{v.titulo || 'Sin título'}</h1>
				<p>
					{TIPOS[v.tipo]} · {v.publicado ? 'Publicado' : 'Oculto (no se ve en el sitio)'}
				</p>
			</header>

			<Tarjeta titulo="Lo básico">
				<div class="campos">
					<Campo etiqueta="Título" ayuda="Así aparece en la tarjeta y en la página del viaje.">
						<input ref={tituloRef} value={v.titulo} maxLength={150} onInput={(e) => cambiar('titulo', e.currentTarget.value)} />
					</Campo>
					<Campo etiqueta="Destino" ayuda="Ej.: Bariloche · Puerto Varas · Puerto Montt" ancho="medio">
						<input value={v.destino} maxLength={150} onInput={(e) => cambiar('destino', e.currentTarget.value)} />
					</Campo>
					<Campo etiqueta="Tipo de viaje" ancho="medio">
						<div class="opciones">
							{(Object.keys(TIPOS) as Tipo[]).map((t) => (
								<button type="button" key={t} class={`opcion ${v.tipo === t ? 'elegida' : ''}`} onClick={() => cambiar('tipo', t)}>
									{TIPOS[t]}
								</button>
							))}
						</div>
					</Campo>
					<Campo etiqueta="Resumen corto" ayuda="Una o dos frases para la tarjeta. Ej.: Naturaleza, navegación y shopping en un solo viaje.">
						<textarea rows={2} value={v.resumen} maxLength={400} onInput={(e) => cambiar('resumen', e.currentTarget.value)} />
					</Campo>
					<Campo etiqueta="Etiqueta (opcional)" ayuda="Un cartelito sobre la foto. Tocá una sugerencia o escribí la tuya.">
						<input value={v.etiqueta} maxLength={40} onInput={(e) => cambiar('etiqueta', e.currentTarget.value)} />
						<div class="chips">
							{SUGERENCIAS_ETIQUETA.map((s) => (
								<button type="button" key={s} class={`chip ${v.etiqueta === s ? 'elegida' : ''}`} onClick={() => cambiar('etiqueta', v.etiqueta === s ? '' : s)}>
									{s}
								</button>
							))}
						</div>
					</Campo>
				</div>
			</Tarjeta>

			<Tarjeta titulo="Fechas, precio y lugares">
				<div class="campos">
					<Campo etiqueta={esGrupal ? 'Fecha de salida' : 'Fecha de salida (opcional)'} ancho="medio">
						<input type="date" value={v.fecha_salida ?? ''} onInput={(e) => cambiar('fecha_salida', e.currentTarget.value || null)} />
					</Campo>
					<Campo etiqueta="Fecha de regreso (opcional)" ancho="medio">
						<input
							type="date"
							value={v.fecha_regreso ?? ''}
							min={v.fecha_salida ?? undefined}
							onInput={(e) => cambiar('fecha_regreso', e.currentTarget.value || null)}
						/>
					</Campo>
					<Campo etiqueta="Precio desde (opcional)" ayuda="Solo números. Si lo dejás vacío, se muestra «Consultar»." ancho="tercio">
						<CampoPrecio valor={v.precio} alCambiar={(x) => cambiar('precio', x)} />
					</Campo>
					<Campo etiqueta="Moneda" ancho="tercio">
						<div class="opciones">
							{(['ARS', 'USD'] as const).map((m) => (
								<button type="button" key={m} class={`opcion ${v.moneda === m ? 'elegida' : ''}`} onClick={() => cambiar('moneda', m)}>
									{m === 'ARS' ? '$ Pesos' : 'US$ Dólares'}
								</button>
							))}
						</div>
					</Campo>
					<Campo etiqueta="Aclaración del precio" ayuda="Ej.: por persona en base doble" ancho="tercio">
						<input value={v.precio_nota} maxLength={150} onInput={(e) => cambiar('precio_nota', e.currentTarget.value)} />
					</Campo>
					<Campo etiqueta="Lugares disponibles">
						<div class="opciones">
							{(Object.keys(ESTADOS) as Estado[]).map((s) => (
								<button type="button" key={s} class={`opcion estado-opcion estado-${s} ${v.estado === s ? 'elegida' : ''}`} onClick={() => cambiar('estado', s)}>
									{ESTADOS[s]}
								</button>
							))}
						</div>
					</Campo>
				</div>
			</Tarjeta>

			<Tarjeta titulo="Fotos" descripcion="La foto principal se usa en la tarjeta y arriba de todo en la página. Las demás forman la galería: arrastralas para ordenarlas.">
				<div class="campos">
					<Campo etiqueta="Foto principal">
						<SelectorImagen valor={v.portada} alCambiar={(x) => cambiar('portada', x)} alt={v.titulo} />
					</Campo>
					<Campo etiqueta="Galería de fotos">
						<Galeria valor={v.galeria} alCambiar={(x) => cambiar('galeria', x)} alt={v.titulo} />
					</Campo>
				</div>
			</Tarjeta>

			<Tarjeta titulo="Descripción">
				<EditorTexto valor={v.descripcion} alCambiar={(x) => cambiar('descripcion', x)} />
			</Tarjeta>

			<Tarjeta titulo="Itinerario día por día" descripcion="Opcional. Agregá un bloque por día o por etapa y arrastralos para ordenarlos.">
				<EditorItinerario valor={v.itinerario} alCambiar={(x) => cambiar('itinerario', x)} />
			</Tarjeta>

			<Tarjeta titulo="Qué incluye y qué no">
				<div class="campos">
					<Campo etiqueta="✓ Incluye" ancho="medio">
						<ListaTextos valor={v.incluye} alCambiar={(x) => cambiar('incluye', x)} placeholder="Ej.: Aéreos Mar del Plata – Bariloche" agregar="Agregar renglón" />
					</Campo>
					<Campo etiqueta="✕ No incluye" ancho="medio">
						<ListaTextos valor={v.no_incluye} alCambiar={(x) => cambiar('no_incluye', x)} placeholder="Ej.: Comidas no mencionadas" agregar="Agregar renglón" />
					</Campo>
				</div>
			</Tarjeta>

			<Tarjeta titulo="Publicación">
				<div class="publicacion">
					<div>
						<Interruptor valor={v.publicado} si="Publicado" no="Oculto" alCambiar={(x) => cambiar('publicado', x)} />
						<p class="campo-ayuda">Si está oculto, el viaje no aparece en el sitio. Sirve para dejarlo a medio cargar.</p>
					</div>
					<div>
						<Interruptor valor={v.destacado} si="Destacado en el inicio" no="No destacado" alCambiar={(x) => cambiar('destacado', x)} />
						<p class="campo-ayuda">Los destacados aparecen primero en la página de inicio.</p>
					</div>
				</div>
				<div class="acciones-secundarias">
					<button type="button" class="boton boton-suave" onClick={abrirVersiones}>
						🕘 Versiones anteriores
					</button>
					<button type="button" class="boton boton-peligro" onClick={borrar}>
						Borrar viaje
					</button>
				</div>
			</Tarjeta>

			<div class="barra-guardar">
				<span>{sucio ? 'Tenés cambios sin guardar' : 'Todo guardado'}</span>
				<a
					class="boton boton-suave"
					href={`/admin/vista/${v.slug}`}
					target="_blank"
					onClick={(e) => {
						if (sucio) {
							e.preventDefault();
							avisar('Guardá primero para ver la vista previa.', 'error');
						}
					}}
				>
					Vista previa
				</a>
				<button type="button" class="boton boton-principal" disabled={!sucio || guardando} onClick={guardar}>
					{guardando ? 'Guardando…' : 'Guardar cambios'}
				</button>
			</div>

			{versiones && (
				<div class="modal-fondo" onClick={() => setVersiones(null)}>
					<div class="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Versiones anteriores">
						<header class="modal-cabecera">
							<h2>Versiones anteriores</h2>
							<button type="button" class="boton boton-suave" onClick={() => setVersiones(null)}>
								Cerrar
							</button>
						</header>
						<p class="campo-ayuda">Cada vez que guardás, queda una copia de cómo estaba antes. Elegí una para volver a ella.</p>
						{versiones.length === 0 ? (
							<p>Todavía no hay versiones anteriores.</p>
						) : (
							<ul class="versiones">
								{versiones.map((ver) => (
									<li key={ver.id}>
										<div>
											<strong>{fechaHora(ver.fecha)}</strong>
											<span>
												{ver.datos.titulo} {ver.usuario && `· guardado por ${ver.usuario}`}
											</span>
										</div>
										<button
											type="button"
											class="boton"
											onClick={() => {
												setV({ ...ver.datos, id: v.id, slug: v.slug, slug_fijo: v.slug_fijo, orden: v.orden });
												setVersiones(null);
												avisar('Cargamos esa versión. Revisala y tocá «Guardar cambios» para confirmarla.');
											}}
										>
											Usar esta versión
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

function CampoPrecio(p: { valor: number | null; alCambiar: (v: number | null) => void }) {
	const [foco, setFoco] = useState(false);
	const texto = p.valor ? (foco ? String(p.valor) : p.valor.toLocaleString('es-AR')) : '';
	return (
		<input
			inputMode="numeric"
			value={texto}
			placeholder="Ej.: 206000"
			onFocus={() => setFoco(true)}
			onBlur={() => setFoco(false)}
			onInput={(e) => {
				const n = Number(e.currentTarget.value.replace(/\D/g, ''));
				p.alCambiar(n > 0 ? n : null);
			}}
		/>
	);
}

/** Texto con botones simples (negrita, subtítulo, lista) y vista previa. */
function EditorTexto(p: { valor: string; alCambiar: (v: string) => void }) {
	const ref = useRef<HTMLTextAreaElement>(null);
	const [previa, setPrevia] = useState(false);
	const html = useMemo(() => (previa ? markdownAHtml(p.valor) : ''), [previa, p.valor]);

	const envolver = (antes: string, despues = antes) => {
		const t = ref.current;
		if (!t) return;
		const { selectionStart: a, selectionEnd: b, value } = t;
		const sel = value.slice(a, b) || 'texto';
		p.alCambiar(value.slice(0, a) + antes + sel + despues + value.slice(b));
		setTimeout(() => {
			t.focus();
			t.setSelectionRange(a + antes.length, a + antes.length + sel.length);
		});
	};
	const prefijo = (pre: string) => {
		const t = ref.current;
		if (!t) return;
		const { selectionStart: a, selectionEnd: b, value } = t;
		const inicio = value.lastIndexOf('\n', a - 1) + 1;
		const bloque = value
			.slice(inicio, b)
			.split('\n')
			.map((l) => (l.startsWith(pre) ? l.slice(pre.length) : pre + l))
			.join('\n');
		p.alCambiar(value.slice(0, inicio) + bloque + value.slice(b));
		setTimeout(() => t.focus());
	};

	return (
		<div class="editor-texto">
			<div class="barra-texto">
				<button type="button" onClick={() => envolver('**')} title="Negrita">
					<b>N</b> Negrita
				</button>
				<button type="button" onClick={() => prefijo('### ')} title="Subtítulo">
					Subtítulo
				</button>
				<button type="button" onClick={() => prefijo('- ')} title="Lista con viñetas">
					• Lista
				</button>
				<span class="separador" />
				<button type="button" class={previa ? 'activo' : ''} onClick={() => setPrevia(!previa)}>
					{previa ? '✎ Seguir editando' : '👁 Ver cómo queda'}
				</button>
			</div>
			{previa ? (
				<div class="vista-previa-texto prosa" dangerouslySetInnerHTML={{ __html: html }} />
			) : (
				<textarea
					ref={ref}
					rows={14}
					value={p.valor}
					placeholder="Contá el viaje: qué lo hace especial, qué van a conocer, por qué sumarse…"
					onInput={(e) => p.alCambiar(e.currentTarget.value)}
				/>
			)}
			<p class="campo-ayuda">Dejá una línea en blanco entre párrafos. Usá los botones de arriba para negrita, subtítulos y listas.</p>
		</div>
	);
}

function EditorItinerario(p: { valor: Viaje['itinerario']; alCambiar: (v: Viaje['itinerario']) => void }) {
	const ref = useOrdenable(p.valor, p.alCambiar, { handle: '.asa' });
	const cambiarDia = (i: number, campo: 'titulo' | 'texto', valor: string) =>
		p.alCambiar(p.valor.map((d, j) => (j === i ? { ...d, [campo]: valor } : d)));
	return (
		<div>
			<ol class="itinerario-editor" ref={ref as never}>
				{p.valor.map((d, i) => (
					<li key={i} class="dia">
						<div class="dia-cabecera">
							<Asa />
							<span class="dia-numero">Día {i + 1}</span>
							<button type="button" class="boton-icono" aria-label="Quitar día" onClick={() => p.alCambiar(p.valor.filter((_, j) => j !== i))}>
								✕
							</button>
						</div>
						<input value={d.titulo} placeholder="Título del día. Ej.: Llegada a Bariloche" onInput={(e) => cambiarDia(i, 'titulo', e.currentTarget.value)} />
						<textarea rows={3} value={d.texto} placeholder="Qué se hace ese día" onInput={(e) => cambiarDia(i, 'texto', e.currentTarget.value)} />
					</li>
				))}
			</ol>
			<button type="button" class="boton boton-suave" onClick={() => p.alCambiar([...p.valor, { titulo: '', texto: '' }])}>
				+ Agregar día
			</button>
		</div>
	);
}
