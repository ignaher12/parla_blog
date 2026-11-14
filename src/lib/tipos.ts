// Tipos compartidos entre el servidor y el panel admin (sin dependencias de Node).

export const ESTADOS = {
	abierta: 'Inscripción abierta',
	ultimos: 'Últimos lugares',
	agotada: 'Agotada',
	consultar: 'Consultar',
} as const;
export type Estado = keyof typeof ESTADOS;

export const TIPOS = {
	grupal: 'Salida grupal',
	paquete: 'Paquete especial',
} as const;
export type Tipo = keyof typeof TIPOS;

export const MONEDAS = ['ARS', 'USD'] as const;
export type Moneda = (typeof MONEDAS)[number];

export interface DiaItinerario {
	titulo: string;
	texto: string;
}

export interface Viaje {
	id: number;
	tipo: Tipo;
	slug: string;
	/** true cuando ya se publicó alguna vez: la dirección web no cambia más. */
	slug_fijo: boolean;
	titulo: string;
	destino: string;
	resumen: string;
	descripcion: string;
	fecha_salida: string | null; // AAAA-MM-DD
	fecha_regreso: string | null;
	precio: number | null;
	moneda: Moneda;
	precio_nota: string;
	estado: Estado;
	etiqueta: string;
	portada: string | null; // id de media
	galeria: string[]; // ids de media
	itinerario: DiaItinerario[];
	incluye: string[];
	no_incluye: string[];
	destacado: boolean;
	publicado: boolean;
	orden: number;
	creado: string;
	actualizado: string;
}

/** Campos que se pueden editar desde el panel. */
export type ViajeEditable = Omit<Viaje, 'id' | 'slug' | 'slug_fijo' | 'orden' | 'creado' | 'actualizado'>;

export interface Asesora {
	nombre: string;
	whatsapp: string; // solo dígitos, con código de país: 549223...
	activa: boolean;
}

export interface Contacto {
	asesoras: Asesora[];
	instagram: string;
}

export interface Inicio {
	hero_titulo: string;
	hero_subtitulo: string;
	hero_texto: string;
	hero_texto2: string;
	hero_imagen: string | null;
	mujeres_titulo: string;
	mujeres_destacado: string;
	mujeres_texto: string;
	mujeres_imagen: string | null;
}

export interface Ajustes {
	contacto: Contacto;
	inicio: Inicio;
}

export interface MediaInfo {
	id: string;
	ancho: number;
	alto: number;
	alt: string;
}

export interface Version {
	id: number;
	accion: string;
	usuario: string;
	fecha: string;
	datos: Viaje;
}

export const mediaUrl = (id: string, ancho: 480 | 960 | 1600 = 960) => `/media/${id}-${ancho}.webp`;
