import { parseRequestJsonToMap } from '../json';
import { buildSetCookie, encryptSessionCookie } from '../auth';
import { createConfig } from '../config';
import { escapeSqlString, jsonError, jsonResponse } from './utils';

/**
 * POST /register - Register a new user
 */
export async function handleRegister(request: Request, env: Env): Promise<Response> {
	try {
		const maps = await parseRequestJsonToMap(request);
		const missing: string[] = [];
		for (const key of ['username', 'password', 'prefix']) {
			if (!(key in maps)) missing.push(key);
		}
		if (missing.length > 0) {
			return jsonError(`Missing required fields: ${missing.join(', ')}`, 400);
		}
		const username = maps['username'];
		const password = maps['password'];
		const prefix = maps['prefix'];
		if (typeof username !== 'string' || typeof password !== 'string' || typeof prefix !== 'string') {
			return jsonError('username, password, prefix must be strings', 400);
		}
		const { executeSqlQuery } = await import('../sql');
		const config = createConfig(env);
		const q = `INSERT INTO \`users\`(\`username\`, \`password\`, \`prefix\`) VALUES ('${escapeSqlString(username)}','${escapeSqlString(password)}','${escapeSqlString(prefix)}')`;
		
		try {
			const data = await executeSqlQuery(config, q);
			return jsonResponse({ status: 'ok', data });
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			return jsonResponse({ status: 'error', message }, 502);
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Invalid JSON';
		return jsonError(message, 400);
	}
}

/**
 * POST /login - Login user and create session
 */
export async function handleLogin(request: Request, env: Env): Promise<Response> {
	try {
		const maps = await parseRequestJsonToMap(request);
		const missing: string[] = [];
		for (const key of ['username', 'password']) {
			if (!(key in maps)) missing.push(key);
		}
		if (missing.length > 0) {
			return jsonError(`Missing required fields: ${missing.join(', ')}`, 400);
		}
		const username = maps['username'];
		const password = maps['password'];
		if (typeof username !== 'string' || typeof password !== 'string') {
			return jsonError('username, password must be strings', 400);
		}
		const q = `SELECT * FROM \`users\` WHERE \`username\`='${escapeSqlString(username)}' AND \`password\`='${escapeSqlString(password)}' LIMIT 1;
			update \`users\`
			`;
		const { executeSqlQuery } = await import('../sql');
		const config = createConfig(env);
		const rows = await executeSqlQuery(config, q);
		if (!Array.isArray(rows) || rows.length === 0) {
			return jsonError('Invalid credentials', 401);
		}
		// Update last_login
		const updateQuery = `UPDATE \`users\` SET \`last_login\` = CURRENT_TIMESTAMP WHERE \`username\` = '${escapeSqlString(username)}'`;
		await executeSqlQuery(config, updateQuery);
		const row = rows[0] as any;
		const prefix = String(row?.prefix ?? '');
		const token = await encryptSessionCookie(env, { username, prefix });
		const cookie = buildSetCookie('session', token, 60 * 60 * 24);
		console.log('Generated Set-Cookie:', cookie);
		return new Response(JSON.stringify({ status: 'ok' }, null, 2), {
			headers: {
				'content-type': 'application/json; charset=utf-8',
				'set-cookie': cookie,
			},
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Invalid JSON';
		return jsonError(message, 400);
	}
}

/**
 * POST /logout - Logout user by expiring session cookie
 */
export async function handleLogout(request: Request, env: Env): Promise<Response> {
	const cookie = buildSetCookie('session', '', 0); // Expire the session cookie
	return new Response(JSON.stringify({ status: 'ok', message: 'Logged out' }, null, 2), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'set-cookie': cookie,
		},
	});
}

