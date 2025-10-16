import { createConfig } from '../config';
import { logError, createErrorResponse, ErrorContext } from '../error-handler';
import { ErrorCode, ErrorCodes } from '../error-codes';

/**
 * Execute a SQL query and return a JSON Response
 */
export async function respondSqlQuery(env: Env, query: string): Promise<Response> {
	const context = { file: 'routes/utils.ts', function: 'respondSqlQuery' };
	
	try {
		const { executeSqlQuery } = await import('../sql');
		const config = createConfig(env);
		const data = await executeSqlQuery(config, query);
		const body = JSON.stringify({ status: 'ok', data }, null, 2);
		return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8' } });
	} catch (error) {
		logError(error, { ...context, details: { query } });
		const message = error instanceof Error ? error.message : 'Unknown error';
		const body = JSON.stringify({ 
			status: 'error', 
			message,
			context: {
				file: context.file,
				function: context.function,
				timestamp: new Date().toISOString(),
			}
		}, null, 2);
		return new Response(body, { status: 502, headers: { 'content-type': 'application/json; charset=utf-8' } });
	}
}

/**
 * Escape single quotes in SQL strings
 */
export function escapeSqlString(value: string): string {
	// Minimal escaping for single quotes. Consider server-side parameterization for full safety.
	return value.replace(/'/g, "''");
}

/**
 * Generate a random alphanumeric key
 */
export function generateRandomKey(length: number = 20): string {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let key = '';
	for (let i = 0; i < length; i++) {
		key += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return key;
}

/**
 * Create a standard JSON error response
 * @deprecated Use jsonErrorWithCode instead for better error tracking
 */
export function jsonError(message: string, status: number = 400): Response {
	return new Response(JSON.stringify({ error: message }, null, 2), {
		status,
		headers: { 'content-type': 'application/json; charset=utf-8' },
	});
}

/**
 * Create a JSON error response with error code
 */
export function jsonErrorWithCode(
	errorCode: ErrorCode,
	context: ErrorContext,
	env?: Env
): Response {
	return createErrorResponse(
		new Error(`Error ${errorCode}`),
		{ ...context, errorCode, env }
	);
}

/**
 * Create a standard JSON response
 */
export function jsonResponse(data: any, status: number = 200): Response {
	return new Response(JSON.stringify(data, null, 2), {
		status,
		headers: { 'content-type': 'application/json; charset=utf-8' },
	});
}

