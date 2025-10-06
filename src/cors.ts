/** CORS helpers. */

/**
 * Get allowed origins from environment
 * Reads from ALLOWED_ORIGINS env variable (comma-separated list)
 */
function getAllowedOrigins(env: Env): string[] {
	const envOrigins = env.ALLOWED_ORIGINS;
	if (typeof envOrigins === 'string' && envOrigins.trim()) {
		return envOrigins.split(',').map(o => o.trim());
	}
	return [];
}

export function withCors(response: Response, request: Request, env: Env): Response {
	const origin = request.headers.get('origin') || '';
	const allowedOrigins = getAllowedOrigins(env);
	const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*';
	const headers = new Headers(response.headers);
	headers.set('Access-Control-Allow-Origin', allowOrigin);
	headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type, *');
	headers.set('Access-Control-Allow-Credentials', 'true');
	headers.set('Access-Control-Max-Age', '86400');
	return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function preflightCors(request: Request, env: Env): Response {
	const origin = request.headers.get('origin') || '';
	const allowedOrigins = getAllowedOrigins(env);
	const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*';
	const headers: HeadersInit = {
		'Access-Control-Allow-Origin': allowOrigin,
		'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, *',
		'Access-Control-Allow-Credentials': 'true',
		'Access-Control-Max-Age': '86400',
	};
	return new Response(null, { status: 204, headers });
}


