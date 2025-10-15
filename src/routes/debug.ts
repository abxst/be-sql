import { parseRequestJsonToMap } from '../json';
import { respondSqlQuery, jsonError, jsonResponse } from './utils';
import { logError, createErrorResponse } from '../error-handler';

/**
 * GET /check-env - Check environment variables
 */
export async function handleCheckEnv(request: Request, env: Env): Promise<Response> {
	const context = { file: 'routes/debug.ts', function: 'handleCheckEnv' };
	
	try {
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
	} catch (error) {
		return createErrorResponse(error, context, 500);
	}
}

/**
 * GET /check-db - Check database connection
 */
export async function handleCheckDb(request: Request, env: Env): Promise<Response> {
	const context = { file: 'routes/debug.ts', function: 'handleCheckDb' };
	
	try {
		// SQLite syntax
		return respondSqlQuery(env, 'SELECT * FROM "comments" WHERE 1');
	} catch (error) {
		return createErrorResponse(error, context, 500);
	}
}

/**
 * POST /parse-json - Parse and echo JSON request body
 */
export async function handleParseJson(request: Request, env: Env): Promise<Response> {
	const context = { file: 'routes/debug.ts', function: 'handleParseJson' };
	
	try {
		const maps = await parseRequestJsonToMap(request);
		return jsonResponse(maps);
	} catch (err) {
		return createErrorResponse(err, { ...context, details: { message: 'Failed to parse JSON' } }, 400);
	}
}

