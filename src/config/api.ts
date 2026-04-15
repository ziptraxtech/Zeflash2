// API Configuration - uses Vercel proxy in production, local backend in dev
export const API_URL = import.meta.env.DEV ? 'http://localhost:3000' : '/api/backend';
