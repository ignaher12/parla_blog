import type { APIRoute } from 'astro';
import { idNumerico, json } from '../../../../../lib/api';
import { versionesViaje } from '../../../../../lib/viajes';

export const GET: APIRoute = ({ params }) => json(versionesViaje(idNumerico(params.id) ?? 0));
