/** CORS helpers. */

export const corsHeaders: HeadersInit = {
	'Access-Control-Allow-Origin': 'web.hainth.edu.vn',
	'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
	'Access-Control-Allow-Headers': '*',
	'Access-Control-Max-Age': '86400',
};

export function withCors(response: Response): Response {
	const headers = new Headers(response.headers);
	for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
	return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function preflightCors(): Response {
	return new Response(null, { status: 204, headers: corsHeaders });
}


