import { createConfig } from './config';

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

		default: {
			const config = createConfig(env);
			return new Response('Hello World!');
		}
	}
}


