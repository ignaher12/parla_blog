// Panel de administración de Parla di Viaggi.
import { useEffect, useState } from 'preact/hooks';
import { EditorContacto, EditorInicio, Papelera } from './Ajustes';
import { api } from './api';
import { Avisos } from './avisos';
import { useRuta } from './navegacion';
import { EditorViaje, ListaViajes } from './Viajes';

const MENU = [
	{ ruta: '/', texto: 'Viajes', icono: '✈️' },
	{ ruta: '/inicio', texto: 'Inicio', icono: '🏠' },
	{ ruta: '/contacto', texto: 'Contacto', icono: '💬' },
	{ ruta: '/papelera', texto: 'Papelera', icono: '🗑' },
];

export default function App() {
	const ruta = useRuta();
	const [email, setEmail] = useState('');
	useEffect(() => {
		api.get<{ email: string }>('/api/admin/yo').then((r) => setEmail(r.email), () => {});
	}, []);

	const [camino, consulta = ''] = ruta.split('?');
	const viaje = camino.match(/^\/viaje\/(\d+)$/);
	const activa = viaje ? '/' : camino;

	let pantalla;
	if (viaje) pantalla = <EditorViaje key={viaje[1]} id={Number(viaje[1])} nuevo={consulta.includes('nuevo')} />;
	else if (camino === '/inicio') pantalla = <EditorInicio />;
	else if (camino === '/contacto') pantalla = <EditorContacto />;
	else if (camino === '/papelera') pantalla = <Papelera />;
	else pantalla = <ListaViajes />;

	return (
		<div class="panel">
			<nav class="menu">
				<a href="#/" class="marca">
					<img src="/imgs/logo.png" alt="" />
					<span>Panel Parla di Viaggi</span>
				</a>
				<ul>
					{MENU.map((m) => (
						<li key={m.ruta}>
							<a href={`#${m.ruta}`} class={activa === m.ruta ? 'activa' : ''}>
								<span aria-hidden="true">{m.icono}</span> {m.texto}
							</a>
						</li>
					))}
				</ul>
				<div class="menu-pie">
					<a href="/" target="_blank" class="boton boton-suave">
						Ver el sitio ↗
					</a>
					{email && <small title="Sesión iniciada">{email}</small>}
					<a href="/cdn-cgi/access/logout" class="salir">
						Cerrar sesión
					</a>
				</div>
			</nav>
			<main class="contenido">{pantalla}</main>
			<Avisos />
		</div>
	);
}
