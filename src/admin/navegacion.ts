// Navegación del panel con el "#" de la URL (#/, #/viaje/3, #/inicio...).
// Si hay cambios sin guardar, pregunta antes de salir.
import { useEffect, useState } from 'preact/hooks';

let hayCambios = false;
const AVISO = 'Tenés cambios sin guardar. ¿Salir igual y perderlos?';

const rutaActual = () => location.hash.replace(/^#/, '') || '/';

export function ir(ruta: string, sinPreguntar = false) {
	if (!sinPreguntar && hayCambios && !confirm(AVISO)) return;
	hayCambios = false;
	location.hash = ruta;
}

export function useRuta() {
	const [ruta, setRuta] = useState(rutaActual);
	useEffect(() => {
		let anterior = rutaActual();
		const alCambiar = () => {
			const nueva = rutaActual();
			if (nueva === anterior) return;
			if (hayCambios && !confirm(AVISO)) {
				history.replaceState(null, '', `#${anterior}`);
				return;
			}
			hayCambios = false;
			anterior = nueva;
			setRuta(nueva);
			scrollTo(0, 0);
		};
		addEventListener('hashchange', alCambiar);
		const antesDeCerrar = (e: BeforeUnloadEvent) => {
			if (hayCambios) e.preventDefault();
		};
		addEventListener('beforeunload', antesDeCerrar);
		return () => {
			removeEventListener('hashchange', alCambiar);
			removeEventListener('beforeunload', antesDeCerrar);
		};
	}, []);
	return ruta;
}

export function useCambiosSinGuardar(sucio: boolean) {
	useEffect(() => {
		hayCambios = sucio;
	}, [sucio]);
	useEffect(() => () => void (hayCambios = false), []);
}
