// Verifica que el pedido venga de alguien logueado con Cloudflare Access.
// Cloudflare agrega el header Cf-Access-Jwt-Assertion (un JWT firmado) a cada
// pedido que pasó el login. Lo verificamos para que nadie pueda saltear el
// login entrando directo al IP del servidor.
import { createRemoteJWKSet, jwtVerify } from 'jose';

const TEAM = process.env.CF_ACCESS_TEAM_DOMAIN; // ej: https://billowing-mud-9a30.cloudflareaccess.com
const AUD = process.env.CF_ACCESS_AUD;
const JWKS = TEAM ? createRemoteJWKSet(new URL('/cdn-cgi/access/certs', TEAM)) : undefined;

export async function usuarioAdmin(request: Request): Promise<string | undefined> {
	if (import.meta.env.DEV) return 'desarrollo@local';
	if (!JWKS || !AUD || !TEAM) return undefined;
	const token = request.headers.get('cf-access-jwt-assertion');
	if (!token) return undefined;
	try {
		const { payload } = await jwtVerify(token, JWKS, { issuer: TEAM, audience: AUD });
		return typeof payload.email === 'string' ? payload.email : undefined;
	} catch {
		return undefined;
	}
}
