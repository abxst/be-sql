/** CORS helpers. */

const allowedOrigins = ['http://localhost:3000', 'https://webpanel.hainth.edu.vn', 'https://fe-webpanel.pages.dev']; // Add production origins here

export const corsHeaders: HeadersInit = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
	'Access-Control-Allow-Headers': '*',
	'Access-Control-Max-Age': '86400',
};

export function withCors(response: Response, request: Request): Response {
	const origin = request.headers.get('origin') || '';
	const allowOrigin = allowedOrigins.includes(origin) ? origin : '';
	const headers = new Headers(response.headers);
	headers.set('Access-Control-Allow-Origin', allowOrigin);
	headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
	headers.set('Access-Control-Allow-Headers', '*');
	headers.set('Access-Control-Allow-Credentials', 'true');
	headers.set('Access-Control-Max-Age', '86400');
	return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function preflightCors(request: Request): Response {
	const origin = request.headers.get('origin') || '';
	const allowOrigin = allowedOrigins.includes(origin) ? origin : '';
	const headers: HeadersInit = {
		'Access-Control-Allow-Origin': allowOrigin,
		'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
		'Access-Control-Allow-Headers': '*',
		'Access-Control-Allow-Credentials': 'true',
		'Access-Control-Max-Age': '86400',
	};
	return new Response(null, { status: 204, headers });
}


