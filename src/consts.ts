// Datos globales del sitio. Se importan desde cualquier componente.

export const SITE_TITLE = 'Parla di Viaggi';
export const SITE_DESCRIPTION = 'Agencia de viajes. Mar del Plata';

// Los WhatsApp de las asesoras y el Instagram se editan desde el panel admin
// (sección Contacto). Los valores iniciales están en src/lib/ajustes.ts.

export const whatsappUrl = (numero: string, mensaje?: string) =>
	`https://wa.me/${numero}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
