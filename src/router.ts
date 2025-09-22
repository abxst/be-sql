import { createConfig } from './config';
import { buildSetCookie, encryptSessionCookie, readSessionFromRequest } from './auth';
import { parseRequestJsonToMap } from './json';

export async function routeRequest(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);

	// Helper localized to router to execute a SQL query and return a JSON Response
	async function respondSqlQuery(query: string): Promise<Response> {
		const { executeSqlQuery } = await import('./sql');
		const config = createConfig(env);
		try {
			const data = await executeSqlQuery(config, query);
			const body = JSON.stringify({ status: 'ok', data }, null, 2);
			return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8' } });
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			const body = JSON.stringify({ status: 'error', message }, null, 2);
			return new Response(body, { status: 502, headers: { 'content-type': 'application/json; charset=utf-8' } });
		}
	}

	function escapeSqlString(value: string): string {
		// Minimal escaping for single quotes. Consider server-side parameterization for full safety.
		return value.replace(/'/g, "''");
	}

	switch (url.pathname) {
		case '/check-env': {
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

		case '/check-db':
			return respondSqlQuery('select * from demo where 1');

		case '/register':
			try {
				const maps = await parseRequestJsonToMap(request);
				const missing: string[] = [];
				for (const key of ['username', 'password', 'prefix']) {
					if (!(key in maps)) missing.push(key);
				}
				if (missing.length > 0) {
					return new Response(JSON.stringify({ error: 'Missing required fields', fields: missing }, null, 2), {
						status: 400,
						headers: { 'content-type': 'application/json; charset=utf-8' },
					});
				}
				const username = maps['username'];
				const password = maps['password'];
				const prefix = maps['prefix'];
				if (typeof username !== 'string' || typeof password !== 'string' || typeof prefix !== 'string') {
					return new Response(JSON.stringify({ error: 'username, password, prefix must be strings' }, null, 2), {
						status: 400,
						headers: { 'content-type': 'application/json; charset=utf-8' },
					});
				}
				const q = `INSERT INTO \`users\`(\`username\`, \`password\`, \`prefix\`) VALUES ('${escapeSqlString(username)}','${escapeSqlString(password)}','${escapeSqlString(prefix)}')`;
				return respondSqlQuery(q);
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Invalid JSON';
				return new Response(JSON.stringify({ error: message }, null, 2), {
					status: 400,
					headers: { 'content-type': 'application/json; charset=utf-8' },
				});
			}

            case '/login':
                try {
                    const maps = await parseRequestJsonToMap(request);
                    const missing: string[] = [];
                    for (const key of ['username', 'password']) {
                        if (!(key in maps)) missing.push(key);
                    }
                    if (missing.length > 0) {
                        return new Response(JSON.stringify({ error: 'Missing required fields', fields: missing }, null, 2), {
                            status: 400,
                            headers: { 'content-type': 'application/json; charset=utf-8' },
                        });
                    }
                    const username = maps['username'];
                    const password = maps['password'];
                    if (typeof username !== 'string' || typeof password !== 'string') {
                        return new Response(JSON.stringify({ error: 'username, password must be strings' }, null, 2), {
                            status: 400,
                            headers: { 'content-type': 'application/json; charset=utf-8' },
                        });
                    }
                    const q = `SELECT * FROM \`users\` WHERE \`username\`='${escapeSqlString(username)}' AND \`password\`='${escapeSqlString(password)}' LIMIT 1`;
                    const { executeSqlQuery } = await import('./sql');
                    const config = createConfig(env);
                    const rows = await executeSqlQuery(config, q);
                    if (!Array.isArray(rows) || rows.length === 0) {
                        return new Response(JSON.stringify({ error: 'Invalid credentials' }, null, 2), {
                            status: 401,
                            headers: { 'content-type': 'application/json; charset=utf-8' },
                        });
                    }
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
                    return new Response(JSON.stringify({ error: message }, null, 2), {
                        status: 400,
                        headers: { 'content-type': 'application/json; charset=utf-8' },
                    });
                }

		case '/parse-json': {
			try {
				const maps = await parseRequestJsonToMap(request);
				return new Response(JSON.stringify(maps, null, 2), {
					headers: { 'content-type': 'application/json; charset=utf-8' },
				});
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Invalid JSON';
				return new Response(JSON.stringify({ error: message }, null, 2), {
					status: 400,
					headers: { 'content-type': 'application/json; charset=utf-8' },
				});
			}
		}

		case '/get-key': {
			try {
				const session = await readSessionFromRequest(env, request);
				if (!session) {
					return new Response(JSON.stringify({ error: 'Unauthorized' }, null, 2), {
						status: 401,
						headers: { 'content-type': 'application/json; charset=utf-8' },
					});
				}
				const userPrefix = session.prefix;

				const pageParam = url.searchParams.get('page');
				const sizeParam = url.searchParams.get('pageSize') ?? url.searchParams.get('limit');
				let page = 1;
				if (pageParam && !Number.isNaN(Number(pageParam))) page = Math.max(1, Math.floor(Number(pageParam)));
				let pageSize = 50;
				if (sizeParam && !Number.isNaN(Number(sizeParam))) pageSize = Math.floor(Number(sizeParam));
				if (pageSize < 1) pageSize = 1;
				if (pageSize > 50) pageSize = 50;
				const offset = (page - 1) * pageSize;

				const { executeSqlQuery } = await import('./sql');
				const config = createConfig(env);
				const keysQuery = `SELECT * FROM \`ukeys\` WHERE \`prefix\`='${escapeSqlString(userPrefix)}' ORDER BY \`id_key\` DESC LIMIT ${pageSize} OFFSET ${offset}`;
				const data = await executeSqlQuery(config, keysQuery);
				return new Response(JSON.stringify({ page, pageSize, data }, null, 2), {
					headers: { 'content-type': 'application/json; charset=utf-8' },
				});
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Invalid request';
				return new Response(JSON.stringify({ error: message }, null, 2), {
					status: 400,
					headers: { 'content-type': 'application/json; charset=utf-8' },
				});
			}
		}

		case '/get-info': {
			try {
				const session = await readSessionFromRequest(env, request);
				if (!session) {
					return new Response(JSON.stringify({ error: 'Unauthorized' }, null, 2), {
						status: 401,
						headers: { 'content-type': 'application/json; charset=utf-8' },
					});
				}
				const userPrefix = session.prefix;
				const infoQuery = `SELECT \`id\`, \`username\`, \`prefix\`, \`last_login\` FROM \`users\` WHERE \`prefix\` = '${escapeSqlString(userPrefix)}'`;
				const { executeSqlQuery } = await import('./sql');
				const config = createConfig(env);
				const data = await executeSqlQuery(config, infoQuery);
				return new Response(JSON.stringify({ status: 'ok', data }, null, 2), {
					headers: { 'content-type': 'application/json; charset=utf-8' },
				});
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Invalid request';
				return new Response(JSON.stringify({ error: message }, null, 2), {
					status: 400,
					headers: { 'content-type': 'application/json; charset=utf-8' },
				});
			}
		}

		default: {
			const config = createConfig(env);
			return new Response('Hello World!');
		}
	}
}


