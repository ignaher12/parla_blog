// Mensajes cortos que aparecen abajo ("Guardado ✓", errores).
import { useEffect, useState } from 'preact/hooks';

type Aviso = { id: number; texto: string; tipo: 'ok' | 'error' };
let oyente: ((a: Aviso) => void) | undefined;
let siguiente = 1;

export function avisar(texto: string, tipo: Aviso['tipo'] = 'ok') {
	oyente?.({ id: siguiente++, texto, tipo });
}

export function avisarError(e: unknown) {
	avisar(e instanceof Error ? e.message : 'Algo salió mal. Probá de nuevo.', 'error');
}

export function Avisos() {
	const [avisos, setAvisos] = useState<Aviso[]>([]);
	useEffect(() => {
		oyente = (a) => {
			setAvisos((l) => [...l, a]);
			setTimeout(() => setAvisos((l) => l.filter((x) => x.id !== a.id)), a.tipo === 'error' ? 7000 : 2500);
		};
		return () => (oyente = undefined);
	}, []);
	return (
		<div class="avisos" role="status" aria-live="polite">
			{avisos.map((a) => (
				<div key={a.id} class={`aviso aviso-${a.tipo}`}>
					{a.texto}
				</div>
			))}
		</div>
	);
}
