// src/pages/api/[...path].ts
import type { APIRoute } from 'astro';

// Prioridad: 
// 1. process.env.BACKEND_URL (Vercel/Hosting env var)
// 2. import.meta.env.PUBLIC_BACKEND_URL (Astro .env files)
// 3. Fallback a localhost
const BACKEND_URL = process.env.BACKEND_URL ||
  import.meta.env.PUBLIC_BACKEND_URL ||
  'http://localhost:3000';

export const ALL: APIRoute = async ({ request, params }) => {
  const path = params.path;

  try {
    const url = new URL(request.url);
    const targetUrl = `${BACKEND_URL.replace(/\/$/, '')}/api/${path}${url.search}`;

    console.log(`[API Proxy] ${request.method} ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers),
        'Origin': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : request.headers.get('origin') || '',
      },
      body: request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.text()
        : undefined,
    });

    const responseData = await response.text();

    return new Response(responseData, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[API Proxy Error]', error);

    // Determinamos la URL final para el debug
    const debugUrl = `${BACKEND_URL.replace(/\/$/, '')}/api/${path}`;

    return new Response(
      JSON.stringify({
        error: 'Failed to proxy request to backend',
        message: error instanceof Error ? error.message : String(error),
        targetUrl: debugUrl,
        hint: 'Verifica que BACKEND_URL esté configurado en tu plataforma de hosting (Vercel/Railway)'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
