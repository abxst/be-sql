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

		if (url.pathname === '/') {
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

		const { createConfig } = await import('./config');
		const config = createConfig(env);
		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;
