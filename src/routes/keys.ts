import { parseRequestJsonToMap } from '../json';
import { readSessionFromRequest } from '../auth';
import { createConfig } from '../config';
import { escapeSqlString, generateRandomKey, jsonError, jsonResponse } from './utils';

/**
 * GET /get-key - Get paginated list of keys for authenticated user
 */
export async function handleGetKey(request: Request, env: Env): Promise<Response> {
	try {
		const session = await readSessionFromRequest(env, request);
		if (!session) {
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

		const { executeSqlQuery } = await import('../sql');
		const config = createConfig(env);
		const keysQuery = `SELECT * FROM \`ukeys\` WHERE \`prefix\`='${escapeSqlString(userPrefix)}' ORDER BY \`id_key\` ASC LIMIT ${pageSize} OFFSET ${offset}`;
		const data = await executeSqlQuery(config, keysQuery);
		return jsonResponse({ page, pageSize, data });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Invalid request';
		return jsonError(message, 400);
	}
}

/**
 * POST /add-key - Generate and add new keys for authenticated user
 */
export async function handleAddKey(request: Request, env: Env): Promise<Response> {
	try {
		const session = await readSessionFromRequest(env, request);
		if (!session) {
			return jsonError('Unauthorized', 401);
		}
		const userPrefix = session.prefix;

		const maps = await parseRequestJsonToMap(request);
		const missing: string[] = [];
		for (const key of ['amount', 'length']) {
			if (!(key in maps)) missing.push(key);
		}
		if (missing.length > 0) {
			return jsonError(`Missing required fields: ${missing.join(', ')}`, 400);
		}
		const amountParam = maps['amount'];
		const lengthParam = maps['length'];
		if (typeof amountParam !== 'number' || typeof lengthParam !== 'number') {
			return jsonError('amount and length must be numbers', 400);
		}

		const amountNum = Number(amountParam);
		const lengthNum = Number(lengthParam);

		if (Number.isNaN(amountNum) || amountNum < 1 || amountNum > 30) {
			return jsonError('amount must be an integer between 1 and 30', 400);
		}

		if (Number.isNaN(lengthNum) || lengthNum < 1 || lengthNum > 30) {
			return jsonError('length must be an integer between 1 and 30', 400);
		}

		const amount = Math.floor(amountNum);
		const keyLength = Math.floor(lengthNum);

		const { executeSqlQuery } = await import('../sql');
		const config = createConfig(env);

		const generatedKeys = [];
		for (let i = 0; i < amount; i++) {
			const key = userPrefix + '_' + lengthParam + '_' + generateRandomKey(15);
			generatedKeys.push(key);
		}

		// Build multiple VALUES for single INSERT
		const values = generatedKeys.map(key => `('${escapeSqlString(key)}', ${keyLength}, '${escapeSqlString(userPrefix)}')`).join(', ');
		const insertQuery = `INSERT INTO \`ukeys\`(\`key\`, \`length\`, \`prefix\`) VALUES ${values}`;
		await executeSqlQuery(config, insertQuery);

		// Return the generated keys directly
		const createdKeys = generatedKeys.map(key => ({
			key,
			length: keyLength,
			prefix: userPrefix,
			time_start: null,
			time_end: null
		}));

		return jsonResponse({ status: 'ok', generated: amount, keys: createdKeys });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Invalid request';
		return jsonError(message, 400);
	}
}

/**
 * POST /delete-key - Delete a key for authenticated user
 */
export async function handleDeleteKey(request: Request, env: Env): Promise<Response> {
	try {
		const session = await readSessionFromRequest(env, request);
		if (!session) {
			return jsonError('Unauthorized', 401);
		}
		const userPrefix = session.prefix;

		const maps = await parseRequestJsonToMap(request);
		const missing: string[] = [];
		for (const key of ['key']) {
			if (!(key in maps)) missing.push(key);
		}
		if (missing.length > 0) {
			return jsonError(`Missing required fields: ${missing.join(', ')}`, 400);
		}
		const keyToDelete = maps['key'];
		if (typeof keyToDelete !== 'string') {
			return jsonError('key must be a string', 400);
		}

		const { executeSqlQuery } = await import('../sql');
		const config = createConfig(env);
		const deleteQuery = `DELETE FROM \`ukeys\` WHERE \`key\` = '${escapeSqlString(keyToDelete)}' AND \`prefix\` = '${escapeSqlString(userPrefix)}'`;
		const result = await executeSqlQuery(config, deleteQuery);

		return jsonResponse({ status: 'ok', deleted: (result as any).affectedRows || 0 });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Invalid request';
		return jsonError(message, 400);
	}
}

/**
 * POST /reset-key - Reset a key's device ID for authenticated user
 */
export async function handleResetKey(request: Request, env: Env): Promise<Response> {
	try {
		const session = await readSessionFromRequest(env, request);
		if (!session) {
			return jsonError('Unauthorized', 401);
		}
		const userPrefix = session.prefix;

		const maps = await parseRequestJsonToMap(request);
		const missing: string[] = [];
		for (const key of ['key']) {
			if (!(key in maps)) missing.push(key);
		}
		if (missing.length > 0) {
			return jsonError(`Missing required fields: ${missing.join(', ')}`, 400);
		}
		const keyToDelete = maps['key'];
		if (typeof keyToDelete !== 'string') {
			return jsonError('key must be a string', 400);
		}

		const { executeSqlQuery } = await import('../sql');
		const config = createConfig(env);
		const deleteQuery = `UPDATE \`ukeys\` SET \`id_device\` = NULL WHERE \`key\` = '${escapeSqlString(keyToDelete)}' AND \`prefix\` = '${escapeSqlString(userPrefix)}'`;
		const result = await executeSqlQuery(config, deleteQuery);

		return jsonResponse({ status: 'ok', deleted: (result as any).affectedRows || 0 });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Invalid request';
		return jsonError(message, 400);
	}
}

