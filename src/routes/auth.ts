import { parseRequestJsonToMap } from '../json';
import { buildSetCookie, encryptSessionCookie } from '../auth';
import { createConfig } from '../config';
import { escapeSqlString, jsonError, jsonResponse, jsonErrorWithCode } from './utils';
import { logError, createErrorResponse, logInfo } from '../error-handler';
import { validateUsername, validatePassword, validatePrefix, containsSqlInjection } from '../validation';
import { ErrorCodes } from '../error-codes';

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
			logError(new Error('Missing required fields'), { 
				...context, 
				details: { missing },
				errorCode: ErrorCodes.MISSING_FIELDS,
				env 
			});
			return jsonErrorWithCode(ErrorCodes.MISSING_FIELDS, { 
				...context, 
				details: { missing }
			}, env);
		}
		
		const username = maps['username'];
		const password = maps['password'];
		const prefix = maps['prefix'];
		
		// Validate username
		const usernameValidation = validateUsername(username);
		if (!usernameValidation.valid) {
			logError(new Error('Username validation failed'), { 
				...context, 
				details: { errors: usernameValidation.errors },
				errorCode: ErrorCodes.USERNAME_VALIDATION_FAILED,
				env 
			});
			
			return jsonErrorWithCode(ErrorCodes.USERNAME_VALIDATION_FAILED, {
				...context,
				details: { errors: usernameValidation.errors }
			}, env);
		}
		
		// Validate password
		const passwordValidation = validatePassword(password);
		if (!passwordValidation.valid) {
			logError(new Error('Password validation failed'), { 
				...context, 
				details: { errors: passwordValidation.errors },
				errorCode: ErrorCodes.PASSWORD_VALIDATION_FAILED,
				env 
			});
			
			return jsonErrorWithCode(ErrorCodes.PASSWORD_VALIDATION_FAILED, {
				...context,
				details: { errors: passwordValidation.errors }
			}, env);
		}
		
		// Validate prefix
		const prefixValidation = validatePrefix(prefix);
		if (!prefixValidation.valid) {
			logError(new Error('Prefix validation failed'), { 
				...context, 
				details: { errors: prefixValidation.errors },
				errorCode: ErrorCodes.PREFIX_VALIDATION_FAILED,
				env 
			});
			
			return jsonErrorWithCode(ErrorCodes.PREFIX_VALIDATION_FAILED, {
				...context,
				details: { errors: prefixValidation.errors }
			}, env);
		}
		
		// At this point, we know all fields are valid strings
		const usernameStr = username as string;
		const passwordStr = password as string;
		const prefixStr = prefix as string;
		
		// Check for SQL injection attempts
		if (containsSqlInjection(usernameStr) || containsSqlInjection(passwordStr) || containsSqlInjection(prefixStr)) {
			logError(new Error('SQL injection attempt detected'), { 
				...context, 
				details: { username: usernameStr },
				errorCode: ErrorCodes.SQL_INJECTION_DETECTED,
				env 
			});
			return jsonErrorWithCode(ErrorCodes.SQL_INJECTION_DETECTED, {
				...context,
				details: { username: usernameStr }
			}, env);
		}
		
		try {
			const { executeSqlQuery } = await import('../sql');
			const config = createConfig(env);
			// SQLite syntax
			const q = `INSERT INTO "users"("username", "password", "prefix") VALUES ('${escapeSqlString(usernameStr)}','${escapeSqlString(passwordStr)}','${escapeSqlString(prefixStr)}')`;
			const data = await executeSqlQuery(config, q);
			return jsonResponse({ status: 'ok', data });
		} catch (error) {
			return createErrorResponse(error, { 
				...context, 
				details: { username: usernameStr },
				errorCode: ErrorCodes.INSERT_FAILED,
				env 
			});
		}
	} catch (err) {
		return createErrorResponse(err, { 
			...context, 
			details: { message: 'Failed to parse request JSON' },
			errorCode: ErrorCodes.JSON_PARSE_ERROR,
			env 
		});
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
			logError(new Error('Missing required fields'), { 
				...context, 
				details: { missing },
				errorCode: ErrorCodes.MISSING_FIELDS,
				env 
			});
			return jsonErrorWithCode(ErrorCodes.MISSING_FIELDS, {
				...context,
				details: { missing }
			}, env);
		}
		
		const username = maps['username'];
		const password = maps['password'];
		
		// Validate username
		const usernameValidation = validateUsername(username);
		if (!usernameValidation.valid) {
			logError(new Error('Username validation failed'), { 
				...context, 
				details: { errors: usernameValidation.errors },
				errorCode: ErrorCodes.USERNAME_VALIDATION_FAILED,
				env 
			});
			return jsonErrorWithCode(ErrorCodes.USERNAME_VALIDATION_FAILED, {
				...context,
				details: { errors: usernameValidation.errors }
			}, env);
		}
		
		// Validate password (basic check for login - not as strict as register)
		if (typeof password !== 'string' || password.length === 0) {
			logError(new Error('Invalid password'), { 
				...context, 
				details: { reason: 'empty or not string' },
				errorCode: ErrorCodes.INVALID_PASSWORD,
				env 
			});
			return jsonErrorWithCode(ErrorCodes.INVALID_PASSWORD, {
				...context,
				details: { reason: 'empty or not string' }
			}, env);
		}
		
		if (password.length > 128) {
			logError(new Error('Password too long'), { 
				...context, 
				details: { length: password.length },
				errorCode: ErrorCodes.PASSWORD_TOO_LONG,
				env 
			});
			return jsonErrorWithCode(ErrorCodes.PASSWORD_TOO_LONG, {
				...context,
				details: { length: password.length }
			}, env);
		}
		
		// At this point, we know username is a valid string and password is a string
		const usernameStr = username as string;
		const passwordStr = password as string;
		
		// Check for SQL injection attempts
		if (containsSqlInjection(usernameStr) || containsSqlInjection(passwordStr)) {
			logError(new Error('SQL injection attempt detected'), { 
				...context, 
				details: { username: usernameStr },
				errorCode: ErrorCodes.SQL_INJECTION_DETECTED,
				env 
			});
			return jsonErrorWithCode(ErrorCodes.SQL_INJECTION_DETECTED, {
				...context,
				details: { username: usernameStr }
			}, env);
		}
		
		try {
			const { executeSqlQuery } = await import('../sql');
			const config = createConfig(env);
			
			// Query to check user credentials (SQLite syntax)
			const selectQuery = `SELECT * FROM "users" WHERE "username"='${escapeSqlString(usernameStr)}' AND "password"='${escapeSqlString(passwordStr)}' LIMIT 1`;
			const rows = await executeSqlQuery(config, selectQuery);
			if (!Array.isArray(rows) || rows.length === 0) {
				logError(new Error('Invalid credentials'), { 
					...context, 
					details: { username: usernameStr },
					errorCode: ErrorCodes.INVALID_CREDENTIALS,
					env 
				});
				return jsonErrorWithCode(ErrorCodes.INVALID_CREDENTIALS, {
					...context,
					details: { username: usernameStr }
				}, env);
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
			return createErrorResponse(error, { 
				...context, 
				details: { username: username as string },
				errorCode: ErrorCodes.SQL_QUERY_FAILED,
				env 
			});
		}
	} catch (err) {
		return createErrorResponse(err, { 
			...context, 
			details: { message: 'Failed to parse request JSON' },
			errorCode: ErrorCodes.JSON_PARSE_ERROR,
			env 
		});
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
		return createErrorResponse(error, { 
			...context,
			errorCode: ErrorCodes.UNKNOWN_ERROR
		});
	}
}

