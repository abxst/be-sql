import { parseRequestJsonToMap } from '../json';
import { buildSetCookie, encryptSessionCookie } from '../auth';
import { createConfig } from '../config';
import { escapeSqlString, jsonError, jsonResponse } from './utils';
import { logError, createErrorResponse, logInfo } from '../error-handler';
import { validateUsername, validatePassword, validatePrefix, containsSqlInjection } from '../validation';

/**
 * POST /register - Register a new user
 */
export async function handleRegister(request: Request, env: Env): Promise<Response> {
	const context = { file: 'routes/auth.ts', function: 'handleRegister' };
	
	try {
		const maps = await parseRequestJsonToMap(request);
		
		// Check missing fields
		const missing: string[] = [];
		for (const key of ['username', 'password', 'prefix']) {
			if (!(key in maps)) missing.push(key);
		}
		if (missing.length > 0) {
			logError(new Error('Missing required fields'), { ...context, details: { missing } });
			return jsonError(`Missing required fields: ${missing.join(', ')}`, 400);
		}
		
		const username = maps['username'];
		const password = maps['password'];
		const prefix = maps['prefix'];
		
		// Validate username
		const usernameValidation = validateUsername(username);
		if (!usernameValidation.valid) {
			logError(new Error('Username validation failed'), { ...context, details: { errors: usernameValidation.errors }, env });
			
			// Show validation details only in debug mode
			const debugEnabled = env.IS_DEBUG === 'true' || env.IS_DEBUG === '1' || env.IS_DEBUG === 'yes' || !env.IS_DEBUG;
			if (debugEnabled) {
				return jsonResponse({ 
					status: 'error', 
					error: 'Username validation failed',
					details: usernameValidation.errors 
				}, 400);
			} else {
				return jsonResponse({ 
					status: 'error', 
					error: 'Invalid username'
				}, 400);
			}
		}
		
		// Validate password
		const passwordValidation = validatePassword(password);
		if (!passwordValidation.valid) {
			logError(new Error('Password validation failed'), { ...context, details: { errors: passwordValidation.errors }, env });
			
			// Show validation details only in debug mode
			const debugEnabled = env.IS_DEBUG === 'true' || env.IS_DEBUG === '1' || env.IS_DEBUG === 'yes' || !env.IS_DEBUG;
			if (debugEnabled) {
				return jsonResponse({ 
					status: 'error', 
					error: 'Password validation failed',
					details: passwordValidation.errors 
				}, 400);
			} else {
				return jsonResponse({ 
					status: 'error', 
					error: 'Invalid password'
				}, 400);
			}
		}
		
		// Validate prefix
		const prefixValidation = validatePrefix(prefix);
		if (!prefixValidation.valid) {
			logError(new Error('Prefix validation failed'), { ...context, details: { errors: prefixValidation.errors }, env });
			
			// Show validation details only in debug mode
			const debugEnabled = env.IS_DEBUG === 'true' || env.IS_DEBUG === '1' || env.IS_DEBUG === 'yes' || !env.IS_DEBUG;
			if (debugEnabled) {
				return jsonResponse({ 
					status: 'error', 
					error: 'Prefix validation failed',
					details: prefixValidation.errors 
				}, 400);
			} else {
				return jsonResponse({ 
					status: 'error', 
					error: 'Invalid prefix'
				}, 400);
			}
		}
		
		// At this point, we know all fields are valid strings
		const usernameStr = username as string;
		const passwordStr = password as string;
		const prefixStr = prefix as string;
		
		// Check for SQL injection attempts
		if (containsSqlInjection(usernameStr) || containsSqlInjection(passwordStr) || containsSqlInjection(prefixStr)) {
			logError(new Error('SQL injection attempt detected'), { ...context, details: { username: usernameStr }, env });
			return jsonError('Invalid input detected', 400);
		}
		
		try {
			const { executeSqlQuery } = await import('../sql');
			const config = createConfig(env);
			// SQLite syntax
			const q = `INSERT INTO "users"("username", "password", "prefix") VALUES ('${escapeSqlString(usernameStr)}','${escapeSqlString(passwordStr)}','${escapeSqlString(prefixStr)}')`;
			const data = await executeSqlQuery(config, q);
			return jsonResponse({ status: 'ok', data });
		} catch (error) {
			return createErrorResponse(error, { ...context, details: { username: usernameStr }, env }, 502);
		}
	} catch (err) {
		return createErrorResponse(err, { ...context, details: { message: 'Failed to parse request JSON' }, env }, 400);
	}
}

