/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/check-env') {
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

		if (url.pathname === '/check-db') {
			const { createConfig } = await import('./config');
			const { executeSqlQuery } = await import('./sql');
			const config = createConfig(env);
			try {
				const data = await executeSqlQuery(config, 'select * from demo where 1');
				const body = JSON.stringify({ status: 'ok', data }, null, 2);
				return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8' } });
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				const body = JSON.stringify({ status: 'error', message }, null, 2);
				return new Response(body, { status: 502, headers: { 'content-type': 'application/json; charset=utf-8' } });
			}
		}

		const { createConfig } = await import('./config');
		const config = createConfig(env);
		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;
