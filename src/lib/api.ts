// Ayudas para las rutas de la API del panel.

export const json = (datos: unknown, status = 200) =>
	new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export const error = (mensaje: string, status = 400) => json({ error: mensaje }, status);

export async function leerJson(request: Request): Promise<Record<string, unknown> | undefined> {
	try {
		const d = await request.json();
		return d && typeof d === 'object' && !Array.isArray(d) ? d : undefined;
	} catch {
		return undefined;
	}
}

export const idNumerico = (v: string | undefined) => {
	const n = Number(v);
	return Number.isInteger(n) && n > 0 ? n : undefined;
};