/**
 * POST /login - Login user and create session
 */
export async function handleLogin(request: Request, env: Env): Promise<Response> {
	const context = { file: 'routes/auth.ts', function: 'handleLogin' };
	
	try {
		const maps = await parseRequestJsonToMap(request);
		
		// Check missing fields
		const missing: string[] = [];
		for (const key of ['username', 'password']) {
			if (!(key in maps)) missing.push(key);
		}
		if (missing.length > 0) {
			logError(new Error('Missing required fields'), { ...context, details: { missing } });
			return jsonError(`Missing required fields: ${missing.join(', ')}`, 400);
		}
		
		const username = maps['username'];
		const password = maps['password'];
		
		// Validate username
		const usernameValidation = validateUsername(username);
		if (!usernameValidation.valid) {
			logError(new Error('Username validation failed'), { ...context, details: { errors: usernameValidation.errors } });
			return jsonResponse({ 
				status: 'error', 
				error: 'Username validation failed',
				details: usernameValidation.errors 
			}, 400);
		}
		
		// Validate password (basic check for login - not as strict as register)
		if (typeof password !== 'string' || password.length === 0) {
			logError(new Error('Invalid password'), { ...context, details: { reason: 'empty or not string' } });
			return jsonError('Password cannot be empty', 400);
		}
		
		if (password.length > 128) {
			logError(new Error('Password too long'), { ...context, details: { length: password.length } });
			return jsonError('Password is too long', 400);
		}
		
		// At this point, we know username is a valid string and password is a string
		const usernameStr = username as string;
		const passwordStr = password as string;
		
		// Check for SQL injection attempts
		if (containsSqlInjection(usernameStr) || containsSqlInjection(passwordStr)) {
			logError(new Error('SQL injection attempt detected'), { ...context, details: { username: usernameStr }, env });
			return jsonError('Invalid input detected', 400);
		}
		
		try {
			const { executeSqlQuery } = await import('../sql');
			const config = createConfig(env);
			
			// Query to check user credentials (SQLite syntax)
			const selectQuery = `SELECT * FROM "users" WHERE "username"='${escapeSqlString(usernameStr)}' AND "password"='${escapeSqlString(passwordStr)}' LIMIT 1`;
			const rows = await executeSqlQuery(config, selectQuery);
			if (!Array.isArray(rows) || rows.length === 0) {
				logError(new Error('Invalid credentials'), { ...context, details: { username: usernameStr } });
				return jsonError('Invalid credentials', 401);
			}
			// Update last_login (SQLite: datetime('now') or CURRENT_TIMESTAMP both work)
			const updateQuery = `UPDATE "users" SET "last_login" = datetime('now') WHERE "username" = '${escapeSqlString(usernameStr)}'`;
			await executeSqlQuery(config, updateQuery);
			const row = rows[0] as any;
			const prefix = String(row?.prefix ?? '');
			const token = await encryptSessionCookie(env, { username: usernameStr, prefix });
			const cookie = buildSetCookie('session', token, 60 * 60 * 24);
			logInfo('Login successful', { username: usernameStr, timestamp: new Date().toISOString() }, env);
			return new Response(JSON.stringify({ status: 'ok' }, null, 2), {
				headers: {
					'content-type': 'application/json; charset=utf-8',
					'set-cookie': cookie,
				},
			});
		} catch (error) {
			return createErrorResponse(error, { ...context, details: { username: username as string }, env }, 500);
		}
	} catch (err) {
		return createErrorResponse(err, { ...context, details: { message: 'Failed to parse request JSON' }, env }, 400);
	}
}

/**
 * POST /logout - Logout user by expiring session cookie
 */
export async function handleLogout(request: Request, env: Env): Promise<Response> {
	const context = { file: 'routes/auth.ts', function: 'handleLogout', env };
	
	try {
		const cookie = buildSetCookie('session', '', 0); // Expire the session cookie
		logInfo('Logout successful', { timestamp: new Date().toISOString() }, env);
		return new Response(JSON.stringify({ status: 'ok', message: 'Logged out' }, null, 2), {
			headers: {
				'content-type': 'application/json; charset=utf-8',
				'set-cookie': cookie,
			},
		});
	} catch (error) {
		return createErrorResponse(error, context, 500);
	}
}

