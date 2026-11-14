import type { APIRoute } from 'astro';
import { json } from '../../../lib/api';

export const GET: APIRoute = ({ locals }) => json({ email: locals.usuario });
