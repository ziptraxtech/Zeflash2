// API Configuration - uses Vercel proxy in production, local backend in dev
export const API_URL = import.meta.env.VITE_API_BASE || '/api/backend';
