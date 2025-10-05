import { parseRequestJsonToMap } from '../json';
import { respondSqlQuery, jsonError, jsonResponse } from './utils';

/**
 * GET /check-env - Check environment variables
 */
export async function handleCheckEnv(request: Request, env: Env): Promise<Response> {
	const envRecord = env as unknown as Record<string, unknown>;
	const keys = Array.from(new Set<string>([...Object.keys(envRecord), 'URL_API_SQL'])).sort();
	const entries = keys.map((key) => {
		const value = envRecord[key as keyof typeof envRecord];
		let shown: string;
		if (typeof value === 'string') {
			shown = value;
		} else if (value === undefined) {
			shown = 'undefined';
		} else if (value === null) {
			shown = 'null';
		} else if (typeof value === 'function') {
			shown = '[function]';
		} else if (typeof value === 'object') {
			shown = '[binding]';
		} else {
			shown = String(value);
		}
		return [key, shown] as const;
	});
	const body = JSON.stringify(Object.fromEntries(entries), null, 2);
	return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8' } });
}

/**
 * GET /check-db - Check database connection
 */
export async function handleCheckDb(request: Request, env: Env): Promise<Response> {
	return respondSqlQuery(env, 'select * from demo where 1');
}

/**
 * POST /parse-json - Parse and echo JSON request body
 */
export async function handleParseJson(request: Request, env: Env): Promise<Response> {
	try {
		const maps = await parseRequestJsonToMap(request);
		return jsonResponse(maps);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Invalid JSON';
		return jsonError(message, 400);
	}
}

