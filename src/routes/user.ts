import { readSessionFromRequest } from '../auth';
import { createConfig } from '../config';
import { escapeSqlString, jsonError, jsonResponse, jsonErrorWithCode } from './utils';
import { logError, createErrorResponse } from '../error-handler';
import { ErrorCodes } from '../error-codes';

/**
 * GET /get-info - Get user information for authenticated user
 */
export async function handleGetInfo(request: Request, env: Env): Promise<Response> {
	const context = { file: 'routes/user.ts', function: 'handleGetInfo' };
	
	try {
		const session = await readSessionFromRequest(env, request);
		if (!session) {
			logError(new Error('Unauthorized access attempt'), { 
				...context,
				errorCode: ErrorCodes.UNAUTHORIZED,
				env 
			});
			return jsonErrorWithCode(ErrorCodes.UNAUTHORIZED, context, env);
		}
		const userPrefix = session.prefix;
		
		try {
			// SQLite syntax
			const infoQuery = `SELECT "id", "username", "prefix", "last_login" FROM "users" WHERE "prefix" = '${escapeSqlString(userPrefix)}'`;
			const { executeSqlQuery } = await import('../sql');
			const config = createConfig(env);
			const data = await executeSqlQuery(config, infoQuery);
			return jsonResponse({ status: 'ok', data });
		} catch (error) {
			return createErrorResponse(error, { 
				...context, 
				details: { userPrefix },
				errorCode: ErrorCodes.SQL_QUERY_FAILED,
				env 
			});
		}
	} catch (err) {
		return createErrorResponse(err, { 
			...context,
			errorCode: ErrorCodes.UNKNOWN_ERROR,
			env 
		});
	}
}

