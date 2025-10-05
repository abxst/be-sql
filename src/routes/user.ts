import { readSessionFromRequest } from '../auth';
import { createConfig } from '../config';
import { escapeSqlString, jsonError, jsonResponse } from './utils';

/**
 * GET /get-info - Get user information for authenticated user
 */
export async function handleGetInfo(request: Request, env: Env): Promise<Response> {
	try {
		const session = await readSessionFromRequest(env, request);
		if (!session) {
			return jsonError('Unauthorized', 401);
		}
		const userPrefix = session.prefix;
		const infoQuery = `SELECT \`id\`, \`username\`, \`prefix\`, \`last_login\` FROM \`users\` WHERE \`prefix\` = '${escapeSqlString(userPrefix)}'`;
		const { executeSqlQuery } = await import('../sql');
		const config = createConfig(env);
		const data = await executeSqlQuery(config, infoQuery);
		return jsonResponse({ status: 'ok', data });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Invalid request';
		return jsonError(message, 400);
	}
}

