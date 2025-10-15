import { parseRequestJsonToMap } from '../json';
import { readSessionFromRequest } from '../auth';
import { createConfig } from '../config';
import { escapeSqlString, generateRandomKey, jsonError, jsonResponse } from './utils';
import { logError, createErrorResponse, logInfo } from '../error-handler';

/**
 * GET /get-key - Get paginated list of keys for authenticated user
 */
export async function handleGetKey(request: Request, env: Env): Promise<Response> {
	const context = { file: 'routes/keys.ts', function: 'handleGetKey' };
	
	try {
		const session = await readSessionFromRequest(env, request);
		if (!session) {
			logError(new Error('Unauthorized access attempt'), context);
			return jsonError('Unauthorized', 401);
		}
		const userPrefix = session.prefix;

		const url = new URL(request.url);
		const pageParam = url.searchParams.get('page');
		const sizeParam = url.searchParams.get('pageSize') ?? url.searchParams.get('limit');
		let page = 1;
		if (pageParam && !Number.isNaN(Number(pageParam))) page = Math.max(1, Math.floor(Number(pageParam)));
		let pageSize = 50;
		if (sizeParam && !Number.isNaN(Number(sizeParam))) pageSize = Math.floor(Number(sizeParam));
		if (pageSize < 1) pageSize = 1;
		if (pageSize > 50) pageSize = 50;
		const offset = (page - 1) * pageSize;

		try {
			const { executeSqlQuery } = await import('../sql');
			const config = createConfig(env);
			// SQLite syntax
			const keysQuery = `SELECT * FROM "ukeys" WHERE "prefix"='${escapeSqlString(userPrefix)}' ORDER BY "id_key" ASC LIMIT ${pageSize} OFFSET ${offset}`;
			const data = await executeSqlQuery(config, keysQuery);
			return jsonResponse({ page, pageSize, data });
		} catch (error) {
			return createErrorResponse(error, { ...context, details: { userPrefix, page, pageSize } }, 500);
		}
	} catch (err) {
		return createErrorResponse(err, context, 500);
	}
}

/**
 * POST /add-key - Generate and add new keys for authenticated user
 */
export async function handleAddKey(request: Request, env: Env): Promise<Response> {
	const context = { file: 'routes/keys.ts', function: 'handleAddKey' };
	
	try {
		const session = await readSessionFromRequest(env, request);
		if (!session) {
			logError(new Error('Unauthorized access attempt'), context);
			return jsonError('Unauthorized', 401);
		}
		const userPrefix = session.prefix;

		const maps = await parseRequestJsonToMap(request);
		const missing: string[] = [];
		for (const key of ['amount', 'length']) {
			if (!(key in maps)) missing.push(key);
		}
		if (missing.length > 0) {
			logError(new Error('Missing required fields'), { ...context, details: { missing } });
			return jsonError(`Missing required fields: ${missing.join(', ')}`, 400);
		}
		const amountParam = maps['amount'];
		const lengthParam = maps['length'];
		if (typeof amountParam !== 'number' || typeof lengthParam !== 'number') {
			logError(new Error('Invalid field types'), { ...context, details: { amount: typeof amountParam, length: typeof lengthParam } });
			return jsonError('amount and length must be numbers', 400);
		}

		const amountNum = Number(amountParam);
		const lengthNum = Number(lengthParam);

		if (Number.isNaN(amountNum) || amountNum < 1 || amountNum > 30) {
			logError(new Error('Invalid amount value'), { ...context, details: { amount: amountNum } });
			return jsonError('amount must be an integer between 1 and 30', 400);
		}

		if (Number.isNaN(lengthNum) || lengthNum < 1 || lengthNum > 30) {
			logError(new Error('Invalid length value'), { ...context, details: { length: lengthNum } });
			return jsonError('length must be an integer between 1 and 30', 400);
		}

		const amount = Math.floor(amountNum);
		const keyLength = Math.floor(lengthNum);

		try {
			const { executeSqlQuery } = await import('../sql');
			const config = createConfig(env);

			const generatedKeys = [];
			for (let i = 0; i < amount; i++) {
				const key = userPrefix + '_' + lengthParam + '_' + generateRandomKey(15);
				generatedKeys.push(key);
			}

			// Build multiple VALUES for single INSERT (SQLite syntax)
			const values = generatedKeys.map(key => `('${escapeSqlString(key)}', ${keyLength}, '${escapeSqlString(userPrefix)}')`).join(', ');
			const insertQuery = `INSERT INTO "ukeys"("key", "length", "prefix") VALUES ${values}`;
			await executeSqlQuery(config, insertQuery);

			// Return the generated keys directly
			const createdKeys = generatedKeys.map(key => ({
				key,
				length: keyLength,
				prefix: userPrefix,
				time_start: null,
				time_end: null
			}));

			logInfo('Keys generated successfully', { userPrefix, amount, timestamp: new Date().toISOString() }, env);
			return jsonResponse({ status: 'ok', generated: amount, keys: createdKeys });
		} catch (error) {
			return createErrorResponse(error, { ...context, details: { userPrefix, amount, keyLength } }, 500);
		}
	} catch (err) {
		return createErrorResponse(err, { ...context, details: { message: 'Failed to process add-key request' } }, 500);
	}
}

