// Datos globales del sitio. Se importan desde cualquier componente.
// En la fase 2 estos valores pasan a editarse desde el panel admin.

export const SITE_TITLE = 'Parla di Viaggi';
export const SITE_DESCRIPTION = 'Agencia de viajes. Mar del Plata';

export const INSTAGRAM_URL = 'https://www.instagram.com/parladiviaggi.viajes/';

export const ASESORAS = [
	{ nombre: 'Andrea', whatsapp: '5492235261703' },
	{ nombre: 'Claudia', whatsapp: '5492235828803' },
] as const;

export const whatsappUrl = (numero: string, mensaje?: string) =>
	`https://wa.me/${numero}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