/**
 * POST /delete-key - Delete a key for authenticated user
 */
export async function handleDeleteKey(request: Request, env: Env): Promise<Response> {
	const context = { file: 'routes/keys.ts', function: 'handleDeleteKey' };
	
	try {
		const session = await readSessionFromRequest(env, request);
		if (!session) {
			logError(new Error('Unauthorized access attempt'), context);
			return jsonError('Unauthorized', 401);
		}
		const userPrefix = session.prefix;

		const maps = await parseRequestJsonToMap(request);
		const missing: string[] = [];
		for (const key of ['key']) {
			if (!(key in maps)) missing.push(key);
		}
		if (missing.length > 0) {
			logError(new Error('Missing required fields'), { ...context, details: { missing } });
			return jsonError(`Missing required fields: ${missing.join(', ')}`, 400);
		}
		const keyToDelete = maps['key'];
		if (typeof keyToDelete !== 'string') {
			logError(new Error('Invalid field type'), { ...context, details: { key: typeof keyToDelete } });
			return jsonError('key must be a string', 400);
		}

		try {
			const { executeSqlQuery } = await import('../sql');
			const config = createConfig(env);
			// SQLite syntax
			const deleteQuery = `DELETE FROM "ukeys" WHERE "key" = '${escapeSqlString(keyToDelete)}' AND "prefix" = '${escapeSqlString(userPrefix)}'`;
			const result = await executeSqlQuery(config, deleteQuery);

			logInfo('Key deleted', { userPrefix, key: keyToDelete, timestamp: new Date().toISOString() }, env);
			return jsonResponse({ status: 'ok', deleted: (result as any).affectedRows || 0 });
		} catch (error) {
			return createErrorResponse(error, { ...context, details: { userPrefix, key: keyToDelete } }, 500);
		}
	} catch (err) {
		return createErrorResponse(err, { ...context, details: { message: 'Failed to process delete-key request' } }, 500);
	}
}

/**
 * POST /reset-key - Reset a key's device ID for authenticated user
 */
export async function handleResetKey(request: Request, env: Env): Promise<Response> {
	const context = { file: 'routes/keys.ts', function: 'handleResetKey' };
	
	try {
		const session = await readSessionFromRequest(env, request);
		if (!session) {
			logError(new Error('Unauthorized access attempt'), context);
			return jsonError('Unauthorized', 401);
		}
		const userPrefix = session.prefix;

		const maps = await parseRequestJsonToMap(request);
		const missing: string[] = [];
		for (const key of ['key']) {
			if (!(key in maps)) missing.push(key);
		}
		if (missing.length > 0) {
			logError(new Error('Missing required fields'), { ...context, details: { missing } });
			return jsonError(`Missing required fields: ${missing.join(', ')}`, 400);
		}
		const keyToReset = maps['key'];
		if (typeof keyToReset !== 'string') {
			logError(new Error('Invalid field type'), { ...context, details: { key: typeof keyToReset } });
			return jsonError('key must be a string', 400);
		}

		try {
			const { executeSqlQuery } = await import('../sql');
			const config = createConfig(env);
			// SQLite syntax
			const resetQuery = `UPDATE "ukeys" SET "id_device" = NULL WHERE "key" = '${escapeSqlString(keyToReset)}' AND "prefix" = '${escapeSqlString(userPrefix)}'`;
			const result = await executeSqlQuery(config, resetQuery);

			logInfo('Key reset', { userPrefix, key: keyToReset, timestamp: new Date().toISOString() }, env);
			return jsonResponse({ status: 'ok', deleted: (result as any).affectedRows || 0 });
		} catch (error) {
			return createErrorResponse(error, { ...context, details: { userPrefix, key: keyToReset } }, 500);
		}
	} catch (err) {
		return createErrorResponse(err, { ...context, details: { message: 'Failed to process reset-key request' } }, 500);
	}
}

